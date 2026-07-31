# Midnight Rodeo — TBC Classic Guild Manager

**Burning Crusade Classic only.** Not retail, not Classic Era, not Wrath/Cata/MoP.

Guild loot council + Raid-Helper roster + Gargul imports + raid logs for **Midnight Rodeo**.

**Repo:** https://github.com/midnightrodeo2026/lootlog  
**Live site (GitHub Pages):** https://midnightrodeo2026.github.io/lootlog/

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

## Character gear / real iLvl (optional Blizzard armory)

**How other programs do it** (Raider.IO, armory addons, most Classic tools):

1. Battle.net **client credentials** OAuth on a **server** (never in the browser)
2. Call Classic profile APIs: character summary + specializations + equipment  
   Namespace: `profile-classic-{region}` (progressive) or `profile-classic1x-{region}` (Era)
3. Read `average_item_level` / equip item levels → display iLvl
4. Cache results and rate-limit lookups

**This app does the same** via `api/blizzard-proxy` (Cloudflare Worker holds the secret).

Without the proxy, **Gear** still works from Raid-Helper class/spec + loot iLvl estimates.

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

**Raid 25** → set realm → **Test armory** → **Gear**. Dual names try the main part first (Moon/Luna → Moon).

> There is no separate live “TBC-only” Blizzard armory API. Use `classic` for current progression. Loot icons still use **Wowhead TBC**.

## GitHub Pages (free hosting)

This app is static HTML/JS — ideal for free GitHub Pages. No build step.

### Live site · `midnightrodeo2026/lootlog`

- **URL:** https://midnightrodeo2026.github.io/lootlog/  
- **Source:** `main` branch, `/ (root)`  
- Push to `main` and the site redeploys in ~1 minute  

### What works on Pages

| Feature | Works? |
|---------|--------|
| Full UI, Gargul import, raid view logs | Yes |
| Accounts / Settings (passwords) | Yes — **per browser** |
| Wowhead TBC icons & names | Yes |
| Blizzard gear sync | Yes, if Worker URL is in `config.js` |

### Important for guild use

- GitHub Pages only **hosts the files**. It does **not** give you a shared database.  
- Loot + accounts live in each officer’s **localStorage**.  
- Use **Overview → Export backup JSON** and **Import** to share data, or add Supabase later for live multi-user sync.  
- When you deploy the Blizzard proxy, set CORS to allow:

```toml
CORS_ORIGINS = "https://midnightrodeo2026.github.io"
```

## Data & sharing

- Default storage: **localStorage** (per browser).  
- **Export backup JSON** / **Import backup** on Overview for guild handoff.  
- For true multi-officer live sync, add Supabase free tier next.

## Project layout

```
index.html              # App (GitHub Pages entry)
.nojekyll               # Skip Jekyll processing on Pages
config.js               # Proxy URL + realm
js/accounts.js          # Multi-account auth
js/wow-api.js           # Blizzard + Wowhead helpers
api/blizzard-proxy/     # Cloudflare Worker (optional)
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
