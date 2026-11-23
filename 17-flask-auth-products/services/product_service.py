from repositories import ProductRepository
from validation import parse_product


class ProductValidationError(ValueError):
    def __init__(self, errors):
        self.errors = errors
        super().__init__("; ".join(errors))


def create_product(user_id, name, description, price, stock):
    values, errors = parse_product(name, description, price, stock)
    if errors:
        raise ProductValidationError(errors)
    return ProductRepository.create(user_id, *values)


def update_product(product, name, description, price, stock):
    values, errors = parse_product(name, description, price, stock)
    if errors:
        raise ProductValidationError(errors)
    return ProductRepository.update(product, *values)
