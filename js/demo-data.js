/**
 * Midnight Rodeo — full TBC Classic demo for Guild Master presentation
 * Real RH-style roster + two raid nights of loot + notes.
 */
(function (global) {
  function fixClass(cClass, role, spec) {
    const c = (cClass || '').trim();
    const r = (role || '').toLowerCase();
    const s = (spec || '').toLowerCase();
    if (!c || /absence|tentative/i.test(c)) {
      if (/tank/.test(r)) return 'Warrior';
      if (/heal/.test(r)) return 'Priest';
      if (/fire|arcane|frost/.test(s)) return 'Mage';
      if (/enhancement|elemental|resto/.test(s)) return 'Shaman';
      return 'Warrior';
    }
    if (/^tank$/i.test(c)) {
      if (/guardian/.test(s)) return 'Druid';
      return 'Warrior';
    }
    if (/^rogue$/i.test(c)) return 'Rogue';
    return c;
  }

  function fixSpec(spec) {
    return String(spec || '')
      .replace(/1$/, '')
      .replace(/Beastmastery/i, 'Beast Mastery')
      .trim();
  }

  function mainName(name) {
    const n = String(name || '').trim();
    if (!n) return '';
    let m = n.split('/')[0].trim();
    m = m.replace(/\(.*\)$/, '').trim();
    m = m.replace(/\\.*$/, '').trim();
    return m || n;
  }

  const RODEO_RAIDERS = [
    { name: 'Dirtyslewt', class: 'Warrior', spec: 'Fury', role: 'Melee', rank: 'Guild Master' },
    { name: 'DirtyHawkins', class: 'Shaman', spec: 'Elemental', role: 'Ranged', rank: 'Officer' },
    { name: 'Oldmandutch', class: 'Warrior', spec: 'Protection', role: 'Tanks', rank: 'Officer' },
    { name: 'Moon/Luna', class: 'Druid', spec: 'Restoration', role: 'Healers', rank: 'Officer' },
    { name: 'Aku', class: 'Paladin', spec: 'Retribution', role: 'Melee', rank: 'Officer' },
    { name: 'Chckenburgaa', class: 'Shaman', spec: 'Enhancement', role: 'Melee' },
    { name: 'Sikru', class: 'Druid', spec: 'Balance', role: 'Ranged' },
    { name: 'Adam(Klinde)', class: 'Shaman', spec: 'Restoration', role: 'Healers' },
    { name: 'Imarn/Valazar', class: 'Shaman', spec: 'Elemental', role: 'Ranged' },
    { name: 'Stewo', class: 'Warlock', spec: 'Affliction', role: 'Ranged' },
    { name: 'Burny', class: 'Mage', spec: 'Fire', role: 'Ranged' },
    { name: 'Tyroneus', class: 'Hunter', spec: 'Beast Mastery', role: 'Ranged' },
    { name: 'Maudest', class: 'Rogue', spec: 'Combat', role: 'Melee' },
    { name: 'Zihm', class: 'Warrior', spec: 'Protection', role: 'Tanks' },
    { name: 'Jarub', class: 'Priest', spec: 'Holy', role: 'Healers' },
    { name: 'FuckingTom', class: 'Paladin', spec: 'Holy', role: 'Healers' },
    { name: 'Zavas', class: 'Paladin', spec: 'Holy', role: 'Healers' },
    { name: 'Druul', class: 'Druid', spec: 'Guardian', role: 'Tanks' },
    { name: 'Manchego', class: 'Shaman', spec: 'Restoration', role: 'Healers' },
    { name: 'Thickdad', class: 'Warrior', spec: 'Fury', role: 'Melee' },
    { name: 'Dawnsguard', class: 'Paladin', spec: 'Retribution', role: 'Melee' },
    { name: 'Glitterbeast', class: 'Hunter', spec: 'Beast Mastery', role: 'Ranged' },
    { name: 'Jinfaza', class: 'Mage', spec: 'Arcane', role: 'Ranged' },
    { name: 'Turkoyero', class: 'Priest', spec: 'Holy', role: 'Healers' },
    { name: 'teuseksi', class: 'Warrior', spec: 'Protection', role: 'Tanks' },
    { name: 'Grimp', class: 'Hunter', spec: 'Beast Mastery', role: 'Ranged' },
    { name: 'Blood', class: 'Shaman', spec: 'Enhancement', role: 'Melee' },
    { name: 'Dandral', class: 'Mage', spec: 'Fire', role: 'Ranged' },
  ];

  const TBC_LOOT_TODAY = [
    { id: '28729', name: 'Spiteblade', player: 'Dirtyslewt', reason: 'BiS' },
    { id: '28714', name: "Fangs of the Sun", player: 'Maudest', reason: 'Upgrade' },
    { id: '28734', name: 'Crystal Spire of Karabor', player: 'Jarub', reason: 'BiS' },
    { id: '28732', name: 'Cowl of Defiance', player: 'Aku', reason: 'Upgrade' },
    { id: '28608', name: 'Ironstriders of Urgency', player: 'Chckenburgaa', reason: 'Council call' },
    { id: '28587', name: 'Wildfury Greatstaff', player: 'Sikru', reason: 'BiS' },
    { id: '28794', name: 'Rage of the Unraveller', player: 'Thickdad', reason: 'Upgrade' },
    { id: '28795', name: 'Bladespire Warbands', player: 'Dawnsguard', reason: 'Upgrade' },
    { id: '28799', name: 'Belt of Divine Inspiration', player: 'FuckingTom', reason: 'BiS' },
    { id: '28823', name: 'Eye of Gruul', player: 'Jinfaza', reason: 'BiS' },
    { id: '28824', name: 'Gauntlets of Martial Perfection', player: 'Oldmandutch', reason: 'Upgrade' },
    { id: '28825', name: 'Aldori Legacy Defender', player: 'Zihm', reason: 'BiS' },
    { id: '28827', name: 'Windshear Boots', player: 'Glitterbeast', reason: 'Upgrade' },
    { id: '28822', name: "Teeth of Gruul", player: 'Tyroneus', reason: 'Council call' },
    { id: '28733', name: 'Girdle of Truth', player: 'Moon', reason: 'Upgrade' },
    { id: '28756', name: 'Headdress of the High Potentate', player: 'Turkoyero', reason: 'BiS' },
    { id: '28785', name: 'Lightning Capacitor', player: 'DirtyHawkins', reason: 'BiS' },
    { id: '28830', name: "Dragonspine Trophy", player: 'Dirtyslewt', reason: 'Upgrade' },
    { id: '28762', name: 'Adornment of Stolen Souls', player: 'Stewo', reason: 'BiS' },
    { id: '28810', name: 'Windshear Boots', player: 'Blood', reason: 'Side grade' },
    { id: '28764', name: 'Farstrider Wildercloak', player: 'Grimp', reason: 'Upgrade' },
    { id: '28770', name: 'Nathrezim Mindblade', player: 'Dandral', reason: 'BiS' },
    { id: '28768', name: 'Malchazeen', player: 'Maudest', reason: 'Off-spec' },
    { id: '28773', name: 'Gorehowl', player: 'Thickdad', reason: 'Council call' },
  ];

  const TBC_LOOT_LAST = [
    { id: '28588', name: 'Blue Diamond Witchwand', player: 'Jarub', reason: 'Upgrade' },
    { id: '28593', name: 'Eternium Greathelm', player: 'teuseksi', reason: 'Upgrade' },
    { id: '28597', name: 'PanzarThar Breastplate', player: 'Oldmandutch', reason: 'BiS' },
    { id: '28600', name: 'Stonebough Jerkin', player: 'Sikru', reason: 'Upgrade' },
    { id: '28602', name: "Robe of the Elder Scribes", player: 'Burny', reason: 'BiS' },
    { id: '28603', name: 'Talisman of Nightbane', player: 'Imarn', reason: 'Upgrade' },
    { id: '28604', name: 'Nightstaff of the Everliving', player: 'Manchego', reason: 'BiS' },
    { id: '28606', name: 'Shield of Impenetrable Darkness', player: 'Druul', reason: 'Upgrade' },
    { id: '28608', name: 'Ironstriders of Urgency', player: 'Aku', reason: 'DE', de: 'Void Crystal' },
    { id: '28609', name: 'Emberspur Talisman', player: 'Jinfaza', reason: 'Upgrade' },
    { id: '28610', name: "Ferocious Swift-Kickers", player: 'Chckenburgaa', reason: 'Upgrade' },
    { id: '28611', name: 'Dragonheart Flameshield', player: 'Zihm', reason: 'Side grade' },
  ];

  function todayKey() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function daysAgoKey(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function makeEntry(dayIso, item, submitted) {
    return {
      id: uid(),
      date: dayIso,
      submittedAt: submitted,
      player: item.player,
      item: item.name,
      itemId: String(item.id),
      itemIlvl: '',
      rollType: item.reason || 'Upgrade',
      quality: 'Epic',
      qualityNum: 4,
      disenchantsInto: item.de || (item.reason === 'DE' ? 'Void Crystal' : ''),
      wowDomain: 'tbc',
    };
  }

  function buildDemo() {
    const day = todayKey();
    const last = daysAgoKey(7);
    const isoToday = day + 'T20:00:00.000Z';
    const isoLast = last + 'T20:00:00.000Z';
    const submitted = new Date().toISOString();

    const playerInfo = {};
    const list = RODEO_RAIDERS.map((r, i) => {
      const main = mainName(r.name);
      const cls = fixClass(r.class, r.role, r.spec);
      const spec = fixSpec(r.spec);
      const key = main.toLowerCase();
      playerInfo[key] = {
        displayName: main,
        rhName: r.name,
        class: cls,
        spec: spec,
        rhRole: r.role,
        rhStatus: 'primary',
        rank: r.rank || 'Raider',
        ilvl: String(112 + ((i * 2) % 14)),
        lastRhImport: submitted,
        lastRhEventTitle: 'Demo · Midnight Rodeo 25-man (today)',
        lastRhEventId: 'demo-today',
        lastGearSync: submitted,
      };
      return {
        name: r.name,
        class: cls,
        spec: spec,
        role: r.role,
        status: 'primary',
        isAbsence: false,
        isPrimary: true,
      };
    });

    // Absences (for realistic RH preview)
    const absences = [
      { name: 'Kraven', class: 'Absence', spec: 'Absence', role: 'Absence', status: 'primary', isAbsence: true, isPrimary: false },
      { name: 'Cheste', class: 'Absence', spec: 'Absence', role: 'Absence', status: 'primary', isAbsence: true, isPrimary: false },
    ];

    const entries = []
      .concat(TBC_LOOT_TODAY.map((it) => makeEntry(isoToday, it, submitted)))
      .concat(TBC_LOOT_LAST.map((it) => makeEntry(isoLast, it, submitted)));

    const byRole = {};
    list.forEach((s) => {
      byRole[s.role] = (byRole[s.role] || 0) + 1;
    });

    const rhToday = {
      id: 'demo-today',
      url: '',
      title: 'Demo · Midnight Rodeo 25-man (today)',
      date: day,
      time: '08:00 PM',
      dayKey: day,
      whenIso: isoToday,
      leader: 'Dirtydutch/Barkley',
      server: '<Midnight Rodeo>',
      channel: 'tuesday-25man-raid',
      primary: list.length,
      absence: absences.length,
      byRole,
      list: list.concat(absences),
      importedAt: submitted,
    };

    const rhLast = {
      id: 'demo-last-week',
      url: '',
      title: 'Demo · Karazhan clear (last week)',
      date: last,
      time: '08:00 PM',
      dayKey: last,
      whenIso: isoLast,
      leader: 'Dirtyslewt',
      server: '<Midnight Rodeo>',
      channel: 'tuesday-25man-raid',
      primary: Math.max(20, list.length - 4),
      absence: 3,
      byRole: { Tanks: 3, Healers: 6, Melee: 6, Ranged: 8 },
      list: list.slice(0, 22),
      importedAt: submitted,
    };

    return {
      meta: {
        registeredAt: isoLast,
        isDemo: true,
        demoLoadedAt: submitted,
        gmShow: true,
        guildTagline: 'TBC Classic · Loot · Roster · Comp',
      },
      playerInfo,
      entries,
      rhEvents: [rhToday, rhLast],
      tour: [
        { tab: 'overview', title: 'Overview', blurb: 'Guild KPIs — raids, items, unique raiders at a glance.' },
        { tab: 'roster', title: 'Roster', blurb: '28 Midnight Rodeo players with class, spec, RH role, ranks, iLvl.' },
        { tab: 'comp', title: 'Comp', blurb: 'Auto groups for Windfury / Trueshot / casters + Paladin blessing assigns.' },
        { tab: 'bosses', title: 'Bosses', blurb: 'MC through Black Temple — tanks, heals, kicks, notes per boss.' },
        { tab: 'raids', title: 'Raids', blurb: 'Raid-Helper import + loot nights.' },
        { tab: 'ledger', title: 'Ledger', blurb: 'Gargul brands with Wowhead icons.' },
        { tab: 'items', title: 'Items', blurb: 'Who already got the piece — council memory.' },
      ],
    };
  }

  const GM_PITCH = [
    'Midnight Rodeo desk: signups, loot, and raid comp.',
    'Pull Discord Raid-Helper into the roster.',
    'Paste Gargul after the raid for the loot log.',
    'Comp stacks WF / Trueshot / casters and blessings.',
    'Bosses: Molten Core through Black Temple seats.',
    'Admin lock for edits — guests can look.',
    'Free on GitHub Pages. Created by Hornyslewt.',
  ];

  global.DemoData = {
    buildDemo,
    todayKey,
    RODEO_RAIDERS,
    TBC_LOOT_TODAY,
    GM_PITCH,
  };
})(typeof window !== 'undefined' ? window : globalThis);
