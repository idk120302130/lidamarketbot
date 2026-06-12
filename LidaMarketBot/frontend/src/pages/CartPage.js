/**
 * Cart Page
 */
import { store } from '../store.js';
import { router } from '../router.js';
import { telegram } from '../telegram.js';
import { formatPrice } from './HomePage.js';

export async function renderCartPage() {
  const div = document.createElement('div');
  div.className = 'cart-page';
  renderCartContent(div);

  store.on('cart:updated', () => renderCartContent(div));
  return div;
}

function renderCartContent(container) {
  const cart = store.cart;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛒</div>
        <div class="empty-title">Корзина пуста</div>
        <div class="empty-text">Добавьте товары из каталога, чтобы оформить заказ</div>
        <button class="btn btn-primary mt-md" id="cart-to-catalog">Перейти в каталог</button>
      </div>
    `;
    document.getElementById('cart-to-catalog')?.addEventListener('click', () => router.navigate('catalog'));
    return;
  }

  const total = store.cartTotal;

  container.innerHTML = `
    <div class="cart-list">
      ${cart.map((item, idx) => `
        <div class="cart-item" data-idx="${idx}">
          <img class="cart-item-img" src="${item.image || ''}" alt="${item.name}"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22><rect fill=%22%23222%22 width=%221%22 height=%221%22/></svg>'">
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-variant">${[item.size, item.color].filter(Boolean).join(' • ') || '—'}</div>
            <div class="cart-item-bottom">
              <span class="cart-item-price">${formatPrice(item.price * item.quantity)}</span>
              <div class="cart-item-qty">
                <button class="qty-minus" data-idx="${idx}">−</button>
                <span>${item.quantity}</span>
                <button class="qty-plus" data-idx="${idx}">+</button>
              </div>
            </div>
          </div>
          <button class="cart-item-delete" data-idx="${idx}">✕</button>
        </div>
      `).join('')}
    </div>

    <div class="order-summary">
      <div class="order-summary-row">
        <span>Товары (${store.cartCount})</span>
        <span>${formatPrice(total)}</span>
      </div>
      <div class="order-summary-row total">
        <span>Итого</span>
        <span class="price">${formatPrice(total)}</span>
      </div>
    </div>

    <button class="btn btn-primary btn-full btn-lg cart-checkout-btn" id="checkout-btn">
      Оформить заказ
    </button>
  `;

  // Quantity buttons
  container.querySelectorAll('.qty-minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx);
      store.updateCartQuantity(idx, store.cart[idx].quantity - 1);
      telegram.haptic('light');
      renderCartContent(container);
    });
  });

  container.querySelectorAll('.qty-plus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx);
      store.updateCartQuantity(idx, store.cart[idx].quantity + 1);
      telegram.haptic('light');
      renderCartContent(container);
    });
  });

  container.querySelectorAll('.cart-item-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx);
      store.removeFromCart(idx);
      telegram.haptic('medium');
      renderCartContent(container);
    });
  });

  document.getElementById('checkout-btn')?.addEventListener('click', () => {
    router.navigate('order');
    telegram.haptic('light');
  });
}
