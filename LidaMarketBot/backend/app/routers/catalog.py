from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.product import Product, Category
from app.models.activity import ViewHistory
from app.models.user import User
from app.routers.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api", tags=["catalog"])


@router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Get all active categories."""
    result = await db.execute(
        select(Category)
        .where(Category.is_active == True)
        .order_by(Category.sort_order, Category.name)
    )
    categories = result.scalars().all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "slug": c.slug,
            "icon": c.icon,
        }
        for c in categories
    ]


@router.get("/products")
async def get_products(
    category: str | None = None,
    sort: str = "newest",
    search: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Get products with filtering and sorting.
    sort: popular, price_asc, price_desc, newest
    """
    query = select(Product).where(
        Product.is_active == True,
        Product.in_stock == True,
    )

    # Filter by category
    if category:
        query = query.join(Category).where(Category.slug == category)

    # Search
    if search:
        query = query.where(Product.name.ilike(f"%{search}%"))

    # Sort
    if sort == "popular":
        query = query.order_by(desc(Product.views_count))
    elif sort == "price_asc":
        query = query.order_by(asc(Product.price))
    elif sort == "price_desc":
        query = query.order_by(desc(Product.price))
    else:  # newest
        query = query.order_by(desc(Product.created_at))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    products = result.scalars().all()

    return {
        "items": [_product_to_dict(p) for p in products],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit if total else 0,
    }


@router.get("/products/popular")
async def get_popular_products(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Get most popular products."""
    result = await db.execute(
        select(Product)
        .where(Product.is_active == True, Product.in_stock == True)
        .order_by(desc(Product.views_count))
        .limit(limit)
    )
    products = result.scalars().all()
    return [_product_to_dict(p) for p in products]


@router.get("/products/new")
async def get_new_products(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Get newest products."""
    result = await db.execute(
        select(Product)
        .where(Product.is_active == True, Product.in_stock == True)
        .order_by(desc(Product.created_at))
        .limit(limit)
    )
    products = result.scalars().all()
    return [_product_to_dict(p) for p in products]


@router.get("/products/{product_id}")
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get single product and track view."""
    result = await db.execute(
        select(Product).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()

    if not product:
        return {"error": "Product not found"}, 404

    # Increment views
    product.views_count += 1

    # Track view history
    view = ViewHistory(user_id=user.id, product_id=product.id)
    db.add(view)
    await db.flush()

    return _product_to_dict(product, detailed=True)


def _product_to_dict(product: Product, detailed: bool = False) -> dict:
    """Convert product to API response dict."""
    data = {
        "id": product.id,
        "name": product.name,
        "price": product.price,
        "old_price": product.old_price,
        "images": product.images,
        "category_id": product.category_id,
        "in_stock": product.in_stock,
        "views_count": product.views_count,
    }

    if detailed:
        data.update({
            "description": product.description,
            "sizes": product.sizes,
            "colors": product.colors,
            "orders_count": product.orders_count,
            "created_at": product.created_at.isoformat() if product.created_at else None,
        })

    return data
