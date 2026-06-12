/**
 * Simple reactive store for app state (cart, user, etc.)
 */
const CART_KEY = 'lidamarket_cart';

class Store {
  constructor() {
    this.cart = this._loadCart();
    this.user = null;
    this._listeners = {};
  }

  // --- Events ---
  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  }

  emit(event, data) {
    (this._listeners[event] || []).forEach(cb => cb(data));
  }

  // --- Cart ---
  _loadCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch {
      return [];
    }
  }

  _saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(this.cart));
    this.emit('cart:updated', this.cart);
  }

  addToCart(product, size = '', color = '', quantity = 1) {
    // Check if item already exists with same size and color
    const existing = this.cart.find(
      item => item.id === product.id && item.size === size && item.color === color
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      this.cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || '',
        size,
        color,
        quantity,
      });
    }

    this._saveCart();
  }

  removeFromCart(index) {
    this.cart.splice(index, 1);
    this._saveCart();
  }

  updateCartQuantity(index, quantity) {
    if (quantity <= 0) {
      this.removeFromCart(index);
      return;
    }
    this.cart[index].quantity = quantity;
    this._saveCart();
  }

  clearCart() {
    this.cart = [];
    this._saveCart();
  }

  get cartCount() {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  get cartTotal() {
    return this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  // --- User ---
  setUser(user) {
    this.user = user;
    this.emit('user:updated', user);
  }
}

export const store = new Store();
export default store;
