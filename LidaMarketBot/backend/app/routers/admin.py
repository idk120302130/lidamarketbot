import os
import uuid
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.models.product import Product, Category
from app.models.order import Order, OrderItem, OrderStatus
from app.models.dropshipper import DropshipOrder, DropshipOrderStatus
from app.routers.auth import get_admin_user
from app.config import settings

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ---- Categories ----

class CategoryCreate(BaseModel):
    name: str
    slug: str
    icon: str = "📦"
    sort_order: int = 0


@router.post("/categories")
async def create_category(
    data: CategoryCreate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new category."""
    cat = Category(
        name=data.name,
        slug=data.slug,
        icon=data.icon,
        sort_order=data.sort_order,
    )
    db.add(cat)
    await db.flush()
    await db.refresh(cat)
    return {"id": cat.id, "name": cat.name, "slug": cat.slug}


@router.put("/categories/{cat_id}")
async def update_category(
    cat_id: int,
    data: CategoryCreate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update category."""
    result = await db.execute(select(Category).where(Category.id == cat_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    cat.name = data.name
    cat.slug = data.slug
    cat.icon = data.icon
    cat.sort_order = data.sort_order
    await db.flush()

    return {"id": cat.id, "name": cat.name}


@router.delete("/categories/{cat_id}")
async def delete_category(
    cat_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate category."""
    result = await db.execute(select(Category).where(Category.id == cat_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    cat.is_active = False
    return {"status": "deleted"}


# ---- Products ----

@router.post("/products")
async def create_product(
    name: str = Form(...),
    description: str = Form(""),
    price: float = Form(...),
    old_price: float = Form(None),
    category_id: int = Form(...),
    sizes: str = Form("S,M,L,XL"),
    colors: str = Form(""),
    images: List[UploadFile] = File(default=[]),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create product with image upload."""
    # Save images
    image_paths = []
    upload_dir = os.path.join(settings.UPLOAD_DIR, "products")
    os.makedirs(upload_dir, exist_ok=True)

    for img in images:
        if img.filename:
            ext = os.path.splitext(img.filename)[1] or ".jpg"
            filename = f"{uuid.uuid4().hex}{ext}"
            filepath = os.path.join(upload_dir, filename)

            async with aiofiles.open(filepath, "wb") as f:
                content = await img.read()
                await f.write(content)

            image_paths.append(f"/uploads/products/{filename}")

    sizes_list = [s.strip() for s in sizes.split(",") if s.strip()]
    colors_list = [c.strip() for c in colors.split(",") if c.strip()]

    product = Product(
        name=name,
        description=description,
        price=price,
        old_price=old_price if old_price and old_price > 0 else None,
        category_id=category_id,
        images=image_paths,
        sizes=sizes_list,
        colors=colors_list,
    )
    db.add(product)
    await db.flush()
    await db.refresh(product)

    return {"id": product.id, "name": product.name}


@router.put("/products/{product_id}")
async def update_product(
    product_id: int,
    name: str = Form(None),
    description: str = Form(None),
    price: float = Form(None),
    old_price: float = Form(None),
    category_id: int = Form(None),
    sizes: str = Form(None),
    colors: str = Form(None),
    in_stock: bool = Form(None),
    images: List[UploadFile] = File(default=[]),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update product."""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if name is not None:
        product.name = name
    if description is not None:
        product.description = description
    if price is not None:
        product.price = price
    if old_price is not None:
        product.old_price = old_price if old_price > 0 else None
    if category_id is not None:
        product.category_id = category_id
    if sizes is not None:
        product.sizes = [s.strip() for s in sizes.split(",") if s.strip()]
    if colors is not None:
        product.colors = [c.strip() for c in colors.split(",") if c.strip()]
    if in_stock is not None:
        product.in_stock = in_stock

    # Upload new images if provided
    if images and images[0].filename:
        upload_dir = os.path.join(settings.UPLOAD_DIR, "products")
        os.makedirs(upload_dir, exist_ok=True)

        new_paths = list(product.images or [])
        for img in images:
            if img.filename:
                ext = os.path.splitext(img.filename)[1] or ".jpg"
                filename = f"{uuid.uuid4().hex}{ext}"
                filepath = os.path.join(upload_dir, filename)

                async with aiofiles.open(filepath, "wb") as f:
                    content = await img.read()
                    await f.write(content)

                new_paths.append(f"/uploads/products/{filename}")

        product.images = new_paths

    await db.flush()
    return {"id": product.id, "name": product.name}


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete product."""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = False
    return {"status": "deleted"}


# ---- Orders Management ----

@router.get("/orders")
async def get_all_orders(
    status: str = None,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all orders for admin."""
    query = select(Order).order_by(desc(Order.created_at))
    if status:
        query = query.where(Order.status == OrderStatus(status))

    result = await db.execute(query)
    orders = result.scalars().all()

    orders_list = []
    for order in orders:
        # Get user
        user_result = await db.execute(select(User).where(User.id == order.user_id))
        user = user_result.scalar_one_or_none()

        # Get items count
        items_result = await db.execute(
            select(func.count()).select_from(OrderItem).where(OrderItem.order_id == order.id)
        )
        items_count = items_result.scalar() or 0

        orders_list.append({
            "id": order.id,
            "user_name": f"{user.first_name} {user.last_name or ''}" if user else "Unknown",
            "user_telegram_id": user.telegram_id if user else None,
            "status": order.status.value,
            "total_price": order.total_price,
            "final_price": order.final_price,
            "items_count": items_count,
            "client_name": order.client_name,
            "phone": order.phone,
            "delivery_address": order.delivery_address,
            "created_at": order.created_at.isoformat() if order.created_at else None,
        })

    return orders_list


@router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    status: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update order status."""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        order.status = OrderStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")

    await db.flush()
    return {"id": order.id, "status": order.status.value}


# ---- Users Management ----

@router.get("/users")
async def get_users(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all users for admin."""
    result = await db.execute(
        select(User).order_by(desc(User.created_at))
    )
    users = result.scalars().all()

    return [
        {
            "id": u.id,
            "telegram_id": u.telegram_id,
            "username": u.username,
            "first_name": u.first_name,
            "points": u.points,
            "is_dropshipper": u.is_dropshipper,
            "dropship_approved": u.dropship_approved,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


# ---- Dropship Management ----

@router.get("/dropship/pending")
async def get_pending_dropshippers(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get pending dropshipper applications."""
    result = await db.execute(
        select(User).where(
            User.is_dropshipper == True,
            User.dropship_approved == False,
        )
    )
    users = result.scalars().all()

    return [
        {
            "id": u.id,
            "telegram_id": u.telegram_id,
            "username": u.username,
            "first_name": u.first_name,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.post("/dropship/approve/{user_id}")
async def approve_dropshipper(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve dropshipper application."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.dropship_approved = True
    await db.flush()

    return {"status": "approved", "user_id": user.id}


@router.get("/dropship/orders")
async def get_all_dropship_orders(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all dropship orders for admin."""
    result = await db.execute(
        select(DropshipOrder).order_by(desc(DropshipOrder.created_at))
    )
    orders = result.scalars().all()

    orders_list = []
    for order in orders:
        user_result = await db.execute(select(User).where(User.id == order.dropshipper_id))
        user = user_result.scalar_one_or_none()

        prod_result = await db.execute(select(Product).where(Product.id == order.product_id))
        product = prod_result.scalar_one_or_none()

        orders_list.append({
            "id": order.id,
            "dropshipper_name": f"{user.first_name}" if user else "Unknown",
            "client_name": order.client_name,
            "client_phone": order.client_phone,
            "client_address": order.client_address,
            "product_name": product.name if product else "Удалён",
            "size": order.size,
            "color": order.color,
            "quantity": order.quantity,
            "status": order.status.value,
            "created_at": order.created_at.isoformat() if order.created_at else None,
        })

    return orders_list


@router.put("/dropship/orders/{order_id}/status")
async def update_dropship_order_status(
    order_id: int,
    status: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update dropship order status."""
    result = await db.execute(select(DropshipOrder).where(DropshipOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        order.status = DropshipOrderStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")

    await db.flush()
    return {"id": order.id, "status": order.status.value}


# ---- Stats ----

@router.get("/stats")
async def get_stats(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get dashboard statistics."""
    users_count = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    products_count = (await db.execute(
        select(func.count()).select_from(Product).where(Product.is_active == True)
    )).scalar() or 0
    orders_count = (await db.execute(select(func.count()).select_from(Order))).scalar() or 0
    new_orders = (await db.execute(
        select(func.count()).select_from(Order).where(Order.status == OrderStatus.NEW)
    )).scalar() or 0

    revenue_result = await db.execute(
        select(func.sum(Order.final_price)).where(
            Order.status.in_([OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED])
        )
    )
    revenue = revenue_result.scalar() or 0

    dropshippers = (await db.execute(
        select(func.count()).select_from(User).where(User.is_dropshipper == True)
    )).scalar() or 0

    return {
        "users_count": users_count,
        "products_count": products_count,
        "orders_count": orders_count,
        "new_orders": new_orders,
        "revenue": revenue,
        "dropshippers_count": dropshippers,
    }
