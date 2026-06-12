/**
 * Catalog Page — full product listing with filters, sorting, search
 */
import { api } from '../api.js';
import { router } from '../router.js';
import { telegram } from '../telegram.js';
import { formatPrice } from './HomePage.js';

let currentParams = { page: 1, sort: 'newest', category: null, search: '' };
let isLoading = false;
let hasMore = true;
let debounceTimer = null;

export async function renderCatalogPage(params = {}) {
  // Reset state
  currentParams = { page: 1, sort: params.sort || 'newest', category: params.category || null, search: '' };
  hasMore = true;

  const div = document.createElement('div');
  div.className = 'catalog-page';

  div.innerHTML = `
    <div class="search-bar">
      <svg class="search-bar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input type="text" class="search-bar-input" id="catalog-search" placeholder="Поиск товаров..." autocomplete="off">
    </div>

    <div class="category-bar" id="category-bar">
      <div class="category-chip active" data-slug="">Все</div>
    </div>

    <div class="sort-bar" id="sort-bar">
      <div class="sort-chip ${currentParams.sort === 'newest' ? 'active' : ''}" data-sort="newest">Новинки</div>
      <div class="sort-chip ${currentParams.sort === 'popular' ? 'active' : ''}" data-sort="popular">Популярные</div>
      <div class="sort-chip ${currentParams.sort === 'price_asc' ? 'active' : ''}" data-sort="price_asc">Дешевле</div>
      <div class="sort-chip ${currentParams.sort === 'price_desc' ? 'active' : ''}" data-sort="price_desc">Дороже</div>
    </div>

    <div class="products-grid" id="products-grid"></div>
    <div id="load-more" style="text-align:center;padding:var(--space-lg)">
      <div class="loading-spinner"></div>
    </div>
  `;

  setTimeout(async () => {
    // Search input
    const searchInput = document.getElementById('catalog-search');
    if (searchInput) {
      if (params.focusSearch) searchInput.focus();
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          currentParams.search = e.target.value;
          currentParams.page = 1;
          hasMore = true;
          document.getElementById('products-grid').innerHTML = '';
          loadProducts();
        }, 300);
      });
    }

    // Load categories
    try {
      const categories = await api.getCategories();
      const bar = document.getElementById('category-bar');
      if (bar) {
        bar.innerHTML = `<div class="category-chip ${!currentParams.category ? 'active' : ''}" data-slug="">Все</div>` +
          categories.map(c =>
            `<div class="category-chip ${currentParams.category === c.slug ? 'active' : ''}" data-slug="${c.slug}">${c.icon} ${c.name}</div>`
          ).join('');

        bar.querySelectorAll('.category-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            bar.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentParams.category = chip.dataset.slug || null;
            currentParams.page = 1;
            hasMore = true;
            document.getElementById('products-grid').innerHTML = '';
            loadProducts();
            telegram.haptic('light');
          });
        });
      }
    } catch (e) { console.warn(e); }

    // Sort chips
    document.querySelectorAll('.sort-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.sort-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentParams.sort = chip.dataset.sort;
        currentParams.page = 1;
        hasMore = true;
        document.getElementById('products-grid').innerHTML = '';
        loadProducts();
        telegram.haptic('light');
      });
    });

    // Infinite scroll
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !isLoading) {
        loadProducts();
      }
    }, { threshold: 0.1 });

    const loadMore = document.getElementById('load-more');
    if (loadMore) observer.observe(loadMore);

    // Initial load
    loadProducts();
  }, 0);

  return div;
}

async function loadProducts() {
  if (isLoading || !hasMore) return;
  isLoading = true;

  try {
    const data = await api.getProducts({
      page: currentParams.page,
      sort: currentParams.sort,
      category: currentParams.category,
      search: currentParams.search,
      limit: 20,
    });

    const grid = document.getElementById('products-grid');
    const loadMore = document.getElementById('load-more');
    if (!grid) return;

    if (data.items.length === 0 && currentParams.page === 1) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Ничего не найдено</div>
          <div class="empty-text">Попробуйте изменить фильтры или поисковый запрос</div>
        </div>
      `;
      if (loadMore) loadMore.style.display = 'none';
      return;
    }

    const html = data.items.map(p => productCardGridHTML(p)).join('');
    grid.insertAdjacentHTML('beforeend', html);

    // Add click listeners to new cards
    grid.querySelectorAll('.product-card:not([data-bound])').forEach(card => {
      card.dataset.bound = '1';
      card.addEventListener('click', () => {
        router.navigate('product', { id: card.dataset.id });
        telegram.haptic('light');
      });
    });

    hasMore = currentParams.page < data.pages;
    currentParams.page++;

    if (!hasMore && loadMore) {
      loadMore.style.display = 'none';
    }
  } catch (e) {
    console.error('Load products error:', e);
  } finally {
    isLoading = false;
  }
}

function productCardGridHTML(product) {
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
