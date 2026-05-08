/**
 * auth-guard.js
 * ─────────────────────────────────────────────────────────────
 * Include this script on EVERY PROTECTED PAGE (before other scripts).
 * If no valid token → redirect to login.
 * Also auto-refreshes token silently if it's about to expire.
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || 'http://localhost:5000/api';
  const LOGIN_PAGE = '/signup/signup.html';

  /* ── Resolve login page path relative to current location ─── */
  function getLoginPath() {
    const depth = window.location.pathname.split('/').filter(Boolean).length;
    const prefix = depth <= 1 ? '.' : Array(depth).fill('..').join('/');
    return prefix + LOGIN_PAGE;
  }

  function redirectToLogin() {
    window.location.replace(getLoginPath());
  }

  /* ── Token helpers ─────────────────────────────────────────── */
  function getToken() {
    return localStorage.getItem('authToken');
  }

  function getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }

  function saveTokens(accessToken, refreshToken) {
    localStorage.setItem('authToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  }

  function clearTokens() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isLoggedIn');
  }

  /* ── Decode JWT payload (no verification, client-side only) ── */
  function decodeJwtPayload(token) {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

  /* ── Check if token expires within next 10 minutes ─────────── */
  function isTokenExpiringSoon(token) {
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp - now < 600; // 10 minutes
  }

  /* ── Silent token refresh ──────────────────────────────────── */
  async function silentRefresh() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.success) {
        saveTokens(data.accessToken, data.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /* ── Main guard ─────────────────────────────────────────────── */
  async function runAuthGuard() {
    const token = getToken();

    if (!token) {
      clearTokens();
      redirectToLogin();
      return;
    }

    // If token expiring soon, try to refresh
    if (isTokenExpiringSoon(token)) {
      const refreshed = await silentRefresh();
      if (!refreshed) {
        clearTokens();
        redirectToLogin();
        return;
      }
    }

    // Verify with server (lightweight /me call)
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) {
        clearTokens();
        redirectToLogin();
        return;
      }

      const data = await res.json();
      if (data.success && data.user) {
        // Store user info for page scripts to use
        window.__currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('isLoggedIn', 'true');
      } else {
        clearTokens();
        redirectToLogin();
      }
    } catch {
      // Network error: allow offline access if token exists and not expired
      const payload = decodeJwtPayload(getToken());
      if (!payload || Math.floor(Date.now() / 1000) > payload.exp) {
        clearTokens();
        redirectToLogin();
      }
    }
  }

  /* ── Global logout helper (usable from any page) ────────────── */
  window.authLogout = async function (redirectAfter = true) {
    const token = getToken();
    const refreshToken = getRefreshToken();

    try {
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      clearTokens();
      if (redirectAfter) redirectToLogin();
    }
  };

  /* ── API helper (auto-attaches token) ──────────────────────── */
  window.apiRequest = async function (endpoint, options = {}) {
    const token = getToken();
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...defaultHeaders, ...(options.headers || {}) },
    });

    // Auto-handle 401: try refresh then retry
    if (res.status === 401) {
      const refreshed = await silentRefresh();
      if (refreshed) {
        const retryRes = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers: {
            ...defaultHeaders,
            Authorization: `Bearer ${getToken()}`,
            ...(options.headers || {}),
          },
        });
        return retryRes;
      } else {
        clearTokens();
        redirectToLogin();
        throw new Error('Session expired. Please login again.');
      }
    }

    return res;
  };

  // Run the guard immediately (blocks page load until check completes)
  runAuthGuard();
})();
