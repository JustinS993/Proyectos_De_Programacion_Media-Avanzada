# 18 — Análisis de ventas

Dashboard interactivo para explorar ventas de una tienda, practicar análisis con pandas y comunicar resultados con gráficos de Plotly. Incluye datos de ejemplo sintéticos y permite cargar datos propios, comparar períodos y exportar resultados.

Los datos de ejemplo y los importes de los CSV cargados se interpretan como dólares estadounidenses (USD). La conversión a otra moneda es manual y solo para visualización y exportación; el dashboard no consulta tasas en internet.

## Funcionalidades

- Indicadores de ventas, pedidos, ticket promedio, margen, ganancia y descuento promedio.
- Filtros por período, región, categoría y producto.
- Comparación entre dos períodos seleccionables, con promedio diario para facilitar la comparación entre rangos de distinta duración.
- Identificación del producto con menor margen y tabla de rentabilidad por producto.
- El descuento promedio es el promedio simple de los descuentos registrados en las filas filtradas.
- Selección de moneda (USD, EUR, COP o MXN) y de formato de fechas.
- Tendencia mensual y comparaciones por categoría, región y producto.
- Carga de CSV separados por coma, punto y coma o tabulador; acepta UTF-8 y Windows-1252.
- Descarga de los registros filtrados y de un resumen CSV con los indicadores y la comparación.
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

El archivo debe incluir estas columnas (el orden no importa; los importes se interpretan como USD):

`Fecha`, `Pedido`, `Region`, `Categoria`, `Producto`, `Unidades`, `Precio_unitario`, `Descuento`, `Ventas`, `Costo`, `Ganancia`

En la barra lateral, selecciona el formato de fecha que corresponde a tu archivo para evitar ambigüedades entre día y mes. `Descuento` debe expresarse entre `0` y `1` (por ejemplo, `0.15` equivale a 15 %). Los valores numéricos no deben llevar símbolos de moneda. En archivos separados por punto y coma puedes usar coma decimal.

Al seleccionar EUR, COP o MXN, ingresa manualmente cuántas unidades de esa moneda equivalen a 1 USD. La tasa se aplica a importes mostrados y descargados, no modifica el archivo original.

### Errores comunes al cargar un CSV

- **Faltan columnas requeridas:** conserva los nombres exactos de la lista de arriba; puedes usar el CSV filtrado descargado como plantilla.
- **Fecha inválida o interpretada al revés:** cambia el formato en la barra lateral; por ejemplo, `04/05/2025` puede significar 4 de mayo o 5 de abril.
- **Número inválido:** quita el símbolo `$` y los separadores de miles; usa `1250.50` con coma como separador de columnas o `1250,50` con punto y coma.
- **Descuento fuera de rango:** utiliza una proporción, como `0.15`, en vez de escribir `15`.
- **Filas con distinto número de columnas o caracteres dañados:** guarda/exporta el archivo de nuevo como CSV UTF-8 con un separador uniforme.

## Pruebas

Con las dependencias instaladas, ejecuta:

```powershell
python -m unittest discover -v
```
