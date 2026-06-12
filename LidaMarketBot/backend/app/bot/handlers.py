import logging
from aiogram import Router, Bot, F
from aiogram.filters import CommandStart, Command
from aiogram.types import Message, CallbackQuery
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.user import User
from app.services.referral import process_referral
from app.config import settings
from app.bot.keyboards import get_main_keyboard, get_start_inline

logger = logging.getLogger(__name__)
router = Router()


async def get_or_create_user(
    db: AsyncSession, telegram_id: int, first_name: str,
    last_name: str | None, username: str | None,
) -> tuple[User, bool]:
    """Get existing user or create new one. Returns (user, is_new)."""
    result = await db.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    if user:
        # Update profile info
        user.first_name = first_name
        user.last_name = last_name
        user.username = username
        if telegram_id in settings.admin_ids_list:
            user.is_admin = True
        await db.flush()
        return user, False

    # Create new user
    user = User(
        telegram_id=telegram_id,
        first_name=first_name,
        last_name=last_name,
        username=username,
        is_admin=telegram_id in settings.admin_ids_list,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user, True


@router.message(CommandStart())
async def cmd_start(message: Message, bot: Bot):
    """Handle /start command, optionally with referral code."""
    async with async_session() as db:
        user, is_new = await get_or_create_user(
            db,
            telegram_id=message.from_user.id,
            first_name=message.from_user.first_name,
            last_name=message.from_user.last_name,
            username=message.from_user.username,
        )

        # Process referral if new user and start param provided
        start_param = message.text.split(maxsplit=1)
        if is_new and len(start_param) > 1:
            ref_param = start_param[1]
            if ref_param.startswith("ref_"):
                ref_code = ref_param[4:]
                referrer = await process_referral(db, user, ref_code)
                if referrer:
                    await message.answer(
                        f"🎉 Вы пришли по приглашению! "
                        f"Добро пожаловать в LidaMarket!"
                    )
                    # Notify referrer
                    try:
                        await bot.send_message(
                            referrer.telegram_id,
                            f"🎊 По вашей ссылке пришёл новый пользователь!\n"
                            f"💰 Вам начислено {settings.REFERRAL_POINTS_PER_INVITE} баллов!\n"
                            f"Ваш баланс: {referrer.points} баллов",
                        )
                    except Exception:
                        pass

        await db.commit()

        welcome_text = (
            f"👋 Привет, <b>{message.from_user.first_name}</b>!\n\n"
            f"🛍 Добро пожаловать в <b>LidaMarket</b> — магазин стильной одежды "
            f"по самым выгодным ценам!\n\n"
            f"🔥 У нас:\n"
            f"• Одежда из Китая по низким ценам\n"
            f"• Реферальная программа — приглашай друзей, получай скидки\n"
            f"• Дропшиппинг — зарабатывай на перепродаже\n\n"
            f"Нажми кнопку ниже, чтобы открыть каталог! 👇"
        )

        await message.answer(
            welcome_text,
            parse_mode="HTML",
            reply_markup=get_main_keyboard(),
        )
        await message.answer(
            "⬇️ Или используйте быстрые кнопки:",
            reply_markup=get_start_inline(),
        )


@router.message(F.text == "👤 Мой профиль")
async def my_profile(message: Message):
    """Show user profile."""
    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.telegram_id == message.from_user.id)
        )
        user = result.scalar_one_or_none()

        if not user:
            await message.answer("Пожалуйста, используйте /start для регистрации.")
            return

        # Count referrals
        ref_result = await db.execute(
            select(User).where(User.referred_by_id == user.id)
        )
        referrals_count = len(ref_result.scalars().all())

        text = (
            f"👤 <b>Ваш профиль</b>\n\n"
            f"📛 Имя: {user.first_name} {user.last_name or ''}\n"
            f"🆔 ID: {user.telegram_id}\n"
            f"💰 Баллы: <b>{user.points}</b>\n"
            f"👥 Приглашено друзей: <b>{referrals_count}</b>\n"
            f"🔗 Реферальный код: <code>{user.referral_code}</code>\n"
        )

        if user.is_dropshipper:
            text += f"\n🚚 Статус: Дропшиппер ✅"

        await message.answer(text, parse_mode="HTML")


@router.message(F.text == "🔗 Реферальная ссылка")
async def show_referral(message: Message, bot: Bot):
    """Show referral link."""
    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.telegram_id == message.from_user.id)
        )
        user = result.scalar_one_or_none()

        if not user:
            await message.answer("Пожалуйста, используйте /start для регистрации.")
            return

        bot_info = await bot.get_me()
        ref_link = f"https://t.me/{bot_info.username}?start=ref_{user.referral_code}"

        text = (
            f"🔗 <b>Ваша реферальная ссылка:</b>\n\n"
            f"<code>{ref_link}</code>\n\n"
            f"📋 Отправьте эту ссылку друзьям!\n"
            f"💰 За каждого друга вы получите "
            f"<b>{settings.REFERRAL_POINTS_PER_INVITE} баллов</b>\n\n"
            f"💡 Баллы можно обменять на скидку:\n"
            f"• 100 баллов = {settings.POINTS_TO_DISCOUNT_RATE}% скидка\n"
            f"• Максимум: {settings.MAX_DISCOUNT_PERCENT}% скидка"
        )

        await message.answer(text, parse_mode="HTML")


@router.message(F.text == "📦 Мои заказы")
async def my_orders(message: Message):
    """Redirect to Mini App orders page."""
    await message.answer(
        "📦 Для просмотра заказов откройте магазин и перейдите в раздел «Мои заказы».",
        reply_markup=get_main_keyboard(),
    )


@router.message(F.text == "ℹ️ Помощь")
async def help_command(message: Message):
    """Show help."""
    text = (
        "ℹ️ <b>Помощь</b>\n\n"
        "🛍 <b>Магазин</b> — нажмите «Открыть магазин» для просмотра каталога\n"
        "🔗 <b>Рефералы</b> — приглашайте друзей и получайте баллы\n"
        "💰 <b>Баллы</b> — обменивайте на скидки при заказе\n"
        "🚚 <b>Дропшиппинг</b> — откройте магазин → Профиль → Дропшиппинг\n\n"
        "По вопросам: свяжитесь с менеджером через бота"
    )
    await message.answer(text, parse_mode="HTML")


@router.callback_query(F.data == "show_referral")
async def callback_referral(callback: CallbackQuery, bot: Bot):
    """Handle show_referral callback."""
    await callback.answer()
    await show_referral(callback.message, bot)
