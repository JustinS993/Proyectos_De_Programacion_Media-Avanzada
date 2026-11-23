from flask import Blueprint, current_app, flash, redirect, render_template, request, session, url_for

from repositories import ProductRepository, UserRepository
from security import login_required
from services.product_service import ProductValidationError, create_product, update_product

web_bp = Blueprint("web", __name__)


@web_bp.route("/dashboard", methods=["GET", "POST"])
@login_required
def dashboard():
    user_id = session["user_id"]
    if request.method == "POST":
        try:
            product = create_product(
                user_id,
                request.form.get("name"),
                request.form.get("description"),
                request.form.get("price"),
                request.form.get("stock"),
            )
        except ProductValidationError as error:
            for message in error.errors:
                flash(message, "danger")
            return redirect(url_for("web.dashboard"))

        flash(f"Producto '{product.name}' agregado con éxito.", "success")
        return redirect(url_for("web.dashboard"))

    user = UserRepository.find_by_id(user_id)
    products = ProductRepository.list_for_user(user_id)
    database_uri = current_app.config["SQLALCHEMY_DATABASE_URI"]
    return render_template(
        "dashboard.html",
        user=user,
        products=products,
        db_available=not str(database_uri).startswith("sqlite"),
    )


@web_bp.route("/products/<int:product_id>/edit", methods=["GET", "POST"])
@login_required
def edit_product(product_id):
    product = ProductRepository.find_for_user(product_id, session["user_id"])
    if product is None:
        flash("Producto no encontrado.", "warning")
        return redirect(url_for("web.dashboard"))

    if request.method == "POST":
        try:
            update_product(
                product,
                request.form.get("name"),
                request.form.get("description"),
                request.form.get("price"),
                request.form.get("stock"),
            )
        except ProductValidationError as error:
            for message in error.errors:
                flash(message, "danger")
            return redirect(url_for("web.edit_product", product_id=product_id))

        flash("Producto actualizado correctamente.", "success")
        return redirect(url_for("web.dashboard"))

    return render_template("edit_product.html", product=product)


@web_bp.route("/products/<int:product_id>/delete", methods=["POST"])
@login_required
def delete_product(product_id):
    product = ProductRepository.find_for_user(product_id, session["user_id"])
    if product is None:
        flash("No se pudo eliminar el producto.", "danger")
    else:
        ProductRepository.delete(product)
        flash("Producto eliminado correctamente.", "success")
    return redirect(url_for("web.dashboard"))
