/**
 * Midnight Rodeo — Classic → TBC raid boss planner
 * Molten Core through Black Temple (+ maps / assigns)
 *
 * Uses roster class/spec/role to place tanks, heals, soaks, kicks, etc.
 */
(function (global) {
  function norm(p) {
    return {
      name: p.displayName || p.name || p.player || '',
      class: (p.class || '').trim(),
      spec: (p.spec || '').trim(),
      role: (p.rhRole || p.role || '').trim(),
      ilvl: Number(p.ilvl) || 0,
    };
  }

  function isTank(p) {
    if (/tank/i.test(p.role)) return true;
    return /prot|guardian|protection/i.test(p.spec);
  }
  function isHeal(p) {
    if (/heal/i.test(p.role)) return true;
    return /holy|disc|resto|restoration/i.test(p.spec);
  }
  function isMelee(p) {
    if (isTank(p) || isHeal(p)) return false;
    if (/melee/i.test(p.role)) return true;
    return /fury|arms|ret|combat|enhance|feral|cat|assassin/i.test(p.spec) ||
      /rogue|warrior/i.test(p.class);
  }
  function isRanged(p) {
    if (isTank(p) || isHeal(p) || isMelee(p)) return false;
    return true;
  }
  function isKick(p) {
    return /rogue|shaman|warrior|mage/i.test(p.class) || /enhance|combat|fury|arms|arcane|fire/i.test(p.spec);
  }
  function isWarlock(p) { return /warlock/i.test(p.class); }
  function isHunter(p) { return /hunter/i.test(p.class); }
  function isPriest(p) { return /priest/i.test(p.class); }
  function isPaladin(p) { return /paladin/i.test(p.class); }
  function isShaman(p) { return /shaman/i.test(p.class); }
  function isDruid(p) { return /druid/i.test(p.class); }
  function isMage(p) { return /mage/i.test(p.class); }

  function sortIlvl(a, b) { return (b.ilvl || 0) - (a.ilvl || 0); }

  function pool(players) {
    const all = players.map(norm).filter((p) => p.name);
    const seen = new Set();
    const unique = all.filter((p) => {
      const k = p.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return {
      all: unique,
      tanks: unique.filter(isTank).sort(sortIlvl),
      heals: unique.filter(isHeal).sort(sortIlvl),
      melee: unique.filter(isMelee).sort(sortIlvl),
      ranged: unique.filter(isRanged).sort(sortIlvl),
      kicks: unique.filter(isKick).sort(sortIlvl),
      locks: unique.filter(isWarlock).sort(sortIlvl),
      hunters: unique.filter(isHunter).sort(sortIlvl),
      priests: unique.filter(isPriest).sort(sortIlvl),
      pals: unique.filter(isPaladin).sort(sortIlvl),
      shamans: unique.filter(isShaman).sort(sortIlvl),
      druids: unique.filter(isDruid).sort(sortIlvl),
      mages: unique.filter(isMage).sort(sortIlvl),
    };
  }

  function names(arr, n) {
    return (arr || []).slice(0, n).map((p) => p.name);
  }
  function join(arr) {
    return arr.length ? arr.join(', ') : '— assign manually —';
  }
  function takeRound(list, count, offset) {
    if (!list.length) return [];
    const out = [];
    for (let i = 0; i < count; i++) out.push(list[(offset + i) % list.length]);
    return out.map((p) => p.name);
  }

  /** Generic tank/heal/dps sheet — scales with roster size */
  function stdAssign(p, opts) {
    opts = opts || {};
    const mt = Math.max(1, opts.mt || 1);
    const ot = Math.max(0, opts.ot != null ? opts.ot : 1);
    const th = Math.max(1, opts.tankHeals || 2);
    const rh = Math.max(1, opts.raidHeals || 3);
    const meleeN = opts.melee != null ? opts.melee : 8;
    const rangedN = opts.ranged != null ? opts.ranged : 10;
    const extra = opts.extra || [];
    const rows = [
      { role: 'Main Tank', people: names(p.tanks, mt), note: opts.mtNote || 'Hold boss' },
    ];
    if (ot > 0) {
      rows.push({
        role: 'Off Tank',
        people: names(p.tanks.slice(mt), ot),
        note: opts.otNote || 'Adds / backup',
      });
    }
    rows.push(
      { role: 'Tank healers', people: names(p.heals, th), note: opts.thNote || 'On tanks' },
      { role: 'Raid healers', people: names(p.heals.slice(th), rh), note: opts.rhNote || 'Raid damage' }
    );
    extra.forEach((e) => rows.push(e));
    rows.push(
      { role: 'Melee DPS', people: names(p.melee, meleeN), note: opts.meleeNote || 'Behind boss' },
      { role: 'Ranged DPS', people: names(p.ranged, rangedN), note: opts.rangedNote || 'Max range / assigned' }
    );
    return rows;
  }

  function boss(def) {
    return {
      id: def.id,
      raid: def.raid,
      raidLabel: def.raidLabel,
      era: def.era || 'classic',
      size: def.size || 25,
      name: def.name,
      order: def.order,
      map: def.map || 'standard',
      strategy: def.strategy || ['Tank and spank; call specials live.'],
      assign:
        def.assign ||
        function (p) {
          return stdAssign(p, def.assignOpts || {});
        },
    };
  }

  const RAID_ORDER = [
    { id: 'mc', label: 'Molten Core', era: 'classic', size: 40 },
    { id: 'ony', label: "Onyxia's Lair", era: 'classic', size: 40 },
    { id: 'bwl', label: 'Blackwing Lair', era: 'classic', size: 40 },
    { id: 'zg', label: "Zul'Gurub", era: 'classic', size: 20 },
    { id: 'aq20', label: 'Ruins of Ahn\'Qiraj', era: 'classic', size: 20 },
    { id: 'aq40', label: 'Temple of Ahn\'Qiraj', era: 'classic', size: 40 },
    { id: 'naxx', label: 'Naxxramas', era: 'classic', size: 40 },
    { id: 'kara', label: 'Karazhan', era: 'tbc', size: 10 },
    { id: 'gruul', label: "Gruul's Lair", era: 'tbc', size: 25 },
    { id: 'mag', label: "Magtheridon's Lair", era: 'tbc', size: 25 },
    { id: 'ssc', label: 'Serpentshrine Cavern', era: 'tbc', size: 25 },
    { id: 'tk', label: 'Tempest Keep: The Eye', era: 'tbc', size: 25 },
    { id: 'hyjal', label: 'Mount Hyjal', era: 'tbc', size: 25 },
    { id: 'bt', label: 'Black Temple', era: 'tbc', size: 25 },
  ];

  function raidBosses(raidId, raidLabel, era, size, list) {
    return list.map((b, i) =>
      boss(
        Object.assign(
          {
            raid: raidId,
            raidLabel,
            era,
            size,
            order: i + 1,
          },
          b
        )
      )
    );
  }

  const BOSSES = []
    .concat(
      raidBosses('mc', 'Molten Core', 'classic', 40, [
        { id: 'mc-luci', name: 'Lucifron', map: 'standard', strategy: ['MT holds Lucifron; OT on adds.', 'Decurse Impending Doom / Lucifron\'s Curse.', 'Kill adds then boss.'] },
        { id: 'mc-mag', name: 'Magmadar', map: 'spread', strategy: ['Tank in place; frenzy → Tranq Shot.', 'Spread for Lava Bomb / Panic.', 'Hunter tranq rotation critical.'] },
        { id: 'mc-geh', name: 'Gehennas', map: 'standard', strategy: ['MT boss; OT adds.', 'Decurse Rain of Fire targets.', 'Kill adds promptly.'] },
        { id: 'mc-garr', name: 'Garr', map: 'dual', strategy: ['MT Garr; assign OTs/DPS to Firesworn.', 'Kill adds away from Garr (explosion).', 'Banishes / CC as planned.'] },
        { id: 'mc-ged', name: 'Baron Geddon', map: 'spread', strategy: ['Living Bomb: run out of raid.', 'Spread; tanks swap if needed on stacks.', 'Ignore mana burn — drink between.'] },
        { id: 'mc-shaz', name: 'Shazzrah', map: 'standard', strategy: ['Blink: tank pickup fast.', 'Decurse Curse of Shazzrah.', 'Melee stay loose for counterspell.'] },
        { id: 'mc-sulf', name: 'Sulfuron Harbinger', map: 'dual', strategy: ['MT Sulfuron; kill priests first.', 'Interrupt Dark Mending.', 'OT adds.'] },
        { id: 'mc-maj', name: 'Golemagg the Incinerator', map: 'standard', strategy: ['MT Golemagg; OTs on Core Ragers.', 'Do not kill ragers early if using classic strat.', 'Heavy tank healing.'] },
        { id: 'mc-domo', name: 'Majordomo Executus', map: 'dual', strategy: ['Kill healers / elites per RL call.', 'Sheep / banish adds.', 'Burn Domo when adds down.'] },
        { id: 'mc-rag', name: 'Ragnaros', map: 'spread', strategy: ['MT on platform; sons phase — kill Sons of Flame.', 'Melee out on Knockback / Wrath.', 'Lust on burn; mana pots ready.'] },
      ])
    )
    .concat(
      raidBosses('ony', "Onyxia's Lair", 'classic', 40, [
        { id: 'ony-ony', name: 'Onyxia', map: 'kite', strategy: ['P1 tank head away from raid.', 'P2 phase: eggs / whelps; DF / deep breath positions.', 'P3 fear — Tremor; burn.'] },
      ])
    )
    .concat(
      raidBosses('bwl', 'Blackwing Lair', 'classic', 40, [
        { id: 'bwl-raz', name: 'Razorgore the Untamed', map: 'dual', strategy: ['Control phase: destroy eggs; tanks on adds.', 'Mind control Razorgore per strat.', 'Burn when control ends.'] },
        { id: 'bwl-vael', name: 'Vaelastrasz the Corrupt', map: 'standard', strategy: ['Burn race — pre-pot / lust.', 'Tank swap on Burning Adrenaline if used.', 'Heal through Essence of the Red.'] },
        { id: 'bwl-lash', name: 'Broodlord Lashlayer', map: 'standard', strategy: ['Clear suppression rooms.', 'MT holds; knockback awareness.', 'Tank heal heavy.'] },
        { id: 'bwl-fire', name: 'Firemaw', map: 'standard', strategy: ['Tank shadow resist if needed.', 'Wing buffet / flame buffet stacks — tank swap.', 'Melee stack carefully.'] },
        { id: 'bwl-ebon', name: 'Ebonroc', map: 'standard', strategy: ['Shadow resist tank optional.', 'Tank swap on Shadow of Ebonroc.', 'Heal tank hard.'] },
        { id: 'bwl-flame', name: 'Flamegor', map: 'standard', strategy: ['Tranq frenzy.', 'Similar to Firemaw positioning.', 'Burn.'] },
        { id: 'bwl-chrom', name: 'Chromaggus', map: 'spread', strategy: ['Call breath colors; resist / stack / spread.', 'Brood affliction — cleanse correct school.', 'Tank swap on vulnerability.'] },
        { id: 'bwl-nef', name: 'Nefarian', map: 'dual', strategy: ['P1: kill adds / drakonids by class call.', 'P2: class calls — stop casting / move.', 'P3: bone constructs; burn Nef.'] },
      ])
    )
    .concat(
      raidBosses('zg', "Zul'Gurub", 'classic', 20, [
        { id: 'zg-jek', name: 'High Priestess Jeklik', map: 'standard', strategy: ['Interrupt heals; bat phase AoE.', 'Tank boss; kill adds.'] },
        { id: 'zg-ven', name: 'High Priest Venoxis', map: 'spread', strategy: ['Poison clouds — move.', 'Decurse / cleanse poison.'] },
        { id: 'zg-mar', name: 'High Priestess Mar\'li', map: 'standard', strategy: ['Kill spawns; interrupt.', 'Tank swap if needed.'] },
        { id: 'zg-thek', name: 'High Priest Thekal', map: 'dual', strategy: ['Kill adds / reincarnation phase.', 'Assign interrupts.'] },
        { id: 'zg-arl', name: 'High Priestess Arlokk', map: 'kite', strategy: ['Marked player kites panthers.', 'Burn boss.'] },
        { id: 'zg-hak', name: 'Hakkar', map: 'standard', strategy: ['Son of Hakkar — kill for blood.', 'MC / poison; cleanse.', 'Burn Hakkar.'] },
      ])
    )
    .concat(
      raidBosses('aq20', "Ruins of Ahn'Qiraj", 'classic', 20, [
        { id: 'aq20-kur', name: 'Kurinnaxx', map: 'spread', strategy: ['Tank swap on Mortal Wound.', 'Sand trap — move.'] },
        { id: 'aq20-raj', name: 'General Rajaxx', map: 'standard', strategy: ['Wave clear; OT adds.', 'Burn Rajaxx.'] },
        { id: 'aq20-buru', name: 'Buru the Gorger', map: 'kite', strategy: ['Kite Buru; eggs for phase.', 'Burn when vulnerable.'] },
        { id: 'aq20-ayam', name: 'Ayamiss the Hunter', map: 'spread', strategy: ['Air phase; larva on sacrifice player.', 'Burn.'] },
        { id: 'aq20-ossi', name: 'Ossirian the Unscarred', map: 'kite', strategy: ['Crystal weaken; tank move boss.', 'Burst on weak.'] },
      ])
    )
    .concat(
      raidBosses('aq40', "Temple of Ahn'Qiraj", 'classic', 40, [
        { id: 'aq40-sker', name: 'The Prophet Skeram', map: 'dual', strategy: ['Kill real Skeram among images.', 'Arcane explosion — melee care.', 'MC break.'] },
        { id: 'aq40-bug', name: 'Bug Trio', map: 'dual', strategy: ['Kill order per RL (Kri / Yauj / Vem).', 'Poison / fear control.'] },
        { id: 'aq40-sart', name: 'Battleguard Sartura', map: 'kite', strategy: ['Whirlwind — kite / run out.', 'Kill adds; burn Sartura.'] },
        { id: 'aq40-fank', name: 'Fankriss the Unyielding', map: 'dual', strategy: ['Tank adds; kill spawns.', 'MT Fankriss.'] },
        { id: 'aq40-visc', name: 'Viscidus', map: 'standard', strategy: ['Frost to freeze; melee shatter.', 'Count frost hits.'] },
        { id: 'aq40-huh', name: 'Princess Huhuran', map: 'standard', strategy: ['Tranq frenzy; nature resist optional.', 'Poison cleanse.'] },
        { id: 'aq40-twins', name: 'Twin Emperors', map: 'dual', strategy: ['Split raid; tank each twin.', 'Swap on teleport; balanced DPS.'] },
        { id: 'aq40-ouro', name: 'Ouro', map: 'spread', strategy: ['Submerge — kill dirt mounds.', 'Spread for quake.'] },
        { id: 'aq40-cthun', name: "C'Thun", map: 'spread', strategy: ['Eye phase: assigned positions / dark glare.', 'Stomach team for tentacles.', 'Burn body.'] },
      ])
    )
    .concat(
      raidBosses('naxx', 'Naxxramas', 'classic', 40, [
        { id: 'naxx-anub', name: 'Anub\'Rekhan', map: 'standard', strategy: ['Locust swarm — run behind.', 'Kill crypt guards.'] },
        { id: 'naxx-faer', name: 'Grand Widow Faerlina', map: 'standard', strategy: ['Worshippers for enrage drop.', 'Kill adds; burn.'] },
        { id: 'naxx-maex', name: 'Maexxna', map: 'standard', strategy: ['Web wrap — free players.', 'Tranq frenzy; poison cleanse.'] },
        { id: 'naxx-noth', name: 'Noth the Plaguebringer', map: 'dual', strategy: ['Blink; kill skeletons.', 'Decurse.'] },
        { id: 'naxx-heig', name: 'Heigan the Unclean', map: 'spread', strategy: ['Dance safety spots.', 'Disease cleanse.'] },
        { id: 'naxx-loat', name: 'Loatheb', map: 'standard', strategy: ['Healer rotation on spores.', 'Burn; manage doom.'] },
        { id: 'naxx-razu', name: 'Instructor Razuvious', map: 'dual', strategy: ['Priest MC understudies to tank.', 'Burn Razu.'] },
        { id: 'naxx-goth', name: 'Gothik the Harvester', map: 'dual', strategy: ['Split sides; kill waves.', 'Burn Gothik.'] },
        { id: 'naxx-4h', name: 'The Four Horsemen', map: 'dual', strategy: ['Tank each horseman; mark stacks.', 'Kill order per RL.'] },
        { id: 'naxx-patch', name: 'Patchwerk', map: 'standard', strategy: ['Hateful strike — OT stack.', 'Burn race.'] },
        { id: 'naxx-grobb', name: 'Grobbulus', map: 'spread', strategy: ['Kite clouds; inject — run out.', 'Kill falls.'] },
        { id: 'naxx-gluth', name: 'Gluth', map: 'kite', strategy: ['Decimate — AoE zombies.', 'Tank kites; burn.'] },
        { id: 'naxx-thad', name: 'Thaddius', map: 'dual', strategy: ['Polarity shift — move correct side.', 'Burn.'] },
        { id: 'naxx-sapp', name: 'Sapphiron', map: 'spread', strategy: ['Icebolt block; blizzard move.', 'Air phase — LOS frost bomb.'] },
        { id: 'naxx-kt', name: "Kel'Thuzad", map: 'spread', strategy: ['P1 adds; P2 frostbolt interrupt.', 'MC break; guardianskite.'] },
      ])
    )
    .concat(
      raidBosses('kara', 'Karazhan', 'tbc', 10, [
        { id: 'kara-att', name: 'Attumen the Huntsman', map: 'standard', strategy: ['Kill Midnight; tank Attumen.', 'Charge awareness.'] },
        { id: 'kara-mor', name: 'Moroes', map: 'dual', strategy: ['CC adds; kill order.', 'Gouge / garrote cleanse.'] },
        { id: 'kara-maiden', name: 'Maiden of Virtue', map: 'spread', strategy: ['Spread for Holy Fire / Repentance.', 'LOS Ground Smash optional.'] },
        { id: 'kara-opera', name: 'Opera Event', map: 'standard', strategy: ['Wizard of Oz / Romulo / Red Riding — follow active script.', 'Assign CC / interrupts.'] },
        { id: 'kara-curator', name: 'The Curator', map: 'standard', strategy: ['Kill Flare Stars; evocate burn.', 'Mana intense.'] },
        { id: 'kara-illhoof', name: 'Terestian Illhoof', map: 'dual', strategy: ['Kill demons / chains.', 'Banish imps; burn Illhoof.'] },
        { id: 'kara-shade', name: 'Shade of Aran', map: 'spread', strategy: ['Elemental rings — move out.', 'Blizzard / AE; interrupt.'] },
        { id: 'kara-netherspite', name: 'Netherspite', map: 'dual', strategy: ['Portal beam soaks assigned.', 'Banish phase — kill void zones.'] },
        { id: 'kara-malchezaar', name: "Prince Malchezaar", map: 'kite', strategy: ['Infernal axes — kite.', 'Tank swap enfeeble; burn.'] },
        { id: 'kara-nightbane', name: 'Nightbane', map: 'spread', strategy: ['Ground / air phases.', 'Bones; charred earth move.'] },
      ])
    )
    .concat(
      raidBosses('gruul', "Gruul's Lair", 'tbc', 25, [
        { id: 'gruul-maul', name: 'High King Maulgar', map: 'dual', strategy: ['Kill council adds first (BL / mage / sham / priest order per RL).', 'MT Maulgar; lust on burn.'] },
        { id: 'gruul-gruul', name: 'Gruul the Dragonkiller', map: 'spread', strategy: ['Grow stacks — tank heal ramps.', 'Cave in / shatter — spread then stack call.', 'Reverberation silence.'] },
      ])
    )
    .concat(
      raidBosses('mag', "Magtheridon's Lair", 'tbc', 25, [
        { id: 'mag-mag', name: 'Magtheridon', map: 'dual', strategy: ['Channelers: assign interrupt / kill.', 'Cube clickers for blast nova.', 'Burn when free; click cubes on nova.'] },
      ])
    )
    .concat(
      raidBosses('ssc', 'Serpentshrine Cavern', 'tbc', 25, [
        { id: 'ssc-hydr', name: 'Hydross the Unstable', map: 'dual', strategy: ['Nature / Frost sides; tank swap on stacks.', 'Kill adds on transition.'] },
        { id: 'ssc-lurk', name: 'The Lurker Below', map: 'spread', strategy: ['Spout — dive / LOS.', 'Kill spawns; burn Lurker.'] },
        { id: 'ssc-leo', name: 'Leotheras the Blind', map: 'standard', strategy: ['Whirlwind run out; Demon form — tank swap.', 'Inner demon: stop DPS / kill own.'] },
        { id: 'ssc-fath', name: 'Fathom-Lord Karathress', map: 'dual', strategy: ['Kill advisors first.', 'MT Karathress; totem / kick.'] },
        { id: 'ssc-morog', name: 'Morogrim Tidewalker', map: 'spread', strategy: ['Murlocs AoE; grave water globules.', 'Tidal wave knock — positioning.'] },
        { id: 'ssc-vash', name: 'Lady Vashj', map: 'kite', strategy: ['P1 static; P2: cores / elementals / striders.', 'Tainted cores to shield; P3 burn + spores.'] },
      ])
    )
    .concat(
      raidBosses('tk', 'Tempest Keep: The Eye', 'tbc', 25, [
        { id: 'tk-alar', name: "Al'ar", map: 'spread', strategy: ['Platform tanking; dive bomb.', 'P2 melt armor tank swap; eggs adds.'] },
        { id: 'tk-void', name: 'Void Reaver', map: 'spread', strategy: ['Tank in place; orbs knockback.', 'Ranged spread; melee careful.'] },
        { id: 'tk-sol', name: 'High Astromancer Solarian', map: 'dual', strategy: ['Agents / priests adds.', 'P3 voidwalker — burn.'] },
        { id: 'tk-kael', name: "Kael'thas Sunstrider", map: 'dual', strategy: ['Weapons phase → advisors → Kael.', 'Gravity lapse; pyroblast interrupt / shield.', 'Eggs / phoenix.'] },
      ])
    )
    .concat(
      raidBosses('hyjal', 'Mount Hyjal', 'tbc', 25, [
        {
          id: 'mh-rage',
          name: 'Rage Winterchill',
          map: 'spread',
          strategy: [
            'Tank in place; raid spreads for Icebolt / Frost Nova.',
            'Melee behind boss. Move out of Death & Decay.',
            'Decurse / remove frost ASAP. Burn during no ice tomb windows.',
          ],
          assign(p) {
            return [
              { role: 'Main Tank', people: names(p.tanks, 1), note: 'Hold Rage facing away from raid' },
              { role: 'Off Tank', people: names(p.tanks.slice(1), 1), note: 'Pickup if threat wipe' },
              { role: 'Tank healers', people: names(p.heals, 2), note: 'Stay on MT' },
              { role: 'Raid healers', people: names(p.heals.slice(2), 5), note: 'Icebolt + Decurse support' },
              { role: 'Decurse / cleanse', people: join(names(p.mages.concat(p.druids.filter((d) => /balance|resto/i.test(d.spec))), 4)), note: 'Priority on ice tombs' },
              { role: 'Melee DPS', people: names(p.melee, 8), note: 'Behind boss; move out of DnD' },
              { role: 'Ranged DPS', people: names(p.ranged, 10), note: 'Spread 8–10 yd' },
            ];
          },
        },
        {
          id: 'mh-anetheron',
          name: 'Anetheron',
          map: 'standard',
          strategy: [
            'Tank swap on Carrion Swarm stacks if needed.',
            'Infernal adds: OT picks up; burn adds if dangerous.',
            'Sleep: break carefully. Dispel Vampiric Aura if possible.',
          ],
          assign(p) {
            return [
              { role: 'Main Tank', people: names(p.tanks, 1), note: 'Boss' },
              { role: 'Off Tank (Infernals)', people: names(p.tanks.slice(1), 2), note: 'Pick up infernals' },
              { role: 'Tank healers', people: names(p.heals, 2), note: 'MT focus' },
              { role: 'Add / raid healers', people: names(p.heals.slice(2), 5), note: 'Swarm + infernal damage' },
              { role: 'Infernal burn squad', people: names(p.ranged.concat(p.melee), 6), note: 'Swap to infernals on spawn' },
              { role: 'Boss DPS', people: names(p.melee.concat(p.ranged), 15), note: 'Stay on boss unless called' },
            ];
          },
        },
        {
          id: 'mh-kaz',
          name: "Kaz'rogal",
          map: 'standard',
          strategy: [
            'Mana burn pulses — casters/healers watch mana.',
            'Physical DPS preferred if mana is tight.',
            'Tank in place; raid loosely stacked for heals.',
          ],
          assign(p) {
            return [
              { role: 'Main Tank', people: names(p.tanks, 1), note: 'Hold boss' },
              { role: 'Off Tank', people: names(p.tanks.slice(1), 1), note: 'Backup' },
              { role: 'Healers', people: names(p.heals, 7), note: 'Mana pots / dark runes ready' },
              { role: 'Physical DPS (priority)', people: names(p.melee.concat(p.hunters), 12), note: 'Less mana burn impact' },
              { role: 'Caster DPS', people: names(p.ranged.filter((r) => !isHunter(r)), 8), note: 'OOM risk — drink between' },
            ];
          },
        },
        {
          id: 'mh-azgalor',
          name: 'Azgalor',
          map: 'spread',
          strategy: [
            'Doom: marked player runs out / assigned soaks.',
            'Howl of Azgalor silence — healers stack range carefully.',
            'Burn boss.',
          ],
          assign(p) {
            const doom = p.melee.concat(p.ranged).sort(sortIlvl);
            return [
              { role: 'Main Tank', people: names(p.tanks, 1), note: 'Boss facing away' },
              { role: 'Off Tank', people: names(p.tanks.slice(1), 1), note: 'Adds / backup' },
              { role: 'Tank healers', people: names(p.heals, 2), note: 'On MT' },
              { role: 'Raid healers', people: names(p.heals.slice(2), 5), note: 'Doom + Howl recovery' },
              { role: 'Doom runners (order)', people: names(doom, 8), note: 'Call order in voice' },
              { role: 'Melee', people: names(p.melee, 8), note: 'Behind boss' },
              { role: 'Ranged', people: names(p.ranged, 10), note: 'Max range for Howl' },
            ];
          },
        },
        {
          id: 'mh-archi',
          name: 'Archimonde',
          map: 'spread',
          strategy: [
            'Air burst: jump / prevention per WA pack.',
            'Fear: Tremor / Fear Ward.',
            'Soul Charge / grip: assigned ranges. Burn hard.',
          ],
          assign(p) {
            return [
              { role: 'Main Tank', people: names(p.tanks, 1), note: 'Boss' },
              { role: 'Off Tanks', people: names(p.tanks.slice(1), 2), note: 'Grip / backup' },
              { role: 'Tremor / Fear ward', people: join(names(p.shamans.filter((s) => /resto|enhance/i.test(s.spec)).concat(p.priests), 4)), note: 'Tremor + Fear Ward rotation' },
              { role: 'Tank healers', people: names(p.heals, 2), note: 'Heavy tank damage' },
              { role: 'Raid healers', people: names(p.heals.slice(2), 5), note: 'Air burst recovery' },
              { role: 'Melee', people: names(p.melee, 8), note: 'Watch air burst timing' },
              { role: 'Ranged', people: names(p.ranged, 10), note: 'Spread; assigned grip spots' },
            ];
          },
        },
      ])
    )
    .concat(
      raidBosses('bt', 'Black Temple', 'tbc', 25, [
        {
          id: 'bt-naj',
          name: "High Warlord Naj'entus",
          map: 'standard',
          strategy: [
            'Tidal Shield: throw spines into shield to break.',
            'Impaling Spine: free players ASAP.',
            'Tank boss; heal spine targets; burn after shield down.',
          ],
          assign(p) {
            return [
              { role: 'Main Tank', people: names(p.tanks, 1), note: "Hold Naj" },
              { role: 'Off Tank', people: names(p.tanks.slice(1), 1), note: 'Backup' },
              { role: 'Spine removers (clickers)', people: names(p.ranged.concat(p.heals), 6), note: 'Free impaled players' },
              { role: 'Shield break (all)', people: ['ENTIRE RAID'], note: 'Throw spines into Tidal Shield' },
              { role: 'Tank healers', people: names(p.heals, 2), note: 'MT' },
              { role: 'Raid healers', people: names(p.heals.slice(2), 5), note: 'Spine targets' },
              { role: 'DPS', people: names(p.melee.concat(p.ranged), 16), note: 'Burn on shield down' },
            ];
          },
        },
        {
          id: 'bt-supremus',
          name: 'Supremus',
          map: 'kite',
          strategy: [
            'P1 tank & spank; kite volcanoes.',
            'P2 kite phase: kiter runs; raid DPS while moving.',
            'Hunters preferred for kite.',
          ],
          assign(p) {
            const kiters = p.hunters.concat(p.melee).concat(p.ranged);
            return [
              { role: 'Main Tank (P1)', people: names(p.tanks, 1), note: 'Phase 1 hold' },
              { role: 'Kiter (P2)', people: names(kiters, 2), note: 'Primary + backup kiter' },
              { role: 'Tank healers', people: names(p.heals, 2), note: 'Follow tank / kiter' },
              { role: 'Raid healers', people: names(p.heals.slice(2), 5), note: 'Raid damage from flames' },
              { role: 'Melee', people: names(p.melee, 8), note: 'P1 max melee; P2 careful' },
              { role: 'Ranged', people: names(p.ranged, 10), note: 'DPS while moving in P2' },
            ];
          },
        },
        {
          id: 'bt-shade',
          name: 'Shade of Akama',
          map: 'dual',
          strategy: [
            'Kill channelers to free Shade.',
            'Defend Akama; AoE adds.',
            'Burn Shade when vulnerable.',
          ],
          assign(p) {
            return [
              { role: 'Akama / add tanks', people: names(p.tanks, 2), note: 'Adds on Akama side' },
              { role: 'Channeler burn (casters)', people: names(p.ranged, 8), note: 'Break channelers first' },
              { role: 'Add AoE melee', people: names(p.melee, 8), note: 'Wave clear' },
              { role: 'Healers on Akama side', people: names(p.heals, 4), note: 'Keep Akama + tanks up' },
              { role: 'Healers on raid', people: names(p.heals.slice(4), 3), note: 'Raid adds damage' },
            ];
          },
        },
        {
          id: 'bt-teron',
          name: 'Teron Gorefiend',
          map: 'standard',
          strategy: [
            'Shadow of Death: ghosts destroy constructs.',
            'Pre-assign ghost pilots.',
            'Heal Incinerate / shadow damage.',
          ],
          assign(p) {
            const ghosters = p.ranged.concat(p.melee).sort(sortIlvl);
            return [
              { role: 'Main Tank', people: names(p.tanks, 1), note: 'Boss' },
              { role: 'Off Tank', people: names(p.tanks.slice(1), 1), note: 'Backup' },
              { role: 'Ghost pilots (priority order)', people: names(ghosters, 8), note: 'Comfort players first' },
              { role: 'Tank healers', people: names(p.heals, 2), note: 'MT' },
              { role: 'Raid healers', people: names(p.heals.slice(2), 5), note: 'Incinerate / shadows' },
              { role: 'DPS', people: names(p.melee.concat(p.ranged), 15), note: 'Burn; ready for ghost' },
            ];
          },
        },
        {
          id: 'bt-gurtogg',
          name: 'Gurtogg Bloodboil',
          map: 'standard',
          strategy: [
            'Bloodboil stacks: tank swap / raid takes boils.',
            'Fel Rage: focus target runs; hard heal.',
            'Arcing Smash / Fel Geyser: don\'t stand in bad.',
          ],
          assign(p) {
            return [
              { role: 'Main Tank', people: names(p.tanks, 1), note: 'Primary' },
              { role: 'Off Tank', people: names(p.tanks.slice(1), 2), note: 'Swap / Fel Rage help' },
              { role: 'Fel Rage healers', people: names(p.heals, 3), note: 'Hard swap to Fel Rage target' },
              { role: 'Raid healers', people: names(p.heals.slice(3), 4), note: 'Bloodboil damage' },
              { role: 'Melee', people: names(p.melee, 8), note: 'Behind; watch smash' },
              { role: 'Ranged', people: names(p.ranged, 10), note: 'Max range' },
            ];
          },
        },
        {
          id: 'bt-ros',
          name: 'Reliquary of Souls',
          map: 'spread',
          strategy: [
            'Suffering → Desire → Anger.',
            'Suffering: tank swap on aura stacks.',
            'Desire: spirits / spell reflect. Anger: spread; soul scream.',
          ],
          assign(p) {
            return [
              { role: 'Tanks (swap)', people: names(p.tanks, 3), note: 'Suffering stacks / Anger' },
              { role: 'Tank healers', people: names(p.heals, 2), note: 'All phases tank damage' },
              { role: 'Raid healers', people: names(p.heals.slice(2), 5), note: 'Desire/Anger raid damage' },
              { role: 'Melee', people: names(p.melee, 8), note: 'Watch phase transitions' },
              { role: 'Ranged', people: names(p.ranged, 10), note: 'Spread on Anger' },
              { role: 'Interrupts / CC', people: names(p.kicks, 6), note: 'Desire spirits as needed' },
            ];
          },
        },
        {
          id: 'bt-mother',
          name: 'Mother Shahraz',
          map: 'spread',
          strategy: [
            'Fatal Attraction: linked players run apart.',
            'Beam tanks: prismatic beams.',
            'Saber Lash: tanks stacked.',
          ],
          assign(p) {
            return [
              { role: 'Beam tanks', people: names(p.tanks, 3), note: 'Stack for Saber Lash' },
              { role: 'Tank healers', people: names(p.heals, 3), note: 'Heavy on tanks' },
              { role: 'Raid healers', people: names(p.heals.slice(3), 4), note: 'Beams + attraction' },
              { role: 'Fatal Attraction movers', people: names(p.melee.concat(p.ranged), 10), note: 'Run links apart immediately' },
              { role: 'DPS', people: names(p.melee.concat(p.ranged), 16), note: 'Burn; don\'t greed links' },
            ];
          },
        },
        {
          id: 'bt-council',
          name: 'Illidari Council',
          map: 'dual',
          strategy: [
            '4 bosses — balance DPS.',
            'Assign kicks / spreads.',
            'None die early (enrage risk).',
          ],
          assign(p) {
            return [
              { role: 'Tank A', people: names(p.tanks, 1), note: 'Council member 1' },
              { role: 'Tank B', people: names(p.tanks.slice(1), 1), note: 'Council member 2' },
              { role: 'Tank C / off', people: names(p.tanks.slice(2), 1), note: 'Help swaps' },
              { role: 'Kick rotation', people: takeRound(p.kicks, 6, 0), note: 'Rotate interrupts' },
              { role: 'Healers', people: names(p.heals, 7), note: 'Raid-wide AoE healing' },
              { role: 'Even DPS teams', people: names(p.melee.concat(p.ranged), 16), note: 'Balance damage on all 4' },
            ];
          },
        },
        {
          id: 'bt-illidan',
          name: 'Illidan Stormrage',
          map: 'standard',
          strategy: [
            'P1: shear; parasitize.',
            'P2: flames / demons.',
            'P3–P5: cages, aggro flip, enrage burn — follow RL timers.',
          ],
          assign(p) {
            return [
              { role: 'Main Tank', people: names(p.tanks, 1), note: 'Illidan P1/P3' },
              { role: 'Off Tanks', people: names(p.tanks.slice(1), 3), note: 'Flames / adds / swaps' },
              { role: 'Tank healers', people: names(p.heals, 3), note: 'Shear + tank damage' },
              { role: 'Raid healers', people: names(p.heals.slice(3), 4), note: 'Parasitize / raid hits' },
              { role: 'Warlock specials', people: names(p.locks, 4), note: 'Enslave / banish / utility' },
              { role: 'Hunters', people: names(p.hunters, 4), note: 'MD / tranq' },
              { role: 'Melee', people: names(p.melee, 8), note: 'Behind; phase positions' },
              { role: 'Ranged', people: names(p.ranged, 10), note: 'Assigned stacks / spreads' },
              { role: 'Bloodlust call', people: names(p.shamans, 3), note: 'Lust on burn phase only' },
            ];
          },
        },
      ])
    );

  const BOSS_MAP = {};
  BOSSES.forEach((b) => {
    BOSS_MAP[b.id] = b.map || 'standard';
  });

  function listRaids() {
    return RAID_ORDER.map((r) => ({
      id: r.id,
      label: r.label,
      era: r.era,
      size: r.size,
      bosses: BOSSES.filter((b) => b.raid === r.id),
    })).filter((r) => r.bosses.length);
  }

  function getBoss(bossId) {
    return BOSSES.find((b) => b.id === bossId) || null;
  }


  const MAP_LAYOUTS = {
    /** Boss north, tank south of boss, melee under boss, ranged south, heals mid */
    standard: {
      label: 'Standard',
      boss: { x: 50, y: 22, r: 7 },
      zones: [
        { x: 35, y: 28, w: 30, h: 14, label: 'Melee', color: 'rgba(227,161,60,.12)' },
        { x: 20, y: 55, w: 60, h: 28, label: 'Ranged / Heal', color: 'rgba(111,194,122,.08)' },
      ],
      slots: {
        mt: [{ x: 50, y: 34, tag: 'MT', color: '#e35d5d' }],
        ot: [
          { x: 38, y: 32, tag: 'OT', color: '#e3a13c' },
          { x: 62, y: 32, tag: 'OT', color: '#e3a13c' },
        ],
        melee: [
          { x: 42, y: 40, tag: 'M' },
          { x: 50, y: 42, tag: 'M' },
          { x: 58, y: 40, tag: 'M' },
          { x: 36, y: 44, tag: 'M' },
          { x: 64, y: 44, tag: 'M' },
          { x: 46, y: 46, tag: 'M' },
          { x: 54, y: 46, tag: 'M' },
          { x: 50, y: 48, tag: 'M' },
        ],
        heal: [
          { x: 30, y: 58, tag: 'H', color: '#6fc27a' },
          { x: 42, y: 60, tag: 'H', color: '#6fc27a' },
          { x: 50, y: 56, tag: 'H', color: '#6fc27a' },
          { x: 58, y: 60, tag: 'H', color: '#6fc27a' },
          { x: 70, y: 58, tag: 'H', color: '#6fc27a' },
          { x: 36, y: 66, tag: 'H', color: '#6fc27a' },
          { x: 64, y: 66, tag: 'H', color: '#6fc27a' },
        ],
        ranged: [
          { x: 22, y: 72, tag: 'R', color: '#69CCF0' },
          { x: 34, y: 78, tag: 'R', color: '#69CCF0' },
          { x: 46, y: 80, tag: 'R', color: '#69CCF0' },
          { x: 58, y: 78, tag: 'R', color: '#69CCF0' },
          { x: 70, y: 72, tag: 'R', color: '#69CCF0' },
          { x: 26, y: 84, tag: 'R', color: '#69CCF0' },
          { x: 40, y: 86, tag: 'R', color: '#69CCF0' },
          { x: 54, y: 86, tag: 'R', color: '#69CCF0' },
          { x: 68, y: 84, tag: 'R', color: '#69CCF0' },
          { x: 80, y: 76, tag: 'R', color: '#69CCF0' },
        ],
        special: [
          { x: 18, y: 40, tag: 'S', color: '#c4a574' },
          { x: 82, y: 40, tag: 'S', color: '#c4a574' },
          { x: 15, y: 55, tag: 'S', color: '#c4a574' },
          { x: 85, y: 55, tag: 'S', color: '#c4a574' },
        ],
      },
    },
    spread: {
      label: 'Spread',
      boss: { x: 50, y: 45, r: 6 },
      zones: [
        { x: 10, y: 10, w: 80, h: 80, label: 'Spread room', color: 'rgba(227,161,60,.06)' },
      ],
      slots: {
        mt: [{ x: 50, y: 55, tag: 'MT', color: '#e35d5d' }],
        ot: [
          { x: 40, y: 52, tag: 'OT', color: '#e3a13c' },
          { x: 60, y: 52, tag: 'OT', color: '#e3a13c' },
        ],
        melee: [
          { x: 45, y: 60, tag: 'M' },
          { x: 55, y: 60, tag: 'M' },
          { x: 40, y: 64, tag: 'M' },
          { x: 60, y: 64, tag: 'M' },
          { x: 50, y: 66, tag: 'M' },
        ],
        heal: [
          { x: 25, y: 40, tag: 'H', color: '#6fc27a' },
          { x: 75, y: 40, tag: 'H', color: '#6fc27a' },
          { x: 30, y: 70, tag: 'H', color: '#6fc27a' },
          { x: 70, y: 70, tag: 'H', color: '#6fc27a' },
          { x: 50, y: 78, tag: 'H', color: '#6fc27a' },
        ],
        ranged: [
          { x: 15, y: 25, tag: 'R', color: '#69CCF0' },
          { x: 30, y: 18, tag: 'R', color: '#69CCF0' },
          { x: 50, y: 15, tag: 'R', color: '#69CCF0' },
          { x: 70, y: 18, tag: 'R', color: '#69CCF0' },
          { x: 85, y: 25, tag: 'R', color: '#69CCF0' },
          { x: 12, y: 50, tag: 'R', color: '#69CCF0' },
          { x: 88, y: 50, tag: 'R', color: '#69CCF0' },
          { x: 18, y: 75, tag: 'R', color: '#69CCF0' },
          { x: 82, y: 75, tag: 'R', color: '#69CCF0' },
          { x: 50, y: 88, tag: 'R', color: '#69CCF0' },
        ],
        special: [
          { x: 20, y: 55, tag: 'S', color: '#c4a574' },
          { x: 80, y: 55, tag: 'S', color: '#c4a574' },
        ],
      },
    },
    kite: {
      label: 'Kite path',
      boss: { x: 30, y: 50, r: 6 },
      zones: [
        { x: 20, y: 20, w: 60, h: 60, label: 'Kite loop', color: 'rgba(227,93,93,.08)' },
      ],
      slots: {
        mt: [{ x: 30, y: 62, tag: 'MT', color: '#e35d5d' }],
        ot: [{ x: 70, y: 30, tag: 'KITE', color: '#e3a13c' }],
        special: [
          { x: 75, y: 45, tag: 'K2', color: '#e3a13c' },
          { x: 55, y: 25, tag: 'S', color: '#c4a574' },
        ],
        melee: [
          { x: 40, y: 55, tag: 'M' },
          { x: 48, y: 58, tag: 'M' },
          { x: 42, y: 65, tag: 'M' },
        ],
        heal: [
          { x: 55, y: 70, tag: 'H', color: '#6fc27a' },
          { x: 65, y: 65, tag: 'H', color: '#6fc27a' },
          { x: 50, y: 75, tag: 'H', color: '#6fc27a' },
          { x: 72, y: 55, tag: 'H', color: '#6fc27a' },
        ],
        ranged: [
          { x: 60, y: 80, tag: 'R', color: '#69CCF0' },
          { x: 70, y: 75, tag: 'R', color: '#69CCF0' },
          { x: 80, y: 70, tag: 'R', color: '#69CCF0' },
          { x: 55, y: 85, tag: 'R', color: '#69CCF0' },
          { x: 85, y: 60, tag: 'R', color: '#69CCF0' },
          { x: 48, y: 70, tag: 'R', color: '#69CCF0' },
        ],
      },
    },
    dual: {
      label: 'Split sides',
      boss: { x: 50, y: 50, r: 8 },
      zones: [
        { x: 8, y: 20, w: 35, h: 60, label: 'Left', color: 'rgba(105,204,240,.08)' },
        { x: 57, y: 20, w: 35, h: 60, label: 'Right', color: 'rgba(227,161,60,.08)' },
      ],
      slots: {
        mt: [{ x: 50, y: 62, tag: 'MT', color: '#e35d5d' }],
        ot: [
          { x: 25, y: 50, tag: 'OT', color: '#e3a13c' },
          { x: 75, y: 50, tag: 'OT', color: '#e3a13c' },
        ],
        melee: [
          { x: 45, y: 58, tag: 'M' },
          { x: 55, y: 58, tag: 'M' },
          { x: 42, y: 65, tag: 'M' },
          { x: 58, y: 65, tag: 'M' },
        ],
        heal: [
          { x: 20, y: 70, tag: 'H', color: '#6fc27a' },
          { x: 35, y: 75, tag: 'H', color: '#6fc27a' },
          { x: 50, y: 78, tag: 'H', color: '#6fc27a' },
          { x: 65, y: 75, tag: 'H', color: '#6fc27a' },
          { x: 80, y: 70, tag: 'H', color: '#6fc27a' },
        ],
        ranged: [
          { x: 15, y: 30, tag: 'R', color: '#69CCF0' },
          { x: 25, y: 25, tag: 'R', color: '#69CCF0' },
          { x: 18, y: 45, tag: 'R', color: '#69CCF0' },
          { x: 75, y: 25, tag: 'R', color: '#69CCF0' },
          { x: 85, y: 30, tag: 'R', color: '#69CCF0' },
          { x: 82, y: 45, tag: 'R', color: '#69CCF0' },
          { x: 30, y: 55, tag: 'R', color: '#69CCF0' },
          { x: 70, y: 55, tag: 'R', color: '#69CCF0' },
        ],
        special: [
          { x: 12, y: 60, tag: 'S', color: '#c4a574' },
          { x: 88, y: 60, tag: 'S', color: '#c4a574' },
        ],
      },
    },
  };

  /** Per-boss map type */

  function peopleFromAssignments(assignments, matchers) {
    const out = [];
    const seen = new Set();
    (assignments || []).forEach((a) => {
      const role = (a.role || '').toLowerCase();
      const hit = matchers.some((m) =>
        typeof m === 'string' ? role.includes(m) : m.test(role)
      );
      if (!hit) return;
      (a.people || []).forEach((name) => {
        if (!name || name === '—' || /entire raid|assign manually/i.test(name)) return;
        const k = name.toLowerCase();
        if (seen.has(k)) return;
        seen.add(k);
        out.push(name);
      });
    });
    return out;
  }

  function buildMap(bossId, assignments) {
    const layoutKey = BOSS_MAP[bossId] || 'standard';
    const layout = MAP_LAYOUTS[layoutKey] || MAP_LAYOUTS.standard;
    const boss = getBoss(bossId);

    const mt = peopleFromAssignments(assignments, ['main tank', 'beam tank', 'tank a']);
    const ot = peopleFromAssignments(assignments, [
      'off tank',
      'kiter',
      'add tank',
      'tank b',
      'tank c',
      'infernal',
      'akama',
    ]);
    const melee = peopleFromAssignments(assignments, ['melee', 'physical', 'add aoe']);
    const ranged = peopleFromAssignments(assignments, [
      'ranged',
      'caster',
      'hunter',
      'boss dps',
      'even dps',
      'channeler',
      'dps',
      'infernal burn',
      'doom',
    ]);
    const heals = peopleFromAssignments(assignments, ['heal']);
    const special = peopleFromAssignments(assignments, [
      'kick',
      'ghost',
      'warlock',
      'spine',
      'decurse',
      'tremor',
      'bloodlust',
      'shield break',
      'fatal',
      'special',
    ]);

    const markers = [];
    // Boss marker
    markers.push({
      type: 'boss',
      x: layout.boss.x,
      y: layout.boss.y,
      r: layout.boss.r || 7,
      label: (boss && boss.name) || 'Boss',
      short: 'BOSS',
      color: '#a335ee',
    });

    function place(list, slots, defColor, group) {
      (slots || []).forEach((slot, i) => {
        const slotId = group + '-' + i;
        const name = list[i] || '';
        markers.push({
          type: 'player',
          slotId,
          group,
          index: i,
          x: slot.x,
          y: slot.y,
          tag: slot.tag || 'P',
          color: slot.color || defColor || '#e3a13c',
          name,
          short: name ? String(name).split('/')[0].slice(0, 9) : '·',
          empty: !name,
        });
      });
    }

    place(mt, layout.slots.mt, '#e35d5d', 'mt');
    place(ot, layout.slots.ot, '#e3a13c', 'ot');
    place(melee, layout.slots.melee, '#C79C6E', 'melee');
    place(heals, layout.slots.heal, '#6fc27a', 'heal');
    place(ranged, layout.slots.ranged, '#69CCF0', 'ranged');
    place(special, layout.slots.special, '#c4a574', 'special');

    // Overflow names as list (not on map)
    const placed = new Set(
      markers.filter((m) => m.name).map((m) => m.name.toLowerCase())
    );
    const overflow = []
      .concat(mt, ot, melee, heals, ranged, special)
      .filter((n, i, a) => n && a.indexOf(n) === i && !placed.has(n.toLowerCase()));

    return {
      layout: layoutKey,
      label: layout.label,
      bossName: (boss && boss.name) || '',
      zones: layout.zones || [],
      markers,
      overflow: overflow.slice(0, 12),
      legend: [
        { tag: 'BOSS', color: '#a335ee', label: 'Boss' },
        { tag: 'MT', color: '#e35d5d', label: 'Main tank' },
        { tag: 'OT', color: '#e3a13c', label: 'Off tank / kite' },
        { tag: 'M', color: '#C79C6E', label: 'Melee' },
        { tag: 'H', color: '#6fc27a', label: 'Healer' },
        { tag: 'R', color: '#69CCF0', label: 'Ranged' },
        { tag: 'S', color: '#c4a574', label: 'Special' },
      ],
    };
  }

  /** Apply admin slot overrides: { 'mt-0': 'PlayerName', ... } */
  function applyMapOverrides(map, overrides) {
    if (!map || !overrides) return map;
    const ov = overrides || {};
    // Build pool of names currently on map
    const bySlot = {};
    map.markers.forEach((m) => {
      if (m.slotId) bySlot[m.slotId] = m;
    });
    Object.keys(ov).forEach((slotId) => {
      const m = bySlot[slotId];
      if (!m) return;
      const name = ov[slotId];
      m.name = name || '';
      m.short = name ? String(name).split('/')[0].slice(0, 9) : '·';
      m.empty = !name;
    });
    return map;
  }

  /** SVG string for embedding in HTML — Jordee-style sheet map */
  function mapToSvg(map, opts) {
    if (!map) return '';
    const w = (opts && opts.w) || 720;
    const h = (opts && opts.h) || 480;
    const interactive = !!(opts && opts.interactive);
    const parts = [];
    parts.push(
      `<svg viewBox="0 0 ${w} ${h}" class="raid-map-svg" role="img" aria-label="Raid position map">`
    );
    // floor — spreadsheet dark panel
    parts.push(
      `<defs>
        <pattern id="mapGrid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="rgba(227,161,60,.06)" stroke-width="1"/>
        </pattern>
      </defs>`,
      `<rect x="0" y="0" width="${w}" height="${h}" fill="#12161f" rx="14"/>`,
      `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#mapGrid)" rx="14"/>`,
      `<rect x="10" y="10" width="${w - 20}" height="${h - 20}" fill="none" stroke="rgba(227,161,60,.35)" stroke-width="2" rx="12"/>`,
      `<text x="24" y="32" fill="#f4bd5f" font-size="13" font-weight="700" font-family="Inter,sans-serif">${escapeXml(map.label || 'Raid map')} · ${escapeXml((map.bossName || '').slice(0, 28))}</text>`
    );
    // zones (big colored boxes like sheet columns)
    (map.zones || []).forEach((z) => {
      const zx = (z.x / 100) * w;
      const zy = (z.y / 100) * h;
      const zw = (z.w / 100) * w;
      const zh = (z.h / 100) * h;
      parts.push(
        `<rect x="${zx}" y="${zy}" width="${zw}" height="${zh}" fill="${z.color || 'rgba(227,161,60,.08)'}" stroke="rgba(227,161,60,.28)" stroke-width="1.5" rx="10"/>`,
        `<text x="${zx + 10}" y="${zy + 18}" fill="#c4a574" font-size="12" font-weight="700" font-family="Inter,sans-serif">${escapeXml(z.label || '')}</text>`
      );
    });
    // markers
    (map.markers || []).forEach((m) => {
      const cx = (m.x / 100) * w;
      const cy = (m.y / 100) * h;
      if (m.type === 'boss') {
        const r = ((m.r || 7) / 100) * Math.min(w, h);
        parts.push(
          `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${m.color}" opacity="0.95"/>`,
          `<circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="none" stroke="${m.color}" opacity="0.45" stroke-width="2"/>`,
          `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#fff" font-size="11" font-weight="800" font-family="Inter,sans-serif">BOSS</text>`,
          `<text x="${cx}" y="${cy + r + 16}" text-anchor="middle" fill="#f4bd5f" font-size="12" font-weight="600" font-family="Inter,sans-serif">${escapeXml((m.label || '').slice(0, 20))}</text>`
        );
      } else {
        const r = 14;
        const fill = m.empty ? 'rgba(40,44,56,.9)' : m.color || '#e3a13c';
        const stroke = m.empty ? 'rgba(227,161,60,.35)' : '#0d1224';
        const gOpen = interactive
          ? `<g class="map-token${m.empty ? ' empty' : ''}" data-slot="${escapeXml(m.slotId || '')}" data-name="${escapeXml(m.name || '')}" style="cursor:${interactive ? 'grab' : 'default'}">`
          : '<g>';
        parts.push(
          gOpen,
          `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="0.97" stroke="${stroke}" stroke-width="1.8"/>`,
          `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="${m.empty ? '#6b7280' : '#0d1224'}" font-size="9" font-weight="800" font-family="Inter,sans-serif">${escapeXml(m.tag || 'P')}</text>`,
          `<text x="${cx}" y="${cy + r + 13}" text-anchor="middle" fill="${m.empty ? '#6b7280' : '#f3ecd9'}" font-size="10" font-weight="600" font-family="Inter,sans-serif">${escapeXml(m.short || '·')}</text>`,
          `</g>`
        );
      }
    });
    parts.push(`</svg>`);
    return parts.join('');
  }

  function escapeXml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function assignBoss(bossId, players) {
    const boss = getBoss(bossId);
    if (!boss) throw new Error('Unknown boss');
    const p = pool(players || []);
    if (!p.all.length) {
      return {
        boss,
        assignments: [{ role: 'Roster', people: ['—'], note: 'Import Raid-Helper or load GM demo first' }],
        empty: true,
        map: null,
        mapSvg: '',
      };
    }
    let assignments = [];
    try {
      assignments = boss.assign(p) || [];
    } catch (e) {
      assignments = [{ role: 'Error', people: ['—'], note: String(e.message || e) }];
    }
    // Normalize people to arrays
    assignments = assignments.map((a) => ({
      role: a.role,
      note: a.note || '',
      people: Array.isArray(a.people) ? a.people : [String(a.people || '—')],
    }));
    const map = buildMap(bossId, assignments);
    return {
      boss: {
        id: boss.id,
        name: boss.name,
        raid: boss.raid,
        raidLabel: boss.raidLabel,
        order: boss.order,
        strategy: boss.strategy || [],
      },
      assignments,
      map,
      mapSvg: mapToSvg(map, { interactive: true }),
      rosterSize: p.all.length,
      empty: false,
      generatedAt: new Date().toISOString(),
    };
  }

  /** Re-render map with optional slot overrides for live admin edits */
  function mapWithOverrides(bossId, assignments, overrides, interactive) {
    let map = buildMap(bossId, assignments);
    map = applyMapOverrides(map, overrides);
    return {
      map,
      mapSvg: mapToSvg(map, { interactive: interactive !== false }),
    };
  }

  function assignRaid(raidId, players) {
    const bosses = BOSSES.filter((b) => b.raid === raidId);
    return bosses.map((b) => assignBoss(b.id, players));
  }

  function assignAll(players) {
    const out = { generatedAt: new Date().toISOString() };
    listRaids().forEach((r) => {
      out[r.id] = assignRaid(r.id, players);
    });
    return out;
  }

  function toDiscord(result) {
    if (!result || !result.boss) return '';
    const lines = [
      `**${result.boss.raidLabel} · ${result.boss.name}**`,
      `_Auto-assigned · Midnight Rodeo · Classic → BT_`,
      '',
      '**Strategy**',
      ...(result.boss.strategy || []).map((s) => `• ${s}`),
      '',
      '**Assignments**',
    ];
    (result.assignments || []).forEach((a) => {
      lines.push(`**${a.role}:** ${(a.people || []).join(', ')}`);
      if (a.note) lines.push(`  _${a.note}_`);
    });
    return lines.join('\n');
  }

  global.RaidBosses = {
    BOSSES,
    listRaids,
    getBoss,
    assignBoss,
    assignRaid,
    assignAll,
    toDiscord,
    pool,
    buildMap,
    mapToSvg,
    applyMapOverrides,
    mapWithOverrides,
    MAP_LAYOUTS,
    BOSS_MAP,
    RAID_ORDER,
  };
})(typeof window !== 'undefined' ? window : globalThis);
