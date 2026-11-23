from werkzeug.security import check_password_hash, generate_password_hash

from repositories import UserRepository
from validation import validate_registration


class RegistrationError(ValueError):
    def __init__(self, errors):
        self.errors = errors
        super().__init__("; ".join(errors))


class DuplicateUserError(ValueError):
    pass


def register_user(name, email, password, confirm_password):
    name, email, errors = validate_registration(
        name, email, password, confirm_password
    )
    if errors:
        raise RegistrationError(errors)
    if UserRepository.find_by_email(email):
        raise DuplicateUserError("Ya existe un usuario con ese correo.")

    return UserRepository.create(name, email, generate_password_hash(password))


def authenticate_user(email, password):
    email = str(email or "").strip().lower()
    password = password if isinstance(password, str) and len(password) <= 72 else ""
    user = UserRepository.find_by_email(email) if email else None
    if not user or not check_password_hash(user.password_hash, password):
        return None
    return user
