# Midnight Rodeo — Loot Ledger

A shared loot-council ledger for **Midnight Rodeo** (Burning Crusade Classic aesthetic + Classic armory lookups).  
Paste [Gargul](https://github.com/papa-smurf/Gargul) exports, brand the loot, and look up raiders on Blizzard’s WoW Classic Profile API.

**Repo:** https://github.com/midnightrodeo2026/lootlog

## Features

- **Overview** — guild-wide stats and recent activity  
- **Ledger** — paste Gargul exports (CSV / JSON), edit/delete when unlocked  
- **Roster** — wranglers ranked by loot + **Blizzard character lookup** (class / spec / iLvl)  
- **Items** — drop frequency with Wowhead TBC icons and quality colors  
- **Raids** — nights grouped by date, CSV export, disenchant notes  
- **Lootmaster login** — UI gate only (see security note)

## Character lookups (Blizzard API)

The browser cannot hold a Battle.net client secret. Character lookups go through a tiny Cloudflare Worker:

```
api/blizzard-proxy  →  oauth.battle.net  →  {region}.api.blizzard.com
```

### What you get

| Field | Source |
|-------|--------|
| Class | Character profile summary |
| Spec | Specializations endpoint |
| iLvl | Profile average / equipped, else gear average |
| Race, guild, level | Profile summary |

### One-time setup

1. Create API credentials: https://develop.battle.net/access/clients  
2. Deploy the proxy (see [`api/blizzard-proxy/README.md`](api/blizzard-proxy/README.md)):

```bash
cd api/blizzard-proxy
npm install
npx wrangler login
npx wrangler secret put BNET_CLIENT_ID
npx wrangler secret put BNET_CLIENT_SECRET
npx wrangler deploy
```

3. Edit root `config.js`:

```js
window.LOOTLOG_CONFIG = {
  blizzardProxyUrl: 'https://lootlog-blizzard-proxy.YOUR_SUBDOMAIN.workers.dev',
  region: 'us',
  game: 'classic',       // or 'classic1x' for Classic Era
  defaultRealm: 'Benediction',
};
```

4. Open the **Roster** tab → set realm → **Test API** → **Lookup** on a wrangler (or **Lookup all**).

### Classic vs TBC

- **Items / tooltips** use Wowhead **TBC** (`domain=tbc`) so loot icons match BC gear.  
- **Character armory** uses Blizzard **Classic Profile** namespaces (`profile-classic-*` or `profile-classic1x-*`). There is no separate live “TBC Classic only” armory anymore — pick the realm/game your raiders actually play on.

## Running the site

No build step. Open `index.html` locally, or host on **GitHub Pages**:

1. Push to `main`  
2. Settings → Pages → Deploy from branch → `main` / root  
3. Site: `https://midnightrodeo2026.github.io/lootlog/`

Data is stored in **localStorage** (or Claude’s `window.storage` when present). It is per-browser, not a shared guild database yet — export CSV when you need a backup.

## Security note

Lootmaster login only hides edit controls in the UI. Anyone with the password (or page source) can still change local data. Do not treat it as real auth.

## Project layout

```
index.html                 # App UI
config.js                  # Proxy URL + realm defaults
config.example.js          # Template
js/wow-api.js              # Character + optional item helpers
api/blizzard-proxy/        # Cloudflare Worker (OAuth + Profile API)
```

## Credits

Built for Midnight Rodeo. Item tooltips via [Wowhead TBC](https://www.wowhead.com/tbc). Character data via [Battle.net Developer API](https://develop.battle.net/). Loot imports from [Gargul](https://github.com/papa-smurf/Gargul).
