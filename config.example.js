// Copy to config.js. This app is TBC Classic ONLY.
//
// Real iLvl (optional) — same pattern Raider.IO / armory sites use:
// 1) Battle.net developer portal → create client (client credentials)
// 2) cd api/blizzard-proxy && wrangler secret put BNET_CLIENT_ID / BNET_CLIENT_SECRET
// 3) npx wrangler deploy → paste worker URL below
// 4) Set defaultRealm to your progressive Classic realm
// Without proxy: Gear still fills class/spec/iLvl from Raid-Helper + loot estimates.
window.LOOTLOG_CONFIG = {
  blizzardProxyUrl: 'https://lootlog-blizzard-proxy.YOUR_SUBDOMAIN.workers.dev',
  region: 'us',
  game: 'classic',
  defaultRealm: 'YourRealm',
  locale: 'en_US',
  guildName: 'Midnight Rodeo',
  expansion: 'tbc',
  tbcOnly: true,
  raidHelperProxyUrl: 'https://lootlog-rh-proxy.YOUR_SUBDOMAIN.workers.dev',
  raidHelperServerId: 'YOUR_DISCORD_SERVER_ID',
  raidHelperEventUrl: '',
};
