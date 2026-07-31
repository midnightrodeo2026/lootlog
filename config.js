// Midnight Rodeo — TBC Classic ONLY guild manager
// Not retail · not Classic Era · not Wrath/Cata/MoP
window.LOOTLOG_CONFIG = {
  blizzardProxyUrl: '',

  region: 'us',
  game: 'classic',
  defaultRealm: '',
  locale: 'en_US',
  guildName: 'Midnight Rodeo',

  // Locked expansion
  expansion: 'tbc',
  tbcOnly: true,

  // Discord / Raid-Helper (Midnight Rodeo)
  // Docs: https://raid-helper.xyz/documentation/api
  raidHelperServerId: '491809191154155520',
  // Server API key — Discord: /apikey (admin only). NEVER commit a real key.
  // Paste in Raids tab (stored in your browser only).
  raidHelperApiKey: '',
  // Cloudflare Worker that bypasses RH CORS (see api/rh-proxy/README.md).
  // Required for Auto events on GitHub Pages with an API key.
  raidHelperProxyUrl: '',
  // Optional calendar key fallback
  raidHelperCalendarKey: '',

  // Optional fallback single event (leave empty — paste on Signups or use API key)
  raidHelperEventUrl: '',

  // Discord guild icon (logo)
  guildIconUrl:
    'https://cdn.discordapp.com/icons/491809191154155520/57f435ac49e7f30c19490785c15e1b7f.png?size=128',

  // Share THIS link in Discord (our board)
  signupBoardPath: 'event.html',

  eventBannerUrl: '',
};
