/**
 * Admin Page — dashboard, product management, orders
 */
import { api } from '../api.js';
import { telegram } from '../telegram.js';
import { formatPrice } from './HomePage.js';

export async function renderAdminPage() {
  const div = document.createElement('div');
  div.className = 'admin-page';
  div.innerHTML = '<div class="loading-spinner" style="margin:var(--space-2xl) auto"></div>';

  setTimeout(async () => {
    try {
      const stats = await api.getAdminStats();

      div.innerHTML = `
        <div class="admin-stats-grid">
          <div class="admin-stat-card"><div class="value">${stats.users_count}</div><div class="label">Пользователей</div></div>
          <div class="admin-stat-card"><div class="value">${stats.products_count}</div><div class="label">Товаров</div></div>
          <div class="admin-stat-card"><div class="value">${stats.orders_count}</div><div class="label">Заказов</div></div>
          <div class="admin-stat-card"><div class="value">${stats.new_orders}</div><div class="label">Новых заказов</div></div>
          <div class="admin-stat-card"><div class="value">${formatPrice(stats.revenue)}</div><div class="label">Выручка</div></div>
          <div class="admin-stat-card"><div class="value">${stats.dropshippers_count}</div><div class="label">Дропшипперов</div></div>
        </div>

        <div class="menu-list">
          <button class="menu-item" id="admin-add-product">
            <div class="menu-item-icon">➕</div>
            <div class="menu-item-text"><div class="menu-item-title">Добавить товар</div></div>
            <span class="menu-item-arrow">›</span>
          </button>
          <button class="menu-item" id="admin-add-category">
            <div class="menu-item-icon">📁</div>
            <div class="menu-item-text"><div class="menu-item-title">Добавить категорию</div></div>
            <span class="menu-item-arrow">›</span>
          </button>
          <button class="menu-item" id="admin-orders">
            <div class="menu-item-icon">📦</div>
            <div class="menu-item-text"><div class="menu-item-title">Управление заказами</div><div class="menu-item-subtitle">${stats.new_orders} новых</div></div>
            <span class="menu-item-arrow">›</span>
          </button>
          <button class="menu-item" id="admin-dropship">
            <div class="menu-item-icon">🚚</div>
            <div class="menu-item-text"><div class="menu-item-title">Дропшипперы</div></div>
            <span class="menu-item-arrow">›</span>
          </button>
        </div>

        <div id="admin-content"></div>
      `;

      document.getElementById('admin-add-product')?.addEventListener('click', () => showAddProductForm(div));
      document.getElementById('admin-add-category')?.addEventListener('click', () => showAddCategoryForm(div));
      document.getElementById('admin-orders')?.addEventListener('click', () => loadAdminOrders(div));
      document.getElementById('admin-dropship')?.addEventListener('click', () => loadDropshipAdmin(div));

    } catch (e) {
      div.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div><div class="empty-title">Доступ запрещён</div><div class="empty-text">${e.message}</div></div>`;
    }
  }, 0);

  return div;
}

function showAddProductForm(container) {
  const content = document.getElementById('admin-content') || container;
  content.innerHTML = `
    <div class="admin-section" style="margin-top:var(--space-lg)">
      <h3 class="admin-section-title">➕ Новый товар</h3>
      <div class="form-group">
        <label class="form-label">Название *</label>
        <input class="input-field" id="ap-name" placeholder="Куртка зимняя Premium">
      </div>
      <div class="form-group">
        <label class="form-label">Описание</label>
        <textarea class="form-textarea" id="ap-desc" placeholder="Описание товара"></textarea>
      </div>
      <div style="display:flex;gap:var(--space-sm)">
        <div class="form-group" style="flex:1">
          <label class="form-label">Цена *</label>
          <input class="input-field" id="ap-price" type="number" placeholder="1990">
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label">Старая цена</label>
          <input class="input-field" id="ap-old-price" type="number" placeholder="3990">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Категория ID *</label>
        <input class="input-field" id="ap-cat" type="number" placeholder="1">
      </div>
      <div class="form-group">
        <label class="form-label">Размеры (через запятую)</label>
        <input class="input-field" id="ap-sizes" placeholder="S,M,L,XL" value="S,M,L,XL">
      </div>
      <div class="form-group">
        <label class="form-label">Цвета (через запятую)</label>
        <input class="input-field" id="ap-colors" placeholder="Чёрный,Белый">
      </div>
      <div class="form-group">
        <label class="form-label">Фото</label>
        <input type="file" id="ap-images" multiple accept="image/*" style="color:var(--text-secondary)">
      </div>
      <button class="btn btn-primary btn-full" id="ap-submit">Создать товар</button>
    </div>
  `;

  document.getElementById('ap-submit')?.addEventListener('click', async () => {
    const formData = new FormData();
    formData.append('name', document.getElementById('ap-name').value);
    formData.append('description', document.getElementById('ap-desc').value);
    formData.append('price', document.getElementById('ap-price').value);
    formData.append('old_price', document.getElementById('ap-old-price').value || '0');
    formData.append('category_id', document.getElementById('ap-cat').value);
    formData.append('sizes', document.getElementById('ap-sizes').value);
    formData.append('colors', document.getElementById('ap-colors').value);

    const files = document.getElementById('ap-images').files;
    for (const file of files) {
      formData.append('images', file);
    }

    try {
      const result = await api.createProduct(formData);
      window.showToast(`Товар "${result.name}" создан!`, 'success');
      telegram.haptic('success');
      content.innerHTML = '';
    } catch (e) {
      window.showToast(e.message, 'error');
    }
  });
}

function showAddCategoryForm(container) {
  const content = document.getElementById('admin-content') || container;
  content.innerHTML = `
    <div class="admin-section" style="margin-top:var(--space-lg)">
      <h3 class="admin-section-title">📁 Новая категория</h3>
      <div class="form-group">
        <label class="form-label">Название *</label>
        <input class="input-field" id="ac-name" placeholder="Куртки">
      </div>
      <div class="form-group">
        <label class="form-label">Slug (URL) *</label>
        <input class="input-field" id="ac-slug" placeholder="jackets">
      </div>
      <div class="form-group">
        <label class="form-label">Иконка (emoji)</label>
        <input class="input-field" id="ac-icon" placeholder="🧥" value="📦">
      </div>
      <button class="btn btn-primary btn-full" id="ac-submit">Создать категорию</button>
    </div>
  `;

  document.getElementById('ac-submit')?.addEventListener('click', async () => {
    try {
      const result = await api.createCategory({
        name: document.getElementById('ac-name').value,
        slug: document.getElementById('ac-slug').value,
        icon: document.getElementById('ac-icon').value || '📦',
      });
      window.showToast(`Категория "${result.name}" создана!`, 'success');
      telegram.haptic('success');
      content.innerHTML = '';
    } catch (e) {
      window.showToast(e.message, 'error');
    }
  });
}

async function loadAdminOrders(container) {
  const content = document.getElementById('admin-content') || container;
  content.innerHTML = '<div class="loading-spinner" style="margin:var(--space-lg) auto"></div>';

  try {
    const orders = await api.getAdminOrders();

    const statusLabels = {
      new: '🆕 Новый', confirmed: '✅ Подтверждён', paid: '💳 Оплачен',
      shipped: '🚀 Отправлен', delivered: '📦 Доставлен', cancelled: '❌ Отменён',
    };

    const statuses = ['new', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled'];

    content.innerHTML = `
      <h3 style="font-weight:700;margin:var(--space-lg) 0 var(--space-md)">📦 Заказы</h3>
      ${orders.length === 0 ? '<p class="text-muted">Заказов нет</p>' : ''}
      ${orders.map(o => `
        <div class="admin-list-item" style="flex-direction:column;align-items:flex-start">
          <div style="display:flex;justify-content:space-between;width:100%;margin-bottom:var(--space-sm)">
            <strong>Заказ #${o.id}</strong>
            <span class="status-badge status-${o.status}">${statusLabels[o.status]}</span>
          </div>
          <div style="font-size:var(--font-size-xs);color:var(--text-muted);width:100%;margin-bottom:var(--space-sm)">
            <p>👤 ${o.client_name} (${o.user_name})</p>
            <p>📱 ${o.phone}</p>
            <p>📍 ${o.delivery_address}</p>
            <p>💰 ${formatPrice(o.final_price)} · ${o.items_count} товар(ов)</p>
          </div>
          <select class="input-field" data-order-id="${o.id}" style="appearance:auto;padding:8px;font-size:var(--font-size-xs)">
            ${statuses.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${statusLabels[s]}</option>`).join('')}
          </select>
        </div>
      `).join('')}
    `;

    // Status change handlers
    content.querySelectorAll('select[data-order-id]').forEach(select => {
      select.addEventListener('change', async () => {
        try {
          await api.updateOrderStatus(select.dataset.orderId, select.value);
          window.showToast('Статус обновлён', 'success');
          telegram.haptic('success');
        } catch (e) {
          window.showToast(e.message, 'error');
        }
      });
    });
  } catch (e) {
    content.innerHTML = `<p class="text-muted p-md">Ошибка: ${e.message}</p>`;
  }
}

async function loadDropshipAdmin(container) {
  const content = document.getElementById('admin-content') || container;
  content.innerHTML = '<div class="loading-spinner" style="margin:var(--space-lg) auto"></div>';

  try {
    const pending = await api.getPendingDropshippers();

    content.innerHTML = `
      <h3 style="font-weight:700;margin:var(--space-lg) 0 var(--space-md)">🚚 Заявки на дропшиппинг</h3>
      ${pending.length === 0 ? '<p class="text-muted">Нет ожидающих заявок</p>' : ''}
      ${pending.map(u => `
        <div class="admin-list-item">
          <div class="admin-list-item-info">
            <div class="admin-list-item-title">${u.first_name} ${u.username ? '@' + u.username : ''}</div>
            <div class="admin-list-item-sub">ID: ${u.telegram_id}</div>
          </div>
          <button class="btn btn-sm btn-primary" data-approve="${u.id}">Одобрить</button>
        </div>
      `).join('')}
    `;

    content.querySelectorAll('[data-approve]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await api.approveDropshipper(btn.dataset.approve);
          window.showToast('Дропшиппер одобрен!', 'success');
          telegram.haptic('success');
          btn.closest('.admin-list-item')?.remove();
        } catch (e) {
          window.showToast(e.message, 'error');
        }
      });
    });
  } catch (e) {
    content.innerHTML = `<p class="text-muted p-md">Ошибка: ${e.message}</p>`;
  }
}
