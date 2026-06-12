import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Telegram Bot
    BOT_TOKEN: str = ""
    WEBAPP_URL: str = ""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/lidamarket"

    # Admin
    ADMIN_IDS: str = ""  # Comma-separated telegram IDs

    # Referral System
    REFERRAL_POINTS_PER_INVITE: int = 50
    POINTS_TO_DISCOUNT_RATE: int = 5  # 100 points = 5% discount
    MAX_DISCOUNT_PERCENT: int = 20

    # Server
    PORT: int = 8000
    DEBUG: bool = False

    # File uploads
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    @property
    def admin_ids_list(self) -> List[int]:
        if not self.ADMIN_IDS:
            return []
        return [int(x.strip()) for x in self.ADMIN_IDS.split(",") if x.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
