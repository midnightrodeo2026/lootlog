# Midnight Rodeo — TBC Classic Guild Manager

**Burning Crusade Classic only.** Not retail, not Classic Era, not Wrath/Cata/MoP.

Guild loot council + Raid-Helper roster + Gargul imports + raid logs for **Midnight Rodeo**.

**Repo:** https://github.com/vorlof69/lootlog  
**Live site (GitHub Pages):** https://vorlof69.github.io/lootlog/  
**Target guild repo (optional):** https://github.com/midnightrodeo2026/lootlog

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

## GitHub Pages (free hosting)

This app is static HTML/JS — ideal for free GitHub Pages. No build step.

### Already enabled for `vorlof69/lootlog`

- **URL:** https://vorlof69.github.io/lootlog/  
- **Source:** `main` branch, `/ (root)`  
- Push to `main` and the site redeploys in ~1 minute  

### Enable on another repo (e.g. midnightrodeo2026)

1. Push code to that GitHub repo  
2. **Settings → Pages**  
3. Source: **Deploy from a branch**  
4. Branch: `main`, folder: `/ (root)` → Save  
5. Site: `https://<username>.github.io/lootlog/`

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
CORS_ORIGINS = "https://vorlof69.github.io,https://midnightrodeo2026.github.io"
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
