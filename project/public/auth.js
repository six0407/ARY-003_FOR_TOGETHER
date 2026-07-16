// ARY Shared Auth Module — used by all public pages.
// Provides unified API fetching, login state, and header rendering.

// ====== API Helper: unwrap { success: true, data: ... } ======
async function safeFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  const body = await res.json();
  if (!body) return null;
  if (body.success !== undefined) {
    return body.success ? (body.data ?? null) : null;
  }
  return body;
}

// ====== Auth State ======
const AUTH = {
  get token() { return sessionStorage.getItem('ary_token'); },
  set token(v) { if (v) sessionStorage.setItem('ary_token', v); else sessionStorage.removeItem('ary_token'); },
  get user() {
    const raw = sessionStorage.getItem('ary_user');
    return raw ? JSON.parse(raw) : null;
  },
  set user(u) {
    if (u) sessionStorage.setItem('ary_user', JSON.stringify(u));
    else sessionStorage.removeItem('ary_user');
  },
  get loggedIn() { return !!this.token; },

  // Restore session from saved data
  restore() {
    const saved = sessionStorage.getItem('ary_token');
    if (saved) return true;
    // Check for OAuth callback token in URL
    if (window.location.hash.startsWith('#token=')) {
      const token = window.location.hash.replace('#token=', '');
      this.token = token;
      history.replaceState(null, '', window.location.pathname + window.location.search);
      return true;
    }
    return false;
  },

  // Login via GitHub OAuth
  login() { window.location.href = '/api/auth/github'; },

  // Logout
  logout() {
    this.token = null;
    this.user = null;
    window.location.reload();
  },

  // Fetch current user info from API
  async fetchMe() {
    if (!this.token) return null;
    const data = await safeFetch('/api/users/me', {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (data) this.user = data;
    return data;
  },
};

// ====== Render login/logout button in header ======
function renderAuthButton(containerId = 'auth-area') {
  const area = document.getElementById(containerId);
  if (!area) return;

  const u = AUTH.user;
  if (u) {
    const roleLabels = (u.roles || []).map(r =>
      ({ rider: '🏇', judge: '⚖️', organizer: '📋', admin: '🔧' }[r] || r)
    ).join(' ');
    area.innerHTML = `
      <a href="/console" class="btn btn-outline btn-sm" style="text-decoration:none;">
        ${u.avatar_url ? `<img src="${u.avatar_url}" style="width:20px;height:20px;border-radius:50%;vertical-align:middle;margin-right:4px;">` : ''}
        ${u.display_name || u.github_account_id}
        ${roleLabels ? `<span class="role-badge-sm">${roleLabels}</span>` : ''}
      </a>
      <button onclick="AUTH.logout()" class="btn btn-ghost btn-sm">退出</button>`;
  } else {
    area.innerHTML = `<button onclick="AUTH.login()" class="btn btn-outline btn-sm">Login with GitHub</button>`;
  }
}

// ====== Init auth on page load ======
async function initAuth() {
  if (AUTH.restore()) {
    await AUTH.fetchMe();
  }
  renderAuthButton();
}
