# Flask Auth + Products + SQLite/MySQL API

Este proyecto es una aplicación web de gestión de productos con autenticación de usuarios, interfaz moderna con Bootstrap y una API REST en Flask.

## Características

- Registro e inicio de sesión
- Autenticación por sesión
- Dashboard con gestión de productos
- CRUD de productos con SQLite persistente o MySQL opcional
- Protección CSRF y sesiones con rotación
- Validación de usuarios y productos
- Arquitectura con app factory, modelos y repositorios
- API REST con JSON
- Diseño moderno con Bootstrap 5

## Estructura del proyecto

- `app.py` — app factory y rutas
- `models.py` — modelos SQLAlchemy
- `repositories.py` — acceso a datos
- `validation.py` — validaciones
- `extensions.py` — SQLAlchemy y Flask-Limiter
- `templates/` — vistas HTML
- `static/styles.css` — estilos personalizados
- `requirements.txt` — dependencias
- `.env.example` — variables de entorno

## Requisitos

- Python 3.10+
- MySQL local (opcional para la base de datos real)

## Instalación

```bash
cd 17-flask-auth-products
python -m venv .venv
```

Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Linux/macOS:

```bash
source .venv/bin/activate
```

Instalar dependencias:

```bash
pip install -r requirements.txt
```

Configurar variables de entorno:

```bash
copy .env.example .env
```

O en Linux/macOS:

```bash
cp .env.example .env
```

## Ejecutar la aplicación

```bash
python app.py
```

Abrir en el navegador:

```text
http://127.0.0.1:5000
```

## Uso

1. Registra un usuario nuevo.
2. Inicia sesión.
3. Agrega, edita o elimina productos desde el dashboard.
4. Consulta la API REST desde `/api/products`.

## Endpoints REST

### GET /api/health

Devuelve el estado del servidor.

### GET /api/products

Lista los productos del usuario autenticado.

### POST /api/products

Crea un producto con JSON o formulario.

### GET /api/products/<id>

Obtiene un producto específico.

### PUT /api/products/<id>

Actualiza un producto.

### DELETE /api/products/<id>

Elimina un producto.

## Persistencia

Por defecto usa SQLite en `instance/products.db`. Para usar MySQL, configura `USE_MYSQL=true` y las variables `MYSQL_*` del archivo `.env`.
También puedes definir `DATABASE_URL` con una URL SQLAlchemy completa.

## Seguridad

- Las contraseñas se almacenan con hash seguro.
- Los formularios usan CSRF.
- Las sesiones usan cookies HttpOnly, SameSite=Lax y expiración de una hora.
- Las rutas API exigen autenticación por sesión.
- Los intentos de login y registro tienen límites.

## Pruebas

```bash
python -m pytest -v
```
