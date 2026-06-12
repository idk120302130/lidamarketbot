/**
 * Product Detail Page — gallery, sizes, colors, add to cart
 */
import { api } from '../api.js';
import { store } from '../store.js';
import { telegram } from '../telegram.js';
import { formatPrice } from './HomePage.js';

export async function renderProductPage(params = {}) {
  const div = document.createElement('div');
  div.className = 'product-detail';

  div.innerHTML = `
    <div class="product-gallery">
      <div class="skeleton skeleton-img" style="aspect-ratio:1"></div>
    </div>
    <div style="padding:var(--space-lg)">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text" style="width:40%"></div>
    </div>
  `;

  setTimeout(() => loadProduct(div, params.id), 0);
  return div;
}

async function loadProduct(container, productId) {
  try {
    const product = await api.getProduct(productId);
    let isFavorite = false;

    try {
      const favCheck = await api.checkFavorite(productId);
      isFavorite = favCheck.is_favorite;
    } catch (e) {}

    let selectedSize = product.sizes?.[0] || '';
    let selectedColor = product.colors?.[0] || '';
    let currentSlide = 0;

    const images = product.images?.length ? product.images : [''];
    const hasDiscount = product.old_price && product.old_price > product.price;
    const discountPercent = hasDiscount ? Math.round((1 - product.price / product.old_price) * 100) : 0;

    container.innerHTML = `
      <div class="product-gallery" id="gallery">
        <div class="product-gallery-track" id="gallery-track">
          ${images.map(img => `
            <div class="product-gallery-slide">
              <img src="${img || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22><rect fill=%22%23222%22 width=%221%22 height=%221%22/></svg>'}" alt="${product.name}">
            </div>
          `).join('')}
        </div>
        ${images.length > 1 ? `
          <div class="product-gallery-dots" id="gallery-dots">
            ${images.map((_, i) => `<div class="product-gallery-dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></div>`).join('')}
          </div>
        ` : ''}
      </div>

      <div class="product-detail-info">
        <div class="product-detail-name">${product.name}</div>

        <div class="product-detail-price-row">
          <span class="product-detail-price">${formatPrice(product.price)}</span>
          ${hasDiscount ? `<span class="product-detail-old-price">${formatPrice(product.old_price)}</span>` : ''}
          ${hasDiscount ? `<span class="product-detail-discount">-${discountPercent}%</span>` : ''}
        </div>

        <div class="product-detail-views">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          ${product.views_count} просмотров
        </div>

        ${product.sizes?.length ? `
          <div class="product-detail-section">
            <div class="product-detail-section-title">Размер</div>
            <div class="product-detail-sizes" id="sizes-container">
              ${product.sizes.map(s => `<div class="size-chip ${s === selectedSize ? 'active' : ''}" data-size="${s}">${s}</div>`).join('')}
            </div>
          </div>
        ` : ''}

        ${product.colors?.length ? `
          <div class="product-detail-section">
            <div class="product-detail-section-title">Цвет</div>
            <div class="product-detail-colors" id="colors-container">
              ${product.colors.map(c => `
                <div class="color-chip ${c === selectedColor ? 'active' : ''}" data-color="${c}"
                     style="background:${getColorHex(c)}" title="${c}"></div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${product.description ? `
          <div class="product-detail-section">
            <div class="product-detail-section-title">Описание</div>
            <div class="product-detail-description">${product.description}</div>
          </div>
        ` : ''}
      </div>

      <div class="product-detail-bottom-bar">
        <button class="btn-fav ${isFavorite ? 'active' : ''}" id="fav-btn" aria-label="В избранное">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <button class="btn btn-primary btn-add-cart" id="add-cart-btn">
          🛒 В корзину — ${formatPrice(product.price)}
        </button>
      </div>
    `;

    // Gallery swipe
    if (images.length > 1) {
      const track = document.getElementById('gallery-track');
      const gallery = document.getElementById('gallery');
      let startX = 0;
      let currentX = 0;

      gallery.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; });
      gallery.addEventListener('touchmove', (e) => { currentX = e.touches[0].clientX; });
      gallery.addEventListener('touchend', () => {
        const diff = startX - currentX;
        if (Math.abs(diff) > 50) {
          if (diff > 0 && currentSlide < images.length - 1) currentSlide++;
          else if (diff < 0 && currentSlide > 0) currentSlide--;
          track.style.transform = `translateX(-${currentSlide * 100}%)`;
          updateDots(currentSlide);
        }
      });

      document.querySelectorAll('.product-gallery-dot').forEach(dot => {
        dot.addEventListener('click', () => {
          currentSlide = parseInt(dot.dataset.idx);
          track.style.transform = `translateX(-${currentSlide * 100}%)`;
          updateDots(currentSlide);
        });
      });
    }

    // Size selection
    document.querySelectorAll('.size-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.size-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedSize = chip.dataset.size;
        telegram.haptic('light');
      });
    });

    // Color selection
    document.querySelectorAll('.color-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.color-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedColor = chip.dataset.color;
        telegram.haptic('light');
      });
    });

    // Favorite button
    document.getElementById('fav-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('fav-btn');
      isFavorite = !isFavorite;
      btn.classList.toggle('active', isFavorite);
      telegram.haptic(isFavorite ? 'success' : 'light');

      try {
        if (isFavorite) {
          await api.addFavorite(productId);
          window.showToast('Добавлено в избранное', 'success');
        } else {
          await api.removeFavorite(productId);
          window.showToast('Убрано из избранного', 'info');
        }
      } catch (e) {
        isFavorite = !isFavorite;
        btn.classList.toggle('active', isFavorite);
      }
    });

    // Add to cart
    document.getElementById('add-cart-btn')?.addEventListener('click', () => {
      store.addToCart(product, selectedSize, selectedColor);
      telegram.haptic('success');
      window.showToast('Добавлено в корзину!', 'success');

      // Button animation
      const btn = document.getElementById('add-cart-btn');
      btn.textContent = '✅ Добавлено!';
      btn.style.background = 'var(--accent-green)';
      setTimeout(() => {
        btn.innerHTML = `🛒 В корзину — ${formatPrice(product.price)}`;
        btn.style.background = '';
      }, 1500);
    });

  } catch (e) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😕</div>
        <div class="empty-title">Товар не найден</div>
        <div class="empty-text">${e.message}</div>
      </div>
    `;
  }
}

function updateDots(activeIdx) {
  document.querySelectorAll('.product-gallery-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === activeIdx);
  });
}

function getColorHex(color) {
  const colors = {
    'Чёрный': '#1a1a1a', 'Белый': '#f5f5f5', 'Красный': '#ef4444',
    'Синий': '#3b82f6', 'Зелёный': '#22c55e', 'Серый': '#6b7280',
    'Бежевый': '#d4a574', 'Розовый': '#ec4899', 'Жёлтый': '#eab308',
    'Коричневый': '#92400e', 'Фиолетовый': '#8b5cf6', 'Оранжевый': '#f97316',
  };
  return colors[color] || '#888';
}
