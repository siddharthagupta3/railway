/**
 * signup.js — Login + Register + OTP with real backend API
 * Connects to: http://localhost:5000/api/auth
 */
'use strict';

/* ─── Config ─────────────────────────────────────────────────── */
const API_BASE      = 'http://localhost:5000/api';
const REDIRECT_DELAY = 1500;
const byId = (id) => document.getElementById(id);

let pendingVerificationEmail = '';

/* ─── Redirect if already logged in ─────────────────────────── */
(function checkAlreadyLoggedIn() {
  const token = localStorage.getItem('authToken');
  if (!token) return;

  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && Math.floor(Date.now() / 1000) < payload.exp) {
      window.location.replace('../dashboard/dash.html');
    }
  } catch {
    localStorage.removeItem('authToken');
  }
})();

/* ─── Panel Switching ────────────────────────────────────────── */
function showLoginPanel() {
  const loginPanel    = byId('loginPanel');
  const registerPanel = byId('registerPanel');
  const otpPanel      = byId('otpPanel');
  if (loginPanel)    loginPanel.style.display = 'flex';
  if (registerPanel) registerPanel.style.display = 'none';
  if (otpPanel)      otpPanel.style.display = 'none';
  window.history.replaceState(null, '', '#login');
}

function showRegisterPanel() {
  const loginPanel    = byId('loginPanel');
  const registerPanel = byId('registerPanel');
  const otpPanel      = byId('otpPanel');
  if (loginPanel)    loginPanel.style.display = 'none';
  if (registerPanel) registerPanel.style.display = 'flex';
  if (otpPanel)      otpPanel.style.display = 'none';
  window.history.replaceState(null, '', '#register');
}

function showOtpPanel(email) {
  const loginPanel    = byId('loginPanel');
  const registerPanel = byId('registerPanel');
  const otpPanel      = byId('otpPanel');
  
  if (loginPanel)    loginPanel.style.display = 'none';
  if (registerPanel) registerPanel.style.display = 'none';
  if (otpPanel)      otpPanel.style.display = 'flex';
  
  pendingVerificationEmail = email;
  const emailDisplay = byId('otpEmailDisplay');
  if (emailDisplay) emailDisplay.textContent = email;

  // Focus first input
  const firstInput = document.querySelector('.otp-digit');
  if (firstInput) firstInput.focus();
}

function bindPanelSwitching() {
  byId('showRegister')?.addEventListener('click', (e) => { e.preventDefault(); showRegisterPanel(); });
  byId('showLogin')?.addEventListener('click',    (e) => { e.preventDefault(); showLoginPanel(); });
  byId('backToRegisterBtn')?.addEventListener('click', (e) => { e.preventDefault(); showRegisterPanel(); });
}

/* ─── Validation Helpers ─────────────────────────────────────── */
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function validatePhone(phone) {
  return /^[\d\s\-\+\(\)]+$/.test(phone) && phone.length >= 10;
}
function formatPhone(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.length > 6) return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6,10)}`;
  if (digits.length > 3) return `${digits.slice(0,3)}-${digits.slice(3)}`;
  return digits;
}

/* ─── Feedback UI ────────────────────────────────────────────── */
function showSuccess(message) {
  const el   = byId('successMessage');
  const text = byId('successText');
  if (!el || !text) return;
  text.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4000);
}

function closeSuccess() {
  byId('successMessage')?.classList.remove('show');
}

function showError(message) {
  document.querySelectorAll('.api-error-toast').forEach(e => e.remove());

  const error = document.createElement('div');
  error.className = 'api-error-toast';
  error.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>${message}</span><button>&times;</button>`;
  error.style.cssText = `
    position:fixed;top:20px;right:20px;background:#ef4444;color:white;
    padding:14px 18px;border-radius:10px;display:flex;align-items:center;
    gap:10px;z-index:9999;box-shadow:0 8px 24px rgba(239,68,68,0.35);
    font-weight:600;max-width:380px;animation:slideDown .3s ease;
  `;
  error.querySelector('button').onclick = () => error.remove();
  document.body.appendChild(error);
  setTimeout(() => error.remove(), 6000);
}

function setButtonLoading(btn, loading, originalText) {
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.originalText = btn.querySelector('span')?.textContent || originalText;
    if (btn.querySelector('span')) btn.querySelector('span').textContent = 'Please wait...';
    btn.style.opacity = '0.7';
  } else {
    if (btn.querySelector('span') && btn.dataset.originalText) {
      btn.querySelector('span').textContent = btn.dataset.originalText;
    }
    btn.style.opacity = '1';
  }
}

/* ─── Save Auth Tokens ───────────────────────────────────────── */
function saveAuthData(data) {
  localStorage.setItem('authToken',     data.accessToken);
  localStorage.setItem('refreshToken',  data.refreshToken || '');
  localStorage.setItem('isLoggedIn',    'true');
  localStorage.setItem('currentUser',   JSON.stringify(data.user));
}

/* ─── Login Handler ──────────────────────────────────────────── */
async function handleLogin(event) {
  event.preventDefault();

  const email      = byId('loginEmail')?.value.trim()    || '';
  const password   = byId('loginPassword')?.value.trim() || '';
  const rememberMe = byId('rememberMe')?.checked;
  const submitBtn  = event.target.querySelector('button[type="submit"]');

  if (!validateEmail(email))  return showError('Please enter a valid email address.');
  if (password.length < 6)    return showError('Password must be at least 6 characters.');

  setButtonLoading(submitBtn, true, 'Login');

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      if (data.requireOtp) {
        showSuccess('Please verify your email first.');
        showOtpPanel(email);
      } else {
        showError(data.message || 'Login failed. Please check your credentials.');
      }
      setButtonLoading(submitBtn, false, 'Login');
      return;
    }

    // Save tokens and user data
    saveAuthData(data);
    if (rememberMe) localStorage.setItem('rememberMe_email', email);

    showSuccess(`✅ Welcome back, ${data.user.firstName}! Redirecting...`);
    event.target.reset();

    setTimeout(() => {
      window.location.href = '../dashboard/dash.html';
    }, REDIRECT_DELAY);

  } catch (err) {
    console.error('Login network error:', err);
    showError('Cannot connect to server. Make sure backend is running on port 5000.');
    setButtonLoading(submitBtn, false, 'Login');
  }
}

/* ─── Register Handler ───────────────────────────────────────── */
async function handleRegister(event) {
  event.preventDefault();

  const first           = byId('firstName')?.value.trim()         || '';
  const last            = byId('lastName')?.value.trim()          || '';
  const email           = byId('registerEmail')?.value.trim()     || '';
  const phone           = byId('phone')?.value.trim()             || '';
  const password        = byId('registerPassword')?.value         || '';
  const confirmPassword = byId('confirmPassword')?.value          || '';
  const agreedToTerms   = !!byId('agreeTerms')?.checked;
  const submitBtn       = event.target.querySelector('button[type="submit"]');

  if (!first || !last)          return showError('Please enter your full name.');
  if (!validateEmail(email))    return showError('Please enter a valid email address.');
  if (!validatePhone(phone))    return showError('Please enter a valid phone number (min 10 digits).');
  if (password.length < 8)      return showError('Password must be at least 8 characters.');
  if (!/[A-Z]/.test(password))  return showError('Password must contain at least one uppercase letter.');
  if (!/[0-9]/.test(password))  return showError('Password must contain at least one number.');
  if (password !== confirmPassword) return showError('Passwords do not match.');
  if (!agreedToTerms)           return showError('Please agree to the Terms & Conditions.');

  setButtonLoading(submitBtn, true, 'Create Account');

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: first, lastName: last, email, phone, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      const msg = data.errors?.map(e => e.message).join(', ') || data.message || 'Registration failed.';
      showError(msg);
      setButtonLoading(submitBtn, false, 'Create Account');
      return;
    }

    if (data.requireOtp) {
      showSuccess('✅ Code sent! Check your email.');
      showOtpPanel(data.email || email);
    } else {
      saveAuthData(data);
      showSuccess(`🎉 Account created! Welcome! Redirecting...`);
      setTimeout(() => { window.location.href = '../dashboard/dash.html'; }, REDIRECT_DELAY);
    }
    
    event.target.reset();
  } catch (err) {
    console.error('Register network error:', err);
    showError('Cannot connect to server. Make sure backend is running on port 5000.');
  } finally {
    setButtonLoading(submitBtn, false, 'Create Account');
  }
}

/* ─── OTP Handlers ───────────────────────────────────────────── */
function setupOtpInputs() {
  const inputs = document.querySelectorAll('.otp-digit');
  inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      if (e.target.value.length > 1) {
        e.target.value = e.target.value.slice(0, 1);
      }
      if (e.target.value !== '' && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
        inputs[index - 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text').slice(0, 6);
      if (/^\d+$/.test(pastedData)) {
        pastedData.split('').forEach((char, i) => {
          if (inputs[i]) inputs[i].value = char;
        });
        if (pastedData.length === 6) inputs[5].focus();
      }
    });
  });
}

async function handleVerifyOtp(event) {
  event.preventDefault();
  
  const inputs = document.querySelectorAll('.otp-digit');
  let otp = '';
  inputs.forEach(input => otp += input.value);

  if (otp.length !== 6) return showError('Please enter all 6 digits of the verification code.');

  const submitBtn = event.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true, 'Verify & Proceed');

  try {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingVerificationEmail, otp }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showError(data.message || 'Verification failed. Please try again.');
      setButtonLoading(submitBtn, false, 'Verify & Proceed');
      return;
    }

    saveAuthData(data);
    showSuccess('🎉 Email verified successfully! Redirecting...');
    
    setTimeout(() => {
      window.location.href = '../dashboard/dash.html';
    }, REDIRECT_DELAY);

  } catch (err) {
    showError('Cannot connect to server.');
    setButtonLoading(submitBtn, false, 'Verify & Proceed');
  }
}

async function handleResendOtp(event) {
  event.preventDefault();
  if (!pendingVerificationEmail) return showError('Email not found. Please try registering again.');

  const resendBtn = event.target;
  resendBtn.style.pointerEvents = 'none';
  resendBtn.style.opacity = '0.5';

  try {
    const res = await fetch(`${API_BASE}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingVerificationEmail }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showSuccess('✅ New code sent to your email.');
    } else {
      showError(data.message || 'Failed to resend code.');
    }
  } catch (err) {
    showError('Cannot connect to server.');
  } finally {
    setTimeout(() => {
      resendBtn.style.pointerEvents = 'auto';
      resendBtn.style.opacity = '1';
    }, 10000); // 10s cooldown
  }
}

/* ─── Password Strength ──────────────────────────────────────── */
function checkPasswordStrength() {
  const pass = byId('registerPassword')?.value || '';
  const map = {
    weak:   { text: 'Weak',   color: '#ef4444', width: '33%' },
    medium: { text: 'Medium', color: '#f59e0b', width: '66%' },
    strong: { text: 'Strong', color: '#10b981', width: '100%' },
  };
  let score = 0;
  if (pass.length >= 8)         score++;
  if (/[A-Z]/.test(pass))       score++;
  if (/[a-z]/.test(pass))       score++;
  if (/[0-9]/.test(pass))       score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  const level = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';
  const s = map[level];
  const fill = document.querySelector('.strength-fill');
  const text = document.querySelector('.strength-text');
  if (fill) { fill.style.width = s.width; fill.style.backgroundColor = s.color; }
  if (text) { text.textContent = s.text; text.style.color = s.color; }
}

function checkPasswordMatch() {
  const pass    = byId('registerPassword')?.value || '';
  const confirm = byId('confirmPassword');
  if (!confirm || confirm.value.length === 0) return;
  confirm.style.borderColor = pass === confirm.value ? '#10b981' : '#ef4444';
}

function togglePassword(fieldId) {
  const field = byId(fieldId);
  const icon  = field?.nextElementSibling?.querySelector('i');
  if (!field || !icon) return;
  field.type = field.type === 'password' ? 'text' : 'password';
  icon.classList.toggle('fa-eye');
  icon.classList.toggle('fa-eye-slash');
}

/* ─── Restore remembered email ───────────────────────────────── */
function restoreSavedLoginEmail() {
  const saved = localStorage.getItem('rememberMe_email');
  if (!saved) return;
  const emailInput  = byId('loginEmail');
  const rememberBox = byId('rememberMe');
  if (emailInput)  emailInput.value = saved;
  if (rememberBox) rememberBox.checked = true;
}

function attachPhoneFormatter() {
  const phoneInput = byId('phone');
  if (!phoneInput) return;
  phoneInput.addEventListener('input', (e) => {
    e.target.value = formatPhone(e.target.value);
  });
}

function handleSocialLogin(event) {
  event.preventDefault();
  const btn = event.target.closest('button');
  if (!btn) return;
  const provider = [...btn.classList].find(c => ['google','facebook','github'].includes(c)) || 'social';
  showError(`${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth not configured yet. Please use email login.`);
}

/* ─── Bind all events ────────────────────────────────────────── */
function bindFormEvents() {
  byId('loginForm')?.addEventListener('submit',    handleLogin);
  byId('registerForm')?.addEventListener('submit', handleRegister);
  byId('otpForm')?.addEventListener('submit',      handleVerifyOtp);
  byId('resendOtpBtn')?.addEventListener('click',  handleResendOtp);
  
  byId('registerPassword')?.addEventListener('input', checkPasswordStrength);
  byId('confirmPassword')?.addEventListener('input',  checkPasswordMatch);
  byId('closeSuccessBtn')?.addEventListener('click',  closeSuccess);
  
  document.querySelectorAll('.social-btn').forEach((b) => b.addEventListener('click', handleSocialLogin));
  document.querySelectorAll('.toggle-password').forEach((b) => {
    b.addEventListener('click', () => {
      const fieldId = b.getAttribute('data-toggle-target');
      if (fieldId) togglePassword(fieldId);
    });
  });
}

/* ─── Init ───────────────────────────────────────────────────── */
function initAuth() {
  showLoginPanel();
  bindPanelSwitching();
  bindFormEvents();
  setupOtpInputs();
  restoreSavedLoginEmail();
  attachPhoneFormatter();
}

document.addEventListener('DOMContentLoaded', initAuth);

window.togglePassword = togglePassword;
window.closeSuccess   = closeSuccess;
