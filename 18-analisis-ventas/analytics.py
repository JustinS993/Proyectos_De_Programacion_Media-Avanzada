"""Funciones de generación y validación de datos para el dashboard."""

from __future__ import annotations

import csv
import random
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
    expected_date_format = (
        "%d/%m/%Y" if date_format == "DD/MM/YYYY" else "%m/%d/%Y"
    )
    parsed_dates = pd.to_datetime(
        date_values,
        format=expected_date_format,
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
        clean_data[column] = pd.to_numeric(clean_data[column], errors="coerce")
        invalid_numbers = clean_data[column].isna()
        if invalid_numbers.any():
            raise ValueError(
                f"Hay {int(invalid_numbers.sum())} valor(es) no numérico(s) "
                f"en '{column}'. Usa números sin símbolos de moneda."
            )

    for column in IDENTIFIER_COLUMNS:
        clean_data[column] = clean_data[column].astype("string").str.strip()
        if clean_data[column].isna().any() or clean_data[column].eq("").any():
            raise ValueError(
                f"Hay celdas vacías en '{column}'. Completa esos datos antes de cargar el CSV."
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


def calculate_kpis(data: pd.DataFrame) -> dict[str, float | int]:
    """Calcula los indicadores principales del conjunto de ventas."""
    total_sales = float(data["Ventas"].sum())
    total_profit = float(data["Ganancia"].sum())
    order_count = int(data["Pedido"].nunique())
    return {
        "ventas_totales": total_sales,
        "pedidos": order_count,
        "ticket_promedio": total_sales / order_count if order_count else 0.0,
        "margen_porcentaje": total_profit / total_sales * 100
        if total_sales
        else 0.0,
        "ganancia_total": total_profit,
        "descuento_promedio": float(data["Descuento"].mean() * 100)
        if not data.empty
        else 0.0,
    }


def calculate_product_profitability(data: pd.DataFrame) -> pd.DataFrame:
    """Resume ventas, ganancia y margen para cada producto."""
    product_totals = data.groupby("Producto", as_index=False).agg(
        Ventas=("Ventas", "sum"),
        Ganancia=("Ganancia", "sum"),
    )
    product_totals["Margen_porcentaje"] = (
        product_totals["Ganancia"]
        .div(product_totals["Ventas"].where(product_totals["Ventas"] != 0))
        .mul(100)
        .fillna(0)
    )
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

    sales = float(data["Ventas"].sum())
    return {
        "ventas_totales": sales,
        "ganancia_total": float(data["Ganancia"].sum()),
        "ventas_diarias": sales / days,
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
    sales_change = (
        (float(period_b["ventas_totales"]) - float(period_a["ventas_totales"]))
        / float(period_a["ventas_totales"])
        * 100
        if period_a["ventas_totales"]
        else None
    )
    least_product = str(least_profitable["Producto"]) if least_profitable else "N/D"
    least_margin = (
        f"{float(least_profitable['Margen_porcentaje']):.2f}%"
        if least_profitable
        else "N/D"
    )
    least_profit = (
        f"{float(least_profitable['Ganancia']) * exchange_rate:.2f} {currency_code}"
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
            f"{float(kpis['ventas_totales']) * exchange_rate:.2f} {currency_code}",
        ),
        ("Período principal", "Pedidos", str(kpis["pedidos"])),
        (
            "Período principal",
            "Ticket promedio",
            f"{float(kpis['ticket_promedio']) * exchange_rate:.2f} {currency_code}",
        ),
        (
            "Período principal",
            "Ganancia total",
            f"{float(kpis['ganancia_total']) * exchange_rate:.2f} {currency_code}",
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
            f"{float(period_a['ventas_totales']) * exchange_rate:.2f} {currency_code}",
        ),
        ("Comparación", f"Período B ({period_b_label})", ""),
        (
            "Comparación",
            "Ventas período B",
            f"{float(period_b['ventas_totales']) * exchange_rate:.2f} {currency_code}",
        ),
        (
            "Comparación",
            "Cambio de ventas B vs. A",
            f"{sales_change:+.2f}%" if sales_change is not None else "N/D (A no tiene ventas)",
        ),
        (
            "Comparación",
            "Promedio diario período A",
            f"{float(period_a['ventas_diarias']) * exchange_rate:.2f} {currency_code}",
        ),
        (
            "Comparación",
            "Promedio diario período B",
            f"{float(period_b['ventas_diarias']) * exchange_rate:.2f} {currency_code}",
        ),
    ]
    return pd.DataFrame(rows, columns=["Sección", "Indicador", "Valor"])
