import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties

from app.config import settings
from app.database import init_db
from app.bot.handlers import router as bot_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Bot setup
bot = Bot(
    token=settings.BOT_TOKEN,
    default=DefaultBotProperties(parse_mode=ParseMode.HTML),
)
dp = Dispatcher()
dp.include_router(bot_router)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """App lifespan — start bot polling and init DB."""
    logger.info("🚀 Starting LidaMarket...")

    # Init database tables
    await init_db()
    logger.info("✅ Database initialized")

    # Create upload directories
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "products"), exist_ok=True)

    # Start bot polling in background
    polling_task = None
    if settings.BOT_TOKEN and settings.BOT_TOKEN != "your_bot_token_here":
        import asyncio
        polling_task = asyncio.create_task(dp.start_polling(bot))
        logger.info("🤖 Bot polling started")
    else:
        logger.warning("⚠️ BOT_TOKEN not set, bot polling skipped")

    yield

    # Cleanup
    if polling_task:
        polling_task.cancel()
    await bot.session.close()
    logger.info("👋 Shutdown complete")


# FastAPI app
app = FastAPI(
    title="LidaMarket API",
    description="Telegram Mini App store for clothing from China",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Mini App
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Mount frontend as static (built Vite output)
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist")
if os.path.exists(frontend_dir):
    app.mount("/app", StaticFiles(directory=frontend_dir, html=True), name="frontend")
    logger.info(f"📱 Frontend mounted from {frontend_dir}")

# Include routers
from app.routers import catalog, user, orders, favorites, history, dropship, admin

app.include_router(catalog.router)
app.include_router(user.router)
app.include_router(orders.router)
app.include_router(favorites.router)
app.include_router(history.router)
app.include_router(dropship.router)
app.include_router(admin.router)


@app.get("/")
async def root():
    return {
        "name": "LidaMarket API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
