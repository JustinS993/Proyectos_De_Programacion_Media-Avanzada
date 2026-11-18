import pytest

from app import create_app
from extensions import db


@pytest.fixture
def app():
    app = create_app({
        "TESTING": True,
        "SECRET_KEY": "test-secret",
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
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


def test_registration_and_product_crud(client):
    response = register(client)
    assert response.status_code == 200
    assert b"Registro exitoso" in response.data

    with client.session_transaction() as session:
        token = session["csrf_token"]

    response = client.post("/dashboard", data={
        "csrf_token": token,
        "name": "Laptop",
        "description": "Equipo portátil",
        "price": "899.99",
        "stock": "5",
    }, follow_redirects=True)
    assert b"Laptop" in response.data

    response = client.get("/api/products")
    assert response.status_code == 200
    product = response.get_json()["products"][0]
    assert product["name"] == "Laptop"
    assert product["price"] == 899.99


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
