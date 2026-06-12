/**
 * Favorites Page
 */
import { api } from '../api.js';
import { router } from '../router.js';
import { telegram } from '../telegram.js';
import { formatPrice } from './HomePage.js';

export async function renderFavoritesPage() {
  const div = document.createElement('div');
  div.innerHTML = `<div class="products-grid" id="fav-grid" style="padding:var(--space-md)">
    <div class="skeleton skeleton-img"></div>
    <div class="skeleton skeleton-img"></div>
  </div>`;

  setTimeout(async () => {
    try {
      const favorites = await api.getFavorites();
      const grid = document.getElementById('fav-grid');
      if (!grid) return;

      if (favorites.length === 0) {
        grid.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1">
            <div class="empty-icon">❤️</div>
            <div class="empty-title">Пока пусто</div>
            <div class="empty-text">Добавляйте товары в избранное, чтобы не потерять их</div>
            <button class="btn btn-primary mt-md" id="go-catalog-btn">Перейти в каталог</button>
          </div>
        `;
        document.getElementById('go-catalog-btn')?.addEventListener('click', () => router.navigate('catalog'));
        return;
      }

      grid.innerHTML = favorites.map(p => `
        <div class="product-card" data-id="${p.id}">
          <img class="product-card-img" src="${p.images?.[0] || ''}" alt="${p.name}" loading="lazy"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22><rect fill=%22%23222%22 width=%221%22 height=%221%22/></svg>'">
          <div class="product-card-body">
            <div class="product-card-name">${p.name}</div>
            <div class="product-card-price-row">
              <span class="product-card-price">${formatPrice(p.price)}</span>
              ${p.old_price ? `<span class="product-card-old-price">${formatPrice(p.old_price)}</span>` : ''}
            </div>
          </div>
        </div>
      `).join('');

      grid.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => {
          router.navigate('product', { id: card.dataset.id });
          telegram.haptic('light');
        });
      });
    } catch (e) {
      console.error(e);
    }
  }, 0);

  return div;
}
