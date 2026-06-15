// Klarr — Shared Auth Module v3
// Google redirect auth, admin checks, full logout

import {
  auth, onAuthStateChanged, signOut,
  signUpWithEmail, signInWithEmail, signInWithGoogle, resetPassword,
  getCustomerProfile, handleGoogleRedirect
} from '/partners/firebase-init.js';

// Check if current user is admin
export async function isAdmin() {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    const profile = await getCustomerProfile(user.uid);
    return profile && profile.role === 'admin';
  } catch (e) { return false; }
}

// Redirect to login if not authenticated
export function requireAuth(redirectUrl) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = redirectUrl || '/login?redirect=' + encodeURIComponent(window.location.pathname);
    }
  });
}

// Require admin access
export function requireAdmin() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    const profile = await getCustomerProfile(user.uid);
    if (!profile || profile.role !== 'admin') {
      window.location.href = '/dashboard';
    }
  });
}

// Redirect to dashboard if already logged in
export function redirectIfAuthed(dashboardUrl) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const profile = await getCustomerProfile(user.uid);
      const params = new URLSearchParams(window.location.search);
      if (profile && profile.role === 'admin') {
        window.location.href = params.get('redirect') || '/admin/';
      } else {
        window.location.href = params.get('redirect') || dashboardUrl || '/dashboard';
      }
    }
  });
}

// Update nav bar based on auth state
export function updateNav() {
  const navRight = document.getElementById('nav-auth-area');
  if (!navRight) return;

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      let name = 'Account';
      let isAdminUser = false;
      try {
        const profile = await getCustomerProfile(user.uid);
        if (profile) {
          if (profile.name) name = profile.name.split(' ')[0];
          if (profile.role === 'admin') isAdminUser = true;
        }
      } catch (e) {}

      let html = '';
      if (isAdminUser) {
        html += '<a href="/admin/" class="nav-ghost-btn nav-admin-link">Admin</a>';
      }
      html += '<a href="/dashboard" class="nav-ghost-btn">Dashboard</a>';
      html += '<button id="nav-logout-btn" class="nav-cta">Log out</button>';
      navRight.innerHTML = html;
      document.getElementById('nav-logout-btn').addEventListener('click', doLogout);
    } else {
      navRight.innerHTML = '<a href="/login" class="nav-login-link">Log in</a><a href="/signup" class="nav-cta">Sign up</a>';
    }
  });
}

// Full logout — clear everything
export async function doLogout() {
  try {
    // Clear all cookies
    document.cookie.split(';').forEach(c => {
      document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
    });
    // Clear localStorage
    localStorage.clear();
    // Clear sessionStorage
    sessionStorage.clear();
    // Firebase sign out
    await signOut(auth);
  } catch (e) { console.error('Logout error:', e); }
  window.location.href = '/';
}

// Handle login form
export function setupLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');
    btn.disabled = true; btn.textContent = 'Logging in...'; errorEl.style.display = 'none';

    try {
      const user = await signInWithEmail(email, password);
      const profile = await getCustomerProfile(user.uid);
      const params = new URLSearchParams(window.location.search);
      window.location.href = (profile && profile.role === 'admin') ? (params.get('redirect') || '/admin/') : (params.get('redirect') || '/dashboard');
    } catch (err) {
      errorEl.textContent = getAuthErrorMessage(err.code); errorEl.style.display = 'block'; btn.disabled = false; btn.textContent = 'Log in';
    }
  });

  const googleBtn = document.getElementById('google-login-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      try { await signInWithGoogle(); } catch (err) { showLoginError(err.code); }
    });
  }

  const forgotLink = document.getElementById('forgot-password-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      if (!email) { document.getElementById('login-email').focus(); return; }
      try { await resetPassword(email); alert('Password reset email sent. Check your inbox.'); } catch (err) { alert(getAuthErrorMessage(err.code)); }
    });
  }
}

// Handle signup form
export function setupSignupForm() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const errorEl = document.getElementById('signup-error');
    const btn = document.getElementById('signup-btn');
    errorEl.style.display = 'none';

    if (password.length < 6) { errorEl.textContent = 'Password must be at least 6 characters.'; errorEl.style.display = 'block'; return; }
    if (password !== confirm) { errorEl.textContent = 'Passwords do not match.'; errorEl.style.display = 'block'; return; }

    btn.disabled = true; btn.textContent = 'Creating account...';
    try {
      await signUpWithEmail(email, password, name);
      const { recordReferredSignup } = await import('/partners/firebase-init.js');
      await recordReferredSignup(email, 'growth');
      window.location.href = '/dashboard';
    } catch (err) { errorEl.textContent = getAuthErrorMessage(err.code); errorEl.style.display = 'block'; btn.disabled = false; btn.textContent = 'Create Account'; }
  });

  const googleBtn = document.getElementById('google-signup-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      try { await signInWithGoogle(); } catch (err) { showSignupError(err.code); }
    });
  }
}

function showLoginError(code) { const el = document.getElementById('login-error'); el.textContent = getAuthErrorMessage(code); el.style.display = 'block'; }
function showSignupError(code) { const el = document.getElementById('signup-error'); el.textContent = getAuthErrorMessage(code); el.style.display = 'block'; }

function getAuthErrorMessage(code) {
  const m = {
    'auth/invalid-email': 'Invalid email address.', 'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.', 'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.', 'auth/popup-closed-by-user': 'Sign-in was closed. Try again.',
    'auth/invalid-credential': 'Invalid email or password.', 'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/unauthorized-domain': 'Google sign-in is not configured for this domain yet. Please contact support or use email/password sign-in.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return m[code] || 'Something went wrong. Please try again.';
}
