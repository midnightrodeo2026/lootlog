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

  /**
   * Public calendar list (no Discord login).
   * RH panel → Calendar → "Unrestricted Calendar Link"
   *   https://raid-helper.xyz/calendar/{serverId}/{calendarKey}
   * API: POST /api/events/{serverId}/{calendarKey}  body {}
   * Returns upcoming + past events for that Discord server.
   */
  function parseCalendarUrl(input) {
    const s = String(input || '').trim();
    if (!s) return null;
    // full calendar URL
    let m = s.match(
      /raid-helper\.(?:xyz|dev)\/calendar\/(\d{10,})\/([A-Za-z0-9_\-]+)/i
    );
    if (m) return { serverId: m[1], calendarKey: m[2] };
    // bare key with known server from config later
    if (/^[A-Za-z0-9_\-]{6,}$/.test(s) && !/^\d{15,}$/.test(s)) {
      return { serverId: '', calendarKey: s };
    }
    // serverId/key
    m = s.match(/^(\d{10,})[\/\s]+([A-Za-z0-9_\-]+)$/);
    if (m) return { serverId: m[1], calendarKey: m[2] };
    return null;
  }

  async function listServerEvents(serverId, calendarKey) {
    const sid = String(serverId || '').trim();
    const key = String(calendarKey || '').trim();
    if (!sid) throw new Error('Missing Raid-Helper server id');
    if (!key || key === 'none') {
      throw new Error(
        'Need unrestricted calendar key — open Raid-Helper panel → Calendar → copy Unrestricted Calendar Link'
      );
    }
    const url =
      'https://raid-helper.xyz/api/events/' +
      encodeURIComponent(sid) +
      '/' +
      encodeURIComponent(key);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: '{}',
      cache: 'no-store',
    });
    if (res.status === 403) {
      throw new Error('Invalid calendar key — regenerate unrestricted link in RH Calendar settings');
    }
    if (!res.ok) {
      throw new Error('Could not list server events (HTTP ' + res.status + ')');
    }
    const data = await res.json();
    const events = (data.events || data || []).map((e) => {
      const id = String(e.id || e.raidid || e.raidId || '');
      const unixtime = e.unixtime || e.startTime || null;
      return {
        id,
        title: e.title || e.displayTitle || e.description || 'Raid',
        date: e.date || '',
        time: e.time || '',
        unixtime: unixtime ? Number(unixtime) : null,
        leader: e.leadername || e.leader || '',
        channel: e.channelName || e.channel || '',
        server: e.servername || e.server || '',
        color: e.color || '',
        url: id ? eventPageUrl(id) : '',
        raw: e,
      };
    });
    // sort soonest first
    events.sort((a, b) => (a.unixtime || 0) - (b.unixtime || 0));
    const now = Date.now() / 1000;
    const upcoming = events.filter((e) => !e.unixtime || e.unixtime >= now - 3 * 3600);
    const past = events.filter((e) => e.unixtime && e.unixtime < now - 3 * 3600);
    return {
      serverId: sid,
      calendarKey: key,
      events,
      upcoming,
      past,
      next: upcoming[0] || null,
    };
  }

  /** Prefer calendar next event, else configured default event id */
  async function resolveActiveEvent(cfg) {
    const c = cfg || {};
    const sid = c.raidHelperServerId || c.serverId || '';
    const key = c.raidHelperCalendarKey || c.calendarKey || '';
    if (sid && key) {
      try {
        const list = await listServerEvents(sid, key);
        if (list.next && list.next.id) {
          return {
            source: 'calendar',
            eventId: list.next.id,
            url: list.next.url,
            list,
          };
        }
        if (list.events.length) {
          const last = list.events[list.events.length - 1];
          return { source: 'calendar-past', eventId: last.id, url: last.url, list };
        }
      } catch (e) {
        return { source: 'calendar-error', error: e.message, eventId: extractEventId(c.raidHelperEventUrl || '') };
      }
    }
    const id = extractEventId(c.raidHelperEventUrl || '');
    return {
      source: 'config',
      eventId: id,
      url: id ? eventPageUrl(id) : '',
      list: null,
    };
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
    parseCalendarUrl,
    listServerEvents,
    resolveActiveEvent,
  };
})(typeof window !== 'undefined' ? window : globalThis);
