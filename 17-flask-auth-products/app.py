import hmac
import os
import secrets
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask, flash, jsonify, redirect, request, session, url_for

from extensions import db, limiter
from routes.api import api_bp
from routes.auth import auth_bp
from routes.web import web_bp

load_dotenv()


def build_database_uri(config):
    database_url = config.get("DATABASE_URL")
    if database_url:
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        if database_url.startswith("postgresql://"):
            database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        return database_url

    if config.get("USE_MYSQL", "").lower() in {"1", "true", "yes"}:
        from sqlalchemy.engine import URL

        return URL.create(
            "mysql+pymysql",
            username=config.get("MYSQL_USER", "root"),
            password=config.get("MYSQL_PASSWORD", ""),
            host=config.get("MYSQL_HOST", "127.0.0.1"),
            port=int(config.get("MYSQL_PORT", "3306")),
            database=config.get("MYSQL_DATABASE", "flask_auth_products"),
        )
    return "sqlite:///products.db"


def create_app(test_config=None):
    load_dotenv()
    app = Flask(__name__)
    configured_secret = os.getenv("SECRET_KEY")
    app_environment = os.getenv("APP_ENV", "development").lower()
    if app_environment == "production" and (
        not configured_secret or configured_secret in {"change-this-secret-key", "replace-this"}
    ):
        raise RuntimeError("SECRET_KEY must be configured in production")

    app.config.update(
        SECRET_KEY=configured_secret or secrets.token_urlsafe(32),
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
        SESSION_COOKIE_SECURE=os.getenv(
            "SESSION_COOKIE_SECURE",
            "true" if app_environment == "production" else "false",
        ).lower() == "true",
        PERMANENT_SESSION_LIFETIME=timedelta(hours=1),
        MAX_CONTENT_LENGTH=1024 * 1024,
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
    app.register_blueprint(auth_bp)
    app.register_blueprint(web_bp)
    app.register_blueprint(api_bp)

    @app.before_request
    def protect_state_changes():
        if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
            return None

        supplied = request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")
        expected = session.get("csrf_token")
        if isinstance(supplied, str) and isinstance(expected, str) and hmac.compare_digest(supplied, expected):
            return None
        if request.path.startswith("/api/"):
            return jsonify({"error": "CSRF validation failed"}), 403
        flash("La solicitud expiró o no es válida.", "danger")
        return redirect(url_for("auth.login") if "user_id" not in session else url_for("web.dashboard"))

    @app.after_request
    def add_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    @app.errorhandler(413)
    def request_too_large(_error):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Request body is too large"}), 413
        flash("El archivo o formulario supera el tamaño permitido.", "danger")
        return redirect(url_for("auth.login")), 413

    @app.errorhandler(429)
    def rate_limit_handler(_error):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Too many requests"}), 429
        flash("Demasiados intentos. Espera antes de volver a intentarlo.", "warning")
        return redirect(url_for("auth.login")), 429

    with app.app_context():
        db.create_all()

    return app


def get_csrf_token():
    token = session.get("csrf_token")
    if not token:
        token = secrets.token_hex(32)
        session["csrf_token"] = token
    return token


if __name__ == "__main__":
    application = create_app()
    application.run(
        host="127.0.0.1",
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
    )
