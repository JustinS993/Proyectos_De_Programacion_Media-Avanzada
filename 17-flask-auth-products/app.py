import os
from functools import wraps

import pymysql
from dotenv import load_dotenv
from flask import Flask, flash, jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "bootstrap-auth-demo-secret")
app.config["JSON_SORT_KEYS"] = False

MYSQL_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
    "port": int(os.getenv("MYSQL_PORT", "3306")),
    "user": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", ""),
    "database": os.getenv("MYSQL_DATABASE", "flask_auth_products"),
}

DB_AVAILABLE = False
USERS_STORE = {}
PRODUCTS_STORE = []
USER_SEQUENCE = 1
PRODUCT_SEQUENCE = 1


def get_connection(database_name=None):
    config = {
        "host": MYSQL_CONFIG["host"],
        "port": MYSQL_CONFIG["port"],
        "user": MYSQL_CONFIG["user"],
        "password": MYSQL_CONFIG["password"],
        "cursorclass": pymysql.cursors.DictCursor,
        "autocommit": True,
    }
    if database_name:
        config["database"] = database_name
    return pymysql.connect(**config)


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
                    name VARCHAR(150) NOT NULL,
                    email VARCHAR(180) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS products (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    name VARCHAR(150) NOT NULL,
                    description TEXT,
                    price DECIMAL(10,2) NOT NULL,
                    stock INT NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
                """
            )
    return True


try:
    initialize_database()
    DB_AVAILABLE = True
except Exception as exc:
    DB_AVAILABLE = False
    print(f"MySQL not available: {exc}")


def user_to_dict(row):
    if row is None:
        return None
    return {"id": row["id"], "name": row["name"], "email": row["email"]}


def product_to_dict(row):
    if row is None:
        return None
    created_at = row.get("created_at")
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "name": row["name"],
        "description": row.get("description", ""),
        "price": float(row["price"]),
        "stock": int(row["stock"]),
        "created_at": created_at.strftime("%Y-%m-%d %H:%M:%S") if hasattr(created_at, "strftime") else created_at,
    }


def get_in_memory_user_by_email(email):
    for user in USERS_STORE.values():
        if user["email"].lower() == email.lower():
            return user
    return None


def get_in_memory_user_by_id(user_id):
    return USERS_STORE.get(user_id)


def get_in_memory_products_for_user(user_id):
    return [product for product in PRODUCTS_STORE if product["user_id"] == user_id]


def create_in_memory_user(name, email, password_hash):
    global USER_SEQUENCE
    user = {
        "id": USER_SEQUENCE,
        "name": name,
        "email": email,
        "password_hash": password_hash,
    }
    USERS_STORE[USER_SEQUENCE] = user
    USER_SEQUENCE += 1
    return user


def create_in_memory_product(user_id, name, description, price, stock):
    global PRODUCT_SEQUENCE
    product = {
        "id": PRODUCT_SEQUENCE,
        "user_id": user_id,
        "name": name,
        "description": description,
        "price": float(price),
        "stock": int(stock),
    }
    PRODUCTS_STORE.append(product)
    PRODUCT_SEQUENCE += 1
    return product


def get_user_by_email(email):
    if not DB_AVAILABLE:
        return get_in_memory_user_by_email(email)

    with get_connection(MYSQL_CONFIG["database"]) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            return cursor.fetchone()


def get_user_by_id(user_id):
    if not DB_AVAILABLE:
        return get_in_memory_user_by_id(user_id)

    with get_connection(MYSQL_CONFIG["database"]) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            return cursor.fetchone()


def create_user(name, email, password_hash):
    if not DB_AVAILABLE:
        return create_in_memory_user(name, email, password_hash)

    with get_connection(MYSQL_CONFIG["database"]) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)",
                (name, email, password_hash),
            )
            user_id = cursor.lastrowid
            return {"id": user_id, "name": name, "email": email, "password_hash": password_hash}


def list_products(user_id):
    if not DB_AVAILABLE:
        return get_in_memory_products_for_user(user_id)

    with get_connection(MYSQL_CONFIG["database"]) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM products WHERE user_id = %s ORDER BY id DESC",
                (user_id,),
            )
            return cursor.fetchall()


def create_product(user_id, name, description, price, stock):
    if not DB_AVAILABLE:
        return create_in_memory_product(user_id, name, description, price, stock)

    with get_connection(MYSQL_CONFIG["database"]) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO products (user_id, name, description, price, stock) VALUES (%s, %s, %s, %s, %s)",
                (user_id, name, description, price, stock),
            )
            product_id = cursor.lastrowid
            return {
                "id": product_id,
                "user_id": user_id,
                "name": name,
                "description": description,
                "price": float(price),
                "stock": int(stock),
            }


def update_product(product_id, user_id, name, description, price, stock):
    if not DB_AVAILABLE:
        for product in PRODUCTS_STORE:
            if product["id"] == product_id and product["user_id"] == user_id:
                product["name"] = name
                product["description"] = description
                product["price"] = float(price)
                product["stock"] = int(stock)
                return product
        return None

    with get_connection(MYSQL_CONFIG["database"]) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE products SET name = %s, description = %s, price = %s, stock = %s WHERE id = %s AND user_id = %s",
                (name, description, price, stock, product_id, user_id),
            )
            if cursor.rowcount == 0:
                return None
            return {
                "id": product_id,
                "user_id": user_id,
                "name": name,
                "description": description,
                "price": float(price),
                "stock": int(stock),
            }


def delete_product(product_id, user_id):
    if not DB_AVAILABLE:
        for index, product in enumerate(PRODUCTS_STORE):
            if product["id"] == product_id and product["user_id"] == user_id:
                PRODUCTS_STORE.pop(index)
                return True
        return False

    with get_connection(MYSQL_CONFIG["database"]) as connection:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM products WHERE id = %s AND user_id = %s", (product_id, user_id))
            return cursor.rowcount > 0


def get_product_by_id(product_id, user_id):
    if not DB_AVAILABLE:
        for product in PRODUCTS_STORE:
            if product["id"] == product_id and product["user_id"] == user_id:
                return product
        return None

    with get_connection(MYSQL_CONFIG["database"]) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM products WHERE id = %s AND user_id = %s", (product_id, user_id))
            return cursor.fetchone()


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if "user_id" not in session:
            flash("Debes iniciar sesión para continuar.", "warning")
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    return wrapped


@app.route("/")
def index():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return redirect(url_for("login"))


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")

        if not all([name, email, password, confirm_password]):
            flash("Todos los campos son obligatorios.", "danger")
            return redirect(url_for("register"))

        if password != confirm_password:
            flash("Las contraseñas no coinciden.", "danger")
            return redirect(url_for("register"))

        if get_user_by_email(email):
            flash("Ya existe un usuario con ese correo.", "warning")
            return redirect(url_for("register"))

        user = create_user(name, email, generate_password_hash(password))
        session["user_id"] = user["id"]
        session["user_name"] = user["name"]
        flash("Registro exitoso. Bienvenido.", "success")
        return redirect(url_for("dashboard"))

    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")

        user = get_user_by_email(email)
        if not user:
            flash("Credenciales inválidas.", "danger")
            return redirect(url_for("login"))

        stored_hash = user["password_hash"]
        if not check_password_hash(stored_hash, password):
            flash("Credenciales inválidas.", "danger")
            return redirect(url_for("login"))

        session["user_id"] = user["id"]
        session["user_name"] = user["name"]
        flash("Has iniciado sesión correctamente.", "success")
        return redirect(url_for("dashboard"))

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    flash("Sesión cerrada correctamente.", "info")
    return redirect(url_for("login"))


@app.route("/dashboard", methods=["GET", "POST"])
@login_required
def dashboard():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        description = request.form.get("description", "").strip()
        price = request.form.get("price", "").strip()
        stock = request.form.get("stock", "").strip()

        if not all([name, price, stock]):
            flash("El nombre, precio y stock son obligatorios.", "danger")
            return redirect(url_for("dashboard"))

        try:
            price_value = float(price)
            stock_value = int(stock)
        except ValueError:
            flash("Precio y stock deben ser números válidos.", "danger")
            return redirect(url_for("dashboard"))

        product = create_product(session["user_id"], name, description, price_value, stock_value)
        flash(f"Producto '{product['name']}' agregado con éxito.", "success")
        return redirect(url_for("dashboard"))

    user = get_user_by_id(session["user_id"])
    products = list_products(session["user_id"])
    return render_template("dashboard.html", user=user, products=products, db_available=DB_AVAILABLE)


@app.route("/products/<int:product_id>/edit", methods=["GET", "POST"])
@login_required
def edit_product(product_id):
    product = get_product_by_id(product_id, session["user_id"])
    if product is None:
        flash("Producto no encontrado.", "warning")
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        description = request.form.get("description", "").strip()
        price = request.form.get("price", "").strip()
        stock = request.form.get("stock", "").strip()

        if not all([name, price, stock]):
            flash("El nombre, precio y stock son obligatorios.", "danger")
            return redirect(url_for("edit_product", product_id=product_id))

        try:
            updated = update_product(product_id, session["user_id"], name, description, float(price), int(stock))
        except ValueError:
            flash("Precio y stock deben ser válidos.", "danger")
            return redirect(url_for("edit_product", product_id=product_id))

        if updated:
            flash("Producto actualizado correctamente.", "success")
        else:
            flash("No se pudo actualizar el producto.", "danger")
        return redirect(url_for("dashboard"))

    return render_template("edit_product.html", product=product)


@app.route("/products/<int:product_id>/delete", methods=["POST"])
@login_required
def delete_product_route(product_id):
    deleted = delete_product(product_id, session["user_id"])
    if deleted:
        flash("Producto eliminado correctamente.", "success")
    else:
        flash("No se pudo eliminar el producto.", "danger")
    return redirect(url_for("dashboard"))


@app.route("/api/health")
def api_health():
    return jsonify({"status": "ok", "db_available": DB_AVAILABLE})


@app.route("/api/products", methods=["GET", "POST"])
@login_required
def api_products():
    if request.method == "GET":
        result = list_products(session["user_id"])
        serialized = []
        for item in result:
            if isinstance(item, dict):
                serialized.append({
                    "id": item["id"],
                    "name": item["name"],
                    "description": item.get("description", ""),
                    "price": float(item["price"]),
                    "stock": int(item["stock"]),
                })
            else:
                serialized.append(product_to_dict(item))
        return jsonify({"products": serialized})

    payload = request.get_json(silent=True) or request.form
    name = (payload.get("name") or "").strip()
    description = (payload.get("description") or "").strip()
    price = payload.get("price")
    stock = payload.get("stock")

    if not name or price is None or stock is None:
        return jsonify({"error": "name, price and stock are required"}), 400

    try:
        price_value = float(price)
        stock_value = int(stock)
    except (TypeError, ValueError):
        return jsonify({"error": "price and stock must be valid numbers"}), 400

    product = create_product(session["user_id"], name, description, price_value, stock_value)
    return jsonify({"message": "Product created", "product": product}), 201


@app.route("/api/products/<int:product_id>", methods=["GET", "PUT", "DELETE"])
@login_required
def api_product_detail(product_id):
    product = get_product_by_id(product_id, session["user_id"])
    if product is None:
        return jsonify({"error": "Product not found"}), 404

    if request.method == "GET":
        if isinstance(product, dict):
            item = {
                "id": product["id"],
                "user_id": product["user_id"],
                "name": product["name"],
                "description": product.get("description", ""),
                "price": float(product["price"]),
                "stock": int(product["stock"]),
            }
        else:
            item = product_to_dict(product)
        return jsonify(item)

    if request.method == "PUT":
        payload = request.get_json(silent=True) or request.form
        name = (payload.get("name") or product["name"]).strip()
        description = (payload.get("description") or product.get("description", "")).strip()
        price = payload.get("price", product["price"])
        stock = payload.get("stock", product["stock"])

        try:
            updated = update_product(product_id, session["user_id"], name, description, float(price), int(stock))
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid values for price or stock"}), 400

        if updated is None:
            return jsonify({"error": "Product not found"}), 404
        return jsonify({"message": "Product updated", "product": updated})

    deleted = delete_product(product_id, session["user_id"])
    if not deleted:
        return jsonify({"error": "Product not found"}), 404
    return jsonify({"message": "Product deleted"})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=True)
