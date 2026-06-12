from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.routers.auth import get_current_user
from app.services.referral import calculate_discount
from typing import List, Optional

router = APIRouter(prefix="/api/orders", tags=["orders"])


class OrderItemCreate(BaseModel):
    product_id: int
    size: str = ""
    color: str = ""
    quantity: int = 1


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    client_name: str
    phone: str
    delivery_address: str
    comment: str = ""
    use_points: int = 0  # How many points to use for discount


@router.post("")
async def create_order(
    data: OrderCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create new order from cart."""
    if not data.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Calculate total and validate products
    total_price = 0
    order_items = []

    for item_data in data.items:
        result = await db.execute(
            select(Product).where(Product.id == item_data.product_id)
        )
        product = result.scalar_one_or_none()

        if not product:
            raise HTTPException(
                status_code=400,
                detail=f"Product {item_data.product_id} not found"
            )
        if not product.in_stock:
            raise HTTPException(
                status_code=400,
                detail=f"Product '{product.name}' is out of stock"
            )

        item_total = product.price * item_data.quantity
        total_price += item_total

        order_items.append(OrderItem(
            product_id=product.id,
            size=item_data.size,
            color=item_data.color,
            quantity=item_data.quantity,
            price=product.price,
        ))

        # Increment order count
        product.orders_count += 1

    # Calculate discount from points
    discount_percent = 0
    points_used = 0

    if data.use_points > 0 and user.points >= data.use_points:
        max_discount = calculate_discount(data.use_points)
        discount_percent = max_discount
        points_used = data.use_points
        user.points -= points_used

    final_price = total_price * (1 - discount_percent / 100)

    # Create order
    order = Order(
        user_id=user.id,
        status=OrderStatus.NEW,
        total_price=total_price,
        discount_percent=discount_percent,
        points_used=points_used,
        final_price=final_price,
        client_name=data.client_name,
        phone=data.phone,
        delivery_address=data.delivery_address,
        comment=data.comment,
    )
    db.add(order)
    await db.flush()

    # Add items
    for item in order_items:
        item.order_id = order.id
        db.add(item)

    await db.flush()
    await db.refresh(order)

    return {
        "id": order.id,
        "status": order.status.value,
        "total_price": order.total_price,
        "discount_percent": order.discount_percent,
        "final_price": order.final_price,
        "created_at": order.created_at.isoformat() if order.created_at else None,
    }


@router.get("")
async def get_orders(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's orders."""
    result = await db.execute(
        select(Order)
        .where(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()

    orders_list = []
    for order in orders:
        # Load items
        items_result = await db.execute(
            select(OrderItem).where(OrderItem.order_id == order.id)
        )
        items = items_result.scalars().all()

        orders_list.append({
            "id": order.id,
            "status": order.status.value,
            "total_price": order.total_price,
            "discount_percent": order.discount_percent,
            "final_price": order.final_price,
            "items_count": len(items),
            "created_at": order.created_at.isoformat() if order.created_at else None,
        })

    return orders_list


@router.get("/{order_id}")
async def get_order_detail(
    order_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get order details."""
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.user_id == user.id)
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Load items with products
    items_result = await db.execute(
        select(OrderItem).where(OrderItem.order_id == order.id)
    )
    items = items_result.scalars().all()

    items_list = []
    for item in items:
        prod_result = await db.execute(
            select(Product).where(Product.id == item.product_id)
        )
        product = prod_result.scalar_one_or_none()

        items_list.append({
            "product_id": item.product_id,
            "product_name": product.name if product else "Удалён",
            "product_image": product.images[0] if product and product.images else None,
            "size": item.size,
            "color": item.color,
            "quantity": item.quantity,
            "price": item.price,
        })

    return {
        "id": order.id,
        "status": order.status.value,
        "total_price": order.total_price,
        "discount_percent": order.discount_percent,
        "points_used": order.points_used,
        "final_price": order.final_price,
        "client_name": order.client_name,
        "phone": order.phone,
        "delivery_address": order.delivery_address,
        "comment": order.comment,
        "items": items_list,
        "created_at": order.created_at.isoformat() if order.created_at else None,
    }
