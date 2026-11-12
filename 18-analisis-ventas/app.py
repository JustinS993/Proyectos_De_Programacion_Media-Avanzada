"""Dashboard interactivo para explorar datos de ventas."""

from __future__ import annotations

from datetime import date, timedelta
from io import BytesIO

import pandas as pd
import plotly.express as px
import streamlit as st

from analytics import (
    build_analysis_summary,
    calculate_kpis,
    calculate_period_metrics,
    calculate_product_profitability,
    generate_sales_data,
    read_sales_csv,
)

CURRENCIES = {
    "USD": "$",
    "EUR": "€",
    "COP": "$",
    "MXN": "$",
}
DATE_FORMATS = {
    "DD/MM/AAAA": ("DD/MM/YYYY", "%d/%m/%Y"),
    "MM/DD/AAAA": ("MM/DD/YYYY", "%m/%d/%Y"),
    "AAAA-MM-DD": ("YYYY-MM-DD", "%Y-%m-%d"),
}
MONEY_COLUMNS = ("Precio_unitario", "Ventas", "Costo", "Ganancia")

st.set_page_config(
    page_title="Análisis de ventas",
    page_icon="📊",
    layout="wide",
)

st.title("📊 Análisis de ventas")
st.caption(
    "Explora ingresos, rentabilidad y tendencias. Los datos de ejemplo son sintéticos."
)

st.sidebar.header("Presentación")
currency_code = st.sidebar.selectbox(
    "Moneda",
    options=list(CURRENCIES),
    format_func=lambda code: f"{code} ({CURRENCIES[code]})",
)
if currency_code == "USD":
    exchange_rate = 1.0
    st.sidebar.caption("Los importes base están en USD.")
else:
    exchange_rate = st.sidebar.number_input(
        f"Tasa: unidades de {currency_code} por 1 USD",
        min_value=0.000001,
        value=None,
        step=0.01,
        format="%.6f",
        help="Ingresa la tasa que quieras aplicar. No se consulta una tasa automática.",
    )
    if exchange_rate is None:
        st.sidebar.info(
            f"Ingresa la tasa de cambio para mostrar los importes en {currency_code}."
        )

date_format_label = st.sidebar.selectbox(
    "Formato de fechas",
    options=list(DATE_FORMATS),
    index=0,
)
streamlit_date_format, export_date_format = DATE_FORMATS[date_format_label]

uploaded_file = st.sidebar.file_uploader(
    "Cargar datos propios (CSV)",
    type=["csv"],
    help="Se aceptan archivos separados por coma, punto y coma o tabulador.",
)

if uploaded_file is not None:
    try:
        sales_data = read_sales_csv(uploaded_file.getvalue(), streamlit_date_format)
    except ValueError as error:
        st.error(f"No se pudo cargar el archivo: {error}")
        with st.expander("Errores frecuentes y cómo corregirlos"):
            st.markdown(
                """
                - **Faltan columnas:** usa exactamente los nombres de la plantilla CSV.
                - **Fechas inválidas o ambiguas:** elige el formato correcto en la barra lateral
                  y usa fechas como `09/11/2026` o `2026-11-09`.
                - **Valores no numéricos:** quita símbolos como `$` y separadores de miles;
                  escribe `1250.50` (o `1250,50` en un CSV separado por punto y coma).
                - **Descuento inválido:** escribe una proporción entre `0` y `1`;
                  por ejemplo, `0.15` representa 15 %.
                - **Separador incorrecto:** exporta como CSV separado por coma o punto y coma
                  y asegúrate de que cada fila tenga las mismas columnas.
                - **Texto con caracteres extraños:** guarda el archivo con codificación UTF-8.
                """
            )
        st.stop()
else:
    sales_data = generate_sales_data()

if currency_code != "USD" and exchange_rate is None:
    st.info("Selecciona una tasa de cambio en la barra lateral para continuar.")
    st.stop()

exchange_rate = float(exchange_rate)
currency_symbol = CURRENCIES[currency_code]


def format_money(amount: float) -> str:
    return f"{currency_symbol}{amount:,.2f} {currency_code}"


def format_date(value: date) -> str:
    return value.strftime(export_date_format)


min_date = sales_data["Fecha"].min().date()
max_date = sales_data["Fecha"].max().date()

st.sidebar.header("Filtros")
selected_dates = st.sidebar.date_input(
    "Período del dashboard",
    value=(min_date, max_date),
    min_value=min_date,
    max_value=max_date,
    format=streamlit_date_format,
)
if isinstance(selected_dates, tuple) and len(selected_dates) == 2:
    start_date, end_date = selected_dates
else:
    start_date = end_date = selected_dates
if start_date is None or end_date is None:
    st.info("Selecciona un período para ver las ventas.")
    st.stop()

days_available = (max_date - min_date).days + 1
split_date = min_date + timedelta(days=days_available // 2)
period_a_default = (min_date, split_date - timedelta(days=1))
period_b_default = (split_date, max_date)
if period_a_default[1] < period_a_default[0]:
    period_a_default = (min_date, min_date)

st.sidebar.subheader("Comparar dos períodos")
period_a_selection = st.sidebar.date_input(
    "Período A",
    value=period_a_default,
    min_value=min_date,
    max_value=max_date,
    format=streamlit_date_format,
    key="comparison_period_a",
)
period_b_selection = st.sidebar.date_input(
    "Período B",
    value=period_b_default,
    min_value=min_date,
    max_value=max_date,
    format=streamlit_date_format,
    key="comparison_period_b",
)


def unpack_date_range(value: date | tuple[date, ...]) -> tuple[date, date] | None:
    if isinstance(value, tuple) and len(value) == 2:
        first_date, last_date = value
        if first_date is not None and last_date is not None:
            return first_date, last_date
    return None


period_a = unpack_date_range(period_a_selection)
period_b = unpack_date_range(period_b_selection)
if period_a is None or period_b is None:
    st.info("Selecciona las fechas de inicio y fin para ambos períodos.")
    st.stop()

regions = sorted(sales_data["Region"].unique())
categories = sorted(sales_data["Categoria"].unique())
selected_regions = st.sidebar.multiselect("Región", regions, default=regions)
selected_categories = st.sidebar.multiselect(
    "Categoría", categories, default=categories
)
available_products = sorted(
    sales_data.loc[
        sales_data["Categoria"].isin(selected_categories), "Producto"
    ].unique()
)
selected_products = st.sidebar.multiselect(
    "Producto", available_products, default=available_products
)

dimension_filter = (
    sales_data["Region"].isin(selected_regions)
    & sales_data["Categoria"].isin(selected_categories)
    & sales_data["Producto"].isin(selected_products)
)
main_mask = sales_data["Fecha"].dt.date.between(start_date, end_date)
period_a_mask = sales_data["Fecha"].dt.date.between(*period_a)
period_b_mask = sales_data["Fecha"].dt.date.between(*period_b)

filtered_data = sales_data.loc[main_mask & dimension_filter].copy()
period_a_data = sales_data.loc[period_a_mask & dimension_filter]
period_b_data = sales_data.loc[period_b_mask & dimension_filter]

period_a_metrics = calculate_period_metrics(period_a_data, *period_a)
period_b_metrics = calculate_period_metrics(period_b_data, *period_b)

st.subheader("Comparación de períodos")
st.caption(
    f"Período A: {format_date(period_a[0])} – {format_date(period_a[1])} · "
    f"Período B: {format_date(period_b[0])} – {format_date(period_b[1])}. "
    "La comparación aplica los mismos filtros de región, categoría y producto."
)
if max(period_a[0], period_b[0]) <= min(period_a[1], period_b[1]):
    st.warning("Los períodos se traslapan; considera elegir fechas distintas.")

sales_change = (
    (float(period_b_metrics["ventas_totales"]) - float(period_a_metrics["ventas_totales"]))
    / float(period_a_metrics["ventas_totales"])
    * 100
    if period_a_metrics["ventas_totales"]
    else None
)
comparison_columns = st.columns(3)
comparison_columns[0].metric(
    "Ventas del período B",
    format_money(float(period_b_metrics["ventas_totales"]) * exchange_rate),
    delta=f"{sales_change:+.1f}% vs. A" if sales_change is not None else "N/D: A sin ventas",
)
comparison_columns[1].metric(
    "Promedio diario B",
    format_money(float(period_b_metrics["ventas_diarias"]) * exchange_rate),
    delta=(
        f"{(float(period_b_metrics['ventas_diarias']) - float(period_a_metrics['ventas_diarias'])) * exchange_rate:+,.2f} {currency_code} vs. A"
    ),
)
comparison_columns[2].metric(
    "Ganancia del período B",
    format_money(float(period_b_metrics["ganancia_total"]) * exchange_rate),
    delta=(
        f"{(float(period_b_metrics['ganancia_total']) - float(period_a_metrics['ganancia_total'])) * exchange_rate:+,.2f} {currency_code} vs. A"
    ),
)
st.caption(
    f"Ventas del período A: "
    f"{format_money(float(period_a_metrics['ventas_totales']) * exchange_rate)} · "
    f"Ganancia A: {format_money(float(period_a_metrics['ganancia_total']) * exchange_rate)}"
)

if filtered_data.empty:
    st.info("No hay ventas para el período y los filtros seleccionados.")
else:
    kpis = calculate_kpis(filtered_data)
    product_profitability = calculate_product_profitability(filtered_data)
    least_profitable = (
        product_profitability.iloc[0].to_dict()
        if not product_profitability.empty
        else None
    )

    st.subheader("Indicadores del período")
    metric_columns = st.columns(5)
    metric_columns[0].metric(
        f"Ventas totales ({currency_code})",
        format_money(float(kpis["ventas_totales"]) * exchange_rate),
    )
    metric_columns[1].metric("Pedidos", f"{kpis['pedidos']:,}")
    metric_columns[2].metric(
        f"Ticket promedio ({currency_code})",
        format_money(float(kpis["ticket_promedio"]) * exchange_rate),
    )
    metric_columns[3].metric(
        "Margen de ganancia", f"{kpis['margen_porcentaje']:.1f}%"
    )
    metric_columns[4].metric(
        "Descuento promedio", f"{kpis['descuento_promedio']:.1f}%"
    )
    st.caption(
        f"Ganancia estimada: "
        f"{format_money(float(kpis['ganancia_total']) * exchange_rate)}"
    )
    if least_profitable is not None:
        st.warning(
            f"Producto con menor margen: **{least_profitable['Producto']}** "
            f"({float(least_profitable['Margen_porcentaje']):.1f}%). "
            f"Ganancia: {format_money(float(least_profitable['Ganancia']) * exchange_rate)}."
        )

    display_data = filtered_data.copy()
    display_data.loc[:, list(MONEY_COLUMNS)] = (
        display_data.loc[:, list(MONEY_COLUMNS)] * exchange_rate
    )
    monthly_sales = (
        display_data.set_index("Fecha")
        .resample("MS")[["Ventas", "Ganancia"]]
        .sum()
        .reset_index()
    )
    sales_by_category = (
        display_data.groupby("Categoria", as_index=False)["Ventas"]
        .sum()
        .sort_values("Ventas", ascending=False)
    )
    sales_by_region = (
        display_data.groupby("Region", as_index=False)["Ventas"]
        .sum()
        .sort_values("Ventas", ascending=False)
    )
    top_products = (
        display_data.groupby("Producto", as_index=False)["Ventas"]
        .sum()
        .nlargest(8, "Ventas")
    )

    left_chart, right_chart = st.columns(2)
    with left_chart:
        st.subheader("Ventas y ganancia por mes")
        monthly_long = monthly_sales.melt(
            id_vars="Fecha",
            value_vars=["Ventas", "Ganancia"],
            var_name="Indicador",
            value_name="Monto",
        )
        figure = px.line(
            monthly_long,
            x="Fecha",
            y="Monto",
            color="Indicador",
            markers=True,
            labels={
                "Fecha": "Mes",
                "Monto": f"Monto ({currency_code})",
                "Indicador": "",
            },
            color_discrete_map={"Ventas": "#2563eb", "Ganancia": "#10b981"},
        )
        st.plotly_chart(figure, width="stretch")

    with right_chart:
        st.subheader("Ventas por categoría")
        figure = px.bar(
            sales_by_category,
            x="Categoria",
            y="Ventas",
            color="Categoria",
            labels={
                "Categoria": "Categoría",
                "Ventas": f"Ventas ({currency_code})",
            },
            color_discrete_sequence=px.colors.qualitative.Set2,
        )
        st.plotly_chart(figure, width="stretch")

    left_chart, right_chart = st.columns(2)
    with left_chart:
        st.subheader("Ventas por región")
        figure = px.bar(
            sales_by_region,
            x="Region",
            y="Ventas",
            color="Region",
            labels={"Region": "Región", "Ventas": f"Ventas ({currency_code})"},
            color_discrete_sequence=px.colors.qualitative.Pastel,
        )
        st.plotly_chart(figure, width="stretch")

    with right_chart:
        st.subheader("Productos principales")
        figure = px.bar(
            top_products.sort_values("Ventas"),
            x="Ventas",
            y="Producto",
            orientation="h",
            labels={
                "Producto": "Producto",
                "Ventas": f"Ventas ({currency_code})",
            },
            color="Ventas",
            color_continuous_scale="Blues",
        )
        st.plotly_chart(figure, width="stretch")

    st.subheader("Rentabilidad por producto")
    profitability_display = product_profitability.copy()
    profitability_display["Ganancia"] *= exchange_rate
    st.dataframe(
        profitability_display,
        width="stretch",
        hide_index=True,
        column_config={
            "Ventas": st.column_config.NumberColumn(
                f"Ventas ({currency_code})", format="%.2f"
            ),
            "Ganancia": st.column_config.NumberColumn(
                f"Ganancia ({currency_code})", format="%.2f"
            ),
            "Margen_porcentaje": st.column_config.NumberColumn(
                "Margen", format="%.1f%%"
            ),
        },
    )

    st.subheader("Detalle de ventas")
    display_columns = [
        "Fecha",
        "Pedido",
        "Region",
        "Categoria",
        "Producto",
        "Unidades",
        "Ventas",
        "Ganancia",
    ]
    st.dataframe(
        display_data[display_columns].sort_values("Fecha", ascending=False),
        width="stretch",
        hide_index=True,
        column_config={
            "Fecha": st.column_config.DateColumn(
                "Fecha", format=streamlit_date_format
            ),
            "Ventas": st.column_config.NumberColumn(
                f"Ventas ({currency_code})", format="%.2f"
            ),
            "Ganancia": st.column_config.NumberColumn(
                f"Ganancia ({currency_code})", format="%.2f"
            ),
        },
    )

    export_data = filtered_data.copy()
    export_data.loc[:, list(MONEY_COLUMNS)] = (
        export_data.loc[:, list(MONEY_COLUMNS)] * exchange_rate
    )
    export_data.insert(0, "Moneda", currency_code)
    export_data["Fecha"] = export_data["Fecha"].dt.strftime(export_date_format)
    csv_buffer = BytesIO()
    export_data.to_csv(csv_buffer, index=False)
    st.download_button(
        "Descargar datos filtrados (CSV)",
        data=csv_buffer.getvalue(),
        file_name="ventas_filtradas.csv",
        mime="text/csv",
    )

    summary = build_analysis_summary(
        kpis=kpis,
        period_a=period_a_metrics,
        period_b=period_b_metrics,
        least_profitable=least_profitable,
        period_a_label=f"{format_date(period_a[0])} - {format_date(period_a[1])}",
        period_b_label=f"{format_date(period_b[0])} - {format_date(period_b[1])}",
        currency_code=currency_code,
        exchange_rate=exchange_rate,
    )
    st.download_button(
        "Descargar resumen del análisis (CSV)",
        data=summary.to_csv(index=False).encode("utf-8-sig"),
        file_name="resumen_analisis_ventas.csv",
        mime="text/csv",
    )
