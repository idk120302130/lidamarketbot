/**
 * Dropship Page — registration, products, orders
 */
import { api } from '../api.js';
import { store } from '../store.js';
import { telegram } from '../telegram.js';
import { formatPrice } from './HomePage.js';

export async function renderDropshipPage() {
  const div = document.createElement('div');
  div.className = 'dropship-page';

  const user = store.user;

  if (!user?.is_dropshipper) {
    // Not registered — show registration
    div.innerHTML = `
      <div class="dropship-status-card">
        <div class="status-icon">🚚</div>
        <h2 style="font-size:var(--font-size-xl);font-weight:700;margin-bottom:var(--space-sm)">Дропшиппинг</h2>
        <p style="color:var(--text-secondary);font-size:var(--font-size-sm);margin-bottom:var(--space-lg)">
          Зарабатывай на перепродаже одежды! Получи доступ к фото товаров и отправляй заказы клиентам через нас.
        </p>
        <button class="btn btn-primary btn-lg" id="register-dropship">Подать заявку</button>
      </div>

      <div class="gradient-card">
        <div style="position:relative;z-index:1">
          <h3 style="font-weight:700;margin-bottom:var(--space-md)">Как это работает?</h3>
          <div style="font-size:var(--font-size-sm);color:var(--text-secondary);line-height:2">
            <p>1️⃣ Подай заявку на дропшиппинг</p>
            <p>2️⃣ Дождись одобрения от администратора</p>
            <p>3️⃣ Получи доступ к фото товаров для перепродажи</p>
            <p>4️⃣ Продавай товары своим клиентам</p>
            <p>5️⃣ Заполни данные клиента — мы отправим товар</p>
          </div>
        </div>
      </div>
    `;

    document.getElementById('register-dropship')?.addEventListener('click', async () => {
      try {
        await api.registerDropship();
        window.showToast('Заявка отправлена!', 'success');
        telegram.haptic('success');
        // Reload user
        const profile = await api.getProfile();
        store.setUser(profile);
        // Re-render
        div.innerHTML = '';
        const newDiv = await renderDropshipPage();
        div.appendChild(newDiv);
      } catch (e) {
        window.showToast(e.message, 'error');
      }
    });

  } else if (!user.dropship_approved) {
    // Waiting for approval
    div.innerHTML = `
      <div class="dropship-status-card">
        <div class="status-icon">⏳</div>
        <h2 style="font-size:var(--font-size-xl);font-weight:700;margin-bottom:var(--space-sm)">Ожидание одобрения</h2>
        <p style="color:var(--text-secondary);font-size:var(--font-size-sm)">
          Ваша заявка на дропшиппинг отправлена. Администратор рассмотрит её в ближайшее время.
        </p>
      </div>
    `;

  } else {
    // Approved — show dropship panel
    div.innerHTML = `
      <div class="dropship-status-card" style="border-color:rgba(74,222,128,0.2)">
        <div class="status-icon">✅</div>
        <h2 style="font-size:var(--font-size-lg);font-weight:700">Дропшиппер</h2>
        <p style="color:var(--accent-green);font-size:var(--font-size-sm)">Статус: Активен</p>
      </div>

      <div class="menu-list">
        <button class="menu-item" id="ds-products">
          <div class="menu-item-icon">📸</div>
          <div class="menu-item-text">
            <div class="menu-item-title">Каталог для дропшиппинга</div>
            <div class="menu-item-subtitle">Фото товаров для перепродажи</div>
          </div>
          <span class="menu-item-arrow">›</span>
        </button>
        <button class="menu-item" id="ds-new-order">
          <div class="menu-item-icon">➕</div>
          <div class="menu-item-text">
            <div class="menu-item-title">Создать заказ клиента</div>
            <div class="menu-item-subtitle">Заполнить данные для отправки</div>
          </div>
          <span class="menu-item-arrow">›</span>
        </button>
        <button class="menu-item" id="ds-orders">
          <div class="menu-item-icon">📋</div>
          <div class="menu-item-text">
            <div class="menu-item-title">Мои заказы</div>
            <div class="menu-item-subtitle">Статус заказов клиентов</div>
          </div>
          <span class="menu-item-arrow">›</span>
        </button>
      </div>

      <div id="ds-content"></div>
    `;

    document.getElementById('ds-products')?.addEventListener('click', () => loadDropshipProducts(div));
    document.getElementById('ds-new-order')?.addEventListener('click', () => showNewOrderForm(div));
    document.getElementById('ds-orders')?.addEventListener('click', () => loadDropshipOrders(div));
  }

  return div;
}

async function loadDropshipProducts(container) {
  const content = document.getElementById('ds-content') || container;
  content.innerHTML = '<div class="loading-spinner" style="margin:var(--space-lg) auto"></div>';

  try {
    const products = await api.getDropshipProducts();
    content.innerHTML = `
      <h3 style="font-weight:700;margin:var(--space-lg) 0 var(--space-md)">📸 Товары для продажи</h3>
      <p style="font-size:var(--font-size-xs);color:var(--text-muted);margin-bottom:var(--space-md)">Нажмите на фото, чтобы сохранить для перепродажи</p>
      ${products.map(p => `
        <div class="admin-list-item" style="flex-direction:column;align-items:flex-start">
          <div style="display:flex;gap:var(--space-md);width:100%;margin-bottom:var(--space-sm)">
            <img class="admin-list-item-img" src="${p.images?.[0] || ''}" alt="${p.name}">
            <div class="admin-list-item-info">
              <div class="admin-list-item-title">${p.name}</div>
              <div class="admin-list-item-sub">${formatPrice(p.price)} · Размеры: ${p.sizes?.join(', ') || '—'}</div>
            </div>
          </div>
          ${p.images?.length ? `
            <div style="display:flex;gap:6px;overflow-x:auto;width:100%">
              ${p.images.map(img => `<img src="${img}" style="width:60px;height:60px;border-radius:8px;object-fit:cover;flex-shrink:0" alt="Фото">`).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    `;
  } catch (e) {
    content.innerHTML = `<p class="text-muted p-md">Ошибка: ${e.message}</p>`;
  }
}

async function showNewOrderForm(container) {
  const content = document.getElementById('ds-content') || container;

  try {
    const products = await api.getDropshipProducts();

    content.innerHTML = `
      <h3 style="font-weight:700;margin:var(--space-lg) 0 var(--space-md)">➕ Новый заказ клиента</h3>
      <div class="form-group">
        <label class="form-label">Товар *</label>
        <select class="input-field" id="ds-product" style="appearance:auto">
          ${products.map(p => `<option value="${p.id}">${p.name} — ${formatPrice(p.price)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">ФИО клиента *</label>
        <input class="input-field" id="ds-client-name" placeholder="Иван Иванов">
      </div>
      <div class="form-group">
        <label class="form-label">Телефон клиента *</label>
        <input class="input-field" id="ds-client-phone" placeholder="+7 (999) 123-45-67" type="tel">
      </div>
      <div class="form-group">
        <label class="form-label">Адрес доставки *</label>
        <textarea class="form-textarea" id="ds-client-address" placeholder="Город, улица, дом, квартира"></textarea>
      </div>
      <div style="display:flex;gap:var(--space-sm)">
        <div class="form-group" style="flex:1">
          <label class="form-label">Размер</label>
          <input class="input-field" id="ds-size" placeholder="M">
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label">Цвет</label>
          <input class="input-field" id="ds-color" placeholder="Чёрный">
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label">Кол-во</label>
          <input class="input-field" id="ds-qty" type="number" value="1" min="1">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Комментарий</label>
        <textarea class="form-textarea" id="ds-comment" placeholder="Дополнительно" style="min-height:60px"></textarea>
      </div>
      <button class="btn btn-primary btn-full btn-lg" id="ds-submit">Отправить заказ</button>
    `;

    document.getElementById('ds-submit')?.addEventListener('click', async () => {
      const data = {
        product_id: parseInt(document.getElementById('ds-product').value),
        client_name: document.getElementById('ds-client-name').value.trim(),
        client_phone: document.getElementById('ds-client-phone').value.trim(),
        client_address: document.getElementById('ds-client-address').value.trim(),
        size: document.getElementById('ds-size').value.trim(),
        color: document.getElementById('ds-color').value.trim(),
        quantity: parseInt(document.getElementById('ds-qty').value) || 1,
        comment: document.getElementById('ds-comment').value.trim(),
      };

      if (!data.client_name || !data.client_phone || !data.client_address) {
        window.showToast('Заполните обязательные поля', 'error');
        return;
      }

      try {
        const order = await api.createDropshipOrder(data);
        window.showToast(`Заказ #${order.id} создан!`, 'success');
        telegram.haptic('success');
        content.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">✅</div>
            <div class="empty-title">Заказ создан!</div>
            <div class="empty-text">Заказ #${order.id} отправлен на обработку</div>
          </div>
        `;
      } catch (e) {
        window.showToast(e.message, 'error');
      }
    });
  } catch (e) {
    content.innerHTML = `<p class="text-muted p-md">Ошибка: ${e.message}</p>`;
  }
}

async function loadDropshipOrders(container) {
  const content = document.getElementById('ds-content') || container;
  content.innerHTML = '<div class="loading-spinner" style="margin:var(--space-lg) auto"></div>';

  try {
    const orders = await api.getDropshipOrders();

    if (orders.length === 0) {
      content.innerHTML = '<div class="empty-state" style="padding:var(--space-lg)"><div class="empty-icon">📋</div><div class="empty-title">Заказов пока нет</div></div>';
      return;
    }

    const statusLabels = {
      new: '🆕 Новый', processing: '⚙️ Обработка', shipped: '🚀 Отправлен',
      delivered: '📦 Доставлен', cancelled: '❌ Отменён',
    };

    content.innerHTML = `
      <h3 style="font-weight:700;margin:var(--space-lg) 0 var(--space-md)">📋 Заказы клиентов</h3>
      ${orders.map(o => `
        <div class="order-card">
          <div class="order-card-header">
            <span class="order-card-id">Заказ #${o.id}</span>
            <span class="status-badge status-${o.status}">${statusLabels[o.status] || o.status}</span>
          </div>
          <div style="font-size:var(--font-size-sm);margin-top:var(--space-sm)">
            <p>👤 ${o.client_name}</p>
            <p>📱 ${o.client_phone}</p>
            <p>📍 ${o.client_address}</p>
            <p>📦 ${o.product_name} (${[o.size, o.color].filter(Boolean).join(', ')}) × ${o.quantity}</p>
          </div>
        </div>
      `).join('')}
    `;
  } catch (e) {
    content.innerHTML = `<p class="text-muted p-md">Ошибка: ${e.message}</p>`;
  }
}
