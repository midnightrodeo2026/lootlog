/**
 * Midnight Rodeo — Raid-Helper API CORS proxy
 *
 * Browser pages on GitHub Pages cannot call authenticated RH endpoints
 * (OPTIONS only allows Origin: raid-helper.xyz). This worker forwards
 * requests and returns Access-Control-Allow-Origin for our site.
 *
 * Deploy:
 *   cd api/rh-proxy
 *   npx wrangler deploy
 * Secrets (optional — can also pass Authorization from the page):
 *   npx wrangler secret put RH_API_KEY
 *
 * Then set in config.js:
 *   raidHelperProxyUrl: 'https://YOUR-WORKER.workers.dev'
 *
 * Routes:
 *   GET /health
 *   GET /v4/events/:id              → public event (no key)
 *   GET /v4/servers/:serverId/events → needs Authorization header or RH_API_KEY secret
 */
function cors(request, env) {
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body, status, request, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=30' : 'no-store',
      ...cors(request, env),
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(request, env) });
    }
    if (request.method !== 'GET') {
      return json({ error: 'GET only' }, 405, request, env);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (path === '/health' || path === '/') {
      return json({ ok: true, service: 'lootlog-rh-proxy' }, 200, request, env);
    }

    // GET /v4/events/:id
    let m = path.match(/^\/v4\/events\/(\d{10,})$/);
    if (m) {
      return proxy(
        request,
        env,
        'https://raid-helper.xyz/api/v4/events/' + m[1],
        false
      );
    }

    // GET /v4/servers/:serverId/events
    m = path.match(/^\/v4\/servers\/(\d{10,})\/events$/);
    if (m) {
      return proxy(
        request,
        env,
        'https://raid-helper.xyz/api/v4/servers/' + m[1] + '/events',
        true
      );
    }

    return json(
      {
        error: 'Unknown route',
        routes: [
          'GET /health',
          'GET /v4/events/:eventId',
          'GET /v4/servers/:serverId/events',
        ],
      },
      404,
      request,
      env
    );
  },
};

async function proxy(request, env, target, needAuth) {
  const headers = { Accept: 'application/json' };
  const fromClient = (request.headers.get('Authorization') || '').trim();
  const fromSecret = (env.RH_API_KEY || '').trim();
  const key = fromClient || fromSecret;
  if (needAuth) {
    if (!key) {
      return json(
        {
          error: 'missing_api_key',
          reason:
            'Send Authorization header or set RH_API_KEY secret on the worker',
        },
        401,
        request,
        env
      );
    }
    headers.Authorization = key;
  } else if (key) {
    // optional key for rate-limit bucket on public event fetch
    headers.Authorization = key;
  }

  // Forward optional Page / filters from query as headers RH understands
  const page = new URL(request.url).searchParams.get('page');
  if (page) headers.Page = page;
  const include = new URL(request.url).searchParams.get('includeSignUps');
  if (include) headers.IncludeSignUps = include;

  try {
    const res = await fetch(target, { headers, cf: { cacheTtl: 30 } });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/json',
        'Cache-Control': res.ok ? 'public, max-age=30' : 'no-store',
        ...cors(request, env),
      },
    });
  } catch (e) {
    return json(
      { error: 'upstream_failed', message: String(e.message || e) },
      502,
      request,
      env
    );
  }
}
