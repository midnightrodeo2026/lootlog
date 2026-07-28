// Copy to config.js and fill in. config.js is gitignored.
// Create a client at https://develop.battle.net/access/clients
// then deploy api/blizzard-proxy with BNET_CLIENT_ID / BNET_CLIENT_SECRET.

window.LOOTLOG_CONFIG = {
  // Required for character lookups — URL of your Cloudflare Worker
  blizzardProxyUrl: 'https://lootlog-blizzard-proxy.YOUR_SUBDOMAIN.workers.dev',

  // us | eu | kr | tw  (must match the worker's BNET_REGION)
  region: 'us',

  // "classic"  = progressive Classic armory (TBC/Wrath/Cata/MoP era, current phase)
  // "classic1x" = Classic Era / 1.x
  game: 'classic',

  // Default realm slug for roster lookups (e.g. "benediction", "faerlina")
  defaultRealm: '',

  locale: 'en_US',
};
