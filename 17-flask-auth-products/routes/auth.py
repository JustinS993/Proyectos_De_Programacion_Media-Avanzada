import secrets

from flask import Blueprint, flash, redirect, render_template, request, session, url_for
from sqlalchemy.exc import IntegrityError

from extensions import db, limiter
from services.auth_service import (
    DuplicateUserError,
    RegistrationError,
    authenticate_user,
    register_user,
)

auth_bp = Blueprint("auth", __name__)


def establish_session(user):
    session.clear()
    session.permanent = True
    session["user_id"] = user.id
    session["user_name"] = user.name
    session["csrf_token"] = secrets.token_hex(32)


@auth_bp.route("/")
def index():
    if "user_id" in session:
        return redirect(url_for("web.dashboard"))
    return redirect(url_for("auth.login"))


@auth_bp.route("/register", methods=["GET", "POST"])
@limiter.limit("10 per hour")
def register():
    if request.method == "GET":
        if "user_id" in session:
            return redirect(url_for("web.dashboard"))
        return render_template("register.html")

    data = request.form
    try:
        user = register_user(
            data.get("name"),
            data.get("email"),
            data.get("password"),
            data.get("confirm_password"),
        )
    except RegistrationError as error:
        for message in error.errors:
            flash(message, "danger")
        return redirect(url_for("auth.register"))
    except DuplicateUserError as error:
        flash(str(error), "warning")
        return redirect(url_for("auth.register"))
    except IntegrityError:
        db.session.rollback()
        flash("Ya existe un usuario con ese correo.", "warning")
        return redirect(url_for("auth.register"))

    establish_session(user)
    flash("Registro exitoso. Bienvenido.", "success")
    return redirect(url_for("web.dashboard"))


@auth_bp.route("/login", methods=["GET", "POST"])
@limiter.limit("20 per hour")
def login():
    if request.method == "GET":
        if "user_id" in session:
            return redirect(url_for("web.dashboard"))
        return render_template("login.html")

    data = request.form
    user = authenticate_user(data.get("email"), data.get("password"))
    if user is None:
        flash("Credenciales inválidas.", "danger")
        return redirect(url_for("auth.login"))

    establish_session(user)
    flash("Has iniciado sesión correctamente.", "success")
    return redirect(url_for("web.dashboard"))


@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    flash("Sesión cerrada correctamente.", "info")
    return redirect(url_for("auth.login"))
