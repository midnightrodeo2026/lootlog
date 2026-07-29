# Midnight Rodeo — Loot Ledger

Modern guild loot council tool for **TBC Classic** aesthetics: Gargul imports, raid view logs, item distribution, and Blizzard Classic gear sync.

**Live work copy:** https://github.com/vorlof69/lootlog  
**Target org repo:** https://github.com/midnightrodeo2026/lootlog

## Features

| Tab | What you get |
|-----|----------------|
| **Overview** | Raids / items / raiders KPIs, shortcut cards, share + backup JSON |
| **Ledger** | Paste Gargul (CSV / JSON), brand loot, DE notes, CSV export |
| **Roster** | Rank, class-colored names, iLvl, last active, **Gear sync** timestamps |
| **Items** | Unique / total / most-dropped, quality colors, drop bars |
| **Raids** | History list → **View log** (awards + disenchants + CSV + copy link) |

## Quick start

1. Open `index.html` in a browser (or host on GitHub Pages).  
2. **First-time setup** → create the **Admin** account (username + password).  
3. Open **Settings** → create Officer / Lootmaster / Viewer accounts, set guild name & realm.  
4. Paste a Gargul export on **Ledger** → **Brand it** (auto-resolves item names via Wowhead TBC).  
5. Optional gear sync: deploy the Blizzard proxy and fill `config.js`.

## Accounts & roles

| Role | Can do |
|------|--------|
| **Admin** | Everything + manage users/settings |
| **Lootmaster** | Brand/edit/delete loot, DE notes, import backup |
| **Officer** | Gear sync + roster fields (if allowed in Settings) |
| **Viewer** | Read-only (export optional) |

Passwords are **salted SHA-256** in `localStorage`. This stops casual edits; it is **not** server-side security. For real multi-officer sync, add Supabase next.

Settings tab also covers: require login, public view, officer permissions, change-my-password, accounts backup import/export.

## Gargul

Supported pastes:

- **Simple lines:** `2026-07-28,PlayerName,28729`
- **Header CSV:** columns like Player, Item, Item ID, Date, Reason…
- **Detailed JSON:** array of award objects (`awardedTo`, `item.id`, etc.)
- **TSV** (tab-separated)

After import, **Resolve item names** fills names, icons, quality, and item iLvl from Wowhead TBC (`dataEnv=5`).

### Best Gargul workflow

1. In-game: award loot with Gargul as usual.  
2. `/gl export` → Detailed JSON (preferred) or Simple string.  
3. Paste into Ledger → Brand it.  
4. Mark disenchants with ♻ on an entry.  
5. Open **Raids → View log** for officer Discord paste / CSV.

## Character gear sync (Blizzard API)

Browsers cannot hold a Battle.net **client secret**. Use the proxy:

```bash
cd api/blizzard-proxy
npm install
npx wrangler login
npx wrangler secret put BNET_CLIENT_ID
npx wrangler secret put BNET_CLIENT_SECRET
npx wrangler deploy
```

Then `config.js`:

```js
window.LOOTLOG_CONFIG = {
  blizzardProxyUrl: 'https://lootlog-blizzard-proxy.YOUR.workers.dev',
  region: 'us',
  game: 'classic',
  defaultRealm: 'YourRealm',
};
```

Roster → enter realm → **Test API** → **Gear sync** / **Gear sync all**.

> Armory uses **current Classic** namespaces (`profile-classic-*`). Loot icons still use **Wowhead TBC**.

## Data & sharing

- Default storage: **localStorage** (per browser).  
- **Export backup JSON** / **Import backup** on Overview for guild handoff.  
- For true multi-officer live sync, add Supabase/Firebase next (recommended).

## Project layout

```
index.html              # App
config.js               # Proxy URL + realm
js/wow-api.js           # Blizzard + Wowhead helpers
api/blizzard-proxy/     # Cloudflare Worker
```

## Recommended next upgrades

See the product notes in the last commit message / chat — top picks:

1. **Shared Supabase backend** (one guild link for everyone)  
2. **Player profile page** (personal loot history + gear sheet)  
3. **Soft-reserve import** from Gargul softres  
4. **Discord webhook** when a raid is branded  
5. **Guild roster rank pull** via Blizzard guild API  

## Credits

Midnight Rodeo guild. Items via [Wowhead TBC](https://www.wowhead.com/tbc). Characters via [Battle.net API](https://develop.battle.net/). Imports from [Gargul](https://github.com/papa-smurf/Gargul).
