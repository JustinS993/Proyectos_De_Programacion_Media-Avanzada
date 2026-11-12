import unittest
from datetime import date

import pandas as pd

from analytics import (
    build_analysis_summary,
    calculate_kpis,
    calculate_period_metrics,
    calculate_product_profitability,
    generate_sales_data,
    read_sales_csv,
    validate_sales_data,
)


class SalesAnalyticsTests(unittest.TestCase):
    def test_generated_data_is_reproducible_and_has_expected_size(self) -> None:
        first = generate_sales_data(order_count=25, seed=7)
        second = generate_sales_data(order_count=25, seed=7)

        pd.testing.assert_frame_equal(first, second)
        self.assertEqual(len(first), 25)
        self.assertEqual(first["Pedido"].nunique(), 25)
        self.assertTrue(pd.api.types.is_datetime64_any_dtype(first["Fecha"]))

    def test_generate_sales_data_rejects_non_positive_order_count(self) -> None:
        with self.assertRaises(ValueError):
            generate_sales_data(order_count=0)

    def test_validate_sales_data_converts_dates_and_numeric_values(self) -> None:
        data = generate_sales_data(order_count=2)
        data["Fecha"] = data["Fecha"].astype(str)
        data["Ventas"] = data["Ventas"].astype(str)

        validated = validate_sales_data(data)

        self.assertTrue(pd.api.types.is_datetime64_any_dtype(validated["Fecha"]))
        self.assertTrue(pd.api.types.is_numeric_dtype(validated["Ventas"]))

    def test_validate_sales_data_reports_missing_columns(self) -> None:
        with self.assertRaisesRegex(ValueError, "Faltan columnas requeridas"):
            validate_sales_data(pd.DataFrame({"Pedido": ["PED-0001"]}))

    def test_validate_sales_data_uses_selected_ambiguous_date_format(self) -> None:
        data = generate_sales_data(order_count=1)
        data["Fecha"] = ["01/02/2025"]

        validated = validate_sales_data(data, date_format="MM/DD/YYYY")

        self.assertEqual(validated.loc[0, "Fecha"].date(), date(2025, 1, 2))

    def test_read_sales_csv_accepts_semicolon_and_decimal_comma(self) -> None:
        data = generate_sales_data(order_count=2)
        csv_content = data.to_csv(
            index=False,
            sep=";",
            decimal=",",
            date_format="%d/%m/%Y",
        ).encode("utf-8-sig")

        loaded = read_sales_csv(csv_content)

        self.assertEqual(len(loaded), 2)
        self.assertAlmostEqual(
            loaded.loc[0, "Ventas"],
            data.loc[0, "Ventas"],
        )

    def test_validate_sales_data_reports_invalid_dates(self) -> None:
        data = generate_sales_data(order_count=1)
        data["Fecha"] = ["fecha no válida"]

        with self.assertRaisesRegex(ValueError, "fecha\\(s\\) inválida"):
            validate_sales_data(data)

    def test_validate_sales_data_reports_invalid_numeric_values(self) -> None:
        data = generate_sales_data(order_count=1)
        data["Ventas"] = ["$1,200"]

        with self.assertRaisesRegex(ValueError, "no numérico.*'Ventas'"):
            validate_sales_data(data)

    def test_validate_sales_data_explains_discount_range(self) -> None:
        data = generate_sales_data(order_count=1)
        data["Descuento"] = [15]

        with self.assertRaisesRegex(ValueError, "0.15"):
            validate_sales_data(data)

    def test_kpis_count_orders_margin_and_average_discount(self) -> None:
        data = pd.DataFrame(
            {
                "Pedido": ["PED-1", "PED-1", "PED-2"],
                "Ventas": [100.0, 50.0, 50.0],
                "Ganancia": [20.0, 10.0, 20.0],
                "Descuento": [0.1, 0.2, 0.0],
            }
        )

        kpis = calculate_kpis(data)

        self.assertEqual(kpis["ventas_totales"], 200.0)
        self.assertEqual(kpis["pedidos"], 2)
        self.assertEqual(kpis["ticket_promedio"], 100.0)
        self.assertEqual(kpis["margen_porcentaje"], 25.0)
        self.assertAlmostEqual(kpis["descuento_promedio"], 10.0)

    def test_product_profitability_orders_products_by_margin(self) -> None:
        data = pd.DataFrame(
            {
                "Producto": ["A", "B"],
                "Ventas": [100.0, 200.0],
                "Ganancia": [50.0, 20.0],
            }
        )

        profitability = calculate_product_profitability(data)

        self.assertEqual(profitability.iloc[0]["Producto"], "B")
        self.assertEqual(profitability.iloc[0]["Margen_porcentaje"], 10.0)

    def test_period_metrics_include_days_without_sales(self) -> None:
        data = pd.DataFrame(
            {
                "Fecha": pd.to_datetime(["2025-01-01"]),
                "Pedido": ["PED-1"],
                "Ventas": [300.0],
                "Ganancia": [60.0],
            }
        )

        metrics = calculate_period_metrics(data, date(2025, 1, 1), date(2025, 1, 3))

        self.assertEqual(metrics["ventas_diarias"], 100.0)

    def test_empty_period_metrics_return_zero_without_dividing_by_zero(self) -> None:
        data = pd.DataFrame(
            columns=["Fecha", "Pedido", "Ventas", "Ganancia"]
        )

        metrics = calculate_period_metrics(data, date(2025, 1, 1), date(2025, 1, 7))

        self.assertEqual(metrics["ventas_totales"], 0.0)
        self.assertEqual(metrics["ventas_diarias"], 0.0)
        self.assertEqual(metrics["pedidos"], 0)

    def test_summary_export_contains_requested_metrics_and_comparison(self) -> None:
        summary = build_analysis_summary(
            kpis={
                "ventas_totales": 200.0,
                "pedidos": 2,
                "ticket_promedio": 100.0,
                "margen_porcentaje": 25.0,
                "ganancia_total": 50.0,
                "descuento_promedio": 10.0,
            },
            period_a={
                "ventas_totales": 100.0,
                "ganancia_total": 20.0,
                "ventas_diarias": 50.0,
            },
            period_b={
                "ventas_totales": 150.0,
                "ganancia_total": 30.0,
                "ventas_diarias": 75.0,
            },
            least_profitable={
                "Producto": "Mouse",
                "Ganancia": 5.0,
                "Margen_porcentaje": 10.0,
            },
            period_a_label="01/01/2025 - 02/01/2025",
            period_b_label="03/01/2025 - 04/01/2025",
            currency_code="EUR",
            exchange_rate=0.9,
        )

        self.assertEqual(list(summary.columns), ["Sección", "Indicador", "Valor"])
        self.assertIn("Descuento promedio", summary["Indicador"].tolist())
        self.assertIn("Producto con menor margen", summary["Indicador"].tolist())
        sales_change = summary.loc[
            summary["Indicador"] == "Cambio de ventas B vs. A", "Valor"
        ].iloc[0]
        self.assertEqual(sales_change, "+50.00%")

    def test_summary_marks_comparison_unavailable_when_period_a_has_no_sales(self) -> None:
        metrics = {
            "ventas_totales": 0.0,
            "pedidos": 0,
            "ticket_promedio": 0.0,
            "margen_porcentaje": 0.0,
            "ganancia_total": 0.0,
            "descuento_promedio": 0.0,
        }
        period_a = {
            "ventas_totales": 0.0,
            "ganancia_total": 0.0,
            "ventas_diarias": 0.0,
        }
        period_b = {
            "ventas_totales": 100.0,
            "ganancia_total": 20.0,
            "ventas_diarias": 10.0,
        }

        summary = build_analysis_summary(
            metrics,
            period_a,
            period_b,
            None,
            "A",
            "B",
            "USD",
            1.0,
        )

        sales_change = summary.loc[
            summary["Indicador"] == "Cambio de ventas B vs. A", "Valor"
        ].iloc[0]
        self.assertIn("N/D", sales_change)


if __name__ == "__main__":
    unittest.main()
