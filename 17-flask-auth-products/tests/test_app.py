import pytest

from app import build_database_uri, create_app
from extensions import db


@pytest.fixture
def app(tmp_path):
    app = create_app({
        "TESTING": True,
        "SECRET_KEY": "test-secret",
        "SQLALCHEMY_DATABASE_URI": f"sqlite:///{tmp_path / 'test.db'}",
        "RATELIMIT_ENABLED": False,
    })
    with app.app_context():
        db.create_all()
    yield app
    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def get_csrf(client):
    client.get("/login")
    with client.session_transaction() as session:
        return session["csrf_token"]


def register(client, email="persona@example.com"):
    token = get_csrf(client)
    return client.post("/register", data={
        "csrf_token": token,
        "name": "Persona",
        "email": email,
        "password": "clave-segura",
        "confirm_password": "clave-segura",
    }, follow_redirects=True)


def register_product(client, name="Laptop"):
    with client.session_transaction() as session:
        token = session["csrf_token"]
    return client.post("/dashboard", data={
        "csrf_token": token,
        "name": name,
        "description": "Equipo portátil",
        "price": "899.99",
        "stock": "5",
    }, follow_redirects=True)


def test_registration_and_product_crud(client):
    response = register(client)
    assert response.status_code == 200
    assert b"Registro exitoso" in response.data

    response = register_product(client)
    assert b"Laptop" in response.data

    response = client.get("/api/products")
    assert response.status_code == 200
    product = response.get_json()["products"][0]
    assert product["name"] == "Laptop"
    assert product["price"] == 899.99

    edit_page = client.get(f"/products/{product['id']}/edit")
    assert edit_page.status_code == 200
    with client.session_transaction() as session:
        token = session["csrf_token"]
    response = client.post(f"/products/{product['id']}/edit", data={
        "csrf_token": token,
        "name": "Laptop actualizada",
        "description": "Equipo actualizado",
        "price": "799.00",
        "stock": "3",
    }, follow_redirects=True)
    assert b"Producto actualizado correctamente" in response.data

    updated = client.get(f"/api/products/{product['id']}")
    assert updated.get_json()["name"] == "Laptop actualizada"
    with client.session_transaction() as session:
        token = session["csrf_token"]
    response = client.post(
        f"/products/{product['id']}/delete",
        data={"csrf_token": token},
        follow_redirects=True,
    )
    assert b"Producto eliminado correctamente" in response.data
    assert client.get("/api/products").get_json()["products"] == []


def test_password_must_be_at_least_eight_characters(client):
    token = get_csrf(client)
    response = client.post("/register", data={
        "csrf_token": token,
        "name": "Persona",
        "email": "corta@example.com",
        "password": "123",
        "confirm_password": "123",
    }, follow_redirects=True)
    assert b"La contrase" in response.data


def test_html_and_api_reject_missing_csrf_tokens(client):
    response = client.post("/register", data={
        "name": "Persona",
        "email": "persona@example.com",
        "password": "clave-segura",
        "confirm_password": "clave-segura",
    })
    assert response.status_code == 302
    assert b"csrf_token" not in response.data

    response = client.post("/api/auth/register", json={
        "name": "Persona",
        "email": "persona@example.com",
        "password": "clave-segura",
        "confirm_password": "clave-segura",
    })
    assert response.status_code == 403
    assert response.get_json()["error"] == "CSRF validation failed"


def test_product_api_requires_authenticated_session(client):
    response = client.get("/api/products")
    assert response.status_code == 401
    assert response.get_json()["error"] == "Authentication required"


def test_api_uses_shared_validation_and_requires_json_object(client):
    csrf_response = client.get("/api/csrf-token")
    token = csrf_response.get_json()["csrf_token"]
    headers = {"X-CSRF-Token": token}

    response = client.post("/api/auth/register", json={
        "name": "Persona",
        "email": "persona@example.com",
        "password": "clave-segura",
        "confirm_password": "clave-segura",
    }, headers=headers)
    assert response.status_code == 201

    token = client.get("/api/csrf-token").get_json()["csrf_token"]
    headers["X-CSRF-Token"] = token
    html_response = client.post("/dashboard", data={
        "csrf_token": token,
        "name": "Laptop",
        "description": "Equipo",
        "price": "no-es-precio",
        "stock": "2",
    }, follow_redirects=True)
    assert "El precio debe ser un número válido.".encode() in html_response.data

    response = client.post("/api/products", json={
        "name": "Laptop",
        "description": "Equipo",
        "price": "no-es-precio",
        "stock": "2",
    }, headers=headers)
    assert response.status_code == 400
    assert "El precio debe ser un número válido." in response.get_json()["details"]

    response = client.post("/api/products", json=["not", "an", "object"], headers=headers)
    assert response.status_code == 400
    assert response.get_json()["error"] == "A JSON object is required"


def test_postgresql_database_urls_select_psycopg_driver():
    assert build_database_uri({
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/products"
    }) == "postgresql+psycopg://user:pass@localhost:5432/products"


def test_production_requires_configured_session_secret(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("SECRET_KEY", raising=False)
    with pytest.raises(RuntimeError, match="SECRET_KEY must be configured"):
        create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})


def test_products_are_persisted_and_isolated_between_users(app):
    first_client = app.test_client()
    register(first_client, "first@example.com")
    register_product(first_client, "Privado")

    second_app = create_app({
        "TESTING": True,
        "SECRET_KEY": "test-secret",
        "SQLALCHEMY_DATABASE_URI": app.config["SQLALCHEMY_DATABASE_URI"],
        "RATELIMIT_ENABLED": False,
    })
    second_client = second_app.test_client()
    register(second_client, "second@example.com")

    assert second_client.get("/api/products").get_json()["products"] == []

    with second_client.session_transaction() as session:
        csrf = session["csrf_token"]
    product = first_client.get("/api/products").get_json()["products"][0]
    delete_response = second_client.delete(
        f"/api/products/{product['id']}",
        headers={"X-CSRF-Token": csrf},
    )
    assert delete_response.status_code == 404

    with second_app.app_context():
        db.session.remove()
        db.engine.dispose()


def test_sqlite_data_survives_app_recreation(tmp_path):
    database_uri = f"sqlite:///{tmp_path / 'persistent.db'}"
    first_app = create_app({
        "TESTING": True,
        "SECRET_KEY": "test-secret",
        "SQLALCHEMY_DATABASE_URI": database_uri,
        "RATELIMIT_ENABLED": False,
    })
    first_client = first_app.test_client()
    register(first_client, "persistent@example.com")
    register_product(first_client, "Persistente")

    with first_app.app_context():
        db.session.remove()
        db.engine.dispose()

    second_app = create_app({
        "TESTING": True,
        "SECRET_KEY": "test-secret",
        "SQLALCHEMY_DATABASE_URI": database_uri,
        "RATELIMIT_ENABLED": False,
    })
    second_client = second_app.test_client()
    csrf = get_csrf(second_client)
    response = second_client.post("/login", data={
        "csrf_token": csrf,
        "email": "persistent@example.com",
        "password": "clave-segura",
    }, follow_redirects=True)
    assert b"Persistente" in response.data

    with second_app.app_context():
        db.session.remove()
        db.engine.dispose()
