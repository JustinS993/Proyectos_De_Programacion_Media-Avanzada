"""Funciones de generación y validación de datos para el dashboard."""

from __future__ import annotations

import csv
import random
from collections.abc import Collection
from math import fsum, isfinite
from io import StringIO
from datetime import date, timedelta

import pandas as pd

SALES_COLUMNS = (
    "Fecha",
    "Pedido",
    "Region",
    "Categoria",
    "Producto",
    "Unidades",
    "Precio_unitario",
    "Descuento",
    "Ventas",
    "Costo",
    "Ganancia",
)

PRODUCTS = {
    "Laptop": ("Tecnología", 850.0),
    "Monitor": ("Tecnología", 260.0),
    "Teclado": ("Accesorios", 48.0),
    "Mouse": ("Accesorios", 28.0),
    "Silla ergonómica": ("Muebles", 190.0),
    "Escritorio": ("Muebles", 320.0),
    "Auriculares": ("Accesorios", 75.0),
    "Tablet": ("Tecnología", 420.0),
}

REGIONS = ("Norte", "Sur", "Este", "Oeste", "Centro")
NUMERIC_COLUMNS = (
    "Unidades",
    "Precio_unitario",
    "Descuento",
    "Ventas",
    "Costo",
    "Ganancia",
)
IDENTIFIER_COLUMNS = ("Pedido", "Region", "Categoria", "Producto")


def _finite_sum(values: pd.Series, column_name: str) -> float:
    """Suma valores finitos sin ocultar un desbordamiento numérico."""
    if not values.map(isfinite).all():
        raise ValueError(f"Los valores de '{column_name}' deben ser finitos.")
    try:
        total = fsum(float(value) for value in values)
    except OverflowError as error:
        raise ValueError(
            f"La suma de '{column_name}' excede el rango numérico admitido."
        ) from error
    if not isfinite(total):
        raise ValueError(
            f"La suma de '{column_name}' excede el rango numérico admitido."
        )
    return total


def _finite_result(value: float, description: str) -> float:
    if not isfinite(value):
        raise ValueError(
            f"El resultado de {description} excede el rango numérico admitido."
        )
    return value


def generate_sales_data(order_count: int = 720, seed: int = 42) -> pd.DataFrame:
    """Genera ventas sintéticas reproducibles para practicar análisis."""
    if order_count <= 0:
        raise ValueError("La cantidad de pedidos debe ser mayor que cero.")

    rng = random.Random(seed)
    first_day = date(2024, 1, 1)
    product_names = tuple(PRODUCTS)
    rows: list[dict[str, object]] = []

    for order_number in range(1, order_count + 1):
        product = rng.choice(product_names)
        category, base_price = PRODUCTS[product]
        units = rng.randint(1, 8)
        unit_price = round(base_price * rng.uniform(0.9, 1.1), 2)
        discount = rng.choice((0.0, 0.05, 0.1, 0.15, 0.2))
        cost_rate = rng.uniform(0.58, 0.78)
        sales = round(units * unit_price * (1 - discount), 2)
        cost = round(units * unit_price * cost_rate, 2)

        rows.append(
            {
                "Fecha": first_day + timedelta(days=rng.randrange(731)),
                "Pedido": f"PED-{order_number:04d}",
                "Region": rng.choice(REGIONS),
                "Categoria": category,
                "Producto": product,
                "Unidades": units,
                "Precio_unitario": unit_price,
                "Descuento": discount,
                "Ventas": sales,
                "Costo": cost,
                "Ganancia": round(sales - cost, 2),
            }
        )

    sales_data = pd.DataFrame(rows, columns=SALES_COLUMNS)
    sales_data["Fecha"] = pd.to_datetime(sales_data["Fecha"])
    return sales_data


def validate_sales_data(
    data: pd.DataFrame, date_format: str = "DD/MM/YYYY"
) -> pd.DataFrame:
    """Valida las columnas y valores del CSV y normaliza sus tipos."""
    clean_data = data.copy()
    clean_data.columns = clean_data.columns.astype(str).str.strip()
    missing_columns = [
        column for column in SALES_COLUMNS if column not in clean_data.columns
    ]
    if missing_columns:
        raise ValueError(
            "Faltan columnas requeridas: "
            + ", ".join(missing_columns)
            + ". Usa los nombres exactos de la plantilla descargable."
        )
    if clean_data.empty:
        raise ValueError("El archivo CSV no contiene registros.")

    clean_data = clean_data.loc[:, list(SALES_COLUMNS)].copy()
    date_values = clean_data["Fecha"].astype("string").str.strip()
    expected_date_formats = {
        "DD/MM/YYYY": "%d/%m/%Y",
        "MM/DD/YYYY": "%m/%d/%Y",
        "YYYY-MM-DD": "%Y-%m-%d",
    }
    if date_format not in expected_date_formats:
        raise ValueError(
            "Formato de fecha no compatible. Usa DD/MM/YYYY, MM/DD/YYYY o YYYY-MM-DD."
        )
    parsed_dates = pd.to_datetime(
        date_values,
        format=expected_date_formats[date_format],
        errors="coerce",
    )
    iso_dates = pd.to_datetime(date_values, format="ISO8601", errors="coerce")
    clean_data["Fecha"] = parsed_dates.fillna(iso_dates)
    invalid_dates = clean_data["Fecha"].isna()
    if invalid_dates.any():
        raise ValueError(
            f"Hay {int(invalid_dates.sum())} fecha(s) inválida(s) en 'Fecha'. "
            "Usa DD/MM/AAAA, MM/DD/AAAA o AAAA-MM-DD."
        )

    for column in NUMERIC_COLUMNS:
        raw_values = clean_data[column]
        numeric_values = pd.to_numeric(raw_values, errors="coerce")
        explicit_non_finite = raw_values.astype("string").str.strip().str.lower().isin(
            {"nan", "+nan", "-nan"}
        )
        invalid_numbers = numeric_values.isna() & raw_values.notna() & ~explicit_non_finite
        if invalid_numbers.any():
            raise ValueError(
                f"Hay {int(invalid_numbers.sum())} valor(es) no numérico(s) "
                f"en '{column}'. Usa números sin símbolos de moneda."
            )
        clean_data[column] = numeric_values

    for column in IDENTIFIER_COLUMNS:
        clean_data[column] = clean_data[column].astype("string").str.strip()
        if clean_data[column].isna().any() or clean_data[column].eq("").any():
            raise ValueError(
                f"Hay celdas vacías en '{column}'. Completa esos datos antes de cargar el CSV."
            )
    duplicate_order_dates = clean_data.duplicated(
        subset=["Fecha", "Pedido"], keep=False
    )
    if duplicate_order_dates.any():
        raise ValueError(
            f"Hay {int(duplicate_order_dates.sum())} registro(s) con la misma "
            "combinación de 'Fecha' y 'Pedido'."
        )
    for column in NUMERIC_COLUMNS:
        non_finite = ~clean_data[column].map(isfinite)
        if non_finite.any():
            raise ValueError(
                f"Hay {int(non_finite.sum())} valor(es) no finito(s) en '{column}'. "
                "Usa números finitos."
            )
    if (clean_data["Unidades"] <= 0).any():
        raise ValueError("Todas las ventas deben tener al menos una unidad.")
    if (clean_data[["Precio_unitario", "Ventas", "Costo"]] < 0).any().any():
        raise ValueError("Los precios, las ventas y los costos no pueden ser negativos.")
    if not clean_data["Descuento"].between(0, 1).all():
        raise ValueError(
            "El descuento debe estar expresado entre 0 y 1. "
            "Por ejemplo, escribe 0.15 para un 15 %."
        )

    return clean_data


def read_sales_csv(content: bytes, date_format: str = "DD/MM/YYYY") -> pd.DataFrame:
    """Lee CSV UTF-8/Windows con delimitador coma, punto y coma o tabulador."""
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text = content.decode("cp1252")
        except UnicodeDecodeError as error:
            raise ValueError(
                "La codificación del CSV no es compatible. Guárdalo como UTF-8."
            ) from error

    try:
        delimiter = csv.Sniffer().sniff(text[:8192], delimiters=",;\t").delimiter
    except csv.Error:
        delimiter = ","

    try:
        data = pd.read_csv(
            StringIO(text),
            sep=delimiter,
            decimal="," if delimiter == ";" else ".",
        )
    except pd.errors.EmptyDataError as error:
        raise ValueError("El archivo CSV está vacío.") from error
    except pd.errors.ParserError as error:
        raise ValueError(
            "No se pudo interpretar el CSV. Revisa que todas las filas tengan "
            "el mismo separador y número de columnas."
        ) from error

    return validate_sales_data(data, date_format)


def filter_sales_data(
    data: pd.DataFrame,
    start_date: date,
    end_date: date,
    selected_regions: Collection[str] | None = None,
    selected_categories: Collection[str] | None = None,
    selected_products: Collection[str] | None = None,
) -> pd.DataFrame:
    """Filtra por intervalo inclusivo y dimensiones opcionales."""
    if start_date > end_date:
        raise ValueError("La fecha final debe ser igual o posterior a la inicial.")

    parsed_dates = pd.to_datetime(data["Fecha"], errors="coerce")
    if parsed_dates.isna().any():
        raise ValueError("La columna 'Fecha' contiene valores inválidos.")
    mask = parsed_dates.dt.date.between(start_date, end_date)
    for column, selected_values in (
        ("Region", selected_regions),
        ("Categoria", selected_categories),
        ("Producto", selected_products),
    ):
        if selected_values is not None:
            mask &= data[column].isin(selected_values)
    return data.loc[mask].copy()


def calculate_kpis(data: pd.DataFrame) -> dict[str, float | int]:
    """Calcula los indicadores principales del conjunto de ventas."""
    total_sales = _finite_sum(data["Ventas"], "Ventas")
    total_profit = _finite_sum(data["Ganancia"], "Ganancia")
    order_count = int(data["Pedido"].nunique())
    return {
        "ventas_totales": total_sales,
        "pedidos": order_count,
        "ticket_promedio": _finite_result(
            total_sales / order_count if order_count else 0.0,
            "el ticket promedio",
        ),
        "margen_porcentaje": _finite_result(
            total_profit / total_sales * 100 if total_sales else 0.0,
            "el margen de ganancia",
        ),
        "ganancia_total": total_profit,
        "descuento_promedio": _finite_result(
            _finite_sum(data["Descuento"], "Descuento") / len(data) * 100
            if not data.empty
            else 0.0,
            "el descuento promedio",
        ),
    }


def calculate_product_profitability(data: pd.DataFrame) -> pd.DataFrame:
    """Resume ventas, ganancia y margen para cada producto."""
    product_totals = data.groupby("Producto", as_index=False).agg(
        Ventas=("Ventas", lambda values: _finite_sum(values, "Ventas")),
        Ganancia=("Ganancia", lambda values: _finite_sum(values, "Ganancia")),
    )
    product_totals["Margen_porcentaje"] = (
        product_totals["Ganancia"]
        .div(product_totals["Ventas"].where(product_totals["Ventas"] != 0))
        .mul(100)
        .fillna(0)
    )
    if not product_totals["Margen_porcentaje"].map(isfinite).all():
        raise ValueError("El margen por producto excede el rango numérico admitido.")
    return product_totals.sort_values(
        ["Margen_porcentaje", "Ganancia"], ascending=[True, True]
    ).reset_index(drop=True)


def calculate_period_metrics(
    data: pd.DataFrame, period_start: date, period_end: date
) -> dict[str, float | int]:
    """Calcula ventas totales, ganancia y promedio diario para un período."""
    days = (period_end - period_start).days + 1
    if days <= 0:
        raise ValueError("La fecha final debe ser igual o posterior a la inicial.")
    if data.empty:
        return {
            "ventas_totales": 0.0,
            "ganancia_total": 0.0,
            "ventas_diarias": 0.0,
            "pedidos": 0,
        }

    sales = _finite_sum(data["Ventas"], "Ventas")
    return {
        "ventas_totales": sales,
        "ganancia_total": _finite_sum(data["Ganancia"], "Ganancia"),
        "ventas_diarias": _finite_result(sales / days, "las ventas diarias"),
        "pedidos": int(data["Pedido"].nunique()),
    }


def build_analysis_summary(
    kpis: dict[str, float | int],
    period_a: dict[str, float | int],
    period_b: dict[str, float | int],
    least_profitable: dict[str, object] | None,
    period_a_label: str,
    period_b_label: str,
    currency_code: str,
    exchange_rate: float,
) -> pd.DataFrame:
    """Crea un resumen descargable con métricas y comparación de períodos."""
    if not isfinite(exchange_rate) or exchange_rate <= 0:
        raise ValueError("La tasa de cambio debe ser un número finito mayor que cero.")

    def format_amount(amount: float) -> str:
        converted_amount = _finite_result(
            amount * exchange_rate, "la conversión de moneda"
        )
        return f"{converted_amount:.2f} {currency_code}"

    sales_change = (
        (float(period_b["ventas_totales"]) - float(period_a["ventas_totales"]))
        / float(period_a["ventas_totales"])
        * 100
        if period_a["ventas_totales"]
        else None
    )
    if sales_change is not None:
        sales_change = _finite_result(sales_change, "la comparación de períodos")
    least_product = str(least_profitable["Producto"]) if least_profitable else "N/D"
    least_margin = (
        f"{float(least_profitable['Margen_porcentaje']):.2f}%"
        if least_profitable
        else "N/D"
    )
    least_profit = (
        format_amount(float(least_profitable["Ganancia"]))
        if least_profitable
        else "N/D"
    )

    rows = [
        ("General", "Moneda de visualización", currency_code),
        (
            "General",
            "Tasa de cambio (unidades por USD)",
            f"{exchange_rate:.6f}",
        ),
        (
            "Período principal",
            "Ventas totales",
            format_amount(float(kpis["ventas_totales"])),
        ),
        ("Período principal", "Pedidos", str(kpis["pedidos"])),
        (
            "Período principal",
            "Ticket promedio",
            format_amount(float(kpis["ticket_promedio"])),
        ),
        (
            "Período principal",
            "Ganancia total",
            format_amount(float(kpis["ganancia_total"])),
        ),
        (
            "Período principal",
            "Margen de ganancia",
            f"{float(kpis['margen_porcentaje']):.2f}%",
        ),
        (
            "Período principal",
            "Descuento promedio",
            f"{float(kpis['descuento_promedio']):.2f}%",
        ),
        ("Rentabilidad", "Producto con menor margen", least_product),
        ("Rentabilidad", "Margen del producto menos rentable", least_margin),
        ("Rentabilidad", "Ganancia del producto menos rentable", least_profit),
        ("Comparación", f"Período A ({period_a_label})", ""),
        (
            "Comparación",
            "Ventas período A",
            format_amount(float(period_a["ventas_totales"])),
        ),
        ("Comparación", f"Período B ({period_b_label})", ""),
        (
            "Comparación",
            "Ventas período B",
            format_amount(float(period_b["ventas_totales"])),
        ),
        (
            "Comparación",
            "Cambio de ventas B vs. A",
            f"{sales_change:+.2f}%" if sales_change is not None else "N/D (A no tiene ventas)",
        ),
        (
            "Comparación",
            "Promedio diario período A",
            format_amount(float(period_a["ventas_diarias"])),
        ),
        (
            "Comparación",
            "Promedio diario período B",
            format_amount(float(period_b["ventas_diarias"])),
        ),
    ]
    return pd.DataFrame(rows, columns=["Sección", "Indicador", "Valor"])
