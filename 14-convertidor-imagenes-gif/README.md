# 14 — Convertidor de imágenes a GIF

Aplicación web para convertir imágenes locales, WebP animados y enlaces directos o de wiki.gg a GIF. La conversión se realiza en el navegador; los archivos no se envían a un servidor.

## Funcionalidades

- Selección de varias imágenes desde el equipo o arrastrar y soltar.
- Importación de enlaces directos y páginas wiki.gg con `#/media/File:…`.
- Conservación de los fotogramas y el bucle de las imágenes animadas compatibles.
- Descarga individual de cada GIF o descarga por lotes en un archivo ZIP.
- Interfaz adaptable a escritorio y móviles, sin dependencias de terceros.

Los enlaces externos deben permitir solicitudes desde el navegador (CORS). El procesamiento de imágenes grandes o muchas imágenes depende de la memoria disponible en el equipo.

## Estructura

```text
14-convertidor-imagenes-gif/
├── index.html
├── styles.css
├── README.md
└── src/
    ├── app.js
    ├── converter.js
    ├── gif-encoder.js
    └── zip.js
```

## Ejecutar localmente

Abre una terminal en esta carpeta y ejecuta:

```bash
python -m http.server 8000
```

Luego abre <http://localhost:8000> en un navegador moderno. Se recomienda Chrome o Edge para conservar la animación de WebP mediante `ImageDecoder`.
