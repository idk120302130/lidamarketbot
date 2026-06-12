/**
 * Order Page — checkout form
 */
import { api } from '../api.js';
import { store } from '../store.js';
import { router } from '../router.js';
import { telegram } from '../telegram.js';
import { formatPrice } from './HomePage.js';

export async function renderOrderPage() {
  const div = document.createElement('div');
  div.className = 'order-form';

  const total = store.cartTotal;
  const user = store.user;
  const maxDiscount = user?.max_discount || 0;
  const userPoints = user?.points || 0;

  div.innerHTML = `
    <h2 style="font-size:var(--font-size-xl);font-weight:700;margin-bottom:var(--space-lg)">Оформление заказа</h2>

    <div class="form-group">
      <label class="form-label">Ваше имя *</label>
      <input class="input-field" id="order-name" placeholder="Иван Иванов" value="${user?.first_name || ''}">
    </div>

    <div class="form-group">
      <label class="form-label">Телефон *</label>
      <input class="input-field" id="order-phone" placeholder="+7 (999) 123-45-67" type="tel">
    </div>

    <div class="form-group">
      <label class="form-label">Адрес доставки *</label>
      <textarea class="form-textarea" id="order-address" placeholder="Город, улица, дом, квартира"></textarea>
    </div>

    <div class="form-group">
      <label class="form-label">Комментарий</label>
      <textarea class="form-textarea" id="order-comment" placeholder="Дополнительные пожелания" style="min-height:60px"></textarea>
    </div>

    ${userPoints > 0 ? `
      <div class="gradient-card" style="margin-bottom:var(--space-lg)">
        <div style="position:relative;z-index:1">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm)">
            <span style="font-weight:600">💰 Использовать баллы</span>
            <span class="badge badge-orange">${userPoints} баллов</span>
          </div>
          <p style="font-size:var(--font-size-xs);color:var(--text-muted);margin-bottom:var(--space-sm)">
            Максимальная скидка: ${maxDiscount}%
          </p>
          <label style="display:flex;align-items:center;gap:var(--space-sm);cursor:pointer">
            <input type="checkbox" id="use-points" style="width:20px;height:20px;accent-color:var(--primary)">
            <span style="font-size:var(--font-size-sm)">Применить скидку ${maxDiscount}% (${userPoints} баллов)</span>
          </label>
        </div>
      </div>
    ` : ''}

    <div class="order-summary" style="margin-bottom:var(--space-lg)">
      <div class="order-summary-row">
        <span>Товары (${store.cartCount})</span>
        <span>${formatPrice(total)}</span>
      </div>
      <div class="order-summary-row" id="discount-row" style="display:none">
        <span>Скидка</span>
        <span class="discount" id="discount-amount">0₽</span>
      </div>
      <div class="order-summary-row total">
        <span>К оплате</span>
        <span class="price" id="final-price">${formatPrice(total)}</span>
      </div>
    </div>

    <button class="btn btn-primary btn-full btn-lg" id="submit-order-btn">
      Подтвердить заказ
    </button>

    <p style="text-align:center;font-size:var(--font-size-xs);color:var(--text-muted);margin-top:var(--space-md)">
      После подтверждения менеджер свяжется с вами для оплаты
    </p>
  `;

  setTimeout(() => {
    // Points checkbox
    const usePoints = document.getElementById('use-points');
    if (usePoints) {
      usePoints.addEventListener('change', () => {
        const discountRow = document.getElementById('discount-row');
        const discountAmount = document.getElementById('discount-amount');
        const finalPrice = document.getElementById('final-price');

        if (usePoints.checked) {
          const discountVal = total * (maxDiscount / 100);
          discountRow.style.display = '';
          discountAmount.textContent = `-${formatPrice(discountVal)}`;
          finalPrice.textContent = formatPrice(total - discountVal);
        } else {
          discountRow.style.display = 'none';
          finalPrice.textContent = formatPrice(total);
        }
      });
    }

    // Submit order
    document.getElementById('submit-order-btn')?.addEventListener('click', async () => {
      const name = document.getElementById('order-name').value.trim();
      const phone = document.getElementById('order-phone').value.trim();
      const address = document.getElementById('order-address').value.trim();
      const comment = document.getElementById('order-comment').value.trim();
      const usePointsChecked = document.getElementById('use-points')?.checked || false;

      if (!name || !phone || !address) {
        window.showToast('Заполните все обязательные поля', 'error');
        telegram.haptic('error');
        return;
      }

      const btn = document.getElementById('submit-order-btn');
      btn.disabled = true;
      btn.textContent = 'Оформляем...';

      try {
        const order = await api.createOrder({
          items: store.cart.map(item => ({
            product_id: item.id,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
          })),
          client_name: name,
          phone,
          delivery_address: address,
          comment,
          use_points: usePointsChecked ? userPoints : 0,
        });

        store.clearCart();
        telegram.haptic('success');
        window.showToast(`Заказ #${order.id} создан!`, 'success');

        // Show success
        div.innerHTML = `
          <div class="empty-state" style="padding-top:var(--space-2xl)">
            <div class="empty-icon">🎉</div>
            <div class="empty-title">Заказ оформлен!</div>
            <div class="empty-text">Заказ #${order.id} принят. Менеджер свяжется с вами для подтверждения и оплаты.</div>
            <button class="btn btn-primary mt-md" id="back-home-btn">На главную</button>
          </div>
        `;
        document.getElementById('back-home-btn')?.addEventListener('click', () => router.navigate('home'));

      } catch (e) {
        window.showToast(e.message || 'Ошибка создания заказа', 'error');
        telegram.haptic('error');
        btn.disabled = false;
        btn.textContent = 'Подтвердить заказ';
      }
    });
  }, 0);

  return div;
}
