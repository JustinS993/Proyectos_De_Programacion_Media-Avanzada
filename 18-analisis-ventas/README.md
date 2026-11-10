# 18 — Análisis de ventas

Dashboard interactivo para explorar ventas de una tienda, practicar análisis con pandas y comunicar resultados con gráficos de Plotly. Incluye datos de ejemplo sintéticos y permite cargar y descargar archivos CSV.

Los importes de los datos de ejemplo se muestran en dólares estadounidenses (USD).

## Funcionalidades

- Indicadores de ventas, pedidos, ticket promedio, margen y ganancia.
- Filtros por período, región, categoría y producto.
- Tendencia mensual y comparaciones por categoría, región y producto.
- Carga de datos propios y descarga de los registros filtrados.
- Datos de muestra reproducibles; no requiere una base de datos ni conexión a internet para generarlos.

## Requisitos

- Python 3.10 o superior
- pip

## Instalación y ejecución en Windows

Desde esta carpeta, ejecuta:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
streamlit run app.py
```

Streamlit abrirá el dashboard en el navegador, normalmente en `http://localhost:8501`.

## CSV para datos propios

El archivo debe incluir estas columnas (el orden no importa):

`Fecha`, `Pedido`, `Region`, `Categoria`, `Producto`, `Unidades`, `Precio_unitario`, `Descuento`, `Ventas`, `Costo`, `Ganancia`

Las fechas deben poder interpretarse como fechas y `Descuento` debe expresarse entre `0` y `1` (por ejemplo, `0.15` equivale a 15 %). Para obtener una plantilla, descarga el CSV desde el dashboard y úsalo como base.

## Pruebas

Con las dependencias instaladas, ejecuta:

```powershell
python -m unittest discover -v
```
