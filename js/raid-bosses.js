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

  function assignBoss(bossId, players) {
    const boss = getBoss(bossId);
    if (!boss) throw new Error('Unknown boss');
    const p = pool(players || []);
    if (!p.all.length) {
      return {
        boss,
        assignments: [{ role: 'Roster', people: ['—'], note: 'Import Raid-Helper or load GM demo first' }],
        empty: true,
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
  };
})(typeof window !== 'undefined' ? window : globalThis);
