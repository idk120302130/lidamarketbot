from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.models.product import Product
from app.models.dropshipper import DropshipOrder, DropshipOrderStatus
from app.routers.auth import get_current_user, get_dropshipper_user

router = APIRouter(prefix="/api/dropship", tags=["dropship"])


@router.post("/register")
async def register_dropshipper(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Apply for dropshipper status."""
    if user.is_dropshipper:
        return {"status": "already_registered", "approved": user.dropship_approved}

    user.is_dropshipper = True
    user.dropship_approved = False
    await db.flush()

    return {"status": "registered", "message": "Заявка отправлена. Ожидайте одобрения администратора."}


@router.get("/status")
async def dropship_status(
    user: User = Depends(get_current_user),
):
    """Check dropshipper status."""
    return {
        "is_dropshipper": user.is_dropshipper,
        "approved": user.dropship_approved,
    }


@router.get("/products")
async def get_dropship_products(
    user: User = Depends(get_dropshipper_user),
    db: AsyncSession = Depends(get_db),
):
    """Get products available for dropshipping with download links for photos."""
    result = await db.execute(
        select(Product)
        .where(Product.is_active == True, Product.in_stock == True)
        .order_by(Product.name)
    )
    products = result.scalars().all()

    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "price": p.price,
            "images": p.images,  # Full access to all photos for resale
            "sizes": p.sizes,
            "colors": p.colors,
        }
        for p in products
    ]


class DropshipOrderCreate(BaseModel):
    product_id: int
    client_name: str
    client_phone: str
    client_address: str
    size: str = ""
    color: str = ""
    quantity: int = 1
    comment: str = ""


@router.post("/orders")
async def create_dropship_order(
    data: DropshipOrderCreate,
    user: User = Depends(get_dropshipper_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a dropship order for end customer."""
    # Validate product
    prod_result = await db.execute(
        select(Product).where(Product.id == data.product_id)
    )
    product = prod_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    order = DropshipOrder(
        dropshipper_id=user.id,
        client_name=data.client_name,
        client_phone=data.client_phone,
        client_address=data.client_address,
        product_id=data.product_id,
        size=data.size,
        color=data.color,
        quantity=data.quantity,
        comment=data.comment,
    )
    db.add(order)
    await db.flush()
    await db.refresh(order)

    return {
        "id": order.id,
        "status": order.status.value,
        "created_at": order.created_at.isoformat() if order.created_at else None,
    }


@router.get("/orders")
async def get_dropship_orders(
    user: User = Depends(get_dropshipper_user),
    db: AsyncSession = Depends(get_db),
):
    """Get dropshipper's orders."""
    result = await db.execute(
        select(DropshipOrder)
        .where(DropshipOrder.dropshipper_id == user.id)
        .order_by(DropshipOrder.created_at.desc())
    )
    orders = result.scalars().all()

    orders_list = []
    for order in orders:
        prod_result = await db.execute(
            select(Product).where(Product.id == order.product_id)
        )
        product = prod_result.scalar_one_or_none()

        orders_list.append({
            "id": order.id,
            "client_name": order.client_name,
            "client_phone": order.client_phone,
            "client_address": order.client_address,
            "product_name": product.name if product else "Удалён",
            "product_image": product.images[0] if product and product.images else None,
            "size": order.size,
            "color": order.color,
            "quantity": order.quantity,
            "status": order.status.value,
            "comment": order.comment,
            "created_at": order.created_at.isoformat() if order.created_at else None,
        })

    return orders_list
