/**
 * Home Page — hero banner, categories, popular & new products
 */
import { api } from '../api.js';
import { router } from '../router.js';
import { store } from '../store.js';
import { telegram } from '../telegram.js';

export async function renderHomePage() {
  const div = document.createElement('div');
  div.className = 'home-page';

  // Hero banner
  div.innerHTML = `
    <div class="home-hero">
      <h2 class="home-hero-title">Стильная одежда<br>по <span>лучшим ценам</span></h2>
      <p class="home-hero-subtitle">Прямые поставки из Китая. Качество и стиль доступны каждому 🔥</p>
      <button class="btn btn-primary" id="hero-catalog-btn">Смотреть каталог</button>
    </div>

    <div class="home-categories" id="categories-section">
      <div class="section-title">
        <span>Категории</span>
      </div>
      <div class="home-categories-grid" id="categories-grid">
        <div class="skeleton" style="width:72px;height:80px;border-radius:12px"></div>
        <div class="skeleton" style="width:72px;height:80px;border-radius:12px"></div>
        <div class="skeleton" style="width:72px;height:80px;border-radius:12px"></div>
        <div class="skeleton" style="width:72px;height:80px;border-radius:12px"></div>
      </div>
    </div>

    <div id="popular-section">
      <div class="section-title">
        <span>🔥 Хиты продаж</span>
        <button class="see-all" id="see-all-popular">Все →</button>
      </div>
      <div class="home-products-scroll" id="popular-products">
        ${skeletonCards(4)}
      </div>
    </div>

    <div id="new-section" style="margin-top:var(--space-lg)">
      <div class="section-title">
        <span>✨ Новинки</span>
        <button class="see-all" id="see-all-new">Все →</button>
      </div>
      <div class="home-products-scroll" id="new-products">
        ${skeletonCards(4)}
      </div>
    </div>

    <div class="home-referral-banner" id="referral-banner">
      <div class="home-referral-banner-icon">🎁</div>
      <div class="home-referral-banner-text">
        <h3>Приглашай друзей — получай скидки!</h3>
        <p>50 баллов за каждого приглашённого друга</p>
      </div>
    </div>
  `;

  // Event listeners
  setTimeout(() => {
    document.getElementById('hero-catalog-btn')?.addEventListener('click', () => {
      router.navigate('catalog');
      telegram.haptic('light');
    });

    document.getElementById('see-all-popular')?.addEventListener('click', () => {
      router.navigate('catalog', { sort: 'popular' });
    });

    document.getElementById('see-all-new')?.addEventListener('click', () => {
      router.navigate('catalog', { sort: 'newest' });
    });

    document.getElementById('referral-banner')?.addEventListener('click', () => {
      router.navigate('referral');
      telegram.haptic('light');
    });

    loadData();
  }, 0);

  return div;
}

async function loadData() {
  // Load categories
  try {
    const categories = await api.getCategories();
    const grid = document.getElementById('categories-grid');
    if (grid) {
      grid.innerHTML = categories.map(cat => `
        <div class="home-category-item" data-slug="${cat.slug}">
          <div class="home-category-icon">${cat.icon}</div>
          <span class="home-category-label">${cat.name}</span>
        </div>
      `).join('');

      grid.querySelectorAll('.home-category-item').forEach(item => {
        item.addEventListener('click', () => {
          router.navigate('catalog', { category: item.dataset.slug });
          telegram.haptic('light');
        });
      });
    }
  } catch (e) {
    console.warn('Categories error:', e);
  }

  // Load popular products
  try {
    const popular = await api.getPopularProducts(10);
    renderProductScroll('popular-products', popular);
  } catch (e) {
    console.warn('Popular products error:', e);
  }

  // Load new products
  try {
    const newProducts = await api.getNewProducts(10);
    renderProductScroll('new-products', newProducts);
  } catch (e) {
    console.warn('New products error:', e);
  }
}

function renderProductScroll(containerId, products) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = '<p class="text-muted p-md">Товаров пока нет</p>';
    return;
  }

  container.innerHTML = products.map(p => productCardHTML(p)).join('');

  container.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.product-card-fav')) return;
      router.navigate('product', { id: card.dataset.id });
      telegram.haptic('light');
    });
  });
}

function productCardHTML(product) {
  const hasDiscount = product.old_price && product.old_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / product.old_price) * 100)
    : 0;

  const img = product.images?.[0] || '';
  const imgSrc = img || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect fill="%23222" width="1" height="1"/></svg>';

  return `
    <div class="product-card" data-id="${product.id}">
      ${hasDiscount ? `<span class="product-card-badge">-${discountPercent}%</span>` : ''}
      <img class="product-card-img" src="${imgSrc}" alt="${product.name}" loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22><rect fill=%22%23222%22 width=%221%22 height=%221%22/></svg>'">
      <div class="product-card-body">
        <div class="product-card-name">${product.name}</div>
        <div class="product-card-price-row">
          <span class="product-card-price">${formatPrice(product.price)}</span>
          ${hasDiscount ? `<span class="product-card-old-price">${formatPrice(product.old_price)}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

function skeletonCards(count) {
  return Array(count).fill('').map(() => `
    <div class="product-card" style="min-width:160px;max-width:160px">
      <div class="skeleton skeleton-img"></div>
      <div style="padding:8px 16px 16px">
        <div class="skeleton skeleton-text" style="width:80%"></div>
        <div class="skeleton skeleton-text" style="width:50%"></div>
      </div>
    </div>
  `).join('');
}

export function formatPrice(price) {
  return `${Math.round(price).toLocaleString('ru-RU')}₽`;
}
