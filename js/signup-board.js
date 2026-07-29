/**
 * Midnight Rodeo — Raid-Helper–style signup board
 * Live-mirrors https://raid-helper.xyz/event/<id>
 * Display board for Discord (signups still happen in RH).
 */
(function (global) {
  const DEFAULT_EVENT_ID = '1530078606578024520';
  const RH_API = 'https://raid-helper.xyz/api/event/';
  const LOCAL_KEY = 'mr-signup-board-v1';
  const TARGET_SIZE = 25;

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
    Late: '#e3a13c',
    Bench: '#b9bdd6',
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
    Melee: { icon: '⚔', color: '#e35d5d', key: 'melee' },
    Ranged: { icon: '◎', color: '#69CCF0', key: 'ranged' },
    Healers: { icon: '✚', color: '#6fc27a', key: 'healers' },
    Tanks: { icon: '🛡', color: '#C79C6E', key: 'tanks' },
    Tentative: { icon: '🕐', color: '#b9bdd6', key: 'tentative' },
    Absence: { icon: '⌀', color: '#888', key: 'absence' },
    Late: { icon: '⏰', color: '#e3a13c', key: 'late' },
    Bench: { icon: '🪑', color: '#b9bdd6', key: 'bench' },
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

  /** RH uses Protection1 / Holy1 / Restoration1 for alt specs — show clean names */
  function cleanSpec(spec) {
    const s = String(spec || '').trim();
    if (!s || /^absence$/i.test(s)) return '';
    return s.replace(/(\d+)$/, '').trim();
  }

  function isAbsence(s) {
    return /absence/i.test(s.role) || /absence/i.test(s.class);
  }

  function isTentative(s) {
    return /tentative/i.test(s.role) || /tentative/i.test(s.class);
  }

  function isLate(s) {
    return /late/i.test(s.role) || /late/i.test(s.class);
  }

  function isBench(s) {
    return /bench/i.test(s.role) || /bench/i.test(s.class);
  }

  function isSoftStatus(s) {
    return isAbsence(s) || isTentative(s) || isLate(s) || isBench(s);
  }

  function normalizeSignup(s, i) {
    const role = s.role || 'Melee';
    const cls = s.class || s.cClass || 'Unknown';
    return {
      name: s.name || 'Unknown',
      class: cls,
      spec: cleanSpec(s.spec || s.cSpec || ''),
      rawSpec: s.spec || s.cSpec || '',
      role,
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
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Could not load event (HTTP ' + res.status + ')');
    return res.json();
  }

  function mergeSignups(remoteSignups, local) {
    const list = (remoteSignups || []).map(normalizeSignup);
    (local.extras || []).forEach((e, i) => {
      list.push(
        normalizeSignup(
          Object.assign({ local: true, position: 1000 + i }, e),
          i
        )
      );
    });
    const ov = local.overrides || [];
    ov.forEach((o) => {
      const hit = list.find(
        (s) => s.name.toLowerCase() === String(o.name || '').toLowerCase()
      );
      if (hit) {
        if (o.role) hit.role = o.role;
        if (o.class) hit.class = o.class;
        if (o.spec) hit.spec = cleanSpec(o.spec);
      }
    });
    return list;
  }

  function classifyDisplayClass(s) {
    const role = (s.role || '').toLowerCase();
    const cls = s.class || '';
    const spec = (s.spec || '').toLowerCase();
    if (isAbsence(s)) return 'Absence';
    if (isTentative(s)) return 'Tentative';
    if (isLate(s)) return 'Late';
    if (isBench(s)) return 'Bench';
    if (
      role === 'tanks' ||
      cls === 'Tank' ||
      /prot|guardian|protection/i.test(spec)
    ) {
      // Keep real class if we know it; RH often stores tanks as class "Tank"
      if (cls && cls !== 'Tank' && CLASS_ORDER.includes(cls)) return 'Tank';
      return 'Tank';
    }
    return cls;
  }

  function buildBoardModel(event, signups) {
    const absence = signups.filter(isAbsence);
    const tentative = signups.filter((s) => isTentative(s) && !isAbsence(s));
    const late = signups.filter((s) => isLate(s) && !isAbsence(s) && !isTentative(s));
    const bench = signups.filter(
      (s) => isBench(s) && !isAbsence(s) && !isTentative(s) && !isLate(s)
    );
    const signed = signups.filter((s) => !isSoftStatus(s));

    const melee = signed.filter((s) => /melee/i.test(s.role)).length;
    const ranged = signed.filter((s) => /ranged/i.test(s.role)).length;
    const healers = signed.filter((s) => /heal/i.test(s.role)).length;
    const tanks = signed.filter((s) => /tank/i.test(s.role)).length;

    const byClass = {};
    signed.forEach((s) => {
      const c = classifyDisplayClass(s);
      if (c === 'Absence' || c === 'Tentative' || c === 'Late' || c === 'Bench') return;
      if (!byClass[c]) byClass[c] = [];
      byClass[c].push(s);
    });
    Object.keys(byClass).forEach((c) => {
      byClass[c].sort((a, b) => (a.position || 0) - (b.position || 0));
    });

    const classCols = CLASS_ORDER.filter((c) => byClass[c] && byClass[c].length).map(
      (c) => ({
        class: c,
        color: CLASS_COLORS[c] || '#ddd',
        people: byClass[c],
      })
    );
    Object.keys(byClass).forEach((c) => {
      if (!CLASS_ORDER.includes(c)) {
        classCols.push({
          class: c,
          color: CLASS_COLORS[c] || '#ddd',
          people: byClass[c],
        });
      }
    });

    const title = event.title || event.displayTitle || 'Raid';
    const accent = parseRhColor(event.color) || '#c23b3b';

    return {
      id: event.raidid || event.id || DEFAULT_EVENT_ID,
      title,
      leader: event.leadername || '',
      date: event.date || '',
      time: event.time || '',
      unixtime: event.unixtime,
      server: event.servername || '<Midnight Rodeo>',
      channel: event.channelName || '',
      description: event.description || event.description2 || '',
      image: (event.advanced && event.advanced.image) || '',
      accent,
      target: TARGET_SIZE,
      counts: {
        signed: signed.length,
        tentative: tentative.length,
        absence: absence.length,
        late: late.length,
        bench: bench.length,
        melee,
        ranged,
        healers,
        tanks,
      },
      classCols,
      tentative,
      absence,
      late,
      bench,
      all: signups,
      raw: event,
    };
  }

  /** "255,0,0" or "#ff0000" → css color */
  function parseRhColor(color) {
    if (!color) return null;
    const s = String(color).trim();
    if (s.startsWith('#')) return s;
    const m = s.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
    if (m) return 'rgb(' + m[1] + ',' + m[2] + ',' + m[3] + ')';
    return null;
  }

  function formatDatePretty(dateStr, unixtime) {
    if (unixtime) {
      try {
        const d = new Date(Number(unixtime) * 1000);
        return d.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      } catch (_) {}
    }
    const m = String(dateStr || '').match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (m) {
      const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return dateStr || '—';
  }

  function formatCountdown(unixtime) {
    if (!unixtime) return null;
    const t = Number(unixtime) * 1000;
    if (!Number.isFinite(t)) return null;
    const diff = t - Date.now();
    if (diff <= 0) {
      if (diff > -3 * 3600 * 1000) return { label: 'Live now', kind: 'live' };
      if (diff > -24 * 3600 * 1000) return { label: 'Ended', kind: 'past' };
      return { label: 'Past event', kind: 'past' };
    }
    const sec = Math.floor(diff / 1000);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d >= 2) return { label: 'in ' + d + ' days', kind: 'soon' };
    if (d === 1) return { label: 'tomorrow · ' + h + 'h', kind: 'soon' };
    if (h >= 1) return { label: 'in ' + h + 'h ' + m + 'm', kind: 'near' };
    return { label: 'in ' + m + ' min', kind: 'imminent' };
  }

  function letterBoard(title) {
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
      event = {
        title: 'Tuesday 25 man',
        date: '28-7-2026',
        time: '09:00 PM',
        leadername: 'Dirtydutch/Barkley',
        servername: '<Midnight Rodeo>',
        channelName: 'tuesday-25man-raid',
        signups: [],
        raidid: id,
        color: '255,0,0',
        error: e.message,
      };
    }
    const signups = mergeSignups(event.signups || [], local);
    const model = buildBoardModel(Object.assign({ id }, event), signups);
    model.eventId = id;
    model.live = !event.error;
    model.error = event.error || null;
    model.datePretty = formatDatePretty(event.date, event.unixtime);
    model.countdown = formatCountdown(event.unixtime);
    model.letterTiles = letterBoard(model.title);
    model.local = local;
    model.rhUrl = 'https://raid-helper.xyz/event/' + id;
    model.progress = Math.min(100, Math.round((model.counts.signed / TARGET_SIZE) * 100));
    return model;
  }

  function addLocalSignup(eventId, { name, role, className, spec }) {
    const id = extractId(eventId);
    const local = loadLocal(id);
    local.extras = local.extras || [];
    const nm = String(name || '').trim();
    if (!nm) return local;
    // replace if same name already local
    local.extras = local.extras.filter(
      (e) => String(e.name || '').toLowerCase() !== nm.toLowerCase()
    );
    local.extras.push({
      name: nm,
      role: role || 'Melee',
      class: className || 'Warrior',
      spec: cleanSpec(spec || ''),
      local: true,
    });
    saveLocal(id, local);
    return local;
  }

  function removeLocalSignup(eventId, name) {
    const id = extractId(eventId);
    const local = loadLocal(id);
    const nm = String(name || '').toLowerCase();
    local.extras = (local.extras || []).filter(
      (e) => String(e.name || '').toLowerCase() !== nm
    );
    saveLocal(id, local);
    return local;
  }

  function clearLocal(eventId) {
    const id = extractId(eventId);
    saveLocal(id, { overrides: [], extras: [] });
  }

  /** Discord-friendly text for pasting into channel */
  function toDiscordText(model) {
    if (!model) return '';
    const lines = [];
    lines.push(`**${model.title}** · Midnight Rodeo`);
    lines.push(
      `📅 ${model.datePretty} · 🕐 ${model.time} · 🚩 **${model.leader || '—'}**`
    );
    if (model.countdown && model.countdown.label) {
      lines.push(`⏱ ${model.countdown.label}`);
    }
    lines.push(
      `✅ **${model.counts.signed}/${model.target}** signed · 🕐 ${model.counts.tentative} tent · ⌀ ${model.counts.absence} abs`
    );
    lines.push(
      `⚔ ${model.counts.melee} · ◎ ${model.counts.ranged} · ✚ ${model.counts.healers} · 🛡 ${model.counts.tanks}`
    );
    lines.push('');
    (model.classCols || []).forEach((col) => {
      lines.push(`**${col.class} (${col.people.length})**`);
      col.people.forEach((p) => {
        const spec = p.spec ? ` · ${p.spec}` : '';
        lines.push(`\`${String(p.position).padStart(2, ' ')}\` ${p.name}${spec}`);
      });
      lines.push('');
    });
    if (model.late && model.late.length) {
      lines.push(`**Late:** ${model.late.map((p) => p.name).join(', ')}`);
    }
    if (model.bench && model.bench.length) {
      lines.push(`**Bench:** ${model.bench.map((p) => p.name).join(', ')}`);
    }
    if (model.tentative && model.tentative.length) {
      lines.push(
        `**Tentative:** ${model.tentative.map((p) => p.name).join(', ')}`
      );
    }
    if (model.absence && model.absence.length) {
      lines.push(`**Absence:** ${model.absence.map((p) => p.name).join(', ')}`);
    }
    lines.push('');
    const boardUrl =
      typeof location !== 'undefined' ? location.href.split('#')[0] : '';
    if (boardUrl) lines.push(`Board: ${boardUrl}`);
    if (model.rhUrl) lines.push(`Sign up: ${model.rhUrl}`);
    return lines.join('\n');
  }

  global.SignupBoard = {
    DEFAULT_EVENT_ID,
    TARGET_SIZE,
    CLASS_COLORS,
    ROLE_META,
    extractId,
    loadBoard,
    addLocalSignup,
    removeLocalSignup,
    clearLocal,
    toDiscordText,
    buildBoardModel,
    formatDatePretty,
    formatCountdown,
    cleanSpec,
  };
})(typeof window !== 'undefined' ? window : globalThis);
