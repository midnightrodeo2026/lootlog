// Midnight Rodeo lootlog config
// Battle.net keys: https://develop.battle.net/access/clients
// Deploy: api/blizzard-proxy (see its README)

window.LOOTLOG_CONFIG = {
  // Cloudflare Worker URL after `npx wrangler deploy`
  blizzardProxyUrl: '',

  region: 'us',
  game: 'classic', // 'classic' | 'classic1x'
  defaultRealm: '',
  locale: 'en_US',
  guildName: 'Midnight Rodeo',
};
