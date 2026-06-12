from aiogram.types import (
    InlineKeyboardMarkup, InlineKeyboardButton,
    ReplyKeyboardMarkup, KeyboardButton, WebAppInfo,
)
from app.config import settings


def get_main_keyboard() -> ReplyKeyboardMarkup:
    """Main reply keyboard with Mini App button."""
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(
                text="🛍 Открыть магазин",
                web_app=WebAppInfo(url=settings.WEBAPP_URL),
            )],
            [
                KeyboardButton(text="👤 Мой профиль"),
                KeyboardButton(text="📦 Мои заказы"),
            ],
            [
                KeyboardButton(text="🔗 Реферальная ссылка"),
                KeyboardButton(text="ℹ️ Помощь"),
            ],
        ],
        resize_keyboard=True,
    )
    return keyboard


def get_start_inline() -> InlineKeyboardMarkup:
    """Inline keyboard for /start message."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🛍 Открыть каталог",
            web_app=WebAppInfo(url=settings.WEBAPP_URL),
        )],
        [InlineKeyboardButton(
            text="🔗 Пригласить друга",
            callback_data="show_referral",
        )],
    ])
