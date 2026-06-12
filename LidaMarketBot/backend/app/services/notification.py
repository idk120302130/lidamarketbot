import logging
from aiogram import Bot
from app.config import settings

logger = logging.getLogger(__name__)


async def notify_admin_new_order(bot: Bot, order_id: int, user_name: str, total: float):
    """Send notification to admins about new order."""
    text = (
        f"🛒 <b>Новый заказ #{order_id}</b>\n\n"
        f"👤 Клиент: {user_name}\n"
        f"💰 Сумма: {total:.0f}₽\n\n"
        f"Откройте админ-панель для просмотра деталей."
    )
    for admin_id in settings.admin_ids_list:
        try:
            await bot.send_message(admin_id, text, parse_mode="HTML")
        except Exception as e:
            logger.error(f"Failed to notify admin {admin_id}: {e}")


async def notify_admin_new_dropship_request(bot: Bot, user_name: str, telegram_id: int):
    """Send notification to admins about new dropshipper application."""
    text = (
        f"🚚 <b>Новая заявка на дропшиппинг</b>\n\n"
        f"👤 Пользователь: {user_name}\n"
        f"🆔 Telegram ID: {telegram_id}\n\n"
        f"Одобрите заявку через админ-панель."
    )
    for admin_id in settings.admin_ids_list:
        try:
            await bot.send_message(admin_id, text, parse_mode="HTML")
        except Exception as e:
            logger.error(f"Failed to notify admin {admin_id}: {e}")


async def notify_admin_dropship_order(bot: Bot, order_id: int, dropshipper_name: str):
    """Send notification to admins about new dropship order."""
    text = (
        f"📦 <b>Новый заказ дропшиппера #{order_id}</b>\n\n"
        f"🚚 Дропшиппер: {dropshipper_name}\n\n"
        f"Проверьте детали в админ-панели."
    )
    for admin_id in settings.admin_ids_list:
        try:
            await bot.send_message(admin_id, text, parse_mode="HTML")
        except Exception as e:
            logger.error(f"Failed to notify admin {admin_id}: {e}")


async def notify_user_order_status(bot: Bot, telegram_id: int, order_id: int, status: str):
    """Notify user about order status change."""
    status_texts = {
        "confirmed": "✅ подтверждён",
        "paid": "💳 оплата получена",
        "shipped": "🚀 отправлен",
        "delivered": "📦 доставлен",
        "cancelled": "❌ отменён",
    }
    status_text = status_texts.get(status, status)
    text = f"📋 Заказ <b>#{order_id}</b> — {status_text}"
    try:
        await bot.send_message(telegram_id, text, parse_mode="HTML")
    except Exception as e:
        logger.error(f"Failed to notify user {telegram_id}: {e}")
