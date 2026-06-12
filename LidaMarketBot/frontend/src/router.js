/**
 * Simple SPA router for page navigation
 */

class Router {
  constructor() {
    this.routes = {};
    this.currentPage = null;
    this.history = [];
    this.container = null;
    this._onNavigate = null;
  }

  /** Register page routes */
  register(name, renderFn) {
    this.routes[name] = renderFn;
  }

  /** Set the container element for page content */
  setContainer(el) {
    this.container = el;
  }

  /** Navigate to a page */
  async navigate(page, params = {}, { pushHistory = true } = {}) {
    const renderFn = this.routes[page];
    if (!renderFn) {
      console.error(`Route not found: ${page}`);
      return;
    }

    if (pushHistory && this.currentPage) {
      this.history.push(this.currentPage);
    }

    this.currentPage = { page, params };

    if (this.container) {
      // Animate page transition
      this.container.innerHTML = '';
      const content = await renderFn(params);

      if (typeof content === 'string') {
        this.container.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        this.container.appendChild(content);
      }

      this.container.classList.remove('page-enter');
      void this.container.offsetWidth; // Force reflow
      this.container.classList.add('page-enter');

      // Scroll to top
      this.container.scrollTop = 0;
      window.scrollTo(0, 0);
    }

    if (this._onNavigate) {
      this._onNavigate(page, params);
    }
  }

  /** Go back to previous page */
  back() {
    if (this.history.length > 0) {
      const prev = this.history.pop();
      this.navigate(prev.page, prev.params, { pushHistory: false });
      return true;
    }
    return false;
  }

  /** Check if there's history to go back to */
  get canGoBack() {
    return this.history.length > 0;
  }

  /** Set callback for navigation events */
  onNavigate(callback) {
    this._onNavigate = callback;
  }
}

export const router = new Router();
export default router;
