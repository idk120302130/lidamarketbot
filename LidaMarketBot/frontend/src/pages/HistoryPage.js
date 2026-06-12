/**
 * History Page — View history
 */
import { api } from '../api.js';
import { router } from '../router.js';
import { telegram } from '../telegram.js';
import { formatPrice } from './HomePage.js';

export async function renderHistoryPage() {
  const div = document.createElement('div');
  div.className = 'history-page';
  div.innerHTML = '<div class="loading-spinner" style="margin:var(--space-2xl) auto"></div>';

  setTimeout(async () => {
    try {
      const history = await api.getHistory();

      if (history.length === 0) {
        div.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🕐</div>
            <div class="empty-title">История пуста</div>
            <div class="empty-text">Просматривайте товары в каталоге — они появятся здесь</div>
          </div>
        `;
        return;
      }

      div.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-md)">
          <span style="font-size:var(--font-size-sm);color:var(--text-muted)">${history.length} товар(ов)</span>
          <button class="btn btn-sm btn-secondary" id="clear-history">Очистить</button>
        </div>
        ${history.map(item => `
          <div class="history-item" data-id="${item.id}">
            <img class="history-item-img" src="${item.images?.[0] || ''}" alt="${item.name}"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22><rect fill=%22%23222%22 width=%221%22 height=%221%22/></svg>'">
            <div class="history-item-info">
              <div class="history-item-name">${item.name}</div>
              <div class="history-item-price">${formatPrice(item.price)}</div>
              <div class="history-item-date">${formatDate(item.viewed_at)}</div>
            </div>
          </div>
        `).join('')}
      `;

      // Item clicks
      div.querySelectorAll('.history-item').forEach(el => {
        el.addEventListener('click', () => {
          router.navigate('product', { id: el.dataset.id });
          telegram.haptic('light');
        });
      });

      // Clear history
      document.getElementById('clear-history')?.addEventListener('click', async () => {
        const confirmed = await telegram.showConfirm('Очистить историю просмотров?');
        if (confirmed) {
          await api.clearHistory();
          div.innerHTML = `
            <div class="empty-state">
              <div class="empty-icon">✅</div>
              <div class="empty-title">История очищена</div>
            </div>
          `;
          telegram.haptic('success');
        }
      });

    } catch (e) {
      div.innerHTML = `<div class="empty-state"><div class="empty-icon">😕</div><div class="empty-title">Ошибка загрузки</div></div>`;
    }
  }, 0);

  return div;
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
