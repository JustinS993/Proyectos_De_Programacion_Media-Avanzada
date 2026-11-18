import re
from decimal import Decimal, InvalidOperation


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validate_email(email):
    return EMAIL_PATTERN.fullmatch(email) is not None


def parse_product(name, description, price, stock):
    errors = []
    name = str(name or "").strip()
    description = str(description or "").strip()

    if not 1 <= len(name) <= 150:
        errors.append("El nombre debe tener entre 1 y 150 caracteres.")
    if len(description) > 1000:
        errors.append("La descripción no puede superar 1000 caracteres.")

    try:
        price_value = Decimal(str(price).strip())
        if not price_value.is_finite() or price_value < 0 or price_value > Decimal("99999999.99"):
            raise InvalidOperation
        price_value = price_value.quantize(Decimal("0.01"))
    except (AttributeError, InvalidOperation, TypeError, ValueError):
        price_value = None
        errors.append("El precio debe ser un número válido.")

    try:
        stock_value = int(stock)
        if stock_value < 0 or stock_value > 1000000:
            raise ValueError
    except (TypeError, ValueError):
        stock_value = None
        errors.append("El stock debe ser un entero entre 0 y 1000000.")

    return name, description, price_value, stock_value, errors
