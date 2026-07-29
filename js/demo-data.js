/**
 * Midnight Rodeo — TBC Classic demo raid seed
 * Real guild names/roles from Raid-Helper; TBC item IDs for loot.
 */
(function (global) {
  /** Normalize RH class labels → proper WoW classes */
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
      if (/protection1?$/.test(s) || /prot/.test(s)) return 'Warrior';
      return 'Warrior';
    }
    if (/^rogue$/i.test(c) || c === 'Rogue') return 'Rogue';
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
    // Moon/Luna → Moon ; Adam(Klinde) → Adam
    let m = n.split('/')[0].trim();
    m = m.replace(/\(.*\)$/, '').trim();
    m = m.replace(/\\.*$/, '').trim();
    return m || n;
  }

  /** Snapshot of Midnight Rodeo RH signups (primary) */
  const RODEO_RAIDERS = [
    { name: 'Moon/Luna', class: 'Druid', spec: 'Restoration', role: 'Healers' },
    { name: 'Chckenburgaa', class: 'Shaman', spec: 'Enhancement', role: 'Melee' },
    { name: 'Sikru', class: 'Druid', spec: 'Balance', role: 'Ranged' },
    { name: 'DirtyHawkins', class: 'Shaman', spec: 'Elemental', role: 'Ranged' },
    { name: 'Adam(Klinde)', class: 'Shaman', spec: 'Restoration', role: 'Healers' },
    { name: 'Oldmandutch', class: 'Warrior', spec: 'Protection', role: 'Tanks' },
    { name: 'Imarn/Valazar', class: 'Shaman', spec: 'Elemental', role: 'Ranged' },
    { name: 'Stewo', class: 'Warlock', spec: 'Affliction', role: 'Ranged' },
    { name: 'Burny', class: 'Mage', spec: 'Fire', role: 'Ranged' },
    { name: 'Tyroneus', class: 'Hunter', spec: 'Beast Mastery', role: 'Ranged' },
    { name: 'Aku', class: 'Paladin', spec: 'Retribution', role: 'Melee' },
    { name: 'Maudest', class: 'Rogue', spec: 'Combat', role: 'Melee' },
    { name: 'Zihm', class: 'Warrior', spec: 'Protection', role: 'Tanks' },
    { name: 'Dirtyslewt', class: 'Warrior', spec: 'Fury', role: 'Melee' },
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

  /** TBC Classic item IDs (Kara / Gruul / Mag era) */
  const TBC_LOOT = [
    { id: '28729', name: 'Spiteblade' },
    { id: '28714', name: "Fangs of the Sun" },
    { id: '28734', name: 'Crystal Spire of Karabor' },
    { id: '28732', name: 'Cowl of Defiance' },
    { id: '28608', name: 'Ironstriders of Urgency' },
    { id: '28587', name: 'Wildfury Greatstaff' },
    { id: '28794', name: 'Rage of the Unraveller' },
    { id: '28795', name: 'Bladespire Warbands' },
    { id: '28799', name: 'Belt of Divine Inspiration' },
    { id: '28823', name: 'Eye of Gruul' },
    { id: '28824', name: 'Gauntlets of Martial Perfection' },
    { id: '28825', name: 'Aldori Legacy Defender' },
    { id: '28827', name: 'Windshear Boots' },
    { id: '28822', name: "Teeth of Gruul" },
    { id: '28733', name: 'Girdle of Truth' },
    { id: '28756', name: 'Headdress of the High Potentate' },
  ];

  function todayKey() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function buildDemo() {
    const day = todayKey();
    const iso = day + 'T20:00:00.000Z';
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
        rank: i === 13 ? 'Guild Master' : i < 4 ? 'Officer' : 'Raider',
        ilvl: String(110 + ((i * 3) % 15)),
        lastRhImport: submitted,
        lastRhEventTitle: 'Demo · Midnight Rodeo 25-man',
        lastRhEventId: 'demo-today',
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

    // Assign loot to a subset of raiders
    const winners = [
      'Dirtyslewt', 'Moon', 'Aku', 'Sikru', 'Jinfaza', 'Oldmandutch',
      'Chckenburgaa', 'Dawnsguard', 'Glitterbeast', 'Jarub', 'Thickdad',
      'Stewo', 'Zihm', 'Dandral', 'Maudest', 'FuckingTom',
    ];
    const entries = TBC_LOOT.map((item, i) => {
      const player = winners[i % winners.length];
      const reasons = ['BiS', 'Upgrade', 'Council call', 'Off-spec', 'Upgrade', 'BiS'];
      return {
        id: uid() + i,
        date: iso,
        submittedAt: submitted,
        player,
        item: item.name,
        itemId: item.id,
        itemIlvl: '',
        rollType: reasons[i % reasons.length],
        quality: 'Epic',
        qualityNum: 4,
        disenchantsInto: i === 15 ? 'Void Crystal' : '',
        wowDomain: 'tbc',
      };
    });
    // One DE entry
    if (entries[15]) {
      entries[15].disenchantsInto = 'Void Crystal';
      entries[15].rollType = 'DE';
    }

    const byRole = {};
    list.forEach((s) => {
      byRole[s.role] = (byRole[s.role] || 0) + 1;
    });

    const rhEvent = {
      id: 'demo-today',
      url: 'https://raid-helper.xyz/event/1530078606578024520',
      title: 'Demo · Midnight Rodeo 25-man (today)',
      date: day.split('-').reverse().join('-').replace(/^(\d+)-(\d+)-(\d+)$/, (_, y, m, d) => `${d}-${m}-${y}`),
      time: '08:00 PM',
      dayKey: day,
      whenIso: iso,
      leader: 'Dirtydutch/Barkley',
      server: '<Midnight Rodeo>',
      channel: 'tuesday-25man-raid',
      primary: list.length,
      absence: 0,
      byRole,
      list,
      importedAt: submitted,
    };

    return {
      meta: {
        registeredAt: submitted,
        isDemo: true,
        demoLoadedAt: submitted,
      },
      playerInfo,
      entries,
      rhEvents: [rhEvent],
    };
  }

  global.DemoData = {
    buildDemo,
    todayKey,
    RODEO_RAIDERS,
    TBC_LOOT,
  };
})(typeof window !== 'undefined' ? window : globalThis);
