# Flask Auth + Products API

Aplicación Flask para administrar productos con autenticación, vistas Bootstrap y una API JSON. Las páginas HTML y API comparten servicios, validación y repositorios.

## Características

- Registro e inicio de sesión
- Autenticación por sesión
- Dashboard con gestión de productos
- CRUD persistente con SQLite por defecto; PostgreSQL y MySQL configurables
- Protección CSRF en formularios y solicitudes API con sesión
- Validación de usuarios y productos
- Arquitectura con app factory, blueprints, servicios, modelos y repositorios
- API REST con JSON
- Diseño moderno con Bootstrap 5

## Estructura del proyecto

- `app.py` — configuración, fábrica Flask y seguridad común
- `models.py` — modelos SQLAlchemy
- `repositories.py` — acceso a datos
- `services/` — lógica y operaciones de negocio
- `routes/` — blueprints HTML y API
- `security.py` — autenticación de sesión
- `validation.py` — validación compartida entre HTML y API
- `extensions.py` — SQLAlchemy y Flask-Limiter
- `templates/` — vistas HTML
- `static/styles.css` — estilos personalizados
- `requirements.txt` — dependencias
- `.env.example` — variables de entorno

## Requisitos

- Python 3.10+
- SQLite se usa por defecto
- PostgreSQL o MySQL opcionales

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

### Autenticación

- `GET /api/csrf-token` — obtiene un token CSRF y crea la sesión necesaria
- `POST /api/auth/register` — registra `{name, email, password, confirm_password}`
- `POST /api/auth/login` — inicia sesión con `{email, password}`
- `POST /api/auth/logout` — cierra la sesión

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

## Persistencia y configuración

Por defecto usa SQLite persistente en `instance/products.db`. Para PostgreSQL, configura `DATABASE_URL`, por ejemplo `postgresql://usuario:clave@localhost:5432/productos`. El proyecto utiliza psycopg 3. MySQL sigue disponible con `USE_MYSQL=true` y las variables `MYSQL_*`.

En producción, configura un `SECRET_KEY` aleatorio y `APP_ENV=production`; las cookies de sesión serán Secure por defecto. No uses `SECRET_KEY` vacío ni compartas el archivo `.env`.

## Seguridad

- Las contraseñas se almacenan con hash seguro.
- Formularios HTML y escrituras API validan CSRF con token de sesión.
- Las sesiones usan cookies HttpOnly, SameSite=Lax y expiración de una hora.
- La API requiere una sesión autenticada para operaciones de productos.
- Los intentos de login y registro tienen límites.

Para consumir la API desde el navegador, primero solicita `GET /api/csrf-token` con credenciales, conserva la cookie de sesión y envía el valor `csrf_token` como `X-CSRF-Token` en solicitudes de escritura. El API y las páginas HTML llaman a los mismos servicios y validadores.

## Pruebas

```bash
python -m pytest -v
```

Las pruebas usan SQLite temporal, por lo que no requieren un servidor de base de datos.
