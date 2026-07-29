/**
 * Midnight Rodeo — TBC Black Temple + Mount Hyjal
 * Auto boss assignments (simple interactive "Jordee sheet")
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

  /** Boss definitions: id, raid, name, phase, strategy, assign(fn) */
  const BOSSES = [
    // ——— Mount Hyjal ———
    {
      id: 'mh-rage',
      raid: 'hyjal',
      raidLabel: 'Mount Hyjal',
      name: "Rage Winterchill",
      order: 1,
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
      raid: 'hyjal',
      raidLabel: 'Mount Hyjal',
      name: 'Anetheron',
      order: 2,
      strategy: [
        'Tank swap on Carrion Swarm stacks if needed.',
        'Infernal adds: OT / offtank picks up; burn adds before boss if dangerous.',
        'Sleep: break with damage carefully. Dispel Vampiric Aura if possible.',
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
      raid: 'hyjal',
      raidLabel: 'Mount Hyjal',
      name: "Kaz'rogal",
      order: 3,
      strategy: [
        'Mana burn pulses — casters/healers watch mana.',
        'Melee and hunters are preferred on burn if mana is tight.',
        'Tank in place; raid stacked loosely for heals.',
      ],
      assign(p) {
        return [
          { role: 'Main Tank', people: names(p.tanks, 1), note: 'Hold boss' },
          { role: 'Off Tank', people: names(p.tanks.slice(1), 1), note: 'Backup' },
          { role: 'Healers', people: names(p.heals, 7), note: 'Mana potions / dark runes ready' },
          { role: 'Physical DPS (priority)', people: names(p.melee.concat(p.hunters), 12), note: 'Less mana burn impact' },
          { role: 'Caster DPS', people: names(p.ranged.filter((r) => !isHunter(r)), 8), note: 'OOM risk — drink between' },
        ];
      },
    },
    {
      id: 'mh-azgalor',
      raid: 'hyjal',
      raidLabel: 'Mount Hyjal',
      name: 'Azgalor',
      order: 4,
      strategy: [
        'Doom: marked player runs out / assigned soaks per your strat.',
        'Howl of Azgalor silence — healers stack range carefully.',
        'Burn boss; handle adds if using older strat variants.',
      ],
      assign(p) {
        const doom = p.melee.concat(p.ranged).sort(sortIlvl);
        return [
          { role: 'Main Tank', people: names(p.tanks, 1), note: 'Boss facing away' },
          { role: 'Off Tank', people: names(p.tanks.slice(1), 1), note: 'Adds / backup' },
          { role: 'Tank healers', people: names(p.heals, 2), note: 'On MT' },
          { role: 'Raid healers', people: names(p.heals.slice(2), 5), note: 'Doom + Howl recovery' },
          { role: 'Doom runners (order)', people: names(doom, 8), note: 'Call order in Discord voice' },
          { role: 'Melee', people: names(p.melee, 8), note: 'Behind boss' },
          { role: 'Ranged', people: names(p.ranged, 10), note: 'Max range for Howl' },
        ];
      },
    },
    {
      id: 'mh-archi',
      raid: 'hyjal',
      raidLabel: 'Mount Hyjal',
      name: 'Archimonde',
      order: 5,
      strategy: [
        'Air burst: jump / prevention per your weak aura pack.',
        'Fear: tremble / fear ward / shamans tremor.',
        'Soul Charge / grip: assigned ranges. Burn hard; no greed on grip.',
      ],
      assign(p) {
        return [
          { role: 'Main Tank', people: names(p.tanks, 1), note: 'Boss' },
          { role: 'Off Tanks', people: names(p.tanks.slice(1), 2), note: 'Grip / backup' },
          { role: 'Tremor / Fear ward', people: join(names(p.shamans.filter((s) => /resto|enhance/i.test(s.spec)).concat(p.priests), 4)), note: 'Tremor totem + Fear Ward rotation' },
          { role: 'Tank healers', people: names(p.heals, 2), note: 'Heavy tank damage' },
          { role: 'Raid healers', people: names(p.heals.slice(2), 5), note: 'Air burst recovery' },
          { role: 'Melee', people: names(p.melee, 8), note: 'Watch air burst timing' },
          { role: 'Ranged', people: names(p.ranged, 10), note: 'Spread; assigned grip spots' },
        ];
      },
    },

    // ——— Black Temple ———
    {
      id: 'bt-naj',
      raid: 'bt',
      raidLabel: 'Black Temple',
      name: "High Warlord Naj'entus",
      order: 1,
      strategy: [
        'Tidal Shield: everyone click spines into shield to break.',
        'Impaling Spine: remove from player ASAP (click).',
        'Tank boss; heal spine targets; burn after shield breaks.',
      ],
      assign(p) {
        return [
          { role: 'Main Tank', people: names(p.tanks, 1), note: 'Hold Naj' },
          { role: 'Off Tank', people: names(p.tanks.slice(1), 1), note: 'Backup' },
          { role: 'Spine removers (clickers)', people: names(p.ranged.concat(p.heals), 6), note: 'Priority: free impaled players' },
          { role: 'Shield break (all)', people: ['ENTIRE RAID'], note: 'Throw spines into Tidal Shield' },
          { role: 'Tank healers', people: names(p.heals, 2), note: 'MT' },
          { role: 'Raid healers', people: names(p.heals.slice(2), 5), note: 'Spine targets' },
          { role: 'DPS', people: names(p.melee.concat(p.ranged), 16), note: 'Burn on shield down' },
        ];
      },
    },
    {
      id: 'bt-supremus',
      raid: 'bt',
      raidLabel: 'Black Temple',
      name: 'Supremus',
      order: 2,
      strategy: [
        'Phase 1 tank & spank; kite volcanoes / molten flames.',
        'Phase 2 kite phase: kiter runs; raid DPS while moving.',
        'Hunters / kiting class preferred for kite phase.',
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
      raid: 'bt',
      raidLabel: 'Black Temple',
      name: 'Shade of Akama',
      order: 3,
      strategy: [
        'Channelers: kill channelers to free Shade.',
        'Defend Akama; adds spawn — AoE and OT pickup.',
        'Burn Shade when vulnerable; keep Akama alive.',
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
      raid: 'bt',
      raidLabel: 'Black Temple',
      name: 'Teron Gorefiend',
      order: 4,
      strategy: [
        'Shadow of Death: dead players control ghosts — destroy constructs.',
        'Pre-assign who plays ghosts well (awareness).',
        'Incinerate / shadow damage — heal and stay spread as needed.',
      ],
      assign(p) {
        const ghosters = p.ranged.concat(p.melee).sort(sortIlvl);
        return [
          { role: 'Main Tank', people: names(p.tanks, 1), note: 'Boss' },
          { role: 'Off Tank', people: names(p.tanks.slice(1), 1), note: 'Backup' },
          { role: 'Ghost pilots (priority order)', people: names(ghosters, 8), note: 'Comfort players first' },
          { role: 'Tank healers', people: names(p.heals, 2), note: 'MT' },
          { role: 'Raid healers', people: names(p.heals.slice(2), 5), note: 'Incinerate / shadows' },
          { role: 'DPS', people: names(p.melee.concat(p.ranged), 15), note: 'Burn boss; be ready for ghost' },
        ];
      },
    },
    {
      id: 'bt-gurtogg',
      raid: 'bt',
      raidLabel: 'Black Temple',
      name: 'Gurtogg Bloodboil',
      order: 5,
      strategy: [
        'Bloodboil stacks: tank swap / raid takes boils per strat.',
        'Fel Rage: focus target runs out; heal that player hard.',
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
      raid: 'bt',
      raidLabel: 'Black Temple',
      name: 'Reliquary of Souls',
      order: 6,
      strategy: [
        'Essence of Suffering → Desire → Anger (3 phases).',
        'Suffering: tank swap on aura stacks; melee care.',
        'Desire: spell reflect / mind control — kill spirits; no self-kill.',
        'Anger: seethe; spread; run off soul scream; burn.',
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
      raid: 'bt',
      raidLabel: 'Black Temple',
      name: 'Mother Shahraz',
      order: 7,
      strategy: [
        'Fatal Attraction: linked players run apart.',
        'Beam tanks: prismatic beams — tank absorb / resist set.',
        'Saber Lash: tanks stacked. Raid heals for beams.',
      ],
      assign(p) {
        return [
          { role: 'Beam tanks', people: names(p.tanks, 3), note: 'Stack for Saber Lash; resist gear if used' },
          { role: 'Tank healers', people: names(p.heals, 3), note: 'Heavy on tanks' },
          { role: 'Raid healers', people: names(p.heals.slice(3), 4), note: 'Beams + attraction' },
          { role: 'Fatal Attraction movers', people: names(p.melee.concat(p.ranged), 10), note: 'Run links apart immediately' },
          { role: 'DPS', people: names(p.melee.concat(p.ranged), 16), note: 'Burn; don\'t greed links' },
        ];
      },
    },
    {
      id: 'bt-council',
      raid: 'bt',
      raidLabel: 'Black Temple',
      name: 'Illidari Council',
      order: 8,
      strategy: [
        '4 bosses: AoE heal control, interrupts, spreads.',
        'Assign kicks on Fire/Frost/Poison/Holy as needed.',
        'Balance DPS so none die early (enrage risk).',
      ],
      assign(p) {
        const kicks = p.kicks;
        return [
          { role: 'Tank A', people: names(p.tanks, 1), note: 'Council member 1' },
          { role: 'Tank B', people: names(p.tanks.slice(1), 1), note: 'Council member 2' },
          { role: 'Tank C / off', people: names(p.tanks.slice(2), 1), note: 'Help swaps' },
          { role: 'Kick rotation', people: takeRound(kicks, 6, 0), note: 'Rotate interrupts' },
          { role: 'Healers', people: names(p.heals, 7), note: 'Raid-wide AoE healing' },
          { role: 'Even DPS teams', people: names(p.melee.concat(p.ranged), 16), note: 'Balance damage on all 4' },
        ];
      },
    },
    {
      id: 'bt-illidan',
      raid: 'bt',
      raidLabel: 'Black Temple',
      name: 'Illidan Stormrage',
      order: 9,
      strategy: [
        'P1: tank boss; shear; parasitize — fire/shadow resist as needed.',
        'P2: demons / flames; assigned soaks and add control.',
        'P3–P5: cage, aggro flip, enrage burn — follow RL timers.',
        'Warlocks: enslaves / banshees per phase. Hunters: MD / tranq.',
      ],
      assign(p) {
        return [
          { role: 'Main Tank', people: names(p.tanks, 1), note: 'Illidan P1/P3' },
          { role: 'Off Tanks', people: names(p.tanks.slice(1), 3), note: 'Flames / adds / swaps' },
          { role: 'Tank healers', people: names(p.heals, 3), note: 'Shear + tank damage' },
          { role: 'Raid healers', people: names(p.heals.slice(3), 4), note: 'Parasitize / raid hits' },
          { role: 'Warlock specials', people: names(p.locks, 4), note: 'Enslave / banish / utility' },
          { role: 'Hunters', people: names(p.hunters, 4), note: 'MD pulls / tranq' },
          { role: 'Melee', people: names(p.melee, 8), note: 'Behind; phase positions' },
          { role: 'Ranged', people: names(p.ranged, 10), note: 'Assigned stacks / spreads' },
          { role: 'Bloodlust call', people: names(p.shamans, 3), note: 'Lust on burn phase only' },
        ];
      },
    },
  ];

  function listRaids() {
    return [
      { id: 'hyjal', label: 'Mount Hyjal', bosses: BOSSES.filter((b) => b.raid === 'hyjal') },
      { id: 'bt', label: 'Black Temple', bosses: BOSSES.filter((b) => b.raid === 'bt') },
    ];
  }

  function getBoss(bossId) {
    return BOSSES.find((b) => b.id === bossId) || null;
  }

  /**
   * Schematic top-down layouts (not real game assets — clear RL maps).
   * Coordinates are % of map (0–100).
   */
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
  const BOSS_MAP = {
    'mh-rage': 'spread',
    'mh-anetheron': 'standard',
    'mh-kaz': 'standard',
    'mh-azgalor': 'spread',
    'mh-archi': 'spread',
    'bt-naj': 'standard',
    'bt-supremus': 'kite',
    'bt-shade': 'dual',
    'bt-teron': 'standard',
    'bt-gurtogg': 'standard',
    'bt-ros': 'spread',
    'bt-mother': 'spread',
    'bt-council': 'dual',
    'bt-illidan': 'standard',
  };

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

    function place(list, slots, defColor) {
      (slots || []).forEach((slot, i) => {
        const name = list[i];
        if (!name) return;
        markers.push({
          type: 'player',
          x: slot.x,
          y: slot.y,
          tag: slot.tag || 'P',
          color: slot.color || defColor || '#e3a13c',
          name,
          short: String(name).slice(0, 8),
        });
      });
    }

    place(mt, layout.slots.mt, '#e35d5d');
    place(ot, layout.slots.ot, '#e3a13c');
    place(melee, layout.slots.melee, '#C79C6E');
    place(heals, layout.slots.heal, '#6fc27a');
    place(ranged, layout.slots.ranged, '#69CCF0');
    place(special, layout.slots.special, '#c4a574');

    // Overflow names as list (not on map)
    const placed = new Set(markers.filter((m) => m.name).map((m) => m.name.toLowerCase()));
    const overflow = []
      .concat(mt, ot, melee, heals, ranged, special)
      .filter((n, i, a) => a.indexOf(n) === i && !placed.has(n.toLowerCase()));

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

  /** SVG string for embedding in HTML */
  function mapToSvg(map, opts) {
    if (!map) return '';
    const w = (opts && opts.w) || 640;
    const h = (opts && opts.h) || 420;
    const parts = [];
    parts.push(
      `<svg viewBox="0 0 ${w} ${h}" class="raid-map-svg" role="img" aria-label="Raid position map">`
    );
    // floor
    parts.push(
      `<rect x="0" y="0" width="${w}" height="${h}" fill="#0f1528" rx="12"/>`,
      `<rect x="8" y="8" width="${w - 16}" height="${h - 16}" fill="none" stroke="rgba(227,161,60,.25)" stroke-width="1.5" rx="10"/>`
    );
    // grid
    for (let i = 1; i < 4; i++) {
      const x = (w * i) / 4;
      const y = (h * i) / 4;
      parts.push(
        `<line x1="${x}" y1="12" x2="${x}" y2="${h - 12}" stroke="rgba(44,53,96,.5)" stroke-dasharray="4 6"/>`,
        `<line x1="12" y1="${y}" x2="${w - 12}" y2="${y}" stroke="rgba(44,53,96,.5)" stroke-dasharray="4 6"/>`
      );
    }
    // zones
    (map.zones || []).forEach((z) => {
      const zx = (z.x / 100) * w;
      const zy = (z.y / 100) * h;
      const zw = (z.w / 100) * w;
      const zh = (z.h / 100) * h;
      parts.push(
        `<rect x="${zx}" y="${zy}" width="${zw}" height="${zh}" fill="${z.color || 'rgba(227,161,60,.08)'}" stroke="rgba(227,161,60,.2)" rx="8"/>`,
        `<text x="${zx + 8}" y="${zy + 16}" fill="#9a6a3f" font-size="11" font-family="Inter,sans-serif">${escapeXml(z.label || '')}</text>`
      );
    });
    // markers
    (map.markers || []).forEach((m) => {
      const cx = (m.x / 100) * w;
      const cy = (m.y / 100) * h;
      if (m.type === 'boss') {
        const r = ((m.r || 7) / 100) * Math.min(w, h);
        parts.push(
          `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${m.color}" opacity="0.9"/>`,
          `<circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="none" stroke="${m.color}" opacity="0.4" stroke-width="2"/>`,
          `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#fff" font-size="10" font-weight="700" font-family="Inter,sans-serif">BOSS</text>`,
          `<text x="${cx}" y="${cy + r + 14}" text-anchor="middle" fill="#f4bd5f" font-size="11" font-family="Inter,sans-serif">${escapeXml((m.label || '').slice(0, 18))}</text>`
        );
      } else {
        const r = 11;
        parts.push(
          `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${m.color || '#e3a13c'}" opacity="0.95" stroke="#0d1224" stroke-width="1.5"/>`,
          `<text x="${cx}" y="${cy + 3.5}" text-anchor="middle" fill="#0d1224" font-size="8" font-weight="700" font-family="Inter,sans-serif">${escapeXml(m.tag || 'P')}</text>`,
          `<text x="${cx}" y="${cy + r + 11}" text-anchor="middle" fill="#f3ecd9" font-size="9" font-family="Inter,sans-serif">${escapeXml(m.short || m.name || '')}</text>`
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
      mapSvg: mapToSvg(map),
      rosterSize: p.all.length,
      empty: false,
      generatedAt: new Date().toISOString(),
    };
  }

  function assignRaid(raidId, players) {
    const bosses = BOSSES.filter((b) => b.raid === raidId);
    return bosses.map((b) => assignBoss(b.id, players));
  }

  function assignAll(players) {
    return {
      hyjal: assignRaid('hyjal', players),
      bt: assignRaid('bt', players),
      generatedAt: new Date().toISOString(),
    };
  }

  function toDiscord(result) {
    if (!result || !result.boss) return '';
    const lines = [
      `**${result.boss.raidLabel} · ${result.boss.name}**`,
      `_Auto-assigned · Midnight Rodeo TBC_`,
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
    MAP_LAYOUTS,
    BOSS_MAP,
  };
})(typeof window !== 'undefined' ? window : globalThis);
