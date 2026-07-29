# Raid-Helper CORS proxy

GitHub Pages **cannot** call authenticated Raid-Helper APIs from the browser  
(`Authorization` triggers a CORS preflight that only allows `raid-helper.xyz`).

This Cloudflare Worker proxies:

- `GET /v4/events/:id` — public event
- `GET /v4/servers/:serverId/events` — all guild events (needs API key)

## Deploy (free Cloudflare account)

```bash
cd api/rh-proxy
npm install
npx wrangler login
npx wrangler deploy
```

Optional — store the key on the worker instead of the browser:

```bash
npx wrangler secret put RH_API_KEY
```

## Wire the app

In `config.js`:

```js
raidHelperProxyUrl: 'https://lootlog-rh-proxy.<your-subdomain>.workers.dev',
// leave empty in public repo — paste key in Raids tab (admin) instead:
raidHelperApiKey: '',
```

## Get a key

In Discord (Midnight Rodeo): `/apikey`  
Copy once. If the key was shared in chat, **refresh** it with `/apikey` again.

## Without the proxy

Paste a single event URL on the Raids tab — public event fetch works without a key.
