from fastapi import APIRouter, Depends
from sqlalchemy import select, delete, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.models.activity import ViewHistory
from app.models.product import Product
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("")
async def get_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's view history (last 50 items, deduplicated)."""
    result = await db.execute(
        select(ViewHistory)
        .where(ViewHistory.user_id == user.id)
        .order_by(desc(ViewHistory.viewed_at))
        .limit(100)
    )
    history = result.scalars().all()

    # Deduplicate — keep only latest view of each product
    seen = set()
    items = []
    for entry in history:
        if entry.product_id in seen:
            continue
        seen.add(entry.product_id)

        prod_result = await db.execute(
            select(Product).where(Product.id == entry.product_id)
        )
        product = prod_result.scalar_one_or_none()
        if product:
            items.append({
                "id": product.id,
                "name": product.name,
                "price": product.price,
                "old_price": product.old_price,
                "images": product.images,
                "in_stock": product.in_stock,
                "viewed_at": entry.viewed_at.isoformat() if entry.viewed_at else None,
            })

        if len(items) >= 50:
            break

    return items


@router.delete("")
async def clear_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear user's view history."""
    await db.execute(
        delete(ViewHistory).where(ViewHistory.user_id == user.id)
    )
    return {"status": "cleared"}
