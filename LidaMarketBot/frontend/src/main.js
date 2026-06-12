/**
 * LidaMarket Mini App — Entry Point
 */
import { telegram } from './telegram.js';
import { router } from './router.js';
import { store } from './store.js';
import { api } from './api.js';
import { renderHomePage } from './pages/HomePage.js';
import { renderCatalogPage } from './pages/CatalogPage.js';
import { renderProductPage } from './pages/ProductPage.js';
import { renderFavoritesPage } from './pages/FavoritesPage.js';
import { renderCartPage } from './pages/CartPage.js';
import { renderProfilePage } from './pages/ProfilePage.js';
import { renderOrderPage } from './pages/OrderPage.js';
import { renderOrdersPage } from './pages/OrdersPage.js';
import { renderReferralPage } from './pages/ReferralPage.js';
import { renderHistoryPage } from './pages/HistoryPage.js';
import { renderDropshipPage } from './pages/DropshipPage.js';
import { renderAdminPage } from './pages/AdminPage.js';

// --- Initialize ---
async function init() {
  // Init Telegram WebApp
  telegram.init();

  // Register routes
  router.register('home', renderHomePage);
  router.register('catalog', renderCatalogPage);
  router.register('product', renderProductPage);
  router.register('favorites', renderFavoritesPage);
  router.register('cart', renderCartPage);
  router.register('profile', renderProfilePage);
  router.register('order', renderOrderPage);
  router.register('orders', renderOrdersPage);
  router.register('referral', renderReferralPage);
  router.register('history', renderHistoryPage);
  router.register('dropship', renderDropshipPage);
  router.register('admin', renderAdminPage);

  // Set page container
  router.setContainer(document.getElementById('page-container'));

  // Navigation handler
  router.onNavigate((page, params) => {
    updateNavigation(page);
    updateHeader(page);
  });

  // Bottom nav clicks
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      router.navigate(page);
      telegram.haptic('light');
    });
  });

  // Header back button
  document.getElementById('header-back').addEventListener('click', () => {
    if (router.canGoBack) {
      router.back();
      telegram.haptic('light');
    }
  });

  // Header cart button
  document.getElementById('header-cart-btn').addEventListener('click', () => {
    router.navigate('cart');
    telegram.haptic('light');
  });

  // Header search button
  document.getElementById('header-search-btn').addEventListener('click', () => {
    router.navigate('catalog', { focusSearch: true });
    telegram.haptic('light');
  });

  // Cart badge updates
  store.on('cart:updated', updateCartBadge);
  updateCartBadge();

  // Load user profile
  try {
    const profile = await api.getProfile();
    store.setUser(profile);
  } catch (e) {
    console.warn('Could not load profile:', e.message);
  }

  // Hide loading, show main content
  const loading = document.getElementById('loading-screen');
  const mainContent = document.getElementById('main-content');
  loading.classList.add('fade-out');
  mainContent.classList.remove('hidden');

  setTimeout(() => {
    loading.style.display = 'none';
  }, 500);

  // Navigate to home
  router.navigate('home');
}

// --- Navigation Helpers ---
function updateNavigation(page) {
  const mainPages = ['home', 'catalog', 'favorites', 'cart', 'profile'];
  const navPage = mainPages.includes(page) ? page : null;

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === navPage);
  });

  // Show/hide bottom nav
  const nav = document.getElementById('bottom-nav');
  const hideNavPages = ['product', 'order'];
  nav.style.display = hideNavPages.includes(page) ? 'none' : '';
}

function updateHeader(page) {
  const backBtn = document.getElementById('header-back');
  const title = document.getElementById('header-title');
  const searchBtn = document.getElementById('header-search-btn');

  const canGoBack = router.canGoBack;
  backBtn.classList.toggle('hidden', !canGoBack);

  // Telegram back button
  if (canGoBack) {
    telegram.showBackButton(() => {
      router.back();
      telegram.haptic('light');
    });
  } else {
    telegram.hideBackButton();
  }

  // Page titles
  const titles = {
    home: 'LidaMarket',
    catalog: 'Каталог',
    favorites: 'Избранное',
    cart: 'Корзина',
    profile: 'Профиль',
    product: 'Товар',
    order: 'Оформление',
    orders: 'Мои заказы',
    referral: 'Рефералы',
    history: 'История',
    dropship: 'Дропшиппинг',
    admin: 'Админ-панель',
  };

  title.textContent = titles[page] || 'LidaMarket';

  // Show search only on some pages
  const searchPages = ['home', 'catalog'];
  searchBtn.classList.toggle('hidden', !searchPages.includes(page));
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  const count = store.cartCount;
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
}

// --- Toast Utility ---
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Make showToast globally available
window.showToast = showToast;

// --- Start ---
document.addEventListener('DOMContentLoaded', init);
