/**
 * Profile Page
 */
import { api } from '../api.js';
import { store } from '../store.js';
import { router } from '../router.js';
import { telegram } from '../telegram.js';

export async function renderProfilePage() {
  const div = document.createElement('div');
  const user = store.user;

  const initial = (user?.first_name || '?')[0].toUpperCase();

  div.innerHTML = `
    <div class="profile-card">
      <div class="profile-header">
        <div class="profile-avatar">${initial}</div>
        <div>
          <div class="profile-name">${user?.first_name || ''} ${user?.last_name || ''}</div>
          <div class="profile-username">${user?.username ? '@' + user.username : 'ID: ' + (user?.telegram_id || '—')}</div>
        </div>
      </div>
      <div class="profile-stats">
        <div class="profile-stat">
          <div class="profile-stat-value">${user?.points || 0}</div>
          <div class="profile-stat-label">Баллы</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value">${user?.referrals_count || 0}</div>
          <div class="profile-stat-label">Друзья</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value">${user?.max_discount || 0}%</div>
          <div class="profile-stat-label">Скидка</div>
        </div>
      </div>
    </div>

    <div class="menu-list">
      <button class="menu-item" id="menu-orders">
        <div class="menu-item-icon">📦</div>
        <div class="menu-item-text">
          <div class="menu-item-title">Мои заказы</div>
          <div class="menu-item-subtitle">История покупок</div>
        </div>
        <span class="menu-item-arrow">›</span>
      </button>
      <button class="menu-item" id="menu-referral">
        <div class="menu-item-icon">🔗</div>
        <div class="menu-item-text">
          <div class="menu-item-title">Реферальная программа</div>
          <div class="menu-item-subtitle">${user?.points || 0} баллов</div>
        </div>
        <span class="menu-item-arrow">›</span>
      </button>
      <button class="menu-item" id="menu-history">
        <div class="menu-item-icon">🕐</div>
        <div class="menu-item-text">
          <div class="menu-item-title">История просмотров</div>
          <div class="menu-item-subtitle">Недавно просмотренные</div>
        </div>
        <span class="menu-item-arrow">›</span>
      </button>
      <button class="menu-item" id="menu-dropship">
        <div class="menu-item-icon">🚚</div>
        <div class="menu-item-text">
          <div class="menu-item-title">Дропшиппинг</div>
          <div class="menu-item-subtitle">${user?.is_dropshipper ? (user?.dropship_approved ? 'Активен ✅' : 'Ожидание ⏳') : 'Зарабатывай на перепродаже'}</div>
        </div>
        <span class="menu-item-arrow">›</span>
      </button>
      ${user?.is_admin ? `
        <button class="menu-item" id="menu-admin">
          <div class="menu-item-icon">⚙️</div>
          <div class="menu-item-text">
            <div class="menu-item-title">Админ-панель</div>
            <div class="menu-item-subtitle">Управление магазином</div>
          </div>
          <span class="menu-item-arrow">›</span>
        </button>
      ` : ''}
    </div>
  `;

  setTimeout(() => {
    document.getElementById('menu-orders')?.addEventListener('click', () => { router.navigate('orders'); telegram.haptic('light'); });
    document.getElementById('menu-referral')?.addEventListener('click', () => { router.navigate('referral'); telegram.haptic('light'); });
    document.getElementById('menu-history')?.addEventListener('click', () => { router.navigate('history'); telegram.haptic('light'); });
    document.getElementById('menu-dropship')?.addEventListener('click', () => { router.navigate('dropship'); telegram.haptic('light'); });
    document.getElementById('menu-admin')?.addEventListener('click', () => { router.navigate('admin'); telegram.haptic('light'); });
  }, 0);

  return div;
}
