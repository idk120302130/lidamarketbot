from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.models.activity import Favorite
from app.models.product import Product
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/favorites", tags=["favorites"])


@router.get("")
async def get_favorites(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's favorite products."""
    result = await db.execute(
        select(Favorite)
        .where(Favorite.user_id == user.id)
        .order_by(Favorite.created_at.desc())
    )
    favorites = result.scalars().all()

    items = []
    for fav in favorites:
        prod_result = await db.execute(
            select(Product).where(Product.id == fav.product_id)
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
                "added_at": fav.created_at.isoformat() if fav.created_at else None,
            })

    return items


@router.post("/{product_id}")
async def add_favorite(
    product_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add product to favorites."""
    # Check product exists
    prod = await db.execute(
        select(Product).where(Product.id == product_id)
    )
    if not prod.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Product not found")

    # Check if already favorited
    existing = await db.execute(
        select(Favorite).where(
            Favorite.user_id == user.id,
            Favorite.product_id == product_id,
        )
    )
    if existing.scalar_one_or_none():
        return {"status": "already_exists"}

    fav = Favorite(user_id=user.id, product_id=product_id)
    db.add(fav)
    await db.flush()

    return {"status": "added"}


@router.delete("/{product_id}")
async def remove_favorite(
    product_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove product from favorites."""
    await db.execute(
        delete(Favorite).where(
            Favorite.user_id == user.id,
            Favorite.product_id == product_id,
        )
    )
    return {"status": "removed"}


@router.get("/check/{product_id}")
async def check_favorite(
    product_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if product is in favorites."""
    result = await db.execute(
        select(Favorite).where(
            Favorite.user_id == user.id,
            Favorite.product_id == product_id,
        )
    )
    is_fav = result.scalar_one_or_none() is not None
    return {"is_favorite": is_fav}
