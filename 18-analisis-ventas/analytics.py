"""Funciones de generación y validación de datos para el dashboard."""

from __future__ import annotations

import random
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


def validate_sales_data(data: pd.DataFrame) -> pd.DataFrame:
    """Valida las columnas y valores del CSV y normaliza sus tipos."""
    missing_columns = [column for column in SALES_COLUMNS if column not in data.columns]
    if missing_columns:
        raise ValueError(
            "Faltan columnas requeridas: " + ", ".join(missing_columns)
        )
    if data.empty:
        raise ValueError("El archivo CSV no contiene registros.")

    clean_data = data.loc[:, list(SALES_COLUMNS)].copy()
    clean_data["Fecha"] = pd.to_datetime(clean_data["Fecha"], errors="coerce")

    numeric_columns = (
        "Unidades",
        "Precio_unitario",
        "Descuento",
        "Ventas",
        "Costo",
        "Ganancia",
    )
    for column in numeric_columns:
        clean_data[column] = pd.to_numeric(clean_data[column], errors="coerce")

    if clean_data.isna().any().any():
        raise ValueError(
            "Hay celdas vacías o valores inválidos. Revisa las fechas y columnas numéricas."
        )
    if (clean_data["Unidades"] <= 0).any():
        raise ValueError("Todas las ventas deben tener al menos una unidad.")
    if (clean_data[["Precio_unitario", "Ventas", "Costo"]] < 0).any().any():
        raise ValueError("Los precios, las ventas y los costos no pueden ser negativos.")
    if not clean_data["Descuento"].between(0, 1).all():
        raise ValueError("El descuento debe estar expresado entre 0 y 1.")

    return clean_data


def calculate_kpis(data: pd.DataFrame) -> dict[str, float | int]:
    """Calcula los indicadores principales del conjunto de ventas."""
    total_sales = float(data["Ventas"].sum())
    total_profit = float(data["Ganancia"].sum())
    return {
        "ventas_totales": total_sales,
        "pedidos": int(data["Pedido"].nunique()),
        "ticket_promedio": total_sales / data["Pedido"].nunique()
        if data["Pedido"].nunique()
        else 0.0,
        "margen_porcentaje": total_profit / total_sales * 100
        if total_sales
        else 0.0,
        "ganancia_total": total_profit,
    }
