from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.routers.auth import get_current_user
from app.services.referral import calculate_discount
from app.config import settings

router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("/profile")
async def get_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user profile."""
    # Count referrals
    ref_result = await db.execute(
        select(func.count()).select_from(User).where(User.referred_by_id == user.id)
    )
    referrals_count = ref_result.scalar() or 0

    return {
        "id": user.id,
        "telegram_id": user.telegram_id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "photo_url": user.photo_url,
        "points": user.points,
        "referral_code": user.referral_code,
        "referrals_count": referrals_count,
        "is_admin": user.is_admin,
        "is_dropshipper": user.is_dropshipper,
        "dropship_approved": user.dropship_approved,
        "max_discount": calculate_discount(user.points),
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.get("/referral")
async def get_referral_info(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get referral info with stats."""
    # Count referrals
    ref_result = await db.execute(
        select(func.count()).select_from(User).where(User.referred_by_id == user.id)
    )
    referrals_count = ref_result.scalar() or 0

    # Get recent referrals
    recent_result = await db.execute(
        select(User)
        .where(User.referred_by_id == user.id)
        .order_by(User.created_at.desc())
        .limit(10)
    )
    recent_referrals = recent_result.scalars().all()

    return {
        "referral_code": user.referral_code,
        "points": user.points,
        "referrals_count": referrals_count,
        "max_discount": calculate_discount(user.points),
        "points_per_invite": settings.REFERRAL_POINTS_PER_INVITE,
        "discount_rate": settings.POINTS_TO_DISCOUNT_RATE,
        "max_discount_percent": settings.MAX_DISCOUNT_PERCENT,
        "recent_referrals": [
            {
                "first_name": r.first_name,
                "joined_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in recent_referrals
        ],
    }
