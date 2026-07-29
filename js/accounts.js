/**
 * Midnight Rodeo — simple admin password (no multi-accounts)
 * Password is NEVER stored in plain text — only salted SHA-256 hash.
 *
 * Admin unlocks loot edits + settings. Guests can view.
 */
(function (global) {
  const SESSION_KEY = 'midnight-rodeo-admin-session-v2';
  const SETTINGS_KEY = 'midnight-rodeo-settings-v1';

  /** Fixed salted hash of the guild admin password (not reversible). */
  const ADMIN = {
    salt: 'mr-tbc-admin-v1',
    // SHA-256(salt + '::' + password)
    hash: '7492ff8e83a4a91f1eecfaa98ae2244ba5fbbd01e6a05a31387ade337e4e56f6',
  };

  const DEFAULT_SETTINGS = {
    guildName: 'Midnight Rodeo',
    realm: '',
    game: 'classic',
    region: 'us',
    requireLogin: false,
    publicCanView: true,
    officersCanEditRoster: true,
    officersCanGearSync: true,
    viewersCanExport: true,
    themeAccent: 'amber',
    registeredAt: null,
    raidHelperEventUrl: '',
  };

  async function hashPassword(password, salt) {
    const enc = new TextEncoder();
    const data = enc.encode(String(salt) + '::' + String(password));
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const s = raw ? JSON.parse(raw) : {};
      return Object.assign({}, DEFAULT_SETTINGS, s || {});
    } catch {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function loadSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || s.role !== 'admin' || !s.ok) return null;
      return {
        userId: 'admin',
        username: 'admin',
        displayName: 'Admin',
        role: 'admin',
        remembered: !!s.remembered,
      };
    } catch {
      return null;
    }
  }

  function saveSession(remember) {
    const payload = JSON.stringify({
      ok: true,
      role: 'admin',
      remembered: !!remember,
      at: new Date().toISOString(),
    });
    sessionStorage.setItem(SESSION_KEY, payload);
    if (remember) localStorage.setItem(SESSION_KEY, payload);
    else localStorage.removeItem(SESSION_KEY);
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  function getSession() {
    return loadSession();
  }

  /** No multi-account setup — always false */
  function isSetupNeeded() {
    return false;
  }

  async function login(username, password, remember) {
    // Accept empty username or "admin"
    const u = String(username || '').trim().toLowerCase();
    if (u && u !== 'admin') {
      throw new Error('Use the admin password (username optional)');
    }
    const h = await hashPassword(password, ADMIN.salt);
    if (h !== ADMIN.hash) throw new Error('Wrong admin password');
    saveSession(!!remember);
    return getSession();
  }

  /** Kept for API compatibility — not used */
  async function createFirstAdmin() {
    throw new Error('Accounts disabled — use the admin password to log in');
  }

  function logout() {
    clearSession();
  }

  function listUsers() {
    return [
      {
        id: 'admin',
        username: 'admin',
        displayName: 'Admin',
        role: 'admin',
        active: true,
        createdAt: null,
        lastLoginAt: null,
      },
    ];
  }

  function requireAdmin() {
    const s = getSession();
    if (!s || s.role !== 'admin') throw new Error('Admin only');
    return s;
  }

  async function createUser() {
    throw new Error('Multi-accounts disabled — single admin password only');
  }
  async function updateUser() {
    throw new Error('Multi-accounts disabled');
  }
  async function deleteUser() {
    throw new Error('Multi-accounts disabled');
  }

  /** Optional: change is not supported with fixed hash (guild password is set in deploy) */
  async function changeOwnPassword() {
    throw new Error(
      'Admin password is fixed in the app (encrypted hash). Ask Hornyslewt to rotate if needed.'
    );
  }

  function updateSettings(patch) {
    requireAdmin();
    const settings = Object.assign(loadSettings(), patch || {});
    saveSettings(settings);
    return settings;
  }

  function getSettings() {
    return loadSettings();
  }

  function can(action) {
    const s = getSession();
    const settings = loadSettings();
    if (!s) {
      if (settings.requireLogin) return false;
      if (action === 'view') return settings.publicCanView !== false;
      if (action === 'export') return settings.publicCanView !== false && settings.viewersCanExport !== false;
      return false;
    }
    // Logged-in admin can do everything
    if (s.role === 'admin') return true;
    return false;
  }

  function canEdit() {
    return can('editLoot');
  }

  async function migrateLegacyAuth() {
    // Clear old multi-account keys so they don't confuse anything
    try {
      localStorage.removeItem('midnight-rodeo-users-v1');
      localStorage.removeItem('midnight-rodeo-lootmaster-auth');
    } catch (_) {}
    return false;
  }

  function exportAccountsBundle() {
    requireAdmin();
    return {
      mode: 'single-admin-hash',
      settings: loadSettings(),
      exportedAt: new Date().toISOString(),
    };
  }

  function importAccountsBundle(data) {
    requireAdmin();
    if (data && data.settings) saveSettings(Object.assign(loadSettings(), data.settings));
  }

  function roleLabel(role) {
    return role === 'admin' ? 'Admin' : role || 'Guest';
  }

  global.Accounts = {
    ROLES: [{ id: 'admin', label: 'Admin', level: 40 }],
    roleLevel: (r) => (r === 'admin' ? 40 : 0),
    roleLabel,
    isSetupNeeded,
    createFirstAdmin,
    login,
    logout,
    getSession,
    listUsers,
    createUser,
    updateUser,
    deleteUser,
    changeOwnPassword,
    getSettings,
    updateSettings,
    can,
    canEdit,
    migrateLegacyAuth,
    exportAccountsBundle,
    importAccountsBundle,
  };
})(typeof window !== 'undefined' ? window : globalThis);
