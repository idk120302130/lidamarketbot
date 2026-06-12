from datetime import datetime
from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    icon: Mapped[str] = mapped_column(String(10), default="📦")  # emoji
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    products = relationship("Product", back_populates="category", lazy="selectin")

    def __repr__(self):
        return f"<Category {self.name}>"


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    price: Mapped[float] = mapped_column(Float, nullable=False)
    old_price: Mapped[float | None] = mapped_column(Float, nullable=True)  # strikethrough price
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False, index=True)

    # Images — stored as JSON array of file paths
    images: Mapped[list] = mapped_column(JSON, default=list)

    # Variants
    sizes: Mapped[list] = mapped_column(JSON, default=lambda: ["S", "M", "L", "XL"])
    colors: Mapped[list] = mapped_column(JSON, default=list)

    # Stock and visibility
    in_stock: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Popularity
    views_count: Mapped[int] = mapped_column(Integer, default=0)
    orders_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    category = relationship("Category", back_populates="products")

    def __repr__(self):
        return f"<Product {self.name} — {self.price}₽>"
