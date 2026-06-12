import enum
from datetime import datetime
from sqlalchemy import (
    String, Integer, DateTime, ForeignKey, Text, Enum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DropshipOrderStatus(str, enum.Enum):
    NEW = "new"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class DropshipOrder(Base):
    __tablename__ = "dropship_orders"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    dropshipper_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )

    # Client info (end customer of the dropshipper)
    client_name: Mapped[str] = mapped_column(String(255), nullable=False)
    client_phone: Mapped[str] = mapped_column(String(50), nullable=False)
    client_address: Mapped[str] = mapped_column(Text, nullable=False)

    # Product info
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    size: Mapped[str] = mapped_column(String(20), default="")
    color: Mapped[str] = mapped_column(String(50), default="")
    quantity: Mapped[int] = mapped_column(Integer, default=1)

    status: Mapped[DropshipOrderStatus] = mapped_column(
        Enum(DropshipOrderStatus), default=DropshipOrderStatus.NEW
    )
    comment: Mapped[str] = mapped_column(Text, default="")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    dropshipper = relationship("User", back_populates="dropship_orders")
    product = relationship("Product")

    def __repr__(self):
        return f"<DropshipOrder #{self.id} by user {self.dropshipper_id}>"
