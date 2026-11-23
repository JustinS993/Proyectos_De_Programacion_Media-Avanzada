import re
from decimal import Decimal, InvalidOperation


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validate_email(email):
    return isinstance(email, str) and EMAIL_PATTERN.fullmatch(email) is not None


def validate_registration(name, email, password, confirm_password):
    name = name.strip() if isinstance(name, str) else ""
    email = email.strip().lower() if isinstance(email, str) else ""
    password = password if isinstance(password, str) else ""
    confirm_password = confirm_password if isinstance(confirm_password, str) else ""
    errors = []

    if not 2 <= len(name) <= 150:
        errors.append("El nombre debe tener entre 2 y 150 caracteres.")
    if not validate_email(email) or len(email) > 180:
        errors.append("Ingresa un correo electrónico válido.")
    if not 8 <= len(password) <= 72:
        errors.append("La contraseña debe tener entre 8 y 72 caracteres.")
    if password != confirm_password:
        errors.append("Las contraseñas no coinciden.")
    return name, email, errors


def parse_product(name, description, price, stock):
    errors = []
    name = name.strip() if isinstance(name, str) else ""
    description = description.strip() if isinstance(description, str) else ""

    if not 1 <= len(name) <= 150:
        errors.append("El nombre debe tener entre 1 y 150 caracteres.")
    if len(description) > 1000:
        errors.append("La descripción no puede superar 1000 caracteres.")

    try:
        if price is None or isinstance(price, bool):
            raise InvalidOperation
        price_value = Decimal(str(price).strip())
        if not price_value.is_finite() or price_value < 0 or price_value > Decimal("99999999.99"):
            raise InvalidOperation
        price_value = price_value.quantize(Decimal("0.01"))
    except (AttributeError, InvalidOperation, TypeError, ValueError):
        price_value = None
        errors.append("El precio debe ser un número válido.")

    try:
        if stock is None or isinstance(stock, bool):
            raise ValueError
        stock_text = str(stock).strip()
        if not stock_text or not re.fullmatch(r"\d+", stock_text):
            raise ValueError
        stock_value = int(stock_text)
        if stock_value < 0 or stock_value > 1000000:
            raise ValueError
    except (TypeError, ValueError):
        stock_value = None
        errors.append("El stock debe ser un entero entre 0 y 1000000.")

    return (name, description, price_value, stock_value), errors
