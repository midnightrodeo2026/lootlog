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
    // https://raid-helper.xyz/event/1530078606578024520
    const m = s.match(/raid-helper\.(?:xyz|dev)\/(?:event|e)\/(\d{10,})/i);
    if (m) return m[1];
    // bare id
    if (/^\d{10,}$/.test(s)) return s;
    // query ?event=...
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
    // "28-7-2026" + "07:00 PM"
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

  function normalizeSignup(s) {
    const status = (s.status || 'primary').toLowerCase();
    const role = s.role || s.cRole || '';
    const isAbsence = /absence|absent|late|bench/i.test(role) || status === 'absence';
    const isBench = /bench|tentative/i.test(role) || status === 'bench' || status === 'tentative';
    return {
      name: (s.name || '').trim(),
      class: s.class || s.cClass || '',
      spec: s.spec || s.cSpec || '',
      role: role,
      status: status,
      userid: s.userid || s.userId || '',
      position: s.position,
      isAbsence,
      isBench,
      isPrimary: !isAbsence && status === 'primary',
      signuptime: s.signuptime || null,
    };
  }

  function summarize(signups) {
    const list = (signups || []).map(normalizeSignup);
    const byRole = {};
    const byClass = {};
    let primary = 0,
      absence = 0,
      bench = 0;
    for (const s of list) {
      if (s.isAbsence) absence++;
      else if (s.isBench) bench++;
      else primary++;
      if (!s.isAbsence) {
        byRole[s.role || 'Other'] = (byRole[s.role || 'Other'] || 0) + 1;
        if (s.class) byClass[s.class] = (byClass[s.class] || 0) + 1;
      }
    }
    return { list, byRole, byClass, primary, absence, bench, total: list.length };
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
   * Map RH signups onto playerInfo-style records for roster.
   * Character name: use part before / if "Main/Alt" style, else full name.
   */
  function toPlayerPatches(event) {
    const patches = {};
    for (const s of event.list || []) {
      if (!s.name || s.isAbsence) continue;
      // "Moon/Luna" → try main "Moon" as key, keep full display
      const main = s.name.includes('/') ? s.name.split('/')[0].trim() : s.name;
      const key = main.toLowerCase();
      patches[key] = {
        displayName: main,
        rhName: s.name,
        class: s.class || '',
        spec: s.spec || '',
        rhRole: s.role || '',
        rhStatus: s.status || '',
        lastRhEventId: event.id,
        lastRhEventTitle: event.title,
        lastRhImport: new Date().toISOString(),
      };
      // also index full name if different
      if (s.name.toLowerCase() !== key) {
        patches[s.name.toLowerCase()] = Object.assign({}, patches[key], {
          displayName: s.name,
        });
      }
    }
    return patches;
  }

  global.RaidHelper = {
    extractEventId,
    eventPageUrl,
    fetchEvent,
    summarize,
    toPlayerPatches,
    normalizeSignup,
  };
})(typeof window !== 'undefined' ? window : globalThis);
