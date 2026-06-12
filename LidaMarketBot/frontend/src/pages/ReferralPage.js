/**
 * Referral Page
 */
import { api } from '../api.js';
import { store } from '../store.js';
import { telegram } from '../telegram.js';

export async function renderReferralPage() {
  const div = document.createElement('div');
  div.className = 'referral-page';
  div.innerHTML = '<div class="loading-spinner" style="margin:var(--space-2xl) auto"></div>';

  setTimeout(async () => {
    try {
      const info = await api.getReferralInfo();
      const botUsername = 'YourBotUsername'; // Will be replaced with actual bot username
      const refLink = `https://t.me/${botUsername}?start=ref_${info.referral_code}`;

      div.innerHTML = `
        <div class="referral-link-card">
          <h2 style="font-size:var(--font-size-xl);font-weight:700;margin-bottom:var(--space-sm)">🔗 Ваша ссылка</h2>
          <p style="font-size:var(--font-size-xs);color:var(--text-muted)">Отправьте друзьям и получайте баллы!</p>
          <div class="referral-link-value" id="ref-link">${refLink}</div>
          <div style="display:flex;gap:var(--space-sm)">
            <button class="btn btn-primary" id="copy-ref" style="flex:1">📋 Скопировать</button>
            <button class="btn btn-secondary" id="share-ref" style="flex:1">📤 Поделиться</button>
          </div>
        </div>

        <div class="referral-stats">
          <div class="referral-stat-card">
            <div class="value">${info.points}</div>
            <div class="label">Баллов</div>
          </div>
          <div class="referral-stat-card">
            <div class="value">${info.referrals_count}</div>
            <div class="label">Приглашено</div>
          </div>
          <div class="referral-stat-card">
            <div class="value">${info.max_discount}%</div>
            <div class="label">Скидка</div>
          </div>
          <div class="referral-stat-card">
            <div class="value">${info.points_per_invite}</div>
            <div class="label">За друга</div>
          </div>
        </div>

        <div class="gradient-card" style="margin-top:var(--space-md)">
          <div style="position:relative;z-index:1">
            <h3 style="font-weight:700;margin-bottom:var(--space-sm)">💡 Как это работает?</h3>
            <div style="font-size:var(--font-size-sm);color:var(--text-secondary);line-height:1.8">
              <p>1️⃣ Поделитесь ссылкой с друзьями</p>
              <p>2️⃣ Друг переходит по ссылке и запускает бота</p>
              <p>3️⃣ Вы получаете <strong style="color:var(--primary)">${info.points_per_invite} баллов</strong></p>
              <p>4️⃣ Обменяйте баллы на скидку при заказе</p>
            </div>
          </div>
        </div>

        <div class="referral-table" style="margin-top:var(--space-lg)">
          <div style="padding:var(--space-md);font-weight:700">📊 Таблица скидок</div>
          <div class="referral-table-header">
            <span>Баллы</span>
            <span>Скидка</span>
          </div>
          <div class="referral-table-row"><span>100</span><span>${info.discount_rate}%</span></div>
          <div class="referral-table-row"><span>200</span><span>${info.discount_rate * 2}%</span></div>
          <div class="referral-table-row"><span>400</span><span>${Math.min(info.discount_rate * 4, info.max_discount_percent)}%</span></div>
          <div class="referral-table-row" style="color:var(--primary);font-weight:600"><span>${(info.max_discount_percent / info.discount_rate) * 100}</span><span>${info.max_discount_percent}% (макс.)</span></div>
        </div>

        ${info.recent_referrals?.length > 0 ? `
          <div style="margin-top:var(--space-lg)">
            <h3 style="font-weight:700;margin-bottom:var(--space-md)">👥 Последние приглашённые</h3>
            ${info.recent_referrals.map(r => `
              <div style="display:flex;justify-content:space-between;padding:var(--space-sm) 0;border-bottom:1px solid var(--border-color);font-size:var(--font-size-sm)">
                <span>${r.first_name}</span>
                <span style="color:var(--text-muted)">${formatDate(r.joined_at)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      `;

      // Copy button
      document.getElementById('copy-ref')?.addEventListener('click', () => {
        navigator.clipboard?.writeText(refLink).then(() => {
          window.showToast('Ссылка скопирована!', 'success');
          telegram.haptic('success');
        }).catch(() => {
          // Fallback
          const el = document.getElementById('ref-link');
          if (el) {
            const range = document.createRange();
            range.selectNodeContents(el);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            window.showToast('Выделено — скопируйте вручную', 'info');
          }
        });
      });

      // Share button
      document.getElementById('share-ref')?.addEventListener('click', () => {
        const text = `🛍 Заходи в LidaMarket — магазин стильной одежды по выгодным ценам!\n${refLink}`;
        if (telegram.webApp) {
          telegram.webApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Заходи в LidaMarket — магазин стильной одежды!')}`);
        } else {
          navigator.share?.({ title: 'LidaMarket', text, url: refLink });
        }
        telegram.haptic('light');
      });

    } catch (e) {
      div.innerHTML = `<div class="empty-state"><div class="empty-icon">😕</div><div class="empty-title">Ошибка загрузки</div></div>`;
    }
  }, 0);

  return div;
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
