// Klarr — Shared Auth Module
// Handles login state, redirects, nav updates

import {
  auth, onAuthStateChanged, signOut,
  signUpWithEmail, signInWithEmail, signInWithGoogle, resetPassword
} from '/partners/firebase-init.js';

// Redirect to login if not authenticated (for protected pages)
export function requireAuth(redirectUrl) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = redirectUrl || '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    }
  });
}

// Redirect to dashboard if already logged in (for login/signup pages)
export function redirectIfAuthed(dashboardUrl) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || dashboardUrl || '/dashboard.html';
      window.location.href = redirect;
    }
  });
}

// Update nav bar based on auth state
export function updateNav() {
  const navRight = document.getElementById('nav-auth-area');
  if (!navRight) return;

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Logged in — show dashboard link + logout
      let name = user.displayName || 'Account';
      try {
        const { getCustomerProfile } = await import('/partners/firebase-init.js');
        const profile = await getCustomerProfile(user.uid);
        if (profile && profile.name) name = profile.name.split(' ')[0];
      } catch (e) {}

      navRight.innerHTML = `
        <a href="/dashboard.html" class="nav-ghost-btn" style="font-size:13px;color:var(--text-muted);padding:6px 12px;border:1px solid var(--border);border-radius:9999px;text-decoration:none;margin-right:8px;">Dashboard</a>
        <button id="nav-logout-btn" class="nav-cta" style="cursor:pointer;border:none;font-family:inherit;">Log out</button>
      `;
      document.getElementById('nav-logout-btn').addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = '/';
      });
    } else {
      // Not logged in — show login + sign up
      navRight.innerHTML = `
        <a href="/login.html" class="nav-login-link" style="font-size:13px;color:var(--text-muted);text-decoration:none;margin-right:16px;">Log in</a>
        <a href="/signup.html" class="nav-cta" style="cursor:pointer;border:none;font-family:inherit;">Sign up</a>
      `;
    }
  });
}

// Handle login form submission
export function setupLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    btn.disabled = true;
    btn.textContent = 'Logging in...';
    errorEl.style.display = 'none';

    try {
      await signInWithEmail(email, password);
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get('redirect') || '/dashboard.html';
    } catch (err) {
      errorEl.textContent = getAuthErrorMessage(err.code);
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Log in';
    }
  });

  // Google sign-in button
  const googleBtn = document.getElementById('google-login-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      try {
        await signInWithGoogle();
        const params = new URLSearchParams(window.location.search);
        window.location.href = params.get('redirect') || '/dashboard.html';
      } catch (err) {
        const errorEl = document.getElementById('login-error');
        errorEl.textContent = getAuthErrorMessage(err.code);
        errorEl.style.display = 'block';
      }
    });
  }

  // Forgot password
  const forgotLink = document.getElementById('forgot-password-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      if (!email) {
        document.getElementById('login-email').focus();
        return;
      }
      try {
        await resetPassword(email);
        alert('Password reset email sent. Check your inbox.');
      } catch (err) {
        alert(getAuthErrorMessage(err.code));
      }
    });
  }
}

// Handle signup form submission
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

    if (password.length < 6) {
      errorEl.textContent = 'Password must be at least 6 characters.';
      errorEl.style.display = 'block';
      return;
    }
    if (password !== confirm) {
      errorEl.textContent = 'Passwords do not match.';
      errorEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating account...';

    try {
      await signUpWithEmail(email, password, name);
      const { recordReferredSignup } = await import('/partners/firebase-init.js');
      await recordReferredSignup(email, 'growth');
      window.location.href = '/dashboard.html';
    } catch (err) {
      errorEl.textContent = getAuthErrorMessage(err.code);
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });

  // Google sign-up button
  const googleBtn = document.getElementById('google-signup-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      try {
        const user = await signInWithGoogle();
        const { recordReferredSignup } = await import('/partners/firebase-init.js');
        if (user.email) await recordReferredSignup(user.email, 'growth');
        window.location.href = '/dashboard.html';
      } catch (err) {
        const errorEl = document.getElementById('signup-error');
        errorEl.textContent = getAuthErrorMessage(err.code);
        errorEl.style.display = 'block';
      }
    });
  }
}

function getAuthErrorMessage(code) {
  const messages = {
    'auth/invalid-email': 'Invalid email address.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed. Try again.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
  };
  return messages[code] || 'Something went wrong. Please try again.';
}
