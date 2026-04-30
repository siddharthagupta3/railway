// 1. App State / Init
// ---------- DOM Helpers ----------
const byId = (id) => document.getElementById(id);
const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

// ---------- Storage Keys ----------
const STORAGE_KEY = 'financeDashboard';
const PROFILE_IMAGE_KEY = 'financeProfileImage';
const PROFILE_META_KEY = 'financeProfileMeta';
const DASHBOARD_IMAGE_FALLBACK = 'images/grid-fallback.svg';

function isUnsafeLocalImagePath(src) {
  if (!src) return false;
  const value = String(src).trim();
  return /^file:\/\//i.test(value) || /^[a-zA-Z]:[\\/]/.test(value);
}

function getImageFallbackPath() {
  return window.location.pathname.includes('/dashboard/setting/') ? '../images/grid-fallback.svg' : DASHBOARD_IMAGE_FALLBACK;
}

function sanitizeImageSource(src, fallback) {
  if (typeof src !== 'string' || !src.trim()) return fallback;
  const value = src.trim();
  if (isUnsafeLocalImagePath(value)) return fallback;
  return value;
}

// 2. UI Rendering (dashboard, cards, transactions)
// ---------- Image Rendering + Fallback ----------
function attachImageFallbacks() {
  const defaultFallback = getImageFallbackPath();

  qsa('img').forEach((img) => {
    const fallback = img.getAttribute('data-fallback-src') || defaultFallback;
    const currentSrc = img.getAttribute('src');

    if (currentSrc && isUnsafeLocalImagePath(currentSrc)) {
      img.setAttribute('src', fallback);
    }

    img.addEventListener('error', () => {
      if (img.dataset.fallbackApplied === '1') return;
      img.dataset.fallbackApplied = '1';
      img.setAttribute('src', fallback);
    });
  });
}

// ---------- Shared Data Store ----------
const financeStore = {
  state: {
    user: 'viewer',
    transactions: []
  },

  init() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        this.state.user = parsed.user || 'viewer';
        this.state.transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
      } catch (err) {
        this.state.user = 'viewer';
        this.state.transactions = [];
      }
    }

    if (this.state.transactions.length === 0) {
      this.state.transactions = [
        { id: 1, amount: 50000, category: 'Customer Deposits', date: '2024-01-15', type: 'income', description: 'Customer deposit transaction' },
        { id: 2, amount: 15000, category: 'Salaries', date: '2024-01-10', type: 'expense', description: 'Staff salaries' },
        { id: 3, amount: 25000, category: 'Account Fees', date: '2024-01-20', type: 'income', description: 'Account service charges' }
      ];
      this.save();
    }
  },

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      user: this.state.user,
      transactions: this.state.transactions
    }));
    applyRoleVisibility();
    this.notify();
  },

  notify() {
    window.dispatchEvent(new CustomEvent('finance:data-changed', { detail: this.getState() }));
  },

  getState() {
    return {
      user: this.state.user,
      transactions: [...this.state.transactions]
    };
  },

  getTransactions() {
    return [...this.state.transactions];
  },

  setUser(role) {
    this.state.user = role;
    this.save();
  },

  onChange(handler) {
    const wrapped = () => handler(this.getState());
    window.addEventListener('finance:data-changed', wrapped);
    return () => window.removeEventListener('finance:data-changed', wrapped);
  }
};

// 3. Event Handlers (buttons, forms, search, filter)
// ---------- Event Handlers ----------
document.addEventListener('DOMContentLoaded', () => {
  financeStore.init();
  applyRoleVisibility();
  attachImageFallbacks();
  setupProfileImage();
});

// 4. Business Logic (calculations, insights)
// ---------- Notifications + Role Visibility ----------
function showNotification(msg, type = 'info') {
  const notification = document.createElement('div');
  notification.textContent = msg;
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '15px 20px',
    borderRadius: '8px',
    color: 'white',
    zIndex: '10000',
    fontSize: '14px',
    background: { success: '#22c55e', error: '#ef4444', info: '#3b82f6' }[type] || '#3b82f6',
    animation: 'slideIn 0.3s ease',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  });
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 4000);
}

// ---------- File Download ----------
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// ---------- Role UI ----------
function applyRoleVisibility() {
  document.body.classList.toggle('admin-mode', financeStore.state.user === 'admin');
}

// ---------- Profile Image ----------
function getDefaultProfileImage() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#76a73f" />
      <stop offset="100%" stop-color="#7598f2" />
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="60" fill="url(#grad)" />
  <circle cx="60" cy="48" r="22" fill="rgba(255,255,255,0.85)" />
  <path d="M24 102c8-18 22-28 36-28s28 10 36 28" fill="rgba(255,255,255,0.85)" />
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function updateProfileImages(src) {
  const safeSrc = sanitizeImageSource(src, getDefaultProfileImage());

  qsa('[data-profile-image]').forEach((img) => {
    img.src = safeSrc;
    img.onerror = () => {
      img.onerror = null;
      img.src = getDefaultProfileImage();
    };
  });
}

function setupProfileImage() {
  const input = byId('profileImageInput');
  const stored = localStorage.getItem(PROFILE_IMAGE_KEY) || getDefaultProfileImage();
  updateProfileImages(stored);

  if (!input) return;

  const trigger = byId('profileButton');
  if (trigger) {
    trigger.addEventListener('click', () => input.click());
  }

  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target.result;
      if (typeof result === 'string') {
        localStorage.setItem(PROFILE_IMAGE_KEY, result);
        updateProfileImages(result);
        showNotification('Profile image updated', 'success');
      }
    };
    reader.readAsDataURL(file);
    input.value = '';
  });
}

// 5. Charts (monthly, category)
// ---------- Not used in this shared module ----------

// 6. Utility functions
// ---------- Sanitizers + Path helpers are defined above ----------

// 7. Animations (last me)
// ---------- Not used in this shared module ----------

// ---------- GLOBAL API ----------
window.financeStore = financeStore;
window.showNotification = showNotification;
window.downloadFile = downloadFile;
window.applyRoleVisibility = applyRoleVisibility;
window.getDefaultProfileImage = getDefaultProfileImage;
window.updateProfileImages = updateProfileImages;
window.PROFILE_META_KEY = PROFILE_META_KEY;
