import secrets

from flask import Blueprint, current_app, jsonify, request, session
from sqlalchemy.exc import IntegrityError

from extensions import db, limiter
from repositories import ProductRepository
from security import login_required
from services.auth_service import (
    DuplicateUserError,
    RegistrationError,
    authenticate_user,
    register_user,
)
from services.product_service import ProductValidationError, create_product, update_product

api_bp = Blueprint("api", __name__, url_prefix="/api")


def json_payload():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return None
    return payload


def establish_session(user):
    session.clear()
    session.permanent = True
    session["user_id"] = user.id
    session["user_name"] = user.name
    session["csrf_token"] = secrets.token_hex(32)


@api_bp.get("/csrf-token")
def csrf_token():
    token = session.get("csrf_token")
    if not token:
        token = secrets.token_hex(32)
        session["csrf_token"] = token
    return jsonify({"csrf_token": token})


@api_bp.post("/auth/register")
@limiter.limit("10 per hour")
def register():
    payload = json_payload()
    if payload is None:
        return jsonify({"error": "A JSON object is required"}), 400
    try:
        user = register_user(
            payload.get("name"),
            payload.get("email"),
            payload.get("password"),
            payload.get("confirm_password"),
        )
    except RegistrationError as error:
        return jsonify({"error": "Invalid registration data", "details": error.errors}), 400
    except DuplicateUserError as error:
        return jsonify({"error": str(error)}), 409
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Ya existe un usuario con ese correo."}), 409

    establish_session(user)
    return jsonify({"user": user.to_dict()}), 201


@api_bp.post("/auth/login")
@limiter.limit("20 per hour")
def login():
    payload = json_payload()
    if payload is None:
        return jsonify({"error": "A JSON object is required"}), 400
    user = authenticate_user(payload.get("email"), payload.get("password"))
    if user is None:
        return jsonify({"error": "Credenciales inválidas."}), 401
    establish_session(user)
    return jsonify({"user": user.to_dict()})


@api_bp.post("/auth/logout")
def logout():
    session.clear()
    return jsonify({"message": "Sesión cerrada correctamente."})


@api_bp.get("/health")
def health():
    database_uri = str(current_app.config["SQLALCHEMY_DATABASE_URI"])
    database = "sqlite" if database_uri.startswith("sqlite") else "postgresql" if database_uri.startswith("postgresql") else "mysql"
    return jsonify({"status": "ok", "database": database})


@api_bp.route("/products", methods=["GET", "POST"])
@login_required
def products():
    user_id = session["user_id"]
    if request.method == "GET":
        items = ProductRepository.list_for_user(user_id)
        return jsonify({"products": [item.to_dict() for item in items]})

    payload = json_payload()
    if payload is None:
        return jsonify({"error": "A JSON object is required"}), 400
    try:
        product = create_product(
            user_id,
            payload.get("name"),
            payload.get("description"),
            payload.get("price"),
            payload.get("stock"),
        )
    except ProductValidationError as error:
        return jsonify({"error": "; ".join(error.errors), "details": error.errors}), 400
    return jsonify({"message": "Product created", "product": product.to_dict()}), 201


@api_bp.route("/products/<int:product_id>", methods=["GET", "PUT", "DELETE"])
@login_required
def product_detail(product_id):
    product = ProductRepository.find_for_user(product_id, session["user_id"])
    if product is None:
        return jsonify({"error": "Product not found"}), 404

    if request.method == "GET":
        return jsonify(product.to_dict())
    if request.method == "DELETE":
        ProductRepository.delete(product)
        return jsonify({"message": "Product deleted"})

    payload = json_payload()
    if payload is None:
        return jsonify({"error": "A JSON object is required"}), 400
    try:
        updated = update_product(
            product,
            payload.get("name", product.name),
            payload.get("description", product.description),
            payload.get("price", product.price),
            payload.get("stock", product.stock),
        )
    except ProductValidationError as error:
        return jsonify({"error": "; ".join(error.errors), "details": error.errors}), 400
    return jsonify({"message": "Product updated", "product": updated.to_dict()})
