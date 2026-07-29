/**
 * Raid-Helper official API client
 * Docs: https://raid-helper.xyz/documentation/api
 *
 * Public (no auth):
 *   GET /api/v4/events/{eventId}
 * Server auth (header Authorization: <apikey from Discord /apikey>):
 *   GET /api/v4/servers/{serverId}/events   (optional header Page: n)
 *
 * Legacy fallback:
 *   GET /api/event/{eventId}
 */
(function (global) {
  const BASE = 'https://raid-helper.xyz';
  const API_V4_EVENT = BASE + '/api/v4/events/';
  const API_LEGACY_EVENT = BASE + '/api/event/';
  const API_V4_SERVER_EVENTS = BASE + '/api/v4/servers/';

  /** Strip commas/quotes/whitespace from pasted keys */
  function cleanApiKey(key) {
    return String(key || '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/^["'\s]+|["'\s]+$/g, '')
      .replace(/[,\s]+$/g, '')
      .trim();
  }

  function getProxyBase() {
    try {
      const cfg =
        (typeof window !== 'undefined' && window.LOOTLOG_CONFIG) || {};
      const u = (cfg.raidHelperProxyUrl || '').trim().replace(/\/+$/, '');
      return u || '';
    } catch {
      return '';
    }
  }

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
    return BASE + '/event/' + id;
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
    const d = parseUnixDate(ev.unixtime || ev.startTime, ev.date, ev.time);
    if (!d || isNaN(d.getTime())) return '';
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  /**
   * If RH title is "Tuesday 25 man" but the event date is Friday, show "Friday 25 man".
   * Also builds a smart default title from the real weekday when title is empty.
   */
  function smartEventTitle(title, unixtime, dateStr, timeStr) {
    const d = parseUnixDate(unixtime, dateStr, timeStr);
    const weekday =
      d && !isNaN(d.getTime())
        ? d.toLocaleDateString(undefined, { weekday: 'long' })
        : '';
    let t = String(title || dataDisplayTitle(title) || '').trim();
    if (!t && weekday) return weekday + ' 25 man';
    if (!weekday) return t || 'Raid';
    // Replace leading weekday names: Tuesday / Tue / Thursday etc.
    const re =
      /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/i;
    if (re.test(t)) {
      t = t.replace(re, weekday);
    }
    return t;
  }

  function dataDisplayTitle(t) {
    return t;
  }

  function nameParts(raw) {
    const s = String(raw || '').trim();
    if (!s) return [];
    return s
      .split(/[/\\|]+/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

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
    // Support v4 (className/roleName/specName) and legacy (class/role/spec)
    const status = (s.status || 'primary').toLowerCase();
    const role = s.roleName || s.role || s.cRoleName || s.cRole || '';
    const cls = s.className || s.class || s.cClassName || s.cClass || '';
    const spec = s.specName || s.spec || s.cSpecName || s.cSpec || '';
    const soft = isSoftStatus(role, cls, status);
    const isAbsence =
      /absence|absent/i.test(role) || /absence/i.test(cls) || status === 'absence';
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
      spec: String(spec || '').replace(/(\d+)$/, ''),
      role: role,
      status: status,
      userid: s.userId || s.userid || s.user_id || '',
      position: s.position,
      isAbsence,
      isTentative,
      isLate,
      isBench,
      isSoft: soft,
      isPrimary: !soft && status !== 'absence',
      signuptime: s.entryTime || s.signuptime || null,
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

  /** Normalize raw event JSON from v4 or legacy into one shape */
  function normalizeEventPayload(data, id) {
    const signups = data.signUps || data.signups || [];
    const summary = summarize(signups);
    const unixtime = data.startTime || data.unixtime || data.unixStart || null;
    const leader = data.leaderName || data.leadername || data.leader || '';
    const server = data.serverName || data.servername || data.server || '';
    const channel = data.channelName || data.channelname || '';
    const advanced = data.advancedSettings || data.advanced || {};
    const when = parseUnixDate(unixtime, data.date, data.time);
    const rawTitle = data.title || data.displayTitle || '';
    const title = smartEventTitle(
      rawTitle,
      unixtime,
      data.date,
      data.time
    );

    return {
      id: String(data.id || data.raidid || id || ''),
      url: eventPageUrl(String(data.id || data.raidid || id || '')),
      title,
      rawTitle,
      date: data.date || '',
      time: data.time || '',
      unixtime: unixtime ? Number(unixtime) : null,
      endTime: data.endTime || data.closingTime || data.closingtime || null,
      dayKey: dayKeyFromEvent({
        unixtime,
        startTime: unixtime,
        date: data.date,
        time: data.time,
      }),
      whenIso: when && !isNaN(when.getTime()) ? when.toISOString() : null,
      leader,
      server,
      serverId: String(data.serverId || data.serverid || ''),
      channel,
      channelId: String(data.channelId || data.channelid || ''),
      description: data.description || data.description2 || '',
      roles: data.roles || [],
      classes: data.classes || [],
      color: data.color || '',
      lastUpdated: data.lastUpdated || data.last_updated || null,
      image: advanced.image || '',
      advanced,
      raw: data,
      ...summary,
    };
  }

  /**
   * Fetch single event — official v4 (public), fallback legacy.
   * Optional apiKey in Authorization for rate-limit by key (docs).
   */
  async function fetchEvent(eventIdOrUrl, opts) {
    const id = extractEventId(eventIdOrUrl);
    if (!id) throw new Error('Paste a Raid-Helper event link or numeric event ID');

    const headers = { Accept: 'application/json' };
    const key = opts && opts.apiKey;
    if (key) headers.Authorization = String(key).trim();

    let data = null;
    let res = await fetch(API_V4_EVENT + encodeURIComponent(id), {
      headers,
      cache: 'no-store',
    });
    if (res.ok) {
      data = await res.json();
    } else {
      // legacy fallback
      res = await fetch(API_LEGACY_EVENT + encodeURIComponent(id), {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(
          res.status === 404
            ? 'Event not found — check the link is public and the ID is correct'
            : `Raid-Helper error HTTP ${res.status}`
        );
      }
      data = await res.json();
    }
    return normalizeEventPayload(data, id);
  }

  /**
   * List all events on a Discord server (official API).
   * GET /api/v4/servers/{serverId}/events
   * Header: Authorization: <apikey>  (from Discord /apikey)
   * Optional: Page header for pagination (max 1000 per page)
   */
  async function listServerEvents(serverId, apiKey, opts) {
    const sid = String(serverId || '').trim();
    const key = cleanApiKey(apiKey);
    if (!sid) throw new Error('Missing Discord server id');
    if (!key) {
      throw new Error(
        'Need server API key — in Discord run /apikey (admin/manage server) and paste it here'
      );
    }

    const page = (opts && opts.page) || 1;
    const headers = {
      Accept: 'application/json',
      Authorization: key,
    };
    if (page > 1) headers.Page = String(page);

    // Prefer CORS proxy (GitHub Pages cannot call RH with Authorization header)
    const proxy = getProxyBase();
    const urls = [];
    if (proxy) {
      urls.push(
        proxy +
          '/v4/servers/' +
          encodeURIComponent(sid) +
          '/events' +
          (page > 1 ? '?page=' + page : '')
      );
    }
    urls.push(API_V4_SERVER_EVENTS + encodeURIComponent(sid) + '/events');

    let res = null;
    let data = null;
    let lastErr = '';
    for (const url of urls) {
      try {
        res = await fetch(url, { headers, cache: 'no-store' });
      } catch (netErr) {
        // Browser "Failed to fetch" = usually CORS from GitHub Pages
        lastErr = 'network: ' + (netErr.message || netErr);
        if (!proxy) {
          throw new Error(
            'Raid-Helper blocks API keys from the browser (CORS). ' +
              'Deploy api/rh-proxy (Cloudflare Worker) and set config.raidHelperProxyUrl, ' +
              'or paste a single event link instead. See api/rh-proxy/README.'
          );
        }
        continue;
      }
      if (res.ok) {
        data = await res.json();
        break;
      }
      const body = await res.text();
      lastErr = res.status + ' ' + body.slice(0, 160);
      if (res.status === 401 || res.status === 403) {
        let reason = 'Invalid API key';
        try {
          const j = JSON.parse(body);
          if (j.reason) reason = j.reason;
        } catch (_) {}
        throw new Error(
          reason +
            ' — In Discord run /apikey, copy the key carefully (no commas/spaces), paste again. ' +
            'If you shared the key publicly, refresh it with /apikey.'
        );
      }
    }
    if (!data) {
      throw new Error(
        'Could not list server events (' +
          lastErr +
          '). Use a fresh /apikey key and set raidHelperProxyUrl if on GitHub Pages.'
      );
    }

    // Response: array, or { events, page, pages, count, ... }
    const arr = Array.isArray(data)
      ? data
      : data.events || data.postedEvents || data.items || [];
    const events = arr.map((e) => {
      const id = String(e.id || e.raidid || e.raidId || e.messageId || '');
      const unixtime = e.startTime || e.unixtime || e.unixStart || null;
      const rawTitle = e.title || e.displayTitle || e.description || '';
      return {
        id,
        title: smartEventTitle(rawTitle, unixtime, e.date, e.time),
        date: e.date || '',
        time: e.time || '',
        unixtime: unixtime ? Number(unixtime) : null,
        leader: e.leaderName || e.leadername || e.leader || '',
        channel: e.channelName || e.channel || '',
        server: e.serverName || e.servername || '',
        color: e.color || '',
        url: id ? eventPageUrl(id) : '',
        raw: e,
      };
    });

    events.sort((a, b) => (a.unixtime || 0) - (b.unixtime || 0));
    const now = Date.now() / 1000;
    const upcoming = events.filter((e) => !e.unixtime || e.unixtime >= now - 3 * 3600);
    const past = events.filter((e) => e.unixtime && e.unixtime < now - 3 * 3600);

    return {
      serverId: sid,
      events,
      upcoming,
      past,
      next: upcoming[0] || null,
      page: data.page || data.currentPage || page,
      pages: data.pages || data.totalPages || 1,
      count: data.count || data.eventCount || events.length,
      total: data.total || data.totalEvents || events.length,
      raw: data,
    };
  }

  /** Calendar link fallback (unrestricted calendar key — not the official API key) */
  function parseCalendarUrl(input) {
    const s = String(input || '').trim();
    if (!s) return null;
    let m = s.match(
      /raid-helper\.(?:xyz|dev)\/calendar\/(\d{10,})\/([A-Za-z0-9_\-]+)/i
    );
    if (m) return { serverId: m[1], calendarKey: m[2] };
    if (/^[A-Za-z0-9_\-]{6,}$/.test(s) && !/^\d{15,}$/.test(s)) {
      return { serverId: '', calendarKey: s };
    }
    m = s.match(/^(\d{10,})[\/\s]+([A-Za-z0-9_\-]+)$/);
    if (m) return { serverId: m[1], calendarKey: m[2] };
    return null;
  }

  async function listServerEventsViaCalendar(serverId, calendarKey) {
    const sid = String(serverId || '').trim();
    const key = String(calendarKey || '').trim();
    if (!sid || !key || key === 'none') {
      throw new Error('Need calendar server id + key');
    }
    const url =
      BASE +
      '/api/events/' +
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
    if (res.status === 403) throw new Error('Invalid calendar key');
    if (!res.ok) throw new Error('Calendar list failed HTTP ' + res.status);
    const data = await res.json();
    const arr = data.events || data || [];
    const events = (Array.isArray(arr) ? arr : []).map((e) => {
      const id = String(e.id || e.raidid || '');
      const unixtime = e.unixtime || e.startTime || null;
      const rawTitle = e.title || e.displayTitle || '';
      return {
        id,
        title: smartEventTitle(rawTitle, unixtime, e.date, e.time),
        date: e.date || '',
        time: e.time || '',
        unixtime: unixtime ? Number(unixtime) : null,
        leader: e.leadername || e.leaderName || '',
        channel: e.channelName || '',
        server: e.servername || '',
        color: e.color || '',
        url: id ? eventPageUrl(id) : '',
        raw: e,
      };
    });
    events.sort((a, b) => (a.unixtime || 0) - (b.unixtime || 0));
    const now = Date.now() / 1000;
    const upcoming = events.filter((e) => !e.unixtime || e.unixtime >= now - 3 * 3600);
    return {
      serverId: sid,
      events,
      upcoming,
      past: events.filter((e) => e.unixtime && e.unixtime < now - 3 * 3600),
      next: upcoming[0] || null,
      source: 'calendar',
    };
  }

  /**
   * Smart list: prefer official API key, else calendar key.
   */
  async function listGuildEvents(cfg) {
    const c = cfg || {};
    const sid = c.raidHelperServerId || c.serverId || '';
    const apiKey = cleanApiKey(c.raidHelperApiKey || c.apiKey || '');
    const calKey = String(c.raidHelperCalendarKey || c.calendarKey || '').trim();

    let apiErr = null;
    if (sid && apiKey) {
      try {
        const list = await listServerEvents(sid, apiKey);
        list.source = 'api';
        return list;
      } catch (e) {
        apiErr = e;
        // fall through to calendar if available
        if (!calKey) throw e;
      }
    }
    if (sid && calKey) {
      try {
        return await listServerEventsViaCalendar(sid, calKey);
      } catch (e) {
        if (apiErr) throw apiErr;
        throw e;
      }
    }
    if (apiErr) throw apiErr;
    throw new Error(
      'Set Raid-Helper API key (Discord /apikey) + deploy rh-proxy for GitHub Pages, or paste a single event URL'
    );
  }

  // expose cleaner
  global.RaidHelperCleanApiKey = cleanApiKey;

  async function resolveActiveEvent(cfg) {
    const c = cfg || {};
    try {
      const list = await listGuildEvents(c);
      if (list.next && list.next.id) {
        return {
          source: list.source || 'api',
          eventId: list.next.id,
          url: list.next.url,
          list,
        };
      }
      if (list.events.length) {
        const last = list.events[list.events.length - 1];
        return {
          source: list.source || 'api',
          eventId: last.id,
          url: last.url,
          list,
        };
      }
    } catch (e) {
      return {
        source: 'error',
        error: e.message,
        eventId: extractEventId(c.raidHelperEventUrl || ''),
      };
    }
    const id = extractEventId(c.raidHelperEventUrl || '');
    return {
      source: 'config',
      eventId: id,
      url: id ? eventPageUrl(id) : '',
      list: null,
    };
  }

  function toPlayerPatches(event, nameOverrides) {
    const overrides = nameOverrides || {};
    const patches = {};
    for (const s of event.list || []) {
      if (!s.name || s.isSoft || !s.isPrimary) continue;
      if (isSoftStatus(s.role, s.class, s.status)) continue;

      const preferred =
        overrides[s.name] ||
        overrides[String(s.name).toLowerCase()] ||
        overrides[(s.mainName || '').toLowerCase()];
      // Show full dual name (Moon/Luna); stable key from main part
      const parts = s.nameParts || nameParts(s.name);
      const main = pickMainName(s.name, preferred);
      const display = preferred || s.name || main;
      const key = main.toLowerCase();
      if (patches[key]) continue;
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
    parseCalendarUrl,
    listServerEvents,
    listServerEventsViaCalendar,
    listGuildEvents,
    resolveActiveEvent,
    normalizeEventPayload,
    cleanApiKey,
    smartEventTitle,
    parseUnixDate,
  };
})(typeof window !== 'undefined' ? window : globalThis);
