from functools import wraps

from flask import flash, jsonify, redirect, request, session, url_for

from repositories import UserRepository


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user_id = session.get("user_id")
        if user_id is None:
            if request.path.startswith("/api/"):
                return jsonify({"error": "Authentication required"}), 401
            flash("Debes iniciar sesión para continuar.", "warning")
            return redirect(url_for("auth.login"))

        user = UserRepository.find_by_id(user_id)
        if user is None:
            session.clear()
            if request.path.startswith("/api/"):
                return jsonify({"error": "Authentication required"}), 401
            return redirect(url_for("auth.login"))
        return view(*args, **kwargs)

    return wrapped
