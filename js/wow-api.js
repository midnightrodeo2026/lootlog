/**
 * Midnight Rodeo — WoW Classic API client
 *
 * Character lookups go through the Blizzard proxy (api/blizzard-proxy)
 * so client secrets never ship to the browser.
 *
 * Item tooltips still use Wowhead TBC (domain=tbc) for loot icons/names.
 *
 * Config (optional window.LOOTLOG_CONFIG or config.js):
 * {
 *   blizzardProxyUrl: "https://lootlog-blizzard-proxy.<you>.workers.dev",
 *   region: "us",
 *   game: "classic",          // "classic" | "classic1x"
 *   defaultRealm: "benediction"
 * }
 */
(function (global) {
  const DEFAULTS = {
    blizzardProxyUrl: '',
    region: 'us',
    game: 'classic', // progressive classic (was TBC Classic during that phase)
    defaultRealm: '',
    locale: 'en_US',
  };

  function getConfig() {
    const c = Object.assign({}, DEFAULTS, global.LOOTLOG_CONFIG || {});
    // Persist lightweight UI prefs
    try {
      const realm = localStorage.getItem('lootlog-default-realm');
      const game = localStorage.getItem('lootlog-game');
      if (realm) c.defaultRealm = realm;
      if (game) c.game = game;
    } catch (_) {}
    return c;
  }

  function setUiPrefs({ realm, game }) {
    try {
      if (realm != null) localStorage.setItem('lootlog-default-realm', String(realm).trim());
      if (game != null) localStorage.setItem('lootlog-game', String(game).trim());
    } catch (_) {}
  }

  function proxyBase() {
    const url = (getConfig().blizzardProxyUrl || '').replace(/\/+$/, '');
    return url;
  }

  function isConfigured() {
    return !!proxyBase();
  }

  async function fetchJson(url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      const err = new Error(
        (data && (data.message || data.error)) || `HTTP ${res.status}`
      );
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  /**
   * Look up a single character on Classic armory via the proxy.
   * @param {string} name
   * @param {string} [realm]
   * @param {{ game?: string }} [opts]
   * @returns {Promise<{name,realm,class,spec,ilvl,race,guild,level,faction}>}
   */
  async function lookupCharacter(name, realm, opts) {
    const cfg = getConfig();
    const base = proxyBase();
    if (!base) {
      const err = new Error(
        'Set LOOTLOG_CONFIG.blizzardProxyUrl to your deployed api/blizzard-proxy worker.'
      );
      err.code = 'not_configured';
      throw err;
    }

    const r = (realm || cfg.defaultRealm || '').trim();
    const n = (name || '').trim();
    if (!n) throw new Error('Character name is required');
    if (!r) throw new Error('Realm is required (set default realm on the Roster tab)');

    const game = (opts && opts.game) || cfg.game || 'classic';
    const locale = cfg.locale || 'en_US';
    const url =
      `${base}/character/${encodeURIComponent(r)}/${encodeURIComponent(n)}` +
      `?game=${encodeURIComponent(game)}&locale=${encodeURIComponent(locale)}`;

    const data = await fetchJson(url);
    return data.character;
  }

  /**
   * Health-check the proxy (and whether secrets are present).
   */
  async function health() {
    const base = proxyBase();
    if (!base) return { ok: false, configured: false };
    try {
      const data = await fetchJson(`${base}/health`);
      return { ok: true, configured: true, ...data };
    } catch (e) {
      return { ok: false, configured: true, error: e.message };
    }
  }

  /**
   * Optional: resolve TBC item metadata via Wowhead (no API key, CORS *).
   * dataEnv=5 maps to TBC Classic on Wowhead's nether tooltip API.
   */
  const itemCache = new Map();
  async function lookupItemTbc(itemId) {
    const id = String(itemId || '').replace(/\D/g, '');
    if (!id) return null;
    if (itemCache.has(id)) return itemCache.get(id);

    try {
      const res = await fetch(
        `https://nether.wowhead.com/tooltip/item/${id}?dataEnv=5&locale=0`
      );
      if (!res.ok) {
        itemCache.set(id, null);
        return null;
      }
      const data = await res.json();
      const out = {
        id,
        name: data.name || `Item #${id}`,
        quality: data.quality,
        icon: data.icon,
        iconUrl: data.icon
          ? `https://wow.zamimg.com/images/wow/icons/large/${data.icon}.jpg`
          : '',
      };
      itemCache.set(id, out);
      return out;
    } catch {
      itemCache.set(id, null);
      return null;
    }
  }

  global.WowApi = {
    getConfig,
    setUiPrefs,
    isConfigured,
    lookupCharacter,
    health,
    lookupItemTbc,
  };
})(typeof window !== 'undefined' ? window : globalThis);
