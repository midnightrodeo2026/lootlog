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
   * Standard progressive TBC layout:
   *  G1 Tank threat  — tanks + WF shaman + tank healers (WF = tank threat)
   *  G2 WF Melee A   — best melee + Enh (Improved WF) + BM FI / LotP if free
   *  G3 WF Melee B   — remaining melee + 2nd shaman (resto/enh) for dual WF
   *  G4 Casters      — SP, boomkin, mages, locks, ele (Moonkin + WoA)
   *  G5 Hunters/Heal — hunters + leftover healers / utility
   */
  function buildGroups(players) {
    const all = players.map(normalizePlayer).filter((p) => p.name);
    const placed = new Set();
    const groups = [[], [], [], [], []];

    function key(p) {
      return String(p.name || '').toLowerCase();
    }
    function free(p) {
      return p && p.name && !placed.has(key(p));
    }
    /** Seat player into group gi if free and under 5 */
    function seat(gi, p) {
      if (!free(p) || groups[gi].length >= 5) return false;
      groups[gi].push(p);
      placed.add(key(p));
      return true;
    }
    /** Seat up to n matches from list into group */
    function seatFrom(gi, list, n) {
      let c = 0;
      const max = n == null ? 99 : n;
      for (let i = 0; i < list.length && c < max && groups[gi].length < 5; i++) {
        if (seat(gi, list[i])) c++;
      }
      return c;
    }
    function freeList(list) {
      return list.filter(free);
    }

    const tanks = all.filter(isTank).sort(byIlvl);
    const healers = all.filter(isHealer).sort(byIlvl);
    const melee = all.filter(isMeleeDps).sort(byIlvl);
    const ranged = all.filter(isRangedDps).sort(byIlvl);
    const rest = all.filter(
      (p) => !isTank(p) && !isHealer(p) && !isMeleeDps(p) && !isRangedDps(p)
    );

    const enhAll = all.filter(isEnhShaman).sort(byIlvl);
    const restoSham = healers.filter(isRestoShaman);
    const eleAll = ranged.filter(isEleShaman);
    const meleeNoSham = melee.filter((p) => !isEnhShaman(p));
    const ferals = meleeNoSham.filter(isFeralCat);
    const physicalMelee = meleeNoSham.filter((p) => !isFeralCat(p)); // warriors, rogues, ret

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

    const labels = [
      'G1 · Tank threat + WF',
      'G2 · Melee WF (Enh)',
      'G3 · Melee WF #2',
      'G4 · Casters',
      'G5 · Hunters / Healers',
    ];
    const notes = [
      'Tanks get Windfury for threat. Sanctuary · Devotion · tank healers.',
      'Best melee + Enhancement (Improved WF). LotP / BM FI if available.',
      'Overflow melee + 2nd shaman (resto) so two WF groups. Salv on DPS.',
      'SPriest · Boomkin · Ele · mages/locks. Moonkin + Wrath of Air.',
      'Hunters (Trueshot is raid-wide). Remaining healers & utility.',
    ];
    const focuses = ['tank', 'melee', 'melee', 'caster', 'mixed'];

    // ── G1: Tanks + WF shaman + tank healers ──
    seatFrom(0, tanks, 3);
    // Prefer resto sham for tank WF (keep Enh for melee DPS group)
    if (freeList(restoSham).length) seat(0, freeList(restoSham)[0]);
    else if (freeList(enhAll).length > 1) seat(0, freeList(enhAll)[0]);
    else if (freeList(enhAll).length === 1 && freeList(physicalMelee).length < 3) {
      seat(0, freeList(enhAll)[0]);
    }
    seatFrom(0, hPals);
    seatFrom(0, disc);
    seatFrom(0, rDruid);
    seatFrom(0, hPriest);
    seatFrom(0, otherHeal);
    seatFrom(0, tanks);

    // ── G2: Top melee + Enh WF ──
    seatFrom(1, enhAll, 1);
    seatFrom(1, ferals, 1); // LotP
    seatFrom(1, bmHunters, 1); // Ferocious Inspiration
    seatFrom(1, physicalMelee);
    seatFrom(1, ferals);

    // ── G3: Second WF melee ──
    if (freeList(restoSham).length) seat(2, freeList(restoSham)[0]);
    else if (freeList(enhAll).length) seat(2, freeList(enhAll)[0]);
    seatFrom(2, physicalMelee);
    seatFrom(2, ferals);
    seatFrom(2, tanks);
    seatFrom(2, enhAll);

    // ── G4: Casters ──
    seatFrom(3, shadows);
    seatFrom(3, boomkins);
    seatFrom(3, eleAll);
    seatFrom(3, mages);
    seatFrom(3, locks);
    seatFrom(3, otherRanged);
    // Wrath of Air if no sham yet
    if (groups[3].length < 5 && !groups[3].some(isAnyShaman) && freeList(restoSham).length) {
      seat(3, freeList(restoSham)[0]);
    }

    // ── G5: Hunters + remaining healers ──
    seatFrom(4, nonBmHunters);
    seatFrom(4, bmHunters);
    seatFrom(4, hPriest);
    seatFrom(4, hPals);
    seatFrom(4, disc);
    seatFrom(4, rDruid);
    seatFrom(4, otherHeal);
    seatFrom(4, restoSham);
    seatFrom(4, otherRanged);
    seatFrom(4, locks);
    seatFrom(4, mages);

    // Dump anyone still free into emptiest group
    const overflow = [];
    all.filter(free).forEach((p) => {
      let best = 0;
      for (let i = 1; i < 5; i++) if (groups[i].length < groups[best].length) best = i;
      if (!seat(best, p)) {
        for (let i = 0; i < 5; i++) {
          if (seat(i, p)) return;
        }
        overflow.push(p);
        placed.add(key(p));
      }
    });

    const groupList = groups.map((members, i) => {
      const seatMem = members.slice(0, 5);
      const buffs = analyzePartyBuffs(seatMem, focuses[i]);
      const activeNames = buffs.present.map((b) =>
        b.upgraded && b.id === 'wf' ? 'WF (Improved)' : b.short
      );
      const missNames = buffs.missing.map((b) => b.short);
      return {
        index: i + 1,
        label: labels[i],
        note: notes[i],
        focus: focuses[i],
        members: seatMem,
        buffs: activeNames,
        buffDetail: buffs,
        missing: missNames,
        hasWF: seatMem.some(canDropWindfury),
        hasImprovedWF: seatMem.some(isEnhShaman),
      };
    });
    return { groups: groupList, overflow };
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
    };

    const tips = [];
    if (counts.total < 10) tips.push('Few raiders — import Raid-Helper first.');
    if (counts.enh === 0 && counts.shamans === 0)
      tips.push('No shaman: melee lose Windfury (huge physical DPS + tank threat loss).');
    else if (counts.enh === 0)
      tips.push('No Enh shaman: only base WF from resto/ele — still put shamans in melee parties.');
    if (counts.shamans >= 2)
      tips.push('2+ shamans: run dual WF melee groups (G2 + G3) for max physical.');
    if (counts.tanks < 2) tips.push('Under 2 tanks signed.');
    if (counts.healers < 4 && counts.total >= 20) tips.push('Low healers for 25-man.');
    if (counts.paladins === 0) tips.push('No paladins: no Greater Blessings / auras.');
    if (!unique.some(isBoomkin)) tips.push('No boomkin: casters miss Moonkin Aura in party.');
    if (!unique.some(isFeralCat) && !unique.some((p) => isTank(p) && /druid/i.test(p.class)))
      tips.push('No feral: missing Leader of the Pack (+5% crit) for physical groups.');
    if (overflow.length)
      tips.push(
        'Overflow (>' + 25 + '): ' + overflow.map((p) => p.name).join(', ') + ' — bench or swap in.'
      );
    tips.push(
      'Tanks: WF group + Sanctuary/Kings, never Salvation. Hunters MD on pull. Melee Salv + wait threat.'
    );

    return {
      counts,
      groups: groupList,
      overflow,
      blessings,
      utility,
      coverage,
      tips,
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
   * Build player list for comp.
   * Prefer RH primary signed (≈25); fall back to playerInfo.
   * Dual RH names collapse to one display name.
   */
  function fromAppState(playerInfo, rhEvents) {
    const map = {};
    const pi = playerInfo || {};

    // Prefer latest RH event primary seats
    const ev = rhEvents && rhEvents[0];
    if (ev && Array.isArray(ev.list) && ev.list.length) {
      ev.list.forEach((s) => {
        if (!s || !s.name || isSoftRh(s)) return;
        if (s.isPrimary === false) return;
        const info =
          pi[pickName(s.name).toLowerCase()] ||
          pi[String(s.name).toLowerCase()] ||
          {};
        const display = pickName(s.name, info);
        const key = display.toLowerCase();
        if (map[key]) return;
        map[key] = {
          displayName: display,
          class: info.class || s.class || '',
          spec: (info.spec || s.spec || '').toString().replace(/(\d+)$/, ''),
          rhRole: info.rhRole || s.role || '',
          ilvl: info.ilvl,
        };
      });
      if (Object.keys(map).length) return Object.values(map);
    }

    // Fallback: playerInfo only (dedupe duals)
    Object.keys(pi).forEach((k) => {
      const info = pi[k] || {};
      if (info.fromRh === false && !info.class && !info.rhRole) return;
      const name = info.displayName || pickName(info.rhName || k, info);
      const key = name.toLowerCase();
      if (map[key]) return;
      // skip soft roles stored by mistake
      if (isSoftRh({ role: info.rhRole, class: info.class, status: info.rhStatus })) return;
      map[key] = {
        displayName: name,
        class: info.class,
        spec: info.spec,
        rhRole: info.rhRole,
        ilvl: info.ilvl,
      };
    });
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
  };
})(typeof window !== 'undefined' ? window : globalThis);
