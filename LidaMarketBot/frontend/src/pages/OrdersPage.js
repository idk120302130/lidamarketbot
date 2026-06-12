/**
 * Orders List Page
 */
import { api } from '../api.js';
import { router } from '../router.js';
import { formatPrice } from './HomePage.js';

const statusLabels = {
  new: '🆕 Новый', confirmed: '✅ Подтверждён', paid: '💳 Оплачен',
  shipped: '🚀 Отправлен', delivered: '📦 Доставлен', cancelled: '❌ Отменён',
};

export async function renderOrdersPage() {
  const div = document.createElement('div');
  div.className = 'orders-page';
  div.innerHTML = '<div class="loading-spinner" style="margin:var(--space-2xl) auto"></div>';

  setTimeout(async () => {
    try {
      const orders = await api.getOrders();

      if (orders.length === 0) {
        div.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📦</div>
            <div class="empty-title">Заказов пока нет</div>
            <div class="empty-text">Оформите первый заказ в каталоге</div>
            <button class="btn btn-primary mt-md" id="orders-to-catalog">В каталог</button>
          </div>
        `;
        document.getElementById('orders-to-catalog')?.addEventListener('click', () => router.navigate('catalog'));
        return;
      }

      div.innerHTML = orders.map(order => `
        <div class="order-card" data-id="${order.id}">
          <div class="order-card-header">
            <span class="order-card-id">Заказ #${order.id}</span>
            <span class="status-badge status-${order.status}">${statusLabels[order.status] || order.status}</span>
          </div>
          <div class="order-card-date">${formatDate(order.created_at)}</div>
          <div class="order-card-footer">
            <span class="order-card-price">${formatPrice(order.final_price)}</span>
            <span class="order-card-items-count">${order.items_count} товар(ов)</span>
          </div>
        </div>
      `).join('');

    } catch (e) {
      div.innerHTML = `<div class="empty-state"><div class="empty-icon">😕</div><div class="empty-title">Ошибка загрузки</div></div>`;
    }
  }, 0);

  return div;
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
