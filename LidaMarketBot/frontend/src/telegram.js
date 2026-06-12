/**
 * Telegram WebApp API wrapper
 */
const tg = window.Telegram?.WebApp;

export const telegram = {
  /** Telegram WebApp instance */
  webApp: tg,

  /** Get Telegram user info */
  get user() {
    return tg?.initDataUnsafe?.user || null;
  },

  /** Get raw initData for API auth */
  get initData() {
    return tg?.initData || '';
  },

  /** Get start param (e.g., referral code) */
  get startParam() {
    return tg?.initDataUnsafe?.start_param || null;
  },

  /** Initialize Mini App */
  init() {
    if (!tg) {
      console.warn('Telegram WebApp not available (running outside Telegram)');
      return;
    }

    tg.ready();
    tg.expand();
    tg.disableVerticalSwipes();

    // Set theme
    tg.setHeaderColor('#0A0A0A');
    tg.setBackgroundColor('#0A0A0A');
    tg.setBottomBarColor('#0A0A0A');
  },

  /** Show back button */
  showBackButton(callback) {
    if (!tg) return;
    tg.BackButton.show();
    tg.BackButton.onClick(callback);
  },

  /** Hide back button */
  hideBackButton() {
    if (!tg) return;
    tg.BackButton.hide();
    tg.BackButton.offClick();
  },

  /** Haptic feedback */
  haptic(type = 'light') {
    if (!tg?.HapticFeedback) return;
    if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
    else if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
    else if (type === 'warning') tg.HapticFeedback.notificationOccurred('warning');
    else if (type === 'medium') tg.HapticFeedback.impactOccurred('medium');
    else if (type === 'heavy') tg.HapticFeedback.impactOccurred('heavy');
    else tg.HapticFeedback.impactOccurred('light');
  },

  /** Show confirm dialog */
  showConfirm(message) {
    return new Promise((resolve) => {
      if (!tg) {
        resolve(confirm(message));
        return;
      }
      tg.showConfirm(message, resolve);
    });
  },

  /** Show alert */
  showAlert(message) {
    return new Promise((resolve) => {
      if (!tg) {
        alert(message);
        resolve();
        return;
      }
      tg.showAlert(message, resolve);
    });
  },

  /** Close Mini App */
  close() {
    tg?.close();
  },
};

export default telegram;
