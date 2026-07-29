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
  // Server API key — Discord: /apikey (admin or Manage Server only).
  // Required to auto-list all guild events. Never commit a real key to a public repo.
  raidHelperApiKey: '',
  // Optional: unrestricted calendar key (fallback if no API key)
  raidHelperCalendarKey: '',

  // Fallback single event if API key not set yet
  raidHelperEventUrl: 'https://raid-helper.xyz/event/1530078606578024520',

  // Share THIS link in Discord (our board)
  signupBoardPath: 'event.html',

  eventBannerUrl: '',
};
