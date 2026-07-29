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

  // Discord / Raid-Helper server (Midnight Rodeo)
  raidHelperServerId: '491809191154155520',
  // Unrestricted calendar key — RH panel → Calendar → copy share link:
  //   https://raid-helper.xyz/calendar/491809191154155520/<KEY>
  // Paste full link or just the key here (or on Raids tab) for auto event discovery.
  raidHelperCalendarKey: '',

  // Fallback single event if calendar key not set yet
  raidHelperEventUrl: 'https://raid-helper.xyz/event/1530078606578024520',

  // Discord server icon (shown in header)
  guildIconUrl:
    'https://cdn.discordapp.com/icons/491809191154155520/57f435ac49e7f30c19490785c15e1b7f.png?size=128',

  // Share THIS link in Discord (our board — no need to open RH)
  // Live site: https://vorlof69.github.io/lootlog/event.html
  signupBoardPath: 'event.html',

  // Optional event banner image (overrides RH advanced.image if set).
  eventBannerUrl: '',
};
