"""Dashboard interactivo para explorar datos de ventas."""

from __future__ import annotations

from io import BytesIO

import pandas as pd
import plotly.express as px
import streamlit as st

from analytics import calculate_kpis, generate_sales_data, validate_sales_data

st.set_page_config(
    page_title="Análisis de ventas",
    page_icon="📊",
    layout="wide",
)

st.title("📊 Análisis de ventas")
st.caption(
    "Explora ingresos, rentabilidad y tendencias. Los datos de ejemplo son sintéticos."
)

uploaded_file = st.sidebar.file_uploader(
    "Cargar datos propios (CSV)",
    type=["csv"],
    help="El archivo debe incluir las columnas del CSV descargable.",
)

if uploaded_file is not None:
    try:
        sales_data = validate_sales_data(pd.read_csv(uploaded_file))
    except (ValueError, pd.errors.ParserError, UnicodeDecodeError) as error:
        st.error(f"No se pudo cargar el archivo: {error}")
        st.stop()
else:
    sales_data = generate_sales_data()

min_date = sales_data["Fecha"].min().date()
max_date = sales_data["Fecha"].max().date()

st.sidebar.header("Filtros")
selected_dates = st.sidebar.date_input(
    "Período",
    value=(min_date, max_date),
    min_value=min_date,
    max_value=max_date,
    format="DD/MM/YYYY",
)
if isinstance(selected_dates, tuple) and len(selected_dates) == 2:
    start_date, end_date = selected_dates
else:
    start_date = end_date = selected_dates
if start_date is None or end_date is None:
    st.info("Selecciona un período para ver las ventas.")
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

filtered_data = sales_data.loc[
    sales_data["Fecha"].dt.date.between(start_date, end_date)
    & sales_data["Region"].isin(selected_regions)
    & sales_data["Categoria"].isin(selected_categories)
    & sales_data["Producto"].isin(selected_products)
].copy()

if filtered_data.empty:
    st.info("No hay ventas para los filtros seleccionados.")
    st.stop()

kpis = calculate_kpis(filtered_data)
currency = lambda amount: f"${amount:,.2f}"

metric_columns = st.columns(4)
metric_columns[0].metric("Ventas totales (USD)", currency(kpis["ventas_totales"]))
metric_columns[1].metric("Pedidos", f"{kpis['pedidos']:,}")
metric_columns[2].metric("Ticket promedio (USD)", currency(kpis["ticket_promedio"]))
metric_columns[3].metric(
    "Margen de ganancia", f"{kpis['margen_porcentaje']:.1f}%"
)
st.caption(f"Ganancia estimada (USD): {currency(kpis['ganancia_total'])}")

monthly_sales = (
    filtered_data.set_index("Fecha")
    .resample("MS")[["Ventas", "Ganancia"]]
    .sum()
    .reset_index()
)
sales_by_category = (
    filtered_data.groupby("Categoria", as_index=False)["Ventas"]
    .sum()
    .sort_values("Ventas", ascending=False)
)
sales_by_region = (
    filtered_data.groupby("Region", as_index=False)["Ventas"]
    .sum()
    .sort_values("Ventas", ascending=False)
)
top_products = (
    filtered_data.groupby("Producto", as_index=False)["Ventas"]
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
        labels={"Fecha": "Mes", "Monto": "Monto (USD)", "Indicador": ""},
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
        labels={"Categoria": "Categoría", "Ventas": "Ventas (USD)"},
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
        labels={"Region": "Región", "Ventas": "Ventas (USD)"},
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
        labels={"Producto": "Producto", "Ventas": "Ventas (USD)"},
        color="Ventas",
        color_continuous_scale="Blues",
    )
    st.plotly_chart(figure, width="stretch")

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
    filtered_data[display_columns].sort_values("Fecha", ascending=False),
    width="stretch",
    hide_index=True,
    column_config={
        "Fecha": st.column_config.DateColumn("Fecha", format="DD/MM/YYYY"),
        "Ventas": st.column_config.NumberColumn("Ventas", format="$%.2f"),
        "Ganancia": st.column_config.NumberColumn("Ganancia", format="$%.2f"),
    },
)

csv_buffer = BytesIO()
filtered_data.to_csv(csv_buffer, index=False, date_format="%Y-%m-%d")
st.download_button(
    "Descargar datos filtrados (CSV)",
    data=csv_buffer.getvalue(),
    file_name="ventas_filtradas.csv",
    mime="text/csv",
)
