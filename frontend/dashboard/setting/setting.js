// 1. App State / Init
// ---------- Storage Keys ----------
const STORAGE_KEY = 'financeDashboard';
const PROFILE_IMAGE_KEY = 'financeProfileImage';
const PROFILE_META_KEY = 'financeProfileMeta';

// ---------- DOM Helper ----------
const byId = (id) => document.getElementById(id);

// ---------- Sample Data ----------
const sampleTransactions = [
  { id: 1, amount: 50000, category: 'Customer Deposits', date: '2024-01-15', type: 'income', description: 'Customer deposit transaction' },
  { id: 2, amount: 15000, category: 'Salaries', date: '2024-01-10', type: 'expense', description: 'Staff salaries' },
  { id: 3, amount: 25000, category: 'Account Fees', date: '2024-01-20', type: 'income', description: 'Account service charges' }
];

// ---------- Page State ----------
const state = {
  user: 'viewer',
  transactions: []
};

function isUnsafeLocalImagePath(src) {
  if (!src) return false;
  const value = String(src).trim();
  return /^file:\/\//i.test(value) || /^[a-zA-Z]:[\\/]/.test(value);
}

function sanitizeImageSource(src, fallback) {
  if (typeof src !== 'string' || !src.trim()) return fallback;
  const value = src.trim();
  if (isUnsafeLocalImagePath(value)) return fallback;
  return value;
}

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

// 2. UI Rendering (dashboard, cards, transactions)
// ---------- UI Rendering ----------
function renderRoleButtons() {
  document.querySelectorAll('.role-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.role === state.user);
  });
}

function updateProfileImages(src) {
  const safeSrc = sanitizeImageSource(src, getDefaultProfileImage());
  const topbarImage = byId('topbarProfileImage');
  const avatarImage = byId('profileAvatar');
  if (topbarImage) {
    topbarImage.src = safeSrc;
    topbarImage.onerror = () => {
      topbarImage.onerror = null;
      topbarImage.src = getDefaultProfileImage();
    };
  }
  if (avatarImage) {
    avatarImage.src = safeSrc;
    avatarImage.onerror = () => {
      avatarImage.onerror = null;
      avatarImage.src = getDefaultProfileImage();
    };
  }
}

function renderStats() {
  const total = state.transactions.length;
  const income = state.transactions.filter((t) => t.type === 'income').length;
  const expense = state.transactions.filter((t) => t.type === 'expense').length;

  if (byId('statTransactions')) byId('statTransactions').textContent = String(total);
  if (byId('statIncome')) byId('statIncome').textContent = String(income);
  if (byId('statExpense')) byId('statExpense').textContent = String(expense);
  if (byId('statRole')) byId('statRole').textContent = state.user;
}

// 3. Event Handlers (buttons, forms, search, filter)
// ---------- Event Bindings ----------
function initProfileImageControls() {
  const uploadBtn = byId('uploadProfileImage');
  const removeBtn = byId('removeProfileImage');
  const settingsInput = byId('settingsProfileInput');
  const topbarButton = byId('profileButton');
  const topbarInput = byId('topbarProfileInput');

  const savedImage = localStorage.getItem(PROFILE_IMAGE_KEY);
  updateProfileImages(savedImage || getDefaultProfileImage());

  if (uploadBtn && settingsInput) {
    uploadBtn.addEventListener('click', () => settingsInput.click());
    settingsInput.addEventListener('change', () => {
      handleImageFile(settingsInput.files && settingsInput.files[0]);
      settingsInput.value = '';
    });
  }

  if (topbarButton && topbarInput) {
    topbarButton.addEventListener('click', () => topbarInput.click());
    topbarInput.addEventListener('change', () => {
      handleImageFile(topbarInput.files && topbarInput.files[0]);
      topbarInput.value = '';
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      if (!confirm('Remove profile image?')) return;
      localStorage.removeItem(PROFILE_IMAGE_KEY);
      updateProfileImages(getDefaultProfileImage());
      showToast('Profile image removed');
    });
  }
}

function initProfileForm() {
  const form = byId('profileForm');
  const clearButton = byId('clearProfileDetails');
  if (!form) return;

  loadProfileMeta(form);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    saveProfileMeta(form);
  });

  if (clearButton) {
    clearButton.addEventListener('click', () => clearProfileMeta(form));
  }
}

function initRoleButtons() {
  const wrapper = byId('roleButtons');
  if (!wrapper) return;

  wrapper.addEventListener('click', (event) => {
    const btn = event.target.closest('.role-btn');
    if (!btn) return;
    saveRole(btn.dataset.role);
  });
}

function initDataActions() {
  const exportBtn = byId('exportCsv');
  const resetBtn = byId('resetData');
  if (exportBtn) exportBtn.addEventListener('click', exportCsv);
  if (resetBtn) resetBtn.addEventListener('click', resetData);
}

// 4. Business Logic (calculations, insights)
// ---------- Feedback ----------
function showToast(message) {
  const host = byId('toastHost');
  if (!host) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  host.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ---------- Storage ----------
function loadStore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state.user = 'viewer';
    state.transactions = [];
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    state.user = parsed.user || 'viewer';
    state.transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
  } catch (err) {
    state.user = 'viewer';
    state.transactions = [];
  }
}

function saveStore() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    user: state.user,
    transactions: state.transactions
  }));
}

// ---------- Role Section ----------
function saveRole(role) {
  state.user = role;
  saveStore();
  renderRoleButtons();
  renderStats();
  showToast(`Role switched to ${role}`);
}

// ---------- Profile Image Section ----------
function loadProfileMeta(form) {
  // Try to load real API data from auth guard first
  const currentUserRaw = localStorage.getItem('currentUser');
  if (currentUserRaw) {
    try {
      const user = JSON.parse(currentUserRaw);
      form.elements.fullName.value = user.fullName || `${user.firstName} ${user.lastName}` || '';
      form.elements.email.value = user.email || '';
      form.elements.phone.value = user.phone || '';
      form.elements.organization.value = user.organization || '';
      return;
    } catch (err) {}
  }

  // Fallback to old local storage
  const raw = localStorage.getItem(PROFILE_META_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    form.elements.fullName.value = parsed.fullName || '';
    form.elements.email.value = parsed.email || '';
    form.elements.phone.value = parsed.phone || '';
    form.elements.organization.value = parsed.organization || '';
  } catch (err) {
    // ignore invalid profile meta
  }
}

// ---------- Profile Details Section ----------
function saveProfileMeta(form) {
  const payload = {
    fullName: form.elements.fullName.value.trim(),
    email: form.elements.email.value.trim(),
    phone: form.elements.phone.value.trim(),
    organization: form.elements.organization.value.trim()
  };
  localStorage.setItem(PROFILE_META_KEY, JSON.stringify(payload));
  showToast('Profile details saved');
}

function clearProfileMeta(form) {
  if (!confirm('Clear saved profile details?')) return;
  localStorage.removeItem(PROFILE_META_KEY);
  form.reset();
  showToast('Profile details cleared');
}

// ---------- File Handling ----------
function handleImageFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const result = event.target.result;
    if (typeof result === 'string') {
      localStorage.setItem(PROFILE_IMAGE_KEY, result);
      updateProfileImages(result);
      showToast('Profile image updated');
    }
  };
  reader.readAsDataURL(file);
}

// ---------- Data Actions ----------
function exportCsv() {
  if (!state.transactions.length) {
    showToast('No transactions to export');
    return;
  }

  const headers = ['Date', 'Category', 'Description', 'Type', 'Amount'];
  const rows = state.transactions.map((t) => [t.date, t.category, t.description || '', t.type, t.amount]);
  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'transactions.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  showToast('CSV exported');
}

function resetData() {
  if (!confirm('Reset all transactions to sample data?')) return;
  state.transactions = sampleTransactions.map((item) => ({ ...item }));
  saveStore();
  renderStats();
  showToast('Transactions reset');
}

// 5. Charts (monthly, category)
// ---------- Not used on this page ----------

// 6. Utility functions
// ---------- Shared helpers are above (image sanitization/defaults) ----------

// 7. Animations (last me)
// ---------- Not used on this page ----------

// ---------- INITIALIZATION ----------
function initSettingsPage() {
  loadStore();
  renderRoleButtons();
  renderStats();
  initProfileImageControls();
  initProfileForm();
  initRoleButtons();
  initDataActions();

  // Logout button
  const logoutBtn = byId('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        if (typeof window.authLogout === 'function') {
          window.authLogout();
        }
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', initSettingsPage);
