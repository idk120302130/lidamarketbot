import secrets
from datetime import datetime
from sqlalchemy import (
    BigInteger, String, Integer, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False, index=True)
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_name: Mapped[str] = mapped_column(String(255), default="")
    last_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Referral system
    referral_code: Mapped[str] = mapped_column(
        String(12), unique=True, nullable=False, index=True,
        default=lambda: secrets.token_urlsafe(6)[:8].upper()
    )
    referred_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    points: Mapped[int] = mapped_column(Integer, default=0)

    # Roles
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_dropshipper: Mapped[bool] = mapped_column(Boolean, default=False)
    dropship_approved: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )

    # Relationships
    referred_by = relationship("User", remote_side="User.id", backref="referrals")
    orders = relationship("Order", back_populates="user", lazy="selectin")
    favorites = relationship("Favorite", back_populates="user", lazy="selectin")
    view_history = relationship("ViewHistory", back_populates="user", lazy="selectin")
    dropship_orders = relationship("DropshipOrder", back_populates="dropshipper", lazy="selectin")

    def __repr__(self):
        return f"<User {self.telegram_id} @{self.username}>"
