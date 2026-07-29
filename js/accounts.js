/**
 * Midnight Rodeo — multi-account auth + guild settings (client-side)
 * Roles: admin > lootmaster > officer > viewer
 *
 * Note: This is browser-local auth (localStorage). It stops casual edits,
 * not a determined attacker with DevTools. Use a real backend for true security.
 */
(function (global) {
  const USERS_KEY = 'midnight-rodeo-users-v1';
  const SETTINGS_KEY = 'midnight-rodeo-settings-v1';
  const SESSION_KEY = 'midnight-rodeo-session-v1';

  const ROLES = [
    { id: 'admin', label: 'Admin', level: 40 },
    { id: 'lootmaster', label: 'Lootmaster', level: 30 },
    { id: 'officer', label: 'Officer', level: 20 },
    { id: 'viewer', label: 'Viewer', level: 10 },
  ];

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
  };

  function roleLevel(role) {
    const r = ROLES.find((x) => x.id === role);
    return r ? r.level : 0;
  }

  function roleLabel(role) {
    const r = ROLES.find((x) => x.id === role);
    return r ? r.label : role || '—';
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function randomSalt() {
    const a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return Array.from(a)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function hashPassword(password, salt) {
    const enc = new TextEncoder();
    const data = enc.encode(String(salt) + '::' + String(password));
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function loadUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
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
      // sessionStorage so closing the tab logs out; also check localStorage "remember me"
      const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !s.userId) return null;
      const user = loadUsers().find((u) => u.id === s.userId && u.active !== false);
      if (!user) return null;
      return {
        userId: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        role: user.role,
        remembered: !!s.remembered,
      };
    } catch {
      return null;
    }
  }

  function saveSession(session, remember) {
    const payload = JSON.stringify({
      userId: session.userId,
      username: session.username,
      role: session.role,
      remembered: !!remember,
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

  function isSetupNeeded() {
    return loadUsers().length === 0;
  }

  async function createFirstAdmin({ username, password, displayName }) {
    if (!isSetupNeeded()) throw new Error('Accounts already exist');
    const u = String(username || '').trim().toLowerCase();
    const p = String(password || '');
    if (u.length < 3) throw new Error('Username needs at least 3 characters');
    if (p.length < 4) throw new Error('Password needs at least 4 characters');
    const salt = randomSalt();
    const passwordHash = await hashPassword(p, salt);
    const user = {
      id: uid(),
      username: u,
      displayName: (displayName || username || u).trim(),
      role: 'admin',
      salt,
      passwordHash,
      active: true,
      createdAt: new Date().toISOString(),
    };
    saveUsers([user]);
    const settings = loadSettings();
    if (!settings.registeredAt) {
      settings.registeredAt = new Date().toISOString();
      saveSettings(settings);
    }
    saveSession(
      { userId: user.id, username: user.username, role: user.role },
      true
    );
    return getSession();
  }

  async function login(username, password, remember) {
    const u = String(username || '').trim().toLowerCase();
    const users = loadUsers();
    const user = users.find((x) => x.username === u && x.active !== false);
    if (!user) throw new Error('Invalid username or password');
    const hash = await hashPassword(password, user.salt);
    if (hash !== user.passwordHash) throw new Error('Invalid username or password');
    user.lastLoginAt = new Date().toISOString();
    saveUsers(users);
    saveSession(
      { userId: user.id, username: user.username, role: user.role },
      !!remember
    );
    return getSession();
  }

  function logout() {
    clearSession();
  }

  function listUsers() {
    return loadUsers().map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName || u.username,
      role: u.role,
      active: u.active !== false,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt || null,
    }));
  }

  function requireAdmin() {
    const s = getSession();
    if (!s || s.role !== 'admin') throw new Error('Admin only');
    return s;
  }

  async function createUser({ username, password, displayName, role }, actor) {
    const session = actor || getSession();
    if (!session || session.role !== 'admin') throw new Error('Admin only');
    const u = String(username || '').trim().toLowerCase();
    const p = String(password || '');
    const r = role || 'viewer';
    if (!ROLES.some((x) => x.id === r)) throw new Error('Invalid role');
    if (u.length < 3) throw new Error('Username needs at least 3 characters');
    if (p.length < 4) throw new Error('Password needs at least 4 characters');
    const users = loadUsers();
    if (users.some((x) => x.username === u)) throw new Error('Username already exists');
    const salt = randomSalt();
    const passwordHash = await hashPassword(p, salt);
    const user = {
      id: uid(),
      username: u,
      displayName: (displayName || username || u).trim(),
      role: r,
      salt,
      passwordHash,
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: session.username,
    };
    users.push(user);
    saveUsers(users);
    return listUsers().find((x) => x.id === user.id);
  }

  async function updateUser(userId, patch) {
    requireAdmin();
    const users = loadUsers();
    const user = users.find((x) => x.id === userId);
    if (!user) throw new Error('User not found');
    if (patch.displayName != null) user.displayName = String(patch.displayName).trim() || user.username;
    if (patch.role != null) {
      if (!ROLES.some((x) => x.id === patch.role)) throw new Error('Invalid role');
      // prevent demoting last admin
      if (user.role === 'admin' && patch.role !== 'admin') {
        const admins = users.filter((x) => x.role === 'admin' && x.active !== false && x.id !== userId);
        if (!admins.length) throw new Error('Cannot demote the last admin');
      }
      user.role = patch.role;
    }
    if (patch.active != null) {
      if (user.role === 'admin' && patch.active === false) {
        const admins = users.filter((x) => x.role === 'admin' && x.active !== false && x.id !== userId);
        if (!admins.length) throw new Error('Cannot disable the last admin');
      }
      user.active = !!patch.active;
    }
    if (patch.password) {
      if (String(patch.password).length < 4) throw new Error('Password needs at least 4 characters');
      user.salt = randomSalt();
      user.passwordHash = await hashPassword(patch.password, user.salt);
    }
    saveUsers(users);
    // refresh session if self
    const s = getSession();
    if (s && s.userId === userId) {
      saveSession(
        { userId: user.id, username: user.username, role: user.role },
        s.remembered
      );
    }
    return listUsers().find((x) => x.id === userId);
  }

  async function deleteUser(userId) {
    const session = requireAdmin();
    const users = loadUsers();
    const user = users.find((x) => x.id === userId);
    if (!user) throw new Error('User not found');
    if (user.id === session.userId) throw new Error('Cannot delete your own account');
    if (user.role === 'admin') {
      const admins = users.filter((x) => x.role === 'admin' && x.active !== false && x.id !== userId);
      if (!admins.length) throw new Error('Cannot delete the last admin');
    }
    saveUsers(users.filter((x) => x.id !== userId));
  }

  async function changeOwnPassword(currentPassword, newPassword) {
    const s = getSession();
    if (!s) throw new Error('Not logged in');
    const users = loadUsers();
    const user = users.find((x) => x.id === s.userId);
    if (!user) throw new Error('User not found');
    const cur = await hashPassword(currentPassword, user.salt);
    if (cur !== user.passwordHash) throw new Error('Current password is wrong');
    if (String(newPassword || '').length < 4) throw new Error('New password needs at least 4 characters');
    user.salt = randomSalt();
    user.passwordHash = await hashPassword(newPassword, user.salt);
    saveUsers(users);
  }

  function updateSettings(patch) {
    const s = getSession();
    if (!s || s.role !== 'admin') throw new Error('Admin only');
    const settings = Object.assign(loadSettings(), patch || {});
    saveSettings(settings);
    return settings;
  }

  function getSettings() {
    return loadSettings();
  }

  /** Permission helpers */
  function can(action) {
    const s = getSession();
    const settings = loadSettings();
    const role = s ? s.role : null;
    const lvl = roleLevel(role);

    // Public / not logged in
    if (!s) {
      if (settings.requireLogin) return false;
      if (action === 'view') return settings.publicCanView !== false;
      if (action === 'export') return settings.publicCanView !== false && settings.viewersCanExport !== false;
      return false;
    }

    switch (action) {
      case 'view':
        return true;
      case 'export':
        return lvl >= 10 && (role !== 'viewer' || settings.viewersCanExport !== false);
      case 'gearSync':
        return lvl >= 30 || (role === 'officer' && settings.officersCanGearSync !== false);
      case 'editRoster':
        return lvl >= 30 || (role === 'officer' && settings.officersCanEditRoster !== false);
      case 'editLoot':
        return lvl >= 30; // lootmaster+
      case 'manageUsers':
      case 'manageSettings':
        return role === 'admin';
      default:
        return false;
    }
  }

  function canEdit() {
    return can('editLoot');
  }

  /** Migrate legacy single lootmaster password into admin account if present */
  async function migrateLegacyAuth() {
    if (!isSetupNeeded()) return false;
    try {
      const raw = localStorage.getItem('midnight-rodeo-lootmaster-auth');
      if (!raw) return false;
      // can't recover plain password from hash — leave setup wizard
      return false;
    } catch {
      return false;
    }
  }

  function exportAccountsBundle() {
    // passwords hashes included for backup restore — admin only
    requireAdmin();
    return {
      users: loadUsers(),
      settings: loadSettings(),
      exportedAt: new Date().toISOString(),
    };
  }

  function importAccountsBundle(data, { merge } = {}) {
    requireAdmin();
    if (!data || !Array.isArray(data.users)) throw new Error('Invalid accounts backup');
    if (merge) {
      const existing = loadUsers();
      const byName = new Map(existing.map((u) => [u.username, u]));
      data.users.forEach((u) => {
        if (!u.username || !u.passwordHash || !u.salt) return;
        byName.set(u.username, u);
      });
      saveUsers([...byName.values()]);
    } else {
      saveUsers(data.users);
    }
    if (data.settings) saveSettings(Object.assign(loadSettings(), data.settings));
  }

  global.Accounts = {
    ROLES,
    roleLevel,
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
