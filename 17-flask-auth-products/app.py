import os
import secrets
from functools import wraps
from pathlib import Path

from dotenv import load_dotenv
from flask import (
    Flask,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db, limiter
from models import Product, User
from repositories import ProductRepository, UserRepository
from validation import parse_product, validate_email

load_dotenv()


def build_database_uri(config):
    database_url = config.get("DATABASE_URL")
    if database_url:
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        return database_url

    mysql_host = config.get("MYSQL_HOST", "127.0.0.1")
    mysql_port = config.get("MYSQL_PORT", "3306")
    mysql_user = config.get("MYSQL_USER", "root")
    mysql_password = config.get("MYSQL_PASSWORD", "")
    mysql_database = config.get("MYSQL_DATABASE", "flask_auth_products")

    if config.get("USE_MYSQL", "").lower() in {"1", "true", "yes"}:
        return (
            f"mysql+pymysql://{mysql_user}:{mysql_password}@"
            f"{mysql_host}:{mysql_port}/{mysql_database}"
        )
    return "sqlite:///products.db"


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.update(
        SECRET_KEY=os.getenv("SECRET_KEY", "development-only-change-me"),
        MYSQL_HOST=os.getenv("MYSQL_HOST", "127.0.0.1"),
        MYSQL_PORT=os.getenv("MYSQL_PORT", "3306"),
        MYSQL_USER=os.getenv("MYSQL_USER", "root"),
        MYSQL_PASSWORD=os.getenv("MYSQL_PASSWORD", ""),
        MYSQL_DATABASE=os.getenv("MYSQL_DATABASE", "flask_auth_products"),
        DATABASE_URL=os.getenv("DATABASE_URL"),
        USE_MYSQL=os.getenv("USE_MYSQL", "false"),
        JSON_SORT_KEYS=False,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true",
        PERMANENT_SESSION_LIFETIME=3600,
    )
    if test_config:
        app.config.update(test_config)

    if not (test_config and "SQLALCHEMY_DATABASE_URI" in test_config):
        app.config["SQLALCHEMY_DATABASE_URI"] = build_database_uri(app.config)
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True}

    db.init_app(app)
    limiter.init_app(app)
    app.jinja_env.globals["csrf_token"] = get_csrf_token

    @app.before_request
    def protect_requests():
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            supplied = request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")
            if not supplied or supplied != session.get("csrf_token"):
                if request.path.startswith("/api/"):
                    return jsonify({"error": "CSRF validation failed"}), 403
                flash("La solicitud expiró o no es válida.", "danger")
                return redirect(url_for("login") if "user_id" not in session else url_for("dashboard"))

    @app.after_request
    def add_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    with app.app_context():
        db.create_all()

    register_routes(app)
    return app


def get_csrf_token():
    token = session.get("csrf_token")
    if not token:
        token = secrets.token_hex(32)
        session["csrf_token"] = token
    return token


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if "user_id" not in session:
            if request.path.startswith("/api/"):
                return jsonify({"error": "Authentication required"}), 401
            flash("Debes iniciar sesión para continuar.", "warning")
            return redirect(url_for("login"))
        user = UserRepository.find_by_id(session["user_id"])
        if user is None:
            session.clear()
            if request.path.startswith("/api/"):
                return jsonify({"error": "Authentication required"}), 401
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    return wrapped


def register_routes(app):
    @app.route("/")
    def index():
        if "user_id" in session:
            return redirect(url_for("dashboard"))
        return redirect(url_for("login"))

    @app.route("/register", methods=["GET", "POST"])
    @limiter.limit("10 per hour")
    def register():
        if "user_id" in session:
            return redirect(url_for("dashboard"))
        if request.method == "POST":
            name = request.form.get("name", "").strip()
            email = request.form.get("email", "").strip().lower()
            password = request.form.get("password", "")
            confirm_password = request.form.get("confirm_password", "")

            if not 2 <= len(name) <= 150:
                flash("El nombre debe tener entre 2 y 150 caracteres.", "danger")
                return redirect(url_for("register"))
            if not validate_email(email):
                flash("Ingresa un correo electrónico válido.", "danger")
                return redirect(url_for("register"))
            if len(password) < 8 or len(password) > 72:
                flash("La contraseña debe tener entre 8 y 72 caracteres.", "danger")
                return redirect(url_for("register"))
            if password != confirm_password:
                flash("Las contraseñas no coinciden.", "danger")
                return redirect(url_for("register"))
            if UserRepository.find_by_email(email):
                flash("Ya existe un usuario con ese correo.", "warning")
                return redirect(url_for("register"))

            user = UserRepository.create(name, email, generate_password_hash(password))
            establish_session(user)
            flash("Registro exitoso. Bienvenido.", "success")
            return redirect(url_for("dashboard"))

        return render_template("register.html")

    @app.route("/login", methods=["GET", "POST"])
    @limiter.limit("20 per hour")
    def login():
        if "user_id" in session:
            return redirect(url_for("dashboard"))
        if request.method == "POST":
            email = request.form.get("email", "").strip().lower()
            password = request.form.get("password", "")
            user = UserRepository.find_by_email(email) if email else None

            if not user or not check_password_hash(user.password_hash, password):
                flash("Credenciales inválidas.", "danger")
                return redirect(url_for("login"))

            establish_session(user)
            flash("Has iniciado sesión correctamente.", "success")
            return redirect(url_for("dashboard"))

        return render_template("login.html")

    @app.route("/logout", methods=["POST"])
    @login_required
    def logout():
        session.clear()
        flash("Sesión cerrada correctamente.", "info")
        return redirect(url_for("login"))

    @app.route("/dashboard", methods=["GET", "POST"])
    @login_required
    def dashboard():
        if request.method == "POST":
            name, description, price, stock, errors = parse_product(
                request.form.get("name"),
                request.form.get("description"),
                request.form.get("price"),
                request.form.get("stock"),
            )
            if errors:
                for error in errors:
                    flash(error, "danger")
                return redirect(url_for("dashboard"))

            product = ProductRepository.create(
                session["user_id"], name, description, price, stock
            )
            flash(f"Producto '{product.name}' agregado con éxito.", "success")
            return redirect(url_for("dashboard"))

        user = UserRepository.find_by_id(session["user_id"])
        products = ProductRepository.list_for_user(session["user_id"])
        return render_template(
            "dashboard.html",
            user=user,
            products=products,
            db_available=not app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite"),
        )

    @app.route("/products/<int:product_id>/edit", methods=["GET", "POST"])
    @login_required
    def edit_product(product_id):
        product = ProductRepository.find_for_user(product_id, session["user_id"])
        if product is None:
            flash("Producto no encontrado.", "warning")
            return redirect(url_for("dashboard"))

        if request.method == "POST":
            name, description, price, stock, errors = parse_product(
                request.form.get("name"),
                request.form.get("description"),
                request.form.get("price"),
                request.form.get("stock"),
            )
            if errors:
                for error in errors:
                    flash(error, "danger")
                return redirect(url_for("edit_product", product_id=product_id))

            ProductRepository.update(product, name, description, price, stock)
            flash("Producto actualizado correctamente.", "success")
            return redirect(url_for("dashboard"))

        return render_template("edit_product.html", product=product)

    @app.route("/products/<int:product_id>/delete", methods=["POST"])
    @login_required
    def delete_product_route(product_id):
        product = ProductRepository.find_for_user(product_id, session["user_id"])
        if product is None:
            flash("No se pudo eliminar el producto.", "danger")
        else:
            ProductRepository.delete(product)
            flash("Producto eliminado correctamente.", "success")
        return redirect(url_for("dashboard"))

    @app.route("/api/health")
    def api_health():
        return jsonify({
            "status": "ok",
            "database": "mysql" if app.config["SQLALCHEMY_DATABASE_URI"].startswith("mysql") else "sqlite",
        })

    @app.route("/api/products", methods=["GET", "POST"])
    @login_required
    def api_products():
        if request.method == "GET":
            products = ProductRepository.list_for_user(session["user_id"])
            return jsonify({"products": [product.to_dict() for product in products]})

        payload = request.get_json(silent=True) or request.form
        name, description, price, stock, errors = parse_product(
            payload.get("name"),
            payload.get("description"),
            payload.get("price"),
            payload.get("stock"),
        )
        if errors:
            return jsonify({"error": "; ".join(errors)}), 400

        product = ProductRepository.create(
            session["user_id"], name, description, price, stock
        )
        return jsonify({"message": "Product created", "product": product.to_dict()}), 201

    @app.route("/api/products/<int:product_id>", methods=["GET", "PUT", "DELETE"])
    @login_required
    def api_product_detail(product_id):
        product = ProductRepository.find_for_user(product_id, session["user_id"])
        if product is None:
            return jsonify({"error": "Product not found"}), 404

        if request.method == "GET":
            return jsonify(product.to_dict())

        if request.method == "PUT":
            payload = request.get_json(silent=True) or request.form
            name, description, price, stock, errors = parse_product(
                payload.get("name", product.name),
                payload.get("description", product.description),
                payload.get("price", product.price),
                payload.get("stock", product.stock),
            )
            if errors:
                return jsonify({"error": "; ".join(errors)}), 400
            updated = ProductRepository.update(product, name, description, price, stock)
            return jsonify({"message": "Product updated", "product": updated.to_dict()})

        ProductRepository.delete(product)
        return jsonify({"message": "Product deleted"})

    @app.errorhandler(429)
    def rate_limit_handler(error):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Too many requests"}), 429
        flash("Demasiados intentos. Espera antes de volver a intentarlo.", "warning")
        return redirect(request.referrer or url_for("login")), 429


def establish_session(user):
    session.clear()
    session.permanent = True
    session["user_id"] = user.id
    session["user_name"] = user.name
    session["csrf_token"] = secrets.token_hex(32)


app = create_app()


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
    )
