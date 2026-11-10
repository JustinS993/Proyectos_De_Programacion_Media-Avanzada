import unittest

import pandas as pd

from analytics import calculate_kpis, generate_sales_data, validate_sales_data


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

    def test_kpis_count_distinct_orders_and_calculate_margin(self) -> None:
        data = pd.DataFrame(
            {
                "Pedido": ["PED-1", "PED-1", "PED-2"],
                "Ventas": [100.0, 50.0, 50.0],
                "Ganancia": [20.0, 10.0, 20.0],
            }
        )

        kpis = calculate_kpis(data)

        self.assertEqual(kpis["ventas_totales"], 200.0)
        self.assertEqual(kpis["pedidos"], 2)
        self.assertEqual(kpis["ticket_promedio"], 100.0)
        self.assertEqual(kpis["margen_porcentaje"], 25.0)


if __name__ == "__main__":
    unittest.main()
