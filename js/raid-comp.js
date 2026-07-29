/**
 * Midnight Rodeo — TBC Classic raid composition optimizer
 *
 * 25-man = 5 parties × 5. Many strong buffs are PARTY-ONLY in TBC:
 *   Windfury Totem, Leader of the Pack, Moonkin Aura, Battle Shout,
 *   Ferocious Inspiration (BM), Paladin auras, most totems.
 *
 * Goals:
 *  1) Dual WF melee stacks for physical DPS
 *  2) Tank group with WF for threat + mitigation auras
 *  3) Caster stack (Moonkin + Wrath of Air + SPriest)
 *  4) Blessings: Sanctuary/Kings tanks · Might physical · Salvation melee · Wisdom casters
 *  5) Coverage report: what each group has vs is missing
 */
(function (global) {
  const ROLE_ORDER = { Tanks: 0, Healers: 1, Melee: 2, Ranged: 3, Other: 4 };

  /* ─── classify helpers ─────────────────────────────────────────── */

  function normalizePlayer(p) {
    const name = p.displayName || p.name || p.player || '';
    const cls = (p.class || '').trim();
    const spec = (p.spec || '').trim();
    let role = (p.rhRole || p.role || '').trim();
    if (!role) role = guessRole(cls, spec);
    return {
      name,
      class: cls,
      spec,
      role,
      ilvl: p.ilvl ? Number(p.ilvl) || 0 : 0,
      raw: p,
    };
  }

  function guessRole(cls, spec) {
    const s = (spec || '').toLowerCase();
    const c = (cls || '').toLowerCase();
    if (/prot|guardian|protection/.test(s) || c === 'tank') return 'Tanks';
    if (/holy|disc|resto|restoration|dreamstate/.test(s)) return 'Healers';
    if (/balance|shadow|afflict|destro|demo|arcane|fire|frost|elemental|moonkin/.test(s))
      return 'Ranged';
    if (/fury|arms|ret|combat|assassin|subtle|enhance|cat|feral/.test(s)) return 'Melee';
    if (c === 'hunter' || c === 'mage' || c === 'warlock') return 'Ranged';
    if (c === 'rogue' || c === 'warrior') return 'Melee';
    if (c === 'priest' || c === 'paladin' || c === 'shaman' || c === 'druid') return 'Other';
    return 'Other';
  }

  function isTank(p) {
    if (/tank/i.test(p.role) || /tank/i.test(p.class)) return true;
    return /prot|guardian|protection/i.test(p.spec || '');
  }
  function isHealer(p) {
    if (/heal/i.test(p.role)) return true;
    return /holy|disc|resto|restoration|dreamstate/i.test(p.spec || '');
  }
  function isMeleeDps(p) {
    if (isTank(p) || isHealer(p)) return false;
    const s = (p.spec || '').toLowerCase();
    const c = (p.class || '').toLowerCase();
    if (/fury|arms|ret|combat|subtle|assassin|enhance|cat|feral/.test(s) && !/guardian/.test(s))
      return true;
    if (c === 'rogue') return true;
    if (c === 'warrior' && !/prot/.test(s)) return true;
    if (c === 'paladin' && /ret/.test(s)) return true;
    if (c === 'shaman' && /enhance/.test(s)) return true;
    if (c === 'druid' && /feral|cat/.test(s) && !/guardian/.test(s)) return true;
    return /melee/i.test(p.role);
  }
  function isRangedDps(p) {
    if (isTank(p) || isHealer(p) || isMeleeDps(p)) return false;
    const s = (p.spec || '').toLowerCase();
    const c = (p.class || '').toLowerCase();
    if (/balance|shadow|afflict|destro|demo|arcane|fire|frost|elemental|bm|mark|surv|beast/.test(s))
      return true;
    if (['mage', 'warlock', 'hunter', 'priest'].includes(c) && !/holy|disc/.test(s)) return true;
    if (c === 'druid' && /balance|moon/.test(s)) return true;
    if (c === 'shaman' && /elemental/.test(s)) return true;
    return /ranged/i.test(p.role);
  }

  function isEnhShaman(p) {
    return /shaman/i.test(p.class) && /enhance/i.test(p.spec);
  }
  function isEleShaman(p) {
    return /shaman/i.test(p.class) && /elemental/i.test(p.spec);
  }
  function isRestoShaman(p) {
    return /shaman/i.test(p.class) && /resto/i.test(p.spec);
  }
  function isAnyShaman(p) {
    return /shaman/i.test(p.class);
  }
  /** Any shaman can drop Windfury; Enh has Improved WF (best for DPS) */
  function canDropWindfury(p) {
    return isAnyShaman(p);
  }
  function isBoomkin(p) {
    return /druid/i.test(p.class) && /balance|moon/i.test(p.spec);
  }
  function isFeralCat(p) {
    return (
      /druid/i.test(p.class) &&
      /feral|cat/i.test(p.spec) &&
      !/guardian/i.test(p.spec) &&
      !isTank(p)
    );
  }
  function isShadowPriest(p) {
    return /priest/i.test(p.class) && /shadow/i.test(p.spec);
  }
  function isHunter(p) {
    return /hunter/i.test(p.class);
  }
  function isBMHunter(p) {
    return isHunter(p) && /beast|bm/i.test(p.spec);
  }
  function isPaladin(p) {
    return /paladin/i.test(p.class);
  }
  function isWarlock(p) {
    return /warlock/i.test(p.class);
  }
  function isMage(p) {
    return /mage/i.test(p.class);
  }
  function isWarrior(p) {
    return /warrior/i.test(p.class);
  }
  function isRetPaladin(p) {
    return isPaladin(p) && /ret/i.test(p.spec);
  }
  function isHolyPaladin(p) {
    return isPaladin(p) && /holy/i.test(p.spec);
  }
  function isProtPaladin(p) {
    return isPaladin(p) && /prot/i.test(p.spec);
  }
  function isFuryWarrior(p) {
    return isWarrior(p) && !isTank(p);
  }
  function isDiscPriest(p) {
    return /priest/i.test(p.class) && /disc/i.test(p.spec);
  }
  function isHolyPriest(p) {
    return /priest/i.test(p.class) && /holy/i.test(p.spec) && !/shadow/i.test(p.spec);
  }
  function isRestoDruid(p) {
    return /druid/i.test(p.class) && /resto/i.test(p.spec);
  }
  function isPhysical(p) {
    return isMeleeDps(p) || isTank(p) || isHunter(p) || isFuryWarrior(p);
  }
  function isCaster(p) {
    return (
      isBoomkin(p) ||
      isShadowPriest(p) ||
      isEleShaman(p) ||
      isMage(p) ||
      isWarlock(p) ||
      (/priest/i.test(p.class) && !isHealer(p) && !isShadowPriest(p) && isRangedDps(p))
    );
  }

  function take(arr, n) {
    return arr.splice(0, Math.min(n, arr.length));
  }
  function fillGroup(target, pool, max) {
    max = max == null ? 5 : max;
    while (target.length < max && pool.length) target.push(pool.shift());
  }
  function byIlvl(a, b) {
    return (b.ilvl || 0) - (a.ilvl || 0);
  }
  function pullWhere(pool, pred, n) {
    const out = [];
    for (let i = 0; i < pool.length && out.length < (n || 1); ) {
      if (pred(pool[i])) out.push(pool.splice(i, 1)[0]);
      else i++;
    }
    return out;
  }

  /* ─── party buff matrix (TBC party-scoped) ─────────────────────── */

  /**
   * Buffs that only hit the 5-man party (not the full raid).
   * These drive grouping decisions.
   */
  const PARTY_BUFFS = [
    {
      id: 'wf',
      name: 'Windfury Totem',
      short: 'WF',
      for: 'physical',
      critical: true,
      has: (m) => m.some(canDropWindfury),
      best: (m) => m.some(isEnhShaman),
      note: 'Melee auto attacks — #1 physical DPS buff. Enh = Improved WF.',
    },
    {
      id: 'lotp',
      name: 'Leader of the Pack',
      short: 'LotP',
      for: 'physical',
      critical: true,
      has: (m) => m.some(isFeralCat) || m.some((p) => isTank(p) && /druid/i.test(p.class)),
      note: '+5% melee/ranged crit (Feral).',
    },
    {
      id: 'fi',
      name: 'Ferocious Inspiration',
      short: 'FI',
      for: 'physical',
      critical: false,
      has: (m) => m.some(isBMHunter),
      note: 'BM pet aura +3% damage to party.',
    },
    {
      id: 'shout',
      name: 'Battle Shout',
      short: 'BS',
      for: 'physical',
      critical: false,
      has: (m) => m.some(isWarrior),
      note: 'AP for party (warrior).',
    },
    {
      id: 'goa',
      name: 'Grace of Air / Strength of Earth',
      short: 'GoA/SoE',
      for: 'physical',
      critical: false,
      has: (m) => m.some(canDropWindfury),
      note: 'Shaman AP/Str totems (with WF).',
    },
    {
      id: 'moonkin',
      name: 'Moonkin Aura',
      short: 'Moonkin',
      for: 'caster',
      critical: true,
      has: (m) => m.some(isBoomkin),
      note: '+5% spell crit to party.',
    },
    {
      id: 'woa',
      name: 'Wrath of Air Totem',
      short: 'WoA',
      for: 'caster',
      critical: true,
      has: (m) => m.some(isEleShaman) || m.some(isRestoShaman) || m.some(isAnyShaman),
      note: 'Spell haste totem for casters.',
    },
    {
      id: 'mspring',
      name: 'Mana Spring Totem',
      short: 'Mana Spring',
      for: 'caster',
      critical: false,
      has: (m) => m.some(isAnyShaman),
      note: 'Party mana regen.',
    },
    {
      id: 'devotion',
      name: 'Devotion Aura',
      short: 'Devotion',
      for: 'tank',
      critical: false,
      has: (m) => m.some(isPaladin),
      note: 'Armor aura — tank survival.',
    },
    {
      id: 'concentration',
      name: 'Concentration Aura',
      short: 'Conc.',
      for: 'healer',
      critical: false,
      has: (m) => m.some(isHolyPaladin) || m.some(isPaladin),
      note: 'Pushback resist for healers.',
    },
    {
      id: 'retribution',
      name: 'Retribution / Sanctity Aura',
      short: 'Ret Aura',
      for: 'physical',
      critical: false,
      has: (m) => m.some(isRetPaladin),
      note: 'Ret paladin party auras.',
    },
  ];

  function analyzePartyBuffs(members, focus) {
    // focus: 'tank' | 'melee' | 'caster' | 'mixed' | 'healer'
    const relevant = PARTY_BUFFS.filter((b) => {
      if (focus === 'tank') return b.for === 'tank' || b.for === 'physical' || b.id === 'wf';
      if (focus === 'melee') return b.for === 'physical';
      if (focus === 'caster') return b.for === 'caster';
      if (focus === 'healer') return b.for === 'healer' || b.for === 'caster';
      return true;
    });

    const present = [];
    const missing = [];
    const nice = [];

    relevant.forEach((b) => {
      const ok = b.has(members);
      const entry = {
        id: b.id,
        name: b.name,
        short: b.short,
        critical: b.critical,
        note: b.note,
        upgraded: b.best ? b.best(members) : false,
      };
      if (ok) present.push(entry);
      else if (b.critical) missing.push(entry);
      else nice.push(entry); // optional missing
    });

    return { present, missing, optionalMissing: nice };
  }

  /* ─── group builder ────────────────────────────────────────────── */

  /**
   * Ideal role split for TBC content size (scales with how many you have).
   * Not fixed 4/7/6/8 — proportional to signed count.
   */
  function idealSplit(n) {
    n = Math.max(0, Number(n) || 0);
    if (n <= 0) return { tanks: 0, healers: 0, melee: 0, ranged: 0, size: 0, groups: 0 };
    // Soft targets by size band
    let tanks, healers;
    if (n <= 10) {
      tanks = Math.min(2, Math.max(1, Math.round(n * 0.15)));
      healers = Math.min(3, Math.max(2, Math.round(n * 0.25)));
    } else if (n <= 15) {
      tanks = 2;
      healers = Math.min(4, Math.max(3, Math.round(n * 0.22)));
    } else if (n <= 20) {
      tanks = 3;
      healers = Math.min(5, Math.max(4, Math.round(n * 0.24)));
    } else {
      // ~25-man
      tanks = Math.min(4, Math.max(3, Math.round(n * 0.14)));
      healers = Math.min(8, Math.max(5, Math.round(n * 0.26)));
    }
    const dps = Math.max(0, n - tanks - healers);
    // ~40% melee / 60% ranged among DPS (TBC caster heavy is fine)
    const melee = Math.round(dps * 0.42);
    const ranged = dps - melee;
    const groups = Math.min(5, Math.max(1, Math.ceil(n / 5)));
    return { tanks, healers, melee, ranged, size: n, groups };
  }

  /**
   * Adaptive TBC layout for whatever signed.
   * Scales 1–5 groups. Maximizes WF / Moonkin / LotP / FI with available specs.
   */
  function buildGroups(players) {
    const all = players.map(normalizePlayer).filter((p) => p.name);
    const ideal = idealSplit(all.length);
    const groupCount = ideal.groups || 1;
    const placed = new Set();
    const groups = [];
    for (let i = 0; i < groupCount; i++) groups.push([]);

    function key(p) {
      return String(p.name || '').toLowerCase();
    }
    function free(p) {
      return p && p.name && !placed.has(key(p));
    }
    function seat(gi, p) {
      if (gi < 0 || gi >= groups.length) return false;
      if (!free(p) || groups[gi].length >= 5) return false;
      groups[gi].push(p);
      placed.add(key(p));
      return true;
    }
    function seatFrom(gi, list, n) {
      let c = 0;
      const max = n == null ? 99 : n;
      for (let i = 0; i < list.length && c < max && gi < groups.length && groups[gi].length < 5; i++) {
        if (seat(gi, list[i])) c++;
      }
      return c;
    }
    function freeList(list) {
      return list.filter(free);
    }
    function emptiest() {
      let best = 0;
      for (let i = 1; i < groups.length; i++) {
        if (groups[i].length < groups[best].length) best = i;
      }
      return best;
    }

    const tanks = all.filter(isTank).sort(byIlvl);
    const healers = all.filter(isHealer).sort(byIlvl);
    const melee = all.filter(isMeleeDps).sort(byIlvl);
    const ranged = all.filter(isRangedDps).sort(byIlvl);

    const enhAll = all.filter(isEnhShaman).sort(byIlvl);
    const restoSham = healers.filter(isRestoShaman);
    const eleAll = ranged.filter(isEleShaman);
    const meleeNoSham = melee.filter((p) => !isEnhShaman(p));
    const ferals = meleeNoSham.filter(isFeralCat);
    const physicalMelee = meleeNoSham.filter((p) => !isFeralCat(p));

    const hunters = ranged.filter(isHunter);
    const bmHunters = hunters.filter(isBMHunter);
    const nonBmHunters = hunters.filter((p) => !isBMHunter(p));
    const boomkins = ranged.filter(isBoomkin);
    const shadows = ranged.filter(isShadowPriest);
    const locks = ranged.filter(isWarlock);
    const mages = ranged.filter(isMage);
    const otherRanged = ranged.filter(
      (p) =>
        !isHunter(p) &&
        !isBoomkin(p) &&
        !isShadowPriest(p) &&
        !isEleShaman(p) &&
        !isWarlock(p) &&
        !isMage(p)
    );

    const hPals = healers.filter(isHolyPaladin);
    const disc = healers.filter(isDiscPriest);
    const hPriest = healers.filter(isHolyPriest);
    const rDruid = healers.filter(isRestoDruid);
    const otherHeal = healers.filter(
      (h) =>
        !isRestoShaman(h) &&
        !isHolyPaladin(h) &&
        !isDiscPriest(h) &&
        !isHolyPriest(h) &&
        !isRestoDruid(h)
    );

    // How many melee WF stacks can we run? (each needs a shaman)
    const shamPool = freeList(enhAll).concat(freeList(restoSham)).concat(freeList(eleAll));
    const meleeNeed = physicalMelee.length + ferals.length + enhAll.length;
    const casterNeed = shadows.length + boomkins.length + mages.length + locks.length + eleAll.length;
    const dualMelee = groupCount >= 3 && meleeNeed >= 4 && shamPool.length >= 2;
    const wantCaster = groupCount >= 2 && casterNeed >= 2;
    const wantTank = tanks.length >= 1;

    // Dynamic labels / focuses by group index
    const labels = [];
    const notes = [];
    const focuses = [];
    for (let i = 0; i < groupCount; i++) {
      labels.push('G' + (i + 1));
      notes.push('');
      focuses.push('mixed');
    }

    let gi = 0;
    // Tank threat group first if we have tanks
    if (wantTank && gi < groupCount) {
      labels[gi] = 'G' + (gi + 1) + ' · Tank threat + WF';
      notes[gi] = 'Tanks + shaman WF for threat · tank healers';
      focuses[gi] = 'tank';
      seatFrom(gi, tanks, Math.min(3, tanks.length));
      if (freeList(restoSham).length) seat(gi, freeList(restoSham)[0]);
      else if (freeList(enhAll).length > (dualMelee ? 1 : 0)) seat(gi, freeList(enhAll)[0]);
      else if (freeList(eleAll).length && !wantCaster) seat(gi, freeList(eleAll)[0]);
      seatFrom(gi, hPals, 1);
      seatFrom(gi, disc, 1);
      seatFrom(gi, rDruid, 1);
      seatFrom(gi, hPriest, 1);
      seatFrom(gi, otherHeal, 1);
      seatFrom(gi, tanks);
      gi++;
    }

    // Melee WF #1 (Enh preferred)
    if (meleeNeed > 0 && gi < groupCount) {
      labels[gi] = 'G' + (gi + 1) + ' · Melee + WF';
      notes[gi] = 'Physical DPS stack · Windfury / LotP / FI';
      focuses[gi] = 'melee';
      if (freeList(enhAll).length) seat(gi, freeList(enhAll)[0]);
      else if (freeList(restoSham).length) seat(gi, freeList(restoSham)[0]);
      seatFrom(gi, ferals, 1);
      seatFrom(gi, bmHunters, 1);
      seatFrom(gi, physicalMelee);
      seatFrom(gi, ferals);
      gi++;
    }

    // Melee WF #2 if enough melee + shamans
    if (dualMelee && gi < groupCount && freeList(physicalMelee).concat(freeList(ferals)).length) {
      labels[gi] = 'G' + (gi + 1) + ' · Melee WF #2';
      notes[gi] = 'Second WF stack for remaining melee';
      focuses[gi] = 'melee';
      if (freeList(restoSham).length) seat(gi, freeList(restoSham)[0]);
      else if (freeList(enhAll).length) seat(gi, freeList(enhAll)[0]);
      else if (freeList(eleAll).length) seat(gi, freeList(eleAll)[0]);
      seatFrom(gi, physicalMelee);
      seatFrom(gi, ferals);
      gi++;
    }

    // Casters
    if (wantCaster && gi < groupCount) {
      labels[gi] = 'G' + (gi + 1) + ' · Casters';
      notes[gi] = 'Moonkin + Wrath of Air + SP · mages/locks';
      focuses[gi] = 'caster';
      seatFrom(gi, shadows);
      seatFrom(gi, boomkins);
      seatFrom(gi, eleAll);
      seatFrom(gi, mages);
      seatFrom(gi, locks);
      seatFrom(gi, otherRanged);
      if (groups[gi] && !groups[gi].some(isAnyShaman) && freeList(restoSham).length) {
        seat(gi, freeList(restoSham)[0]);
      }
      gi++;
    }

    // Remaining groups: hunters + healers + leftovers
    while (gi < groupCount) {
      labels[gi] = 'G' + (gi + 1) + ' · Support / Hunters';
      notes[gi] = 'Hunters · remaining healers · overflow';
      focuses[gi] = 'mixed';
      seatFrom(gi, nonBmHunters);
      seatFrom(gi, bmHunters);
      seatFrom(gi, hPriest);
      seatFrom(gi, hPals);
      seatFrom(gi, disc);
      seatFrom(gi, rDruid);
      seatFrom(gi, otherHeal);
      seatFrom(gi, restoSham);
      seatFrom(gi, otherRanged);
      seatFrom(gi, locks);
      seatFrom(gi, mages);
      seatFrom(gi, physicalMelee);
      gi++;
    }

    // Dump free into emptiest group under 5; expand only if still overflow and <5 groups
    const overflow = [];
    all.filter(free).forEach((p) => {
      const best = emptiest();
      if (!seat(best, p)) {
        if (groups.length < 5) {
          groups.push([]);
          labels.push('G' + groups.length + ' · Overflow');
          notes.push('Extra seats');
          focuses.push('mixed');
          seat(groups.length - 1, p);
        } else {
          overflow.push(p);
          placed.add(key(p));
        }
      }
    });

    // Drop empty groups at end (keep compact)
    const packed = [];
    groups.forEach((members, i) => {
      if (!members.length) return;
      packed.push({ members, label: labels[i], note: notes[i], focus: focuses[i] });
    });
    if (!packed.length && all.length) {
      packed.push({
        members: all.slice(0, 5),
        label: 'G1 · Raid',
        note: 'All available',
        focus: 'mixed',
      });
    }

    const groupList = packed.map((g, i) => {
      const seatMem = g.members.slice(0, 5);
      const buffs = analyzePartyBuffs(seatMem, g.focus || 'mixed');
      const activeNames = buffs.present.map((b) =>
        b.upgraded && b.id === 'wf' ? 'WF (Improved)' : b.short
      );
      const missNames = buffs.missing.map((b) => b.short);
      return {
        index: i + 1,
        label: g.label || 'G' + (i + 1),
        note: g.note || '',
        focus: g.focus || 'mixed',
        members: seatMem,
        buffs: activeNames,
        buffDetail: buffs,
        missing: missNames,
        hasWF: seatMem.some(canDropWindfury),
        hasImprovedWF: seatMem.some(isEnhShaman),
      };
    });
    return { groups: groupList, overflow, ideal };
  }

  /** Per-raid advice (BT / Hyjal) using current counts */
  function raidAdvice(counts) {
    const out = [];
    const n = counts.total || 0;
    // Black Temple
    out.push({
      raid: 'Black Temple',
      id: 'bt',
      lines: [
        counts.tanks >= 3
          ? 'Tanks OK for Mother / Council / Illidan (3+).'
          : 'BT wants 3–4 tanks (Mother beams, Council, Illidan). You have ' + counts.tanks + '.',
        counts.healers >= 5
          ? 'Healing depth OK for BT raid damage.'
          : 'BT is healer-heavy (RoS, Mother, Illidan). You have ' + counts.healers + ' — stack heals.',
        counts.melee + counts.ranged >= 10
          ? 'DPS count fine for BT burn phases.'
          : 'Low DPS for BT — expect longer enrages; tighten comp.',
        counts.shamans > 0
          ? 'Lust available for Illidan / Council burns.'
          : 'No shamans — no Bloodlust for BT burns.',
      ],
    });
    // Hyjal
    out.push({
      raid: 'Mount Hyjal',
      id: 'hyjal',
      lines: [
        counts.tanks >= 2
          ? 'Tanks OK for Hyjal (2–3).'
          : 'Hyjal needs 2+ tanks (Anetheron infernals). You have ' + counts.tanks + '.',
        counts.ranged >= 4
          ? 'Ranged OK for kiting / spread fights.'
          : 'Hyjal loves hunters/ranged (Supremus-style kiting, Archi). Only ' + counts.ranged + ' ranged.',
        counts.healers >= 4
          ? 'Heals OK for Hyjal waves / Archi.'
          : 'Hyjal wave damage — bring more healers if possible (' + counts.healers + ' now).',
        n >= 20
          ? 'Size OK for 25-man Hyjal.'
          : n >= 10
            ? 'Smaller raid (' + n + ') — still works; stack essential buffs.'
            : 'Very small roster — fill more signups before Hyjal.',
      ],
    });
    return out;
  }

  /* ─── blessings ────────────────────────────────────────────────── */

  function assignBlessings(players) {
    const all = players.map(normalizePlayer).filter((p) => p.name);
    const paladins = all.filter(isPaladin);
    const tanks = all.filter(isTank);
    const healers = all.filter(isHealer);
    const meleeDps = all.filter((p) => isMeleeDps(p) && !isTank(p));
    const physical = all.filter((p) => isMeleeDps(p) || isTank(p) || isHunter(p));
    const casters = all.filter(
      (p) =>
        isHealer(p) ||
        isBoomkin(p) ||
        isShadowPriest(p) ||
        isEleShaman(p) ||
        isMage(p) ||
        isWarlock(p) ||
        (isRangedDps(p) && !isHunter(p))
    );

    const holy = paladins.filter(isHolyPaladin);
    const ret = paladins.filter(isRetPaladin);
    const prot = paladins.filter(isProtPaladin);
    const otherPals = paladins.filter(
      (p) => !holy.includes(p) && !ret.includes(p) && !prot.includes(p)
    );
    const queue = [].concat(holy, prot, ret, otherPals);
    const used = new Set();
    const assignments = [];

    function nextPal() {
      return queue.find((p) => !used.has(p.name));
    }
    function assign(blessing, who, targets, why) {
      if (!who || !targets.length) return null;
      used.add(who.name);
      assignments.push({
        paladin: who.name,
        class: who.class,
        spec: who.spec,
        blessing,
        targets: targets.map((t) => t.name),
        targetSummary: summarizeTargets(targets),
        why,
      });
      return who;
    }

    // Priority order for limited pals:
    // 1) Kings (everyone) if few pals
    // 2) Sanctuary tanks
    // 3) Might physical
    // 4) Salvation melee DPS (threat)
    // 5) Wisdom casters
    // 6) Light healers

    if (paladins.length <= 2) {
      // Scarcity mode: Kings + Might (or Sanctuary if progression tanks need it)
      const kingsP = nextPal();
      assign('Greater Blessing of Kings', kingsP, all, '+10% stats — best single blessing when short on pals');
      const mightP = nextPal();
      assign(
        'Greater Blessing of Might',
        mightP,
        physical,
        'AP for tanks/melee/hunters — physical DPS + tank threat'
      );
    } else {
      // Full coverage
      const sanctP = prot[0] || holy[0] || nextPal();
      if (sanctP && tanks.length) {
        assign(
          'Greater Blessing of Sanctuary',
          sanctP,
          tanks,
          'Tank mitigation + block value. NEVER Salvation on tanks.'
        );
      }

      const mightP =
        ret.find((p) => !used.has(p.name)) || nextPal();
      assign(
        'Greater Blessing of Might',
        mightP,
        physical,
        'AP — melee DPS, hunters, and tank threat'
      );

      const kingsP = nextPal();
      assign('Greater Blessing of Kings', kingsP, all, '+10% all stats — raid-wide value');

      // Salvation before Wisdom: threat control enables full melee DPS
      const salvP = nextPal();
      assign(
        'Greater Blessing of Salvation',
        salvP,
        meleeDps,
        '−30% threat on melee DPS only — keep tanks above them (never on tanks)'
      );

      const wisP = nextPal();
      assign(
        'Greater Blessing of Wisdom',
        wisP,
        casters,
        'Mana regen for healers & casters'
      );

      const lightP = nextPal();
      if (healers.length) {
        assign(
          'Greater Blessing of Light',
          lightP,
          healers,
          'Bonus healing received (optional 5th+ paladin)'
        );
      }
    }

    const notes = [];
    if (paladins.length === 0) {
      notes.push('No paladins — no Greater Blessings. Use flasks/scrolls/food.');
    } else if (paladins.length < 3) {
      notes.push(
        `Only ${paladins.length} paladin(s): Kings + Might first. Add Sanctuary on hard tank fights.`
      );
    } else {
      notes.push(`${paladins.length} paladins — full blessing set available.`);
    }
    notes.push('Tanks: Sanctuary or Kings — never Salvation (kills threat).');
    notes.push('Melee DPS: Salvation + Might (or Kings). Rebuff after wipes · PallyPower helps.');
    notes.push('Hunters: Might (AP) not Wisdom.');

    const perPlayer = {};
    all.forEach((p) => {
      perPlayer[p.name] = [];
    });
    assignments.forEach((a) => {
      a.targets.forEach((t) => {
        if (perPlayer[t]) perPlayer[t].push(shortBlessing(a.blessing));
      });
    });

    return {
      paladins: paladins.map((p) => ({ name: p.name, spec: p.spec, role: p.role })),
      assignments,
      perPlayer,
      notes,
    };
  }

  function shortBlessing(b) {
    if (/Sanctuary/i.test(b)) return 'Sanctuary';
    if (/Might/i.test(b)) return 'Might';
    if (/Kings/i.test(b)) return 'Kings';
    if (/Wisdom/i.test(b)) return 'Wisdom';
    if (/Salvation/i.test(b)) return 'Salvation';
    if (/Light/i.test(b)) return 'Light';
    return b;
  }

  function summarizeTargets(targets) {
    const roles = {};
    targets.forEach((t) => {
      const r = t.role || 'Other';
      roles[r] = (roles[r] || 0) + 1;
    });
    return Object.keys(roles)
      .map((r) => `${r}×${roles[r]}`)
      .join(', ');
  }

  /* ─── utility + threat ─────────────────────────────────────────── */

  function utilityAssignments(players) {
    const all = players.map(normalizePlayer);
    const out = [];

    const locks = all.filter(isWarlock);
    if (locks.length) {
      out.push({
        title: 'Soulstones',
        detail: locks.map((l) => l.name).join(', '),
        why: 'Pre-stone healers / raid lead before pull',
      });
      out.push({
        title: 'Curses (raid debuffs)',
        detail: locks.map((l) => l.name).join(', '),
        why: 'CoE (casters) · CoR (physical) · CoS (misc) — assign one lock per curse',
      });
    }

    const shamans = all.filter(isAnyShaman);
    if (shamans.length) {
      out.push({
        title: 'Bloodlust / Heroism',
        detail: shamans.map((s) => `${s.name} (${s.spec || 'Shaman'})`).join(', '),
        why: 'Raid-wide — one lust window on burn; do not chain-waste',
      });
      out.push({
        title: 'Windfury providers',
        detail: shamans.map((s) => {
          const tag = isEnhShaman(s) ? 'Improved WF' : 'WF';
          return `${s.name} [${tag}]`;
        }).join(', '),
        why: 'Each melee party needs its own WF totem (party-only)',
      });
    }

    const hunters = all.filter(isHunter);
    if (hunters.length) {
      out.push({
        title: 'Misdirect → tanks',
        detail: hunters.map((h) => h.name).join(', '),
        why: 'MD pulls build tank threat free — critical for squishy openers',
      });
      out.push({
        title: 'Tranquilizing Shot',
        detail: hunters.map((h) => h.name).join(', '),
        why: 'Enrage dispels (e.g. some BT/Hyjal bosses)',
      });
    }

    if (all.some(isShadowPriest)) {
      out.push({
        title: 'Shadow Priest (Misery / Weaving)',
        detail: all.filter(isShadowPriest).map((p) => p.name).join(', '),
        why: 'Boss debuffs are raid-wide; still stack SP with casters for mana return',
      });
    }

    if (all.some(isBoomkin)) {
      out.push({
        title: 'Moonkin Aura',
        detail: all.filter(isBoomkin).map((p) => p.name).join(', '),
        why: 'Party-only +5% spell crit — keep boomkin in caster group',
      });
    }

    if (all.some(isFeralCat) || all.some((p) => isTank(p) && /druid/i.test(p.class))) {
      const ferals = all.filter(
        (p) => isFeralCat(p) || (isTank(p) && /druid/i.test(p.class))
      );
      out.push({
        title: 'Leader of the Pack',
        detail: ferals.map((p) => p.name).join(', '),
        why: 'Party-only +5% crit — seat with top physical group',
      });
    }

    // Tank threat package
    const tanks = all.filter(isTank);
    if (tanks.length) {
      out.push({
        title: 'Tank threat package',
        detail: tanks.map((t) => `${t.name} (${t.spec || t.class})`).join(', '),
        why:
          'WF on tank group · Sanctuary/Kings (never Salv) · MD from hunters · ' +
          'Sunder/Demo/ThunderClap · wait 2–3 s before full DPS on pull',
      });
    }

    const warriors = all.filter(isWarrior);
    if (warriors.length) {
      out.push({
        title: 'Shouts / Sunder',
        detail: warriors.map((w) => w.name).join(', '),
        why: 'Battle Shout in melee parties · Commanding on tanks · Sunder uptime = raid DPS',
      });
    }

    return out;
  }

  /* ─── raid-wide coverage scorecard ─────────────────────────────── */

  function coverageReport(players, groups) {
    const all = players.map(normalizePlayer);
    const items = [];

    const shamans = all.filter(isAnyShaman);
    const enh = all.filter(isEnhShaman);
    const wfGroups = (groups || []).filter((g) => g.hasWF).length;
    const meleeGroups = (groups || []).filter((g) => g.focus === 'melee');
    const meleeWithWf = meleeGroups.filter((g) => g.hasWF).length;

    items.push({
      id: 'wf',
      label: 'Windfury coverage',
      ok: shamans.length > 0,
      detail:
        shamans.length === 0
          ? 'No shamans — melee lose huge DPS & tanks lose threat'
          : `${shamans.length} shaman(s), ${enh.length} Enh · ${wfGroups} group(s) with WF` +
            (meleeGroups.length && meleeWithWf < meleeGroups.length
              ? ` · ⚠ ${meleeGroups.length - meleeWithWf} melee group(s) without WF`
              : ''),
      level: shamans.length === 0 ? 'bad' : meleeWithWf >= 2 || meleeGroups.length <= 1 ? 'good' : 'warn',
    });

    items.push({
      id: 'dualwf',
      label: 'Dual WF melee stacks',
      ok: meleeWithWf >= 2,
      detail:
        meleeWithWf >= 2
          ? 'Two melee parties have WF — strong physical setup'
          : meleeWithWf === 1
            ? 'Only one WF melee group — move a resto/enh sham into G3 if possible'
            : 'No melee WF group',
      level: meleeWithWf >= 2 ? 'good' : meleeWithWf === 1 ? 'warn' : 'bad',
    });

    items.push({
      id: 'tankwf',
      label: 'Tank group WF (threat)',
      ok: groups[0] && groups[0].hasWF,
      detail: groups[0] && groups[0].hasWF
        ? 'G1 has shaman — tanks get WF for threat'
        : 'G1 has no shaman — tank threat will suffer on openers',
      level: groups[0] && groups[0].hasWF ? 'good' : 'warn',
    });

    items.push({
      id: 'lotp',
      label: 'Leader of the Pack',
      ok: all.some(isFeralCat) || all.some((p) => isTank(p) && /druid/i.test(p.class)),
      detail: all.some(isFeralCat) || all.some((p) => isTank(p) && /druid/i.test(p.class))
        ? 'Feral present — seat with top physical for +5% crit'
        : 'No feral — missing party melee/ranged crit',
      level:
        all.some(isFeralCat) || all.some((p) => isTank(p) && /druid/i.test(p.class))
          ? 'good'
          : 'warn',
    });

    items.push({
      id: 'moonkin',
      label: 'Moonkin Aura',
      ok: all.some(isBoomkin),
      detail: all.some(isBoomkin)
        ? 'Boomkin in raid — keep in caster group'
        : 'No boomkin — casters miss +5% spell crit party aura',
      level: all.some(isBoomkin) ? 'good' : 'warn',
    });

    items.push({
      id: 'sp',
      label: 'Shadow Priest',
      ok: all.some(isShadowPriest),
      detail: all.some(isShadowPriest)
        ? 'Misery / Shadow Weaving on boss'
        : 'No SP — weaker caster debuffs & mana return',
      level: all.some(isShadowPriest) ? 'good' : 'warn',
    });

    items.push({
      id: 'pals',
      label: 'Paladin blessings',
      ok: all.filter(isPaladin).length >= 3,
      detail: `${all.filter(isPaladin).length} paladin(s) — ${
        all.filter(isPaladin).length >= 3
          ? 'full Kings/Might/Wisdom/Salv/Sanctuary possible'
          : all.filter(isPaladin).length === 0
            ? 'none signed'
            : 'prioritize Kings + Might'
      }`,
      level:
        all.filter(isPaladin).length >= 3
          ? 'good'
          : all.filter(isPaladin).length === 0
            ? 'bad'
            : 'warn',
    });

    items.push({
      id: 'lust',
      label: 'Bloodlust / Heroism',
      ok: shamans.length > 0,
      detail: shamans.length
        ? `${shamans.length} lust available (raid-wide)`
        : 'No lust',
      level: shamans.length ? 'good' : 'bad',
    });

    items.push({
      id: 'hunter',
      label: 'Hunters (MD / Trueshot / Tranq)',
      ok: all.some(isHunter),
      detail: all.some(isHunter)
        ? `${all.filter(isHunter).length} hunter(s) — MD pulls for tank threat`
        : 'No hunters — harder pulls, no Trueshot',
      level: all.some(isHunter) ? 'good' : 'warn',
    });

    return items;
  }

  /* ─── analyze entry ────────────────────────────────────────────── */

  function analyze(players) {
    const list = (players || []).map(normalizePlayer).filter((p) => p.name);
    const seen = new Set();
    const unique = list.filter((p) => {
      const k = p.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const built = buildGroups(unique);
    const groupList = built.groups || built;
    const overflow = built.overflow || [];
    const ideal = built.ideal || idealSplit(unique.length);

    const blessings = assignBlessings(unique);
    const utility = utilityAssignments(unique);
    const coverage = coverageReport(unique, groupList);

    const counts = {
      total: unique.length,
      tanks: unique.filter(isTank).length,
      healers: unique.filter(isHealer).length,
      melee: unique.filter(isMeleeDps).length,
      ranged: unique.filter(isRangedDps).length,
      paladins: unique.filter(isPaladin).length,
      shamans: unique.filter(isAnyShaman).length,
      enh: unique.filter(isEnhShaman).length,
      groups: groupList.length,
    };

    // Compare actual vs ideal for this signup size
    const delta = {
      tanks: counts.tanks - ideal.tanks,
      healers: counts.healers - ideal.healers,
      melee: counts.melee - ideal.melee,
      ranged: counts.ranged - ideal.ranged,
    };

    const tips = [];
    tips.push(
      'Using ' +
        counts.total +
        ' signed · ' +
        counts.groups +
        ' groups · ideal ~' +
        ideal.tanks +
        'T / ' +
        ideal.healers +
        'H / ' +
        ideal.melee +
        'M / ' +
        ideal.ranged +
        'R for this size'
    );
    if (counts.total < 8) tips.push('Very small roster — fill more RH signups when you can.');
    if (counts.enh === 0 && counts.shamans === 0)
      tips.push('No shaman: melee lose Windfury (huge physical DPS + tank threat loss).');
    else if (counts.enh === 0 && counts.shamans > 0)
      tips.push('No Enh: resto/ele still drop WF — seat shamans with melee/tanks.');
    if (counts.shamans >= 2 && counts.melee >= 4)
      tips.push('2+ shamans + melee: dual WF stacks for max physical.');
    if (delta.tanks < 0) tips.push('Short ' + -delta.tanks + ' tank(s) vs ideal for ' + counts.total + '-man.');
    if (delta.healers < 0)
      tips.push('Short ' + -delta.healers + ' healer(s) vs ideal — tough on BT Mother / Illidan / Hyjal Archi.');
    if (delta.tanks > 1) tips.push('Extra tanks — park OT in melee WF group or special assigns.');
    if (counts.paladins === 0) tips.push('No paladins: no Greater Blessings / auras.');
    if (!unique.some(isBoomkin) && counts.ranged >= 3)
      tips.push('No boomkin: casters miss Moonkin Aura — stack casters with Ele sham for WoA.');
    if (!unique.some(isFeralCat) && !unique.some((p) => isTank(p) && /druid/i.test(p.class)))
      tips.push('No feral: missing Leader of the Pack (+5% crit) for physical.');
    if (overflow.length)
      tips.push(
        'Overflow: ' + overflow.map((p) => p.name).join(', ') + ' — over 25 or unseated.'
      );

    const raids = raidAdvice(counts);

    return {
      counts,
      ideal,
      delta,
      groups: groupList,
      overflow,
      blessings,
      utility,
      coverage,
      tips,
      raids,
      generatedAt: new Date().toISOString(),
    };
  }

  function isSoftRh(s) {
    if (!s) return true;
    if (s.isSoft || s.isAbsence || s.isTentative || s.isLate || s.isBench) return true;
    if (window.RaidHelper && RaidHelper.isSoftStatus) {
      return RaidHelper.isSoftStatus(s.role, s.class, s.status);
    }
    const r = String(s.role || '');
    const c = String(s.class || '');
    return /absence|tentative|late|bench/i.test(r + ' ' + c);
  }

  function pickName(raw, info) {
    if (info && info.displayName) return info.displayName;
    if (window.RaidHelper && RaidHelper.pickMainName) {
      return RaidHelper.pickMainName(raw, info && info.preferredName);
    }
    const parts = String(raw || '')
      .split(/[/\\|]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    return parts[0] || String(raw || '').trim();
  }

  /**
   * Build player list for comp/bosses.
   * Prefer playerInfo (already RH-synced). Full dual names as displayName.
   * Optional squadKeys filter (lowercase keys) for the active 25.
   */
  function fromAppState(playerInfo, rhEvents, squadKeys) {
    const map = {};
    const pi = playerInfo || {};
    const squad =
      squadKeys && squadKeys.length
        ? new Set(squadKeys.map((k) => String(k).toLowerCase()))
        : null;

    function add(key, rec) {
      const k = String(key).toLowerCase();
      if (squad && !squad.has(k)) {
        // also allow match by display main
        const main = pickName(rec.displayName || k).toLowerCase();
        if (!squad.has(main) && !squad.has(String(rec.displayName || '').toLowerCase()))
          return;
      }
      if (map[k]) return;
      map[k] = rec;
    }

    Object.keys(pi).forEach((k) => {
      const info = pi[k] || {};
      if (info.fromRh === false && !info.class && !info.rhRole && !info.lastRhImport)
        return;
      if (isSoftRh({ role: info.rhRole, class: info.class, status: info.rhStatus }))
        return;
      const display =
        info.displayName || info.rhName || pickName(k, info) || k;
      add(k, {
        displayName: display,
        class: info.class,
        spec: info.spec,
        rhRole: info.rhRole,
        ilvl: info.ilvl,
      });
    });

    // Merge any RH primaries missing from playerInfo
    const ev = rhEvents && rhEvents[0];
    if (ev && Array.isArray(ev.list)) {
      ev.list.forEach((s) => {
        if (!s || !s.name || isSoftRh(s)) return;
        if (s.isPrimary === false) return;
        const main = pickName(s.name).toLowerCase();
        if (map[main]) return;
        const info = pi[main] || {};
        add(main, {
          displayName: info.displayName || s.name,
          class: info.class || s.class || '',
          spec: (info.spec || s.spec || '').toString().replace(/(\d+)$/, ''),
          rhRole: info.rhRole || s.role || '',
          ilvl: info.ilvl,
        });
      });
    }

    return Object.values(map);
  }

  /**
   * Apply admin manual seats: { "playername": groupIndex 0-4 }
   * Unlisted players keep auto placement from analyze().
   */
  function applyManualSeats(result, seatsByName) {
    if (!result || !result.groups) return result;
    const seats = seatsByName || {};
    const all = [];
    result.groups.forEach((g) => g.members.forEach((m) => all.push(m)));
    if (result.overflow) result.overflow.forEach((m) => all.push(m));

    const byName = {};
    all.forEach((p) => {
      byName[String(p.name || '').toLowerCase()] = p;
    });

    const buckets = [[], [], [], [], []];
    const placed = new Set();

    Object.keys(seats).forEach((name) => {
      const gi = Number(seats[name]);
      if (gi < 0 || gi > 4) return;
      const p = byName[String(name).toLowerCase()];
      if (!p || placed.has(p.name.toLowerCase())) return;
      if (buckets[gi].length >= 5) return;
      buckets[gi].push(p);
      placed.add(p.name.toLowerCase());
    });

    // Keep remaining in original relative groups if possible
    result.groups.forEach((g, gi) => {
      g.members.forEach((p) => {
        const k = p.name.toLowerCase();
        if (placed.has(k)) return;
        // if seats forced this name elsewhere, skip
        if (seats[k] != null && Number(seats[k]) !== gi) return;
        if (buckets[gi].length < 5) {
          buckets[gi].push(p);
          placed.add(k);
        }
      });
    });

    // leftover → emptiest
    all.forEach((p) => {
      const k = p.name.toLowerCase();
      if (placed.has(k)) return;
      let best = 0;
      for (let i = 1; i < 5; i++) if (buckets[i].length < buckets[best].length) best = i;
      if (buckets[best].length < 5) {
        buckets[best].push(p);
        placed.add(k);
      }
    });

    const focuses = ['tank', 'melee', 'melee', 'caster', 'mixed'];
    const labels = result.groups.map((g) => g.label);
    const notes = result.groups.map((g) => g.note);

    result.groups = buckets.map((members, i) => {
      const buffs = analyzePartyBuffs(members, focuses[i] || 'mixed');
      return {
        index: i + 1,
        label: labels[i] || 'G' + (i + 1),
        note: notes[i] || '',
        focus: focuses[i] || 'mixed',
        members,
        buffs: buffs.present.map((b) =>
          b.upgraded && b.id === 'wf' ? 'WF (Improved)' : b.short
        ),
        buffDetail: buffs,
        missing: buffs.missing.map((b) => b.short),
        hasWF: members.some(canDropWindfury),
        hasImprovedWF: members.some(isEnhShaman),
      };
    });
    result.manual = true;
    result.counts = Object.assign({}, result.counts, {
      total: result.groups.reduce((n, g) => n + g.members.length, 0),
    });
    return result;
  }

  /** Snapshot seats from groups → { nameLower: groupIndex } */
  function seatsFromGroups(groups) {
    const seats = {};
    (groups || []).forEach((g, gi) => {
      (g.members || []).forEach((m) => {
        if (m && m.name) seats[String(m.name).toLowerCase()] = gi;
      });
    });
    return seats;
  }

  global.RaidComp = {
    analyze,
    fromAppState,
    buildGroups,
    assignBlessings,
    normalizePlayer,
    PARTY_BUFFS,
    coverageReport,
    applyManualSeats,
    seatsFromGroups,
    analyzePartyBuffs,
    idealSplit,
    raidAdvice,
  };
})(typeof window !== 'undefined' ? window : globalThis);
