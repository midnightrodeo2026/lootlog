/**
 * Midnight Rodeo — WoW API client
 * Characters: Blizzard proxy
 * Items: Wowhead nether tooltip API (multi-expansion)
 *
 * Gargul simple format: date,player,itemId
 *   2026-03-20,Aerindel,219333
 */
(function (global) {
  const DEFAULTS = {
    blizzardProxyUrl: '',
    region: 'us',
    game: 'classic',
    defaultRealm: '',
    locale: 'en_US',
    guildName: 'Midnight Rodeo',
    // Prefer order for item lookup. Retail first — modern Gargul IDs (200k+) are current content.
    itemDataEnvs: [1, 2, 5, 8, 9, 3, 4],
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

  /** dataEnv → wowhead path domain for links / tooltips */
  const ENV_DOMAIN = {
    1: '', // retail
    2: 'classic',
    3: 'ptr',
    4: 'beta',
    5: 'tbc',
    8: 'wotlk',
    9: 'cata',
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
    let m = String(html).match(/Item Level\s*(?:<!--ilvl-->)?\s*(\d+)/i);
    if (m) return Number(m[1]);
    m = String(html).match(/<!--ilvl-->(\d+)/i);
    return m ? Number(m[1]) : null;
  }

  function wowheadItemUrl(itemId, domain) {
    const id = encodeURIComponent(String(itemId || '').replace(/\D/g, ''));
    if (!id) return '';
    const d = domain || '';
    if (!d) return `https://www.wowhead.com/item=${id}`;
    return `https://www.wowhead.com/${d}/item=${id}`;
  }

  function wowheadDataAttr(domain) {
    // tooltips.js: data-wowhead="domain=tbc" or omit for retail
    if (!domain) return '';
    return ` data-wowhead="domain=${domain}"`;
  }

  const itemCache = new Map();
  const ITEM_CACHE_KEY = 'lootlog-item-cache-v2';

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
        if (v && n < 1000) {
          obj[k] = v;
          n++;
        }
      });
      localStorage.setItem(ITEM_CACHE_KEY, JSON.stringify(obj));
    } catch (_) {}
  }

  loadDiskCache();

  async function fetchTooltip(id, dataEnv) {
    const res = await fetch(
      `https://nether.wowhead.com/tooltip/item/${id}?dataEnv=${dataEnv}&locale=0`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.name) return null;
    return data;
  }

  /**
   * Resolve item by ID across expansions until one hits.
   * Your sample IDs (219333 etc.) are current retail — dataEnv 1.
   */
  async function lookupItem(itemId) {
    const id = String(itemId || '').replace(/\D/g, '');
    if (!id) return null;
    if (itemCache.has(id)) return itemCache.get(id);

    const envs = getConfig().itemDataEnvs || DEFAULTS.itemDataEnvs;
    for (const dataEnv of envs) {
      try {
        const data = await fetchTooltip(id, dataEnv);
        if (!data) continue;
        const q = typeof data.quality === 'number' ? data.quality : null;
        const domain = ENV_DOMAIN[dataEnv] != null ? ENV_DOMAIN[dataEnv] : '';
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
          dataEnv,
          domain,
          url: wowheadItemUrl(id, domain),
        };
        itemCache.set(id, out);
        saveDiskCache();
        return out;
      } catch {
        /* try next env */
      }
    }

    itemCache.set(id, null);
    return null;
  }

  // Back-compat alias
  const lookupItemTbc = lookupItem;

  async function lookupItems(ids, { concurrency = 6, onProgress } = {}) {
    const unique = [
      ...new Set((ids || []).map((x) => String(x).replace(/\D/g, '')).filter(Boolean)),
    ];
    const results = {};
    let done = 0;
    let i = 0;

    async function worker() {
      while (i < unique.length) {
        const idx = i++;
        const id = unique[idx];
        results[id] = await lookupItem(id);
        done++;
        if (onProgress) onProgress(done, unique.length);
      }
    }

    const workers = Array.from(
      { length: Math.min(concurrency, unique.length || 1) },
      () => worker()
    );
    await Promise.all(workers);
    return results;
  }

  const lookupItemsTbc = lookupItems;

  /**
   * Pure Gargul simple-line parser for tests & shared use.
   * Supports: date,player,itemId  and  date,player,itemName
   */
  function parseGargulSimpleLine(line) {
    if (!line || !String(line).trim()) return null;
    const cells = [];
    let cur = '',
      q = false;
    const s = String(line).trim();
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '"') {
        q = !q;
        continue;
      }
      if ((ch === ',' || ch === '\t' || ch === ';') && !q) {
        cells.push(cur.trim());
        cur = '';
        continue;
      }
      cur += ch;
    }
    cells.push(cur.trim());
    if (cells.length < 2) return null;

    const looksLikeDate = (x) =>
      /^\d{4}-\d{1,2}-\d{1,2}/.test(x) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(x);
    const looksLikeId = (x) => /^\d{3,}$/.test(x);

    // Fast path: exactly date, player, itemId
    if (cells.length >= 3 && looksLikeDate(cells[0]) && looksLikeId(cells[2])) {
      return {
        date: cells[0],
        player: cells[1],
        itemId: cells[2].replace(/\D/g, ''),
        itemName: '',
        rollType: cells[3] || '',
      };
    }
    // date, player, itemName
    if (cells.length >= 3 && looksLikeDate(cells[0]) && !looksLikeId(cells[2])) {
      return {
        date: cells[0],
        player: cells[1],
        itemId: looksLikeId(cells[3] || '') ? cells[3].replace(/\D/g, '') : '',
        itemName: cells[2],
        rollType: cells[3] && !looksLikeId(cells[3]) ? cells[3] : cells[4] || '',
      };
    }
    // player, itemId (no date)
    if (cells.length === 2 && looksLikeId(cells[1])) {
      return {
        date: '',
        player: cells[0],
        itemId: cells[1].replace(/\D/g, ''),
        itemName: '',
        rollType: '',
      };
    }
    return null;
  }

  global.WowApi = {
    getConfig,
    setUiPrefs,
    isConfigured,
    lookupCharacter,
    health,
    lookupItem,
    lookupItems,
    lookupItemTbc,
    lookupItemsTbc,
    wowheadItemUrl,
    wowheadDataAttr,
    parseGargulSimpleLine,
    QUALITY_NAMES,
    ENV_DOMAIN,
  };
})(typeof window !== 'undefined' ? window : globalThis);
