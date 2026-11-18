from sqlalchemy import func

from extensions import db
from models import Product, User


class UserRepository:
    @staticmethod
    def find_by_email(email):
        return db.session.scalar(
            db.select(User).where(func.lower(User.email) == email.lower())
        )

    @staticmethod
    def find_by_id(user_id):
        return db.session.get(User, user_id)

    @staticmethod
    def create(name, email, password_hash):
        user = User(name=name, email=email, password_hash=password_hash)
        db.session.add(user)
        db.session.commit()
        return user


class ProductRepository:
    @staticmethod
    def list_for_user(user_id):
        return db.session.scalars(
            db.select(Product)
            .where(Product.user_id == user_id)
            .order_by(Product.created_at.desc())
        ).all()

    @staticmethod
    def find_for_user(product_id, user_id):
        return db.session.scalar(
            db.select(Product).where(
                Product.id == product_id,
                Product.user_id == user_id,
            )
        )

    @staticmethod
    def create(user_id, name, description, price, stock):
        product = Product(
            user_id=user_id,
            name=name,
            description=description,
            price=price,
            stock=stock,
        )
        db.session.add(product)
        db.session.commit()
        return product

    @staticmethod
    def update(product, name, description, price, stock):
        product.name = name
        product.description = description
        product.price = price
        product.stock = stock
        db.session.commit()
        return product

    @staticmethod
    def delete(product):
        db.session.delete(product)
        db.session.commit()
