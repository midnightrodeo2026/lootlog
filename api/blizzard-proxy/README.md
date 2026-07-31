# Blizzard character lookup proxy

Same pattern as Raider.IO and other armory tools: **client credentials stay on a server**.

Browser apps cannot safely hold a Battle.net **client secret**. This Cloudflare Worker:

1. Exchanges `BNET_CLIENT_ID` / `BNET_CLIENT_SECRET` for an access token
2. Calls Classic Profile APIs (summary, specializations, equipment) under `profile-classic-{region}`
3. Returns class / spec / iLvl for the Lootlog roster

The site’s **Raid 25 → Gear** button uses this when `blizzardProxyUrl` + realm are set.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Proxy status + whether secrets are set |
| `GET` | `/character/:realm/:name?game=classic\|classic1x` | Character lookup |
| `GET` | `/search/character?name=&realm=&game=` | Same as character |

### Game namespaces

- `classic` → `profile-classic-{region}` (progressive Classic armory)
- `classic1x` → `profile-classic1x-{region}` (Classic Era)

> **TBC Classic note:** Blizzard no longer runs a separate live “TBC Classic” armory.
> Use `classic` for the current progression Classic phase. Loot **items** in the ledger
> still use Wowhead’s TBC domain for icons and tooltips.

## Setup

1. Create a client at [Battle.net Developer Portal](https://develop.battle.net/access/clients)  
   (Client credentials flow is enough — no redirect URL required for this proxy.)

2. Install and log in to Cloudflare:

```bash
cd api/blizzard-proxy
npm install
npx wrangler login
```

3. Set secrets and deploy:

```bash
npx wrangler secret put BNET_CLIENT_ID
npx wrangler secret put BNET_CLIENT_SECRET
npx wrangler deploy
```

4. Optional: lock CORS in `wrangler.toml`:

```toml
CORS_ORIGINS = "https://midnightrodeo2026.github.io,http://127.0.0.1:5500"
```

5. Put the worker URL in the site root `config.js`:

```js
window.LOOTLOG_CONFIG = {
  blizzardProxyUrl: 'https://lootlog-blizzard-proxy.<you>.workers.dev',
  region: 'us',
  game: 'classic',
  defaultRealm: 'your-realm',
};
```

## Example response

```json
{
  "ok": true,
  "game": "classic",
  "namespace": "profile-classic-us",
  "character": {
    "name": "Aerindel",
    "realm": "Benediction",
    "class": "Paladin",
    "spec": "Retribution",
    "ilvl": "141",
    "race": "Human",
    "guild": "Midnight Rodeo",
    "level": 70
  }
}
```
