/**
 * Midnight Rodeo — TBC Classic API client
 * Characters: Blizzard proxy (classic namespaces)
 * Items: Wowhead TBC only (dataEnv=5, domain=tbc)
 */
(function (global) {
  const DEFAULTS = {
    blizzardProxyUrl: '',
    region: 'us',
    game: 'classic',
    defaultRealm: '',
    locale: 'en_US',
    guildName: 'Midnight Rodeo',
    expansion: 'tbc',
    // TBC Classic only
    itemDataEnvs: [5],
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

  const TBC_DOMAIN = 'tbc';
  const TBC_DATA_ENV = 5;

  function getConfig() {
    const c = Object.assign({}, DEFAULTS, global.LOOTLOG_CONFIG || {});
    c.expansion = 'tbc';
    c.itemDataEnvs = [TBC_DATA_ENV];
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
    // Always TBC for this guild app
    return `https://www.wowhead.com/tbc/item=${id}`;
  }

  function wowheadDataAttr(domain) {
    return ' data-wowhead="domain=tbc"';
  }

  const itemCache = new Map();
  const ITEM_CACHE_KEY = 'lootlog-item-cache-tbc-v1';

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

  async function lookupItem(itemId) {
    const id = String(itemId || '').replace(/\D/g, '');
    if (!id) return null;
    if (itemCache.has(id)) return itemCache.get(id);

    try {
      const res = await fetch(
        `https://nether.wowhead.com/tooltip/item/${id}?dataEnv=${TBC_DATA_ENV}&locale=0`
      );
      if (!res.ok) {
        itemCache.set(id, null);
        return null;
      }
      const data = await res.json();
      if (!data || !data.name) {
        itemCache.set(id, null);
        return null;
      }
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
        dataEnv: TBC_DATA_ENV,
        domain: TBC_DOMAIN,
        url: wowheadItemUrl(id, TBC_DOMAIN),
      };
      itemCache.set(id, out);
      saveDiskCache();
      return out;
    } catch {
      itemCache.set(id, null);
      return null;
    }
  }

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

    await Promise.all(
      Array.from({ length: Math.min(concurrency, unique.length || 1) }, () => worker())
    );
    return results;
  }

  const lookupItemsTbc = lookupItems;

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

    if (cells.length >= 3 && looksLikeDate(cells[0]) && looksLikeId(cells[2])) {
      return {
        date: cells[0],
        player: cells[1],
        itemId: cells[2].replace(/\D/g, ''),
        itemName: '',
        rollType: cells[3] || '',
      };
    }
    if (cells.length >= 3 && looksLikeDate(cells[0]) && !looksLikeId(cells[2])) {
      return {
        date: cells[0],
        player: cells[1],
        itemId: looksLikeId(cells[3] || '') ? cells[3].replace(/\D/g, '') : '',
        itemName: cells[2],
        rollType: cells[3] && !looksLikeId(cells[3]) ? cells[3] : cells[4] || '',
      };
    }
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
    TBC_DOMAIN,
    TBC_DATA_ENV,
  };
})(typeof window !== 'undefined' ? window : globalThis);
