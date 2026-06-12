from fastapi import Depends, HTTPException, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.utils.telegram import validate_init_data, parse_telegram_user
from app.config import settings


async def get_current_user(
    x_init_data: str = Header(None, alias="X-Init-Data"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Authenticate user via Telegram initData header.
    Creates user if not exists.
    """
    if not x_init_data:
        raise HTTPException(status_code=401, detail="Missing X-Init-Data header")

    validated = validate_init_data(x_init_data)
    if not validated:
        raise HTTPException(status_code=401, detail="Invalid init data")

    user_data = parse_telegram_user(validated)
    if not user_data or not user_data.get("telegram_id"):
        raise HTTPException(status_code=401, detail="Invalid user data")

    telegram_id = user_data["telegram_id"]

    # Get or create user
    result = await db.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            telegram_id=telegram_id,
            username=user_data.get("username"),
            first_name=user_data.get("first_name", ""),
            last_name=user_data.get("last_name"),
            photo_url=user_data.get("photo_url"),
            is_admin=telegram_id in settings.admin_ids_list,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
    else:
        # Update profile info
        user.username = user_data.get("username") or user.username
        user.first_name = user_data.get("first_name") or user.first_name
        user.last_name = user_data.get("last_name") or user.last_name
        user.photo_url = user_data.get("photo_url") or user.photo_url
        await db.flush()

    return user


async def get_admin_user(
    user: User = Depends(get_current_user),
) -> User:
    """Require admin access."""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def get_dropshipper_user(
    user: User = Depends(get_current_user),
) -> User:
    """Require approved dropshipper access."""
    if not user.is_dropshipper or not user.dropship_approved:
        raise HTTPException(status_code=403, detail="Dropshipper access required")
    return user
