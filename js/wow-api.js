/**
 * Midnight Rodeo — WoW Classic API client
 * Characters: Blizzard proxy  |  Items: Wowhead TBC (nether tooltip API)
 */
(function (global) {
  const DEFAULTS = {
    blizzardProxyUrl: '',
    region: 'us',
    game: 'classic',
    defaultRealm: '',
    locale: 'en_US',
    guildName: 'Midnight Rodeo',
  };

  const QUALITY_NAMES = {
    0: 'Poor',
    1: 'Common',
    2: 'Uncommon',
    3: 'Rare',
    4: 'Epic',
    5: 'Legendary',
    6: 'Artifact',
    7: 'Heirloom',
  };

  function getConfig() {
    const c = Object.assign({}, DEFAULTS, global.LOOTLOG_CONFIG || {});
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
    return (getConfig().blizzardProxyUrl || '').replace(/\/+$/, '');
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
      const err = new Error((data && (data.message || data.error)) || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

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
    if (!r) throw new Error('Realm is required');

    const game = (opts && opts.game) || cfg.game || 'classic';
    const locale = cfg.locale || 'en_US';
    const url =
      `${base}/character/${encodeURIComponent(r)}/${encodeURIComponent(n)}` +
      `?game=${encodeURIComponent(game)}&locale=${encodeURIComponent(locale)}`;
    const data = await fetchJson(url);
    return data.character;
  }

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

  function parseIlvlFromTooltip(html) {
    if (!html) return null;
    // Wowhead: Item Level <!--ilvl-->115  or plain "Item Level 115"
    let m = String(html).match(/Item Level\s*(?:<!--ilvl-->)?\s*(\d+)/i);
    if (m) return Number(m[1]);
    m = String(html).match(/<!--ilvl-->(\d+)/i);
    return m ? Number(m[1]) : null;
  }

  const itemCache = new Map();
  const ITEM_CACHE_KEY = 'lootlog-item-cache-v1';

  function loadDiskCache() {
    try {
      const raw = localStorage.getItem(ITEM_CACHE_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      Object.keys(obj).forEach((id) => itemCache.set(id, obj[id]));
    } catch (_) {}
  }

  function saveDiskCache() {
    try {
      const obj = {};
      let n = 0;
      itemCache.forEach((v, k) => {
        if (v && n < 800) {
          obj[k] = v;
          n++;
        }
      });
      localStorage.setItem(ITEM_CACHE_KEY, JSON.stringify(obj));
    } catch (_) {}
  }

  loadDiskCache();

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
      const q = typeof data.quality === 'number' ? data.quality : null;
      const out = {
        id,
        name: data.name || `Item #${id}`,
        quality: q,
        qualityName: q != null ? QUALITY_NAMES[q] || String(q) : '',
        icon: data.icon || '',
        iconUrl: data.icon
          ? `https://wow.zamimg.com/images/wow/icons/large/${data.icon}.jpg`
          : '',
        ilvl: parseIlvlFromTooltip(data.tooltip),
      };
      itemCache.set(id, out);
      saveDiskCache();
      return out;
    } catch {
      itemCache.set(id, null);
      return null;
    }
  }

  /** Resolve many item IDs with mild concurrency */
  async function lookupItemsTbc(ids, { concurrency = 6, onProgress } = {}) {
    const unique = [...new Set((ids || []).map((x) => String(x).replace(/\D/g, '')).filter(Boolean))];
    const results = {};
    let done = 0;
    let i = 0;

    async function worker() {
      while (i < unique.length) {
        const idx = i++;
        const id = unique[idx];
        results[id] = await lookupItemTbc(id);
        done++;
        if (onProgress) onProgress(done, unique.length);
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, unique.length || 1) }, () =>
      worker()
    );
    await Promise.all(workers);
    return results;
  }

  global.WowApi = {
    getConfig,
    setUiPrefs,
    isConfigured,
    lookupCharacter,
    health,
    lookupItemTbc,
    lookupItemsTbc,
    QUALITY_NAMES,
  };
})(typeof window !== 'undefined' ? window : globalThis);
