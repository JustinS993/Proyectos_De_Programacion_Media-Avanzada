import os

import pymysql
from dotenv import load_dotenv
from flask import Flask, flash, redirect, render_template, request, url_for

load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "class-project-secret")

MYSQL_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
    "port": int(os.getenv("MYSQL_PORT", "3306")),
    "user": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", ""),
    "database": os.getenv("MYSQL_DATABASE", "flask_users_db"),
}

DB_AVAILABLE = False


def get_connection(database_name=None):
    connection_config = {
        "host": MYSQL_CONFIG["host"],
        "port": MYSQL_CONFIG["port"],
        "user": MYSQL_CONFIG["user"],
        "password": MYSQL_CONFIG["password"],
        "cursorclass": pymysql.cursors.DictCursor,
        "autocommit": True,
    }
    if database_name:
        connection_config["database"] = database_name
    return pymysql.connect(**connection_config)


def initialize_database():
    root_connection = pymysql.connect(
        host=MYSQL_CONFIG["host"],
        port=MYSQL_CONFIG["port"],
        user=MYSQL_CONFIG["user"],
        password=MYSQL_CONFIG["password"],
        autocommit=True,
    )
    try:
        with root_connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{MYSQL_CONFIG['database']}`")
    finally:
        root_connection.close()

    with get_connection(MYSQL_CONFIG["database"]) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    email VARCHAR(150) NOT NULL UNIQUE,
                    age INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
    return True


def read_users():
    with get_connection(MYSQL_CONFIG["database"]) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM users ORDER BY id DESC")
            return cursor.fetchall()


def get_user_by_id(user_id):
    with get_connection(MYSQL_CONFIG["database"]) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            return cursor.fetchone()


def create_user(name, email, age):
    with get_connection(MYSQL_CONFIG["database"]) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO users (name, email, age) VALUES (%s, %s, %s)",
                (name, email, age),
            )


def update_user(user_id, name, email, age):
    with get_connection(MYSQL_CONFIG["database"]) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE users SET name = %s, email = %s, age = %s WHERE id = %s",
                (name, email, age, user_id),
            )
            return cursor.rowcount > 0


def delete_user(user_id):
    with get_connection(MYSQL_CONFIG["database"]) as connection:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
            return cursor.rowcount > 0


try:
    initialize_database()
    DB_AVAILABLE = True
except Exception as exc:  # pragma: no cover - intentionally handles missing MySQL
    DB_AVAILABLE = False
    print(f"MySQL is not available yet: {exc}")


@app.route("/")
def index():
    return redirect(url_for("users"))


@app.route("/users", methods=["GET", "POST"])
def users():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip()
        age_raw = request.form.get("age", "").strip()

        if not name or not email or not age_raw:
            flash("Name, email and age are required.", "error")
            return redirect(url_for("users"))

        try:
            age = int(age_raw)
        except ValueError:
            flash("Age must be a valid whole number.", "error")
            return redirect(url_for("users"))

        if not DB_AVAILABLE:
            flash("MySQL is not reachable right now. Start the database and try again.", "warning")
            return redirect(url_for("users"))

        try:
            create_user(name, email, age)
            flash("User added successfully.", "success")
        except Exception as exc:  # pragma: no cover - app-level error handling
            flash(f"Could not save user: {exc}", "error")
        return redirect(url_for("users"))

    user_list = []
    if DB_AVAILABLE:
        try:
            user_list = read_users()
        except Exception as exc:  # pragma: no cover - app-level error handling
            flash(f"Unable to read users: {exc}", "error")
            user_list = []

    return render_template(
        "users.html",
        users=user_list,
        db_available=DB_AVAILABLE,
    )


@app.route("/users/<int:user_id>/edit", methods=["GET", "POST"])
def edit_user(user_id):
    if request.method == "POST":
        if not DB_AVAILABLE:
            flash("MySQL is not reachable right now. Start the database and try again.", "warning")
            return redirect(url_for("users"))

        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip()
        age_raw = request.form.get("age", "").strip()

        if not name or not email or not age_raw:
            flash("Name, email and age are required.", "error")
            return redirect(url_for("edit_user", user_id=user_id))

        try:
            age = int(age_raw)
        except ValueError:
            flash("Age must be a valid whole number.", "error")
            return redirect(url_for("edit_user", user_id=user_id))

        try:
            updated = update_user(user_id, name, email, age)
            if updated:
                flash("User updated successfully.", "success")
            else:
                flash("User not found.", "error")
        except Exception as exc:  # pragma: no cover - app-level error handling
            flash(f"Could not update user: {exc}", "error")
        return redirect(url_for("users"))

    user = None
    if DB_AVAILABLE:
        try:
            user = get_user_by_id(user_id)
        except Exception as exc:  # pragma: no cover - app-level error handling
            flash(f"Could not load user: {exc}", "error")
    return render_template("edit_user.html", user=user, db_available=DB_AVAILABLE)


@app.route("/users/<int:user_id>/delete", methods=["POST"])
def delete_user_route(user_id):
    if not DB_AVAILABLE:
        flash("MySQL is not reachable right now. Start the database and try again.", "warning")
        return redirect(url_for("users"))

    try:
        deleted = delete_user(user_id)
        if deleted:
            flash("User deleted successfully.", "success")
        else:
            flash("User not found.", "error")
    except Exception as exc:  # pragma: no cover - app-level error handling
        flash(f"Could not delete user: {exc}", "error")
    return redirect(url_for("users"))


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=int(os.getenv("PORT", "5000")),
        debug=True,
    )
