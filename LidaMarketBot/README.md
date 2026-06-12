# LidaMarket 🛍

> Telegram Mini App — полноценный магазин одежды из Китая с реферальной системой, дропшиппингом и админ-панелью.

## 🚀 Быстрый старт

### Требования
- Python 3.11+
- Node.js 18+
- PostgreSQL

### 1. Backend

```bash
cd backend

# Создаём виртуальное окружение
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Устанавливаем зависимости
pip install -r requirements.txt

# Копируем .env
copy .env.example .env
# Заполняем BOT_TOKEN, DATABASE_URL, ADMIN_IDS

# Запуск
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend будет на http://localhost:5173, API проксируется на http://localhost:8000.

### 3. Настройка бота

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен и добавьте в `.env`
3. Установите Menu Button: `/setmenubutton` → URL Mini App
4. Настройте Main Mini App в BotFather

## 📦 Деплой на Railway

1. Создайте проект на [Railway](https://railway.app)
2. Добавьте PostgreSQL plugin
3. Подключите GitHub репозиторий
4. Добавьте переменные окружения:
   - `BOT_TOKEN` — токен бота
   - `DATABASE_URL` — берётся автоматически из PostgreSQL plugin
   - `ADMIN_IDS` — ваш Telegram ID
   - `WEBAPP_URL` — URL вашего приложения на Railway (например `https://lidamarket.up.railway.app/app/`)

## 🏗 Архитектура

- **Backend**: Python (FastAPI + aiogram 3) + PostgreSQL + SQLAlchemy 2.0
- **Frontend**: Vanilla JS + Vite + Telegram Mini App SDK
- **Дизайн**: Тёмная тема, оранжевый/чёрный/белый, glassmorphism

## ✨ Функционал

- 📦 **Каталог** — фильтры, сортировка, поиск, пагинация
- ❤️ **Избранное** — сохранение товаров
- 🕐 **История** — просмотренные товары
- 🛒 **Корзина** — оформление заказов
- 🔗 **Рефералы** — баллы за приглашения → скидки
- 🚚 **Дропшиппинг** — перепродажа товаров
- ⚙️ **Админка** — управление товарами и заказами
