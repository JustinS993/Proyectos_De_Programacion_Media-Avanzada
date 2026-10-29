# Proyecto simple de bases de datos con MySQL

Este proyecto crea una pequeña base de datos en MySQL para manejar usuarios con operaciones CRUD.

## ¿Qué incluye?

- Crear la base de datos `sistema_usuarios`
- Crear la tabla `usuarios`
- Insertar registros
- Consultar todos los usuarios
- Actualizar datos
- Eliminar registros
- Menú interactivo en consola

## Requisitos

- Python 3.10 o superior
- MySQL Server 9.5 instalado localmente
- Paquete `mysql-connector-python`

## Instalación rápida

```bash
cd 15-base-datos-simple
python -m pip install -r requirements.txt
```

## Cómo ejecutar el proyecto

1. Inicia el servidor MySQL local del proyecto:

```bash
cd 15-base-datos-simple
start_mysql.bat
```

2. En otra terminal, ejecuta la app:

```bash
cd 15-base-datos-simple
python app.py
```

## Configuración utilizada

La aplicación conecta a:

- Host: `127.0.0.1`
- Puerto: `3307`
- Usuario: `root`
- Contraseña: vacía
- Base de datos: `sistema_usuarios`

## Estructura

- `app.py`: lógica principal de la base de datos y menú
- `mysql-custom.ini`: configuración del servidor MySQL usado por este proyecto
- `mysql-data/`: carpeta de datos del servidor local
- `start_mysql.bat`: inicia MySQL para este proyecto
- `requirements.txt`: dependencias de Python

## Funciones principales

- `crear_base_y_tabla()`
- `agregar_usuario()`
- `listar_usuarios()`
- `actualizar_usuario()`
- `eliminar_usuario()`

## Ejemplo de uso

1. Ejecuta el programa.
2. Elige la opción 1 para agregar un usuario.
3. Usa la opción 2 para ver los registros.
4. Actualiza o elimina un registro cuando quieras.

## Nota

Este proyecto usa una instancia local independiente de MySQL en el puerto 3307 para evitar conflictos con otros servicios del sistema.
