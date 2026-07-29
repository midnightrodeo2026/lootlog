/**
 * Raid-Helper.xyz public event API client
 * GET https://raid-helper.xyz/api/event/{eventId}
 * CORS: Access-Control-Allow-Origin: *
 *
 * Used to pull Discord raid signups into Midnight Rodeo guild manager.
 */
(function (global) {
  const API = 'https://raid-helper.xyz/api/event/';

  function extractEventId(input) {
    const s = String(input || '').trim();
    if (!s) return '';
    const m = s.match(/raid-helper\.(?:xyz|dev)\/(?:event|e)\/(\d{10,})/i);
    if (m) return m[1];
    if (/^\d{10,}$/.test(s)) return s;
    const m2 = s.match(/[?&](?:event|id)=(\d{10,})/i);
    if (m2) return m2[1];
    return '';
  }

  function eventPageUrl(id) {
    return `https://raid-helper.xyz/event/${id}`;
  }

  function parseUnixDate(unixtime, dateStr, timeStr) {
    if (unixtime) {
      const ms = Number(unixtime) * 1000;
      if (!isNaN(ms)) return new Date(ms);
    }
    if (dateStr) {
      const m = String(dateStr).match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
      if (m) {
        let h = 12,
          min = 0;
        if (timeStr) {
          const tm = String(timeStr).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
          if (tm) {
            h = Number(tm[1]);
            min = Number(tm[2]);
            const ap = (tm[3] || '').toUpperCase();
            if (ap === 'PM' && h < 12) h += 12;
            if (ap === 'AM' && h === 12) h = 0;
          }
        }
        return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), h, min);
      }
    }
    return null;
  }

  function dayKeyFromEvent(ev) {
    const d = parseUnixDate(ev.unixtime, ev.date, ev.time);
    if (!d || isNaN(d.getTime())) return '';
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  /** "Moon/Luna" or "Druul\\Hairydad" → parts */
  function nameParts(raw) {
    const s = String(raw || '').trim();
    if (!s) return [];
    return s
      .split(/[/\\|]+/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  /**
   * Auto-pick one name for dual RH nicknames.
   * Prefer part before / (main). Admin can override via preferredName later.
   */
  function pickMainName(raw, preferred) {
    if (preferred && String(preferred).trim()) return String(preferred).trim();
    const parts = nameParts(raw);
    return parts[0] || String(raw || '').trim();
  }

  function isSoftStatus(role, cls, status) {
    const r = String(role || '');
    const c = String(cls || '');
    const st = String(status || '').toLowerCase();
    if (/absence|absent|tentative|late|bench/i.test(r)) return true;
    if (/absence|tentative|late|bench/i.test(c)) return true;
    if (/absence|bench|tentative|late/.test(st)) return true;
    return false;
  }

  function normalizeSignup(s) {
    const status = (s.status || 'primary').toLowerCase();
    const role = s.role || s.cRole || '';
    const cls = s.class || s.cClass || '';
    const soft = isSoftStatus(role, cls, status);
    const isAbsence = /absence|absent/i.test(role) || /absence/i.test(cls) || status === 'absence';
    const isTentative =
      /tentative/i.test(role) || /tentative/i.test(cls) || status === 'tentative';
    const isLate = /late/i.test(role) || /late/i.test(cls) || status === 'late';
    const isBench = /bench/i.test(role) || /bench/i.test(cls) || status === 'bench';
    const rawName = (s.name || '').trim();
    const parts = nameParts(rawName);
    return {
      name: rawName,
      nameParts: parts,
      mainName: parts[0] || rawName,
      class: cls,
      spec: s.spec || s.cSpec || '',
      role: role,
      status: status,
      userid: s.userid || s.userId || '',
      position: s.position,
      isAbsence,
      isTentative,
      isLate,
      isBench,
      isSoft: soft,
      /** Hard raid seat (counts toward 25) */
      isPrimary: !soft && status !== 'absence',
      signuptime: s.signuptime || null,
    };
  }

  function summarize(signups) {
    const list = (signups || []).map(normalizeSignup);
    const byRole = {};
    const byClass = {};
    let primary = 0,
      absence = 0,
      bench = 0,
      tentative = 0,
      late = 0;
    for (const s of list) {
      if (s.isAbsence) absence++;
      else if (s.isTentative) tentative++;
      else if (s.isLate) late++;
      else if (s.isBench) bench++;
      else if (s.isPrimary) {
        primary++;
        byRole[s.role || 'Other'] = (byRole[s.role || 'Other'] || 0) + 1;
        if (s.class) byClass[s.class] = (byClass[s.class] || 0) + 1;
      }
    }
    return {
      list,
      byRole,
      byClass,
      primary,
      absence,
      bench,
      tentative,
      late,
      total: list.length,
    };
  }

  async function fetchEvent(eventIdOrUrl) {
    const id = extractEventId(eventIdOrUrl);
    if (!id) throw new Error('Paste a Raid-Helper event link or numeric event ID');

    const res = await fetch(API + encodeURIComponent(id), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(
        res.status === 404
          ? 'Event not found — check the link is public and the ID is correct'
          : `Raid-Helper error HTTP ${res.status}`
      );
    }
    const data = await res.json();
    const summary = summarize(data.signups || []);
    const when = parseUnixDate(data.unixtime, data.date, data.time);

    return {
      id,
      url: eventPageUrl(id),
      title: data.title || data.displayTitle || 'Raid',
      date: data.date || '',
      time: data.time || '',
      unixtime: data.unixtime || null,
      dayKey: dayKeyFromEvent(data),
      whenIso: when && !isNaN(when.getTime()) ? when.toISOString() : null,
      leader: data.leadername || '',
      server: data.servername || '',
      channel: data.channelName || '',
      description: data.description || data.description2 || '',
      roles: data.roles || [],
      classes: data.classes || [],
      color: data.color || '',
      lastUpdated: data.last_updated || null,
      raw: data,
      ...summary,
    };
  }

  /**
   * Map RH primary signups → playerInfo patches (one key per person).
   * Dual names auto-collapse to main; nameOverrides[rhFullName] forces pick.
   * Does NOT create ghost keys for "Main/Alt" duals.
   */
  function toPlayerPatches(event, nameOverrides) {
    const overrides = nameOverrides || {};
    const patches = {};
    for (const s of event.list || []) {
      if (!s.name || s.isSoft || !s.isPrimary) continue;
      // Skip non-raid roles if class is soft-status leftover
      if (isSoftStatus(s.role, s.class, s.status)) continue;

      const preferred =
        overrides[s.name] ||
        overrides[String(s.name).toLowerCase()] ||
        overrides[(s.mainName || '').toLowerCase()];
      const display = pickMainName(s.name, preferred);
      const key = display.toLowerCase();
      if (patches[key]) {
        // rare collision after collapse — keep first, note rhName
        continue;
      }
      const parts = s.nameParts || nameParts(s.name);
      patches[key] = {
        displayName: display,
        rhName: s.name,
        nameOptions: parts.length > 1 ? parts : parts.length ? parts : [display],
        class: s.class || '',
        spec: String(s.spec || '').replace(/(\d+)$/, ''),
        rhRole: s.role || '',
        rhStatus: s.status || '',
        lastRhEventId: event.id,
        lastRhEventTitle: event.title,
        lastRhImport: new Date().toISOString(),
        fromRh: true,
      };
    }
    return patches;
  }

  /** Primary signed only (for 25-man raid roster) */
  function primarySignups(event) {
    return (event.list || []).filter((s) => s.isPrimary && !s.isSoft);
  }

  global.RaidHelper = {
    extractEventId,
    eventPageUrl,
    fetchEvent,
    summarize,
    toPlayerPatches,
    normalizeSignup,
    pickMainName,
    nameParts,
    primarySignups,
    isSoftStatus,
  };
})(typeof window !== 'undefined' ? window : globalThis);
