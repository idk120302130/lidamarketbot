from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.config import settings


async def process_referral(
    db: AsyncSession,
    new_user: User,
    referral_code: str,
) -> User | None:
    """
    Process a referral: link new_user to the referrer and award points.
    Returns the referrer User if successful, None otherwise.
    """
    if not referral_code:
        return None

    # Find referrer by code
    result = await db.execute(
        select(User).where(User.referral_code == referral_code)
    )
    referrer = result.scalar_one_or_none()

    if not referrer:
        return None

    # Don't allow self-referral
    if referrer.telegram_id == new_user.telegram_id:
        return None

    # Don't allow if already referred
    if new_user.referred_by_id is not None:
        return None

    # Link and award points
    new_user.referred_by_id = referrer.id
    referrer.points += settings.REFERRAL_POINTS_PER_INVITE

    await db.flush()
    return referrer


def calculate_discount(points: int) -> int:
    """
    Calculate discount percentage from points.
    100 points = POINTS_TO_DISCOUNT_RATE% discount
    Capped at MAX_DISCOUNT_PERCENT%.
    """
    if points <= 0:
        return 0

    discount = (points // 100) * settings.POINTS_TO_DISCOUNT_RATE
    return min(discount, settings.MAX_DISCOUNT_PERCENT)


def points_needed_for_discount(target_percent: int) -> int:
    """Calculate how many points are needed for a given discount percentage."""
    if settings.POINTS_TO_DISCOUNT_RATE <= 0:
        return 0
    return (target_percent // settings.POINTS_TO_DISCOUNT_RATE) * 100
