/**
 * Midnight Rodeo — own Raid-Helper-style signup board
 * Live-mirrors https://raid-helper.xyz/event/1530078606578024520
 * Guild-only UI for Discord (no need to open RH in browser).
 */
(function (global) {
  const DEFAULT_EVENT_ID = '1530078606578024520';
  const RH_API = 'https://raid-helper.xyz/api/event/';
  const LOCAL_KEY = 'mr-signup-board-v1';

  const CLASS_COLORS = {
    Warrior: '#C79C6E',
    Paladin: '#F58CBA',
    Hunter: '#ABD473',
    Rogue: '#FFF569',
    Priest: '#FFFFFF',
    Shaman: '#0070DE',
    Mage: '#69CCF0',
    Warlock: '#9482C9',
    Druid: '#FF7D0A',
    Deathknight: '#C41F3B',
    Tank: '#C79C6E',
    Absence: '#888',
    Tentative: '#AAA',
  };

  const CLASS_ORDER = [
    'Tank',
    'Warrior',
    'Paladin',
    'Hunter',
    'Rogue',
    'Priest',
    'Deathknight',
    'Shaman',
    'Mage',
    'Warlock',
    'Druid',
  ];

  const ROLE_META = {
    Melee: { icon: '⚔', color: '#e35d5d' },
    Ranged: { icon: '◎', color: '#69CCF0' },
    Healers: { icon: '✚', color: '#6fc27a' },
    Tanks: { icon: '🛡', color: '#C79C6E' },
    Tentative: { icon: '🕐', color: '#b9bdd6' },
    Absence: { icon: '⌀', color: '#888' },
    Late: { icon: '⏰', color: '#e3a13c' },
  };

  function extractId(input) {
    const s = String(input || '').trim();
    if (/^\d{10,}$/.test(s)) return s;
    const m = s.match(/(\d{15,})/);
    return m ? m[1] : DEFAULT_EVENT_ID;
  }

  function loadLocal(eventId) {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return { overrides: [], extras: [] };
      const all = JSON.parse(raw);
      return all[eventId] || { overrides: [], extras: [] };
    } catch {
      return { overrides: [], extras: [] };
    }
  }

  function saveLocal(eventId, data) {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      const all = raw ? JSON.parse(raw) : {};
      all[eventId] = data;
      localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
    } catch (_) {}
  }

  function normalizeSignup(s, i) {
    return {
      name: s.name || 'Unknown',
      class: s.class || s.cClass || 'Unknown',
      spec: s.spec || s.cSpec || '',
      role: s.role || 'Melee',
      position: s.position != null ? Number(s.position) : i + 1,
      status: s.status || 'primary',
      userid: s.userid || '',
      local: !!s.local,
    };
  }

  async function fetchLive(eventId) {
    const id = extractId(eventId);
    const res = await fetch(RH_API + encodeURIComponent(id), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('Could not load event (HTTP ' + res.status + ')');
    return res.json();
  }

  function mergeSignups(remoteSignups, local) {
    const list = (remoteSignups || []).map(normalizeSignup);
    // Apply local extras (guild signups not from RH)
    (local.extras || []).forEach((e, i) => {
      list.push(normalizeSignup(Object.assign({ local: true, position: 1000 + i }, e), i));
    });
    // Overrides: rename role/class for a name
    const ov = local.overrides || [];
    ov.forEach((o) => {
      const hit = list.find((s) => s.name.toLowerCase() === String(o.name || '').toLowerCase());
      if (hit) {
        if (o.role) hit.role = o.role;
        if (o.class) hit.class = o.class;
        if (o.spec) hit.spec = o.spec;
      }
    });
    return list;
  }

  function classifyDisplayClass(s) {
    // Screenshot groups tanks as "Tank" column even if Warrior/Druid
    const role = (s.role || '').toLowerCase();
    const cls = s.class || '';
    const spec = (s.spec || '').toLowerCase();
    if (role === 'absence' || cls === 'Absence') return 'Absence';
    if (role === 'tentative' || cls === 'Tentative') return 'Tentative';
    if (role === 'tanks' || /prot|guardian|protection/i.test(spec) || cls === 'Tank') return 'Tank';
    return cls;
  }

  function buildBoardModel(event, signups) {
    const primary = signups.filter(
      (s) => !/absence/i.test(s.role) && !/absence/i.test(s.class)
    );
    const absence = signups.filter(
      (s) => /absence/i.test(s.role) || /absence/i.test(s.class)
    );
    const tentative = signups.filter(
      (s) => /tentative|late|bench/i.test(s.role) || /tentative/i.test(s.class)
    );
    // tentative may also be in primary depending on data — screenshot shows separate
    const signed = primary.filter(
      (s) => !/tentative|late|bench/i.test(s.role) && !/tentative/i.test(s.class)
    );

    const melee = signed.filter((s) => /melee/i.test(s.role)).length;
    const ranged = signed.filter((s) => /ranged/i.test(s.role)).length;
    const healers = signed.filter((s) => /heal/i.test(s.role)).length;
    const tanks = signed.filter((s) => /tank/i.test(s.role)).length;

    // Group by display class for columns (like RH embed)
    const byClass = {};
    signed.forEach((s) => {
      const c = classifyDisplayClass(s);
      if (c === 'Absence' || c === 'Tentative') return;
      if (!byClass[c]) byClass[c] = [];
      byClass[c].push(s);
    });
    Object.keys(byClass).forEach((c) => {
      byClass[c].sort((a, b) => (a.position || 0) - (b.position || 0));
    });

    const classCols = CLASS_ORDER.filter((c) => byClass[c] && byClass[c].length).map((c) => ({
      class: c,
      color: CLASS_COLORS[c] || '#ddd',
      people: byClass[c],
    }));
    // any other classes
    Object.keys(byClass).forEach((c) => {
      if (!CLASS_ORDER.includes(c)) {
        classCols.push({ class: c, color: CLASS_COLORS[c] || '#ddd', people: byClass[c] });
      }
    });

    const title = event.title || event.displayTitle || 'Raid';
    const letters = title.toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim();

    return {
      id: event.raidid || event.id || DEFAULT_EVENT_ID,
      title,
      letters,
      leader: event.leadername || '',
      date: event.date || '',
      time: event.time || '',
      unixtime: event.unixtime,
      server: event.servername || '<Midnight Rodeo>',
      channel: event.channelName || '',
      image: (event.advanced && event.advanced.image) || '',
      counts: {
        signed: signed.length,
        tentative: tentative.length,
        absence: absence.length,
        melee,
        ranged,
        healers,
        tanks,
      },
      classCols,
      tentative,
      absence,
      all: signups,
      raw: event,
    };
  }

  function formatDatePretty(dateStr, unixtime) {
    if (unixtime) {
      try {
        const d = new Date(Number(unixtime) * 1000);
        return d.toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      } catch (_) {}
    }
    // 28-7-2026
    const m = String(dateStr || '').match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (m) {
      const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
      return d.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return dateStr || '—';
  }

  function letterBoard(title) {
    // "TUESDAY 25 MAN" → individual tiles
    const s = String(title || '')
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return s.split('').map((ch) => (ch === ' ' ? null : ch));
  }

  async function loadBoard(eventIdOrUrl) {
    const id = extractId(eventIdOrUrl || DEFAULT_EVENT_ID);
    const local = loadLocal(id);
    let event;
    try {
      event = await fetchLive(id);
    } catch (e) {
      // offline fallback minimal shell
      event = {
        title: 'Tuesday 25 man',
        date: '28-7-2026',
        time: '09:00 PM',
        leadername: 'Dirtydutch/Barkley',
        servername: '<Midnight Rodeo>',
        channelName: 'tuesday-25man-raid',
        signups: [],
        raidid: id,
        error: e.message,
      };
    }
    const signups = mergeSignups(event.signups || [], local);
    const model = buildBoardModel(Object.assign({ id }, event), signups);
    model.eventId = id;
    model.live = !event.error;
    model.error = event.error || null;
    model.datePretty = formatDatePretty(event.date, event.unixtime);
    model.letterTiles = letterBoard(model.title);
    model.local = local;
    model.rhUrl = 'https://raid-helper.xyz/event/' + id;
    return model;
  }

  function addLocalSignup(eventId, { name, role, className, spec }) {
    const id = extractId(eventId);
    const local = loadLocal(id);
    local.extras = local.extras || [];
    local.extras.push({
      name: String(name || '').trim(),
      role: role || 'Melee',
      class: className || 'Warrior',
      spec: spec || '',
      local: true,
    });
    saveLocal(id, local);
    return local;
  }

  function clearLocal(eventId) {
    const id = extractId(eventId);
    saveLocal(id, { overrides: [], extras: [] });
  }

  /** Discord-friendly text (no need for RH page) */
  function toDiscordText(model) {
    if (!model) return '';
    const lines = [];
    lines.push(`**${model.title}** · Midnight Rodeo TBC`);
    lines.push(`${model.datePretty} · ${model.time} · Lead **${model.leader}**`);
    lines.push(
      `Signed **${model.counts.signed}** · Tentative ${model.counts.tentative} · Absence ${model.counts.absence}`
    );
    lines.push(
      `Melee ${model.counts.melee} · Ranged ${model.counts.ranged} · Healers ${model.counts.healers} · Tanks ${model.counts.tanks}`
    );
    lines.push('');
    (model.classCols || []).forEach((col) => {
      lines.push(`**${col.class} (${col.people.length})**`);
      col.people.forEach((p) => {
        lines.push(`\`${String(p.position).padStart(2, ' ')}\` ${p.name}`);
      });
      lines.push('');
    });
    if (model.tentative && model.tentative.length) {
      lines.push(
        `**Tentative:** ${model.tentative.map((p) => p.name).join(', ')}`
      );
    }
    if (model.absence && model.absence.length) {
      lines.push(`**Absence:** ${model.absence.map((p) => p.name).join(', ')}`);
    }
    lines.push('');
    lines.push(`Board: ${typeof location !== 'undefined' ? location.href.split('#')[0] : ''}`);
    return lines.join('\n');
  }

  global.SignupBoard = {
    DEFAULT_EVENT_ID,
    CLASS_COLORS,
    ROLE_META,
    extractId,
    loadBoard,
    addLocalSignup,
    clearLocal,
    toDiscordText,
    buildBoardModel,
    formatDatePretty,
  };
})(typeof window !== 'undefined' ? window : globalThis);
