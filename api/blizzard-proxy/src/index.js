/**
 * Midnight Rodeo — Blizzard Battle.net proxy
 *
 * Keeps client id/secret off the page. Exposes character lookup for
 * WoW Classic progression (profile-classic-*) and Classic Era (profile-classic1x-*).
 *
 * Env (secrets): BNET_CLIENT_ID, BNET_CLIENT_SECRET
 * Env (vars):    BNET_REGION, CORS_ORIGINS
 */

const TOKEN_TTL_MS = 50 * 60 * 1000; // refresh before 1h expiry
let cachedToken = null;
let tokenExpiresAt = 0;

const CLASSIC_NAMESPACES = {
  // Progressive Classic (TBC → Wrath → Cata → MoP depending on current phase)
  classic: {
    profile: (region) => `profile-classic-${region}`,
    static: (region) => `static-classic-${region}`,
    dynamic: (region) => `dynamic-classic-${region}`,
  },
  // Classic Era / hardcore / SoD-style 1.x
  classic1x: {
    profile: (region) => `profile-classic1x-${region}`,
    static: (region) => `static-classic1x-${region}`,
    dynamic: (region) => `dynamic-classic1x-${region}`,
  },
};

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  let allow = '*';
  if (allowed.length) {
    allow = allowed.includes(origin) ? origin : allowed[0];
  }

  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body, status, request, env) {
  return new Response(JSON.stringify(body, null, 0), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=60' : 'no-store',
      ...corsHeaders(request, env),
    },
  });
}

function slugifyRealm(realm) {
  return String(realm || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function slugifyName(name) {
  return String(name || '')
    .trim()
    .toLowerCase();
}

async function getAccessToken(env) {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const id = env.BNET_CLIENT_ID;
  const secret = env.BNET_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error('Missing BNET_CLIENT_ID / BNET_CLIENT_SECRET on the worker');
  }

  const region = (env.BNET_REGION || 'us').toLowerCase();
  const tokenHost =
    region === 'cn' ? 'https://oauth.battlenet.com.cn' : 'https://oauth.battle.net';

  const basic = btoa(`${id}:${secret}`);
  const res = await fetch(`${tokenHost}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + Math.min((data.expires_in || 3600) * 1000, TOKEN_TTL_MS);
  return cachedToken;
}

async function blizzardGet(path, namespace, locale, env) {
  const region = (env.BNET_REGION || 'us').toLowerCase();
  const apiHost =
    region === 'cn'
      ? 'https://gateway.battlenet.com.cn'
      : `https://${region}.api.blizzard.com`;

  const token = await getAccessToken(env);
  const url = new URL(path, apiHost);
  url.searchParams.set('namespace', namespace);
  url.searchParams.set('locale', locale || 'en_US');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return { ok: res.ok, status: res.status, data };
}

function pickSpec(specializations) {
  if (!specializations) return '';
  const active =
    specializations.active_specialization ||
    (specializations.specializations || []).find((s) => s.specialization);
  if (active?.specialization?.name) return active.specialization.name;
  if (active?.name) return active.name;
  const first = (specializations.specializations || [])[0];
  return first?.specialization?.name || first?.name || '';
}

function avgIlvlFromEquipment(equipment) {
  if (!equipment?.equipped_items?.length) return null;
  const levels = equipment.equipped_items
    .map((i) => i.level?.value)
    .filter((n) => typeof n === 'number' && n > 0);
  if (!levels.length) return null;
  return Math.round(levels.reduce((a, b) => a + b, 0) / levels.length);
}

function mapCharacter(summary, specializations, equipment) {
  const className = summary?.character_class?.name || '';
  const race = summary?.race?.name || '';
  const guild = summary?.guild?.name || '';
  const level = summary?.level ?? null;
  const realm = summary?.realm?.name || summary?.realm?.slug || '';
  const name = summary?.name || '';
  const faction = summary?.faction?.name || '';

  let ilvl =
    summary?.average_item_level ??
    summary?.equipped_item_level ??
    avgIlvlFromEquipment(equipment);

  const spec = pickSpec(specializations);

  return {
    name,
    realm,
    realmSlug: summary?.realm?.slug || '',
    level,
    class: className,
    spec,
    ilvl: ilvl != null ? String(ilvl) : '',
    race,
    faction,
    guild,
    lastLoginTimestamp: summary?.last_login_timestamp || null,
    source: 'blizzard-classic',
  };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if (path === '/' || path === '/health') {
        return json(
          {
            ok: true,
            service: 'lootlog-blizzard-proxy',
            region: env.BNET_REGION || 'us',
            hasCredentials: !!(env.BNET_CLIENT_ID && env.BNET_CLIENT_SECRET),
            endpoints: [
              'GET /health',
              'GET /character/:realm/:name?game=classic|classic1x&locale=en_US',
              'GET /search/character?name=&realm=&game=classic|classic1x',
            ],
          },
          200,
          request,
          env
        );
      }

      // GET /character/:realm/:name
      const charMatch = path.match(/^\/character\/([^/]+)\/([^/]+)$/i);
      if (charMatch) {
        if (!env.BNET_CLIENT_ID || !env.BNET_CLIENT_SECRET) {
          return json(
            {
              error: 'proxy_not_configured',
              message:
                'Set BNET_CLIENT_ID and BNET_CLIENT_SECRET on this worker (Battle.net developer portal).',
            },
            503,
            request,
            env
          );
        }

        const region = (env.BNET_REGION || 'us').toLowerCase();
        const game = (url.searchParams.get('game') || 'classic').toLowerCase();
        const locale = url.searchParams.get('locale') || 'en_US';
        const nsFamily = CLASSIC_NAMESPACES[game] || CLASSIC_NAMESPACES.classic;
        const profileNs = nsFamily.profile(region);

        const realmSlug = slugifyRealm(decodeURIComponent(charMatch[1]));
        const charName = slugifyName(decodeURIComponent(charMatch[2]));

        if (!realmSlug || !charName) {
          return json({ error: 'bad_request', message: 'realm and name are required' }, 400, request, env);
        }

        const base = `/profile/wow/character/${realmSlug}/${charName}`;

        const [summaryRes, specRes, equipRes] = await Promise.all([
          blizzardGet(base, profileNs, locale, env),
          blizzardGet(`${base}/specializations`, profileNs, locale, env),
          blizzardGet(`${base}/equipment`, profileNs, locale, env),
        ]);

        if (!summaryRes.ok) {
          const code = summaryRes.status === 404 ? 404 : summaryRes.status;
          return json(
            {
              error: summaryRes.status === 404 ? 'not_found' : 'blizzard_error',
              message:
                summaryRes.status === 404
                  ? `Character not found: ${charName} on ${realmSlug} (${game}). Check realm slug and game (classic vs classic1x).`
                  : summaryRes.data?.detail || summaryRes.data?.message || 'Blizzard API error',
              blizzardStatus: summaryRes.status,
              realmSlug,
              name: charName,
              namespace: profileNs,
            },
            code,
            request,
            env
          );
        }

        const character = mapCharacter(
          summaryRes.data,
          specRes.ok ? specRes.data : null,
          equipRes.ok ? equipRes.data : null
        );

        return json(
          {
            ok: true,
            game,
            namespace: profileNs,
            character,
            raw: {
              specializationsOk: specRes.ok,
              equipmentOk: equipRes.ok,
            },
          },
          200,
          request,
          env
        );
      }

      // GET /search/character?name=&realm=
      if (path === '/search/character') {
        if (!env.BNET_CLIENT_ID || !env.BNET_CLIENT_SECRET) {
          return json({ error: 'proxy_not_configured' }, 503, request, env);
        }

        const name = slugifyName(url.searchParams.get('name') || '');
        const realm = slugifyRealm(url.searchParams.get('realm') || '');
        if (!name || !realm) {
          return json(
            { error: 'bad_request', message: 'Query params name and realm are required' },
            400,
            request,
            env
          );
        }

        // Re-use the same character path (Blizzard has no public free-text character search without user OAuth)
        const game = (url.searchParams.get('game') || 'classic').toLowerCase();
        const locale = url.searchParams.get('locale') || 'en_US';
        const target = new URL(request.url);
        target.pathname = `/character/${realm}/${name}`;
        target.search = `?game=${encodeURIComponent(game)}&locale=${encodeURIComponent(locale)}`;
        return fetch(new Request(target.toString(), request), env);
      }

      return json({ error: 'not_found', message: `No route for ${path}` }, 404, request, env);
    } catch (err) {
      return json(
        { error: 'server_error', message: err.message || String(err) },
        500,
        request,
        env
      );
    }
  },
};
