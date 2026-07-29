/**
 * Midnight Rodeo — TBC Classic raid composition optimizer
 * Groups for max buffs / DPS and assigns Paladin blessings.
 *
 * 25-man: 5 groups × 5. Priorities (TBC):
 * - WF melee stack (Enh Shaman + melee)
 * - Melee lust/heroism group with shaman
 * - Caster stack (shadow priest, boomkin, ele, spriest)
 * - Hunter group with Trueshot
 * - Tank group with Sanctuary / mitigation
 * - Blessings: Might, Kings, Wisdom, Salvation, Light, Sanctuary
 */
(function (global) {
  const ROLE_ORDER = { Tanks: 0, Healers: 1, Melee: 2, Ranged: 3, Other: 4 };

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
    if (/prot|guardian|protection/.test(s) || (c === 'warrior' && /prot/.test(s))) return 'Tanks';
    if (/holy|disc|resto|restoration/.test(s)) return 'Healers';
    if (
      /fury|arms|ret|combat|assassin|enhance|cat|feral|survival|marks|bm|beast/.test(s) ||
      (c === 'rogue' || c === 'warrior' || c === 'hunter' || c === 'paladin')
    ) {
      if (c === 'hunter' || /balance|shadow|affliction|destruction|demo|arcane|fire|frost|elemental|spriest/.test(s))
        return /balance|shadow|affliction|destruction|demo|arcane|fire|frost|elemental/.test(s)
          ? 'Ranged'
          : c === 'hunter'
            ? 'Ranged'
            : 'Melee';
    }
    if (/balance|shadow|afflict|destro|demo|arcane|fire|frost|elemental|moonkin/.test(s)) return 'Ranged';
    if (c === 'mage' || c === 'warlock' || c === 'priest' || c === 'hunter') return 'Ranged';
    if (c === 'rogue') return 'Melee';
    return 'Other';
  }

  function isMeleeDps(p) {
    if (/tank/i.test(p.role)) return false;
    if (/heal/i.test(p.role)) return false;
    const s = (p.spec || '').toLowerCase();
    const c = (p.class || '').toLowerCase();
    if (/fury|arms|ret|combat|subtle|assassin|enhance|cat|feral(?!.*guardian)/.test(s)) return true;
    if (c === 'rogue') return true;
    if (c === 'warrior' && !/prot/.test(s)) return true;
    if (c === 'paladin' && /ret/.test(s)) return true;
    if (c === 'shaman' && /enhance/.test(s)) return true;
    if (c === 'druid' && /feral|cat/.test(s) && !/guardian/.test(s)) return true;
    return /melee/i.test(p.role);
  }

  function isRangedDps(p) {
    if (/tank|heal/i.test(p.role)) return false;
    if (isMeleeDps(p)) return false;
    const s = (p.spec || '').toLowerCase();
    const c = (p.class || '').toLowerCase();
    if (/balance|shadow|afflict|destro|demo|arcane|fire|frost|elemental|bm|mark|surv|beast/.test(s))
      return true;
    if (['mage', 'warlock', 'hunter', 'priest'].includes(c) && !/holy|disc/.test(s)) return true;
    if (c === 'druid' && /balance|moon/.test(s)) return true;
    if (c === 'shaman' && /elemental/.test(s)) return true;
    return /ranged/i.test(p.role);
  }

  function isTank(p) {
    if (/tank/i.test(p.role)) return true;
    const s = (p.spec || '').toLowerCase();
    return /prot|guardian|protection/.test(s);
  }

  function isHealer(p) {
    if (/heal/i.test(p.role)) return true;
    const s = (p.spec || '').toLowerCase();
    return /holy|disc|resto|restoration/.test(s);
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
  function isBoomkin(p) {
    return /druid/i.test(p.class) && /balance|moon/i.test(p.spec);
  }
  function isShadowPriest(p) {
    return /priest/i.test(p.class) && /shadow/i.test(p.spec);
  }
  function isHunter(p) {
    return /hunter/i.test(p.class);
  }
  function isPaladin(p) {
    return /paladin/i.test(p.class);
  }
  function isWarlock(p) {
    return /warlock/i.test(p.class);
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

  function take(arr, n) {
    return arr.splice(0, Math.min(n, arr.length));
  }

  function fillGroup(target, pool, max = 5) {
    while (target.length < max && pool.length) target.push(pool.shift());
  }

  /**
   * Build 5 groups of up to 5 for 25-man TBC.
   */
  function buildGroups(players) {
    const all = players.map(normalizePlayer).filter((p) => p.name);
    const tanks = all.filter(isTank);
    const healers = all.filter(isHealer);
    const melee = all.filter((p) => !isTank(p) && !isHealer(p) && isMeleeDps(p));
    const ranged = all.filter((p) => !isTank(p) && !isHealer(p) && isRangedDps(p));
    const rest = all.filter(
      (p) => !tanks.includes(p) && !healers.includes(p) && !melee.includes(p) && !ranged.includes(p)
    );

    // Sort higher ilvl first for "max dps" priority seats
    const byIlvl = (a, b) => (b.ilvl || 0) - (a.ilvl || 0);
    melee.sort(byIlvl);
    ranged.sort(byIlvl);
    healers.sort(byIlvl);

    const enh = melee.filter(isEnhShaman);
    const meleeNoEnh = melee.filter((p) => !isEnhShaman(p));
    const hunters = ranged.filter(isHunter);
    const boomkins = ranged.filter(isBoomkin);
    const shadows = ranged.filter(isShadowPriest);
    const ele = ranged.filter(isEleShaman);
    const locks = ranged.filter(isWarlock);
    const otherRanged = ranged.filter(
      (p) => !isHunter(p) && !isBoomkin(p) && !isShadowPriest(p) && !isEleShaman(p) && !isWarlock(p)
    );

    const groups = [[], [], [], [], []];
    const labels = [
      'G1 · Tanks + Mit',
      'G2 · Melee + Windfury',
      'G3 · Melee / Physical',
      'G4 · Hunters + Ranged',
      'G5 · Casters + SP',
    ];
    const notes = [
      'Tanks + Sanctuary. Healing tanks / plate.',
      'Windfury melee stack. Put Enh shaman here for WF.',
      'Overflow melee. Kings / Might.',
      'Hunters for Trueshot. Ranged physical.',
      'Caster stack: SPriest, Boomkin, Ele, locks/mages.',
    ];

    // G1 tanks + tank healers
    groups[0].push(...take(tanks, 3));
    const tankHealers = healers.filter(
      (h) => /paladin|priest|druid|shaman/i.test(h.class)
    );
    fillGroup(groups[0], tankHealers, 5);
    fillGroup(groups[0], healers, 5);

    // G2 melee WF
    if (enh.length) groups[1].push(enh.shift());
    fillGroup(groups[1], meleeNoEnh, 5);
    // one resto shaman for mana/WF backup if room
    const resto = healers.filter(isRestoShaman);
    if (groups[1].length < 5 && resto.length) groups[1].push(resto.shift());

    // G3 more melee + leftover tanks
    fillGroup(groups[2], meleeNoEnh, 5);
    fillGroup(groups[2], tanks, 5);
    fillGroup(groups[2], enh, 5);

    // G4 hunters
    fillGroup(groups[3], hunters, 5);
    fillGroup(groups[3], otherRanged, 5);
    fillGroup(groups[3], locks, 5);

    // G5 casters
    fillGroup(groups[4], shadows, 5);
    fillGroup(groups[4], boomkins, 5);
    fillGroup(groups[4], ele, 5);
    fillGroup(groups[4], locks, 5);
    fillGroup(groups[4], otherRanged, 5);
    fillGroup(groups[4], hunters, 5);

    // Dump remaining into emptiest groups
    const leftover = []
      .concat(tanks, healers, meleeNoEnh, enh, hunters, boomkins, shadows, ele, locks, otherRanged, rest)
      .filter(Boolean);
    // unique leftover not already placed
    const placed = new Set(groups.flat().map((p) => p.name.toLowerCase()));
    const uniqueLeft = leftover.filter((p) => !placed.has(p.name.toLowerCase()));
    uniqueLeft.forEach((p) => {
      let best = 0;
      for (let i = 1; i < 5; i++) if (groups[i].length < groups[best].length) best = i;
      if (groups[best].length < 5) groups[best].push(p);
      else {
        // force into any group under 5 or create overflow note on G3
        for (let i = 0; i < 5; i++) {
          if (groups[i].length < 5) {
            groups[i].push(p);
            return;
          }
        }
        groups[2].push(p); // overflow
      }
    });

    return groups.map((members, i) => ({
      index: i + 1,
      label: labels[i],
      note: notes[i],
      members: members.slice(0, 5),
      buffs: groupBuffHints(members),
    }));
  }

  function groupBuffHints(members) {
    const hints = [];
    if (members.some(isEnhShaman)) hints.push('Windfury Totem');
    if (members.some(isEleShaman) || members.some(isRestoShaman))
      hints.push('Wrath of Air / Mana Spring');
    if (members.some(isBoomkin)) hints.push('Moonkin Aura');
    if (members.some(isShadowPriest)) hints.push('Shadow Weaving / Misery');
    if (members.some(isHunter)) hints.push('Trueshot Aura');
    if (members.some((p) => /warrior/i.test(p.class) && !isTank(p)))
      hints.push('Battle Shout');
    if (members.some(isWarlock)) hints.push('Fel Armor / Soulstones');
    if (members.some(isTank)) hints.push('Focus: Tank mitigation');
    return hints;
  }

  /**
   * Assign Greater Blessings across paladins.
   * Classic TBC: each paladin can hold one Greater Blessing type at a time
   * (simplified — we assign responsibility, not in-game macros).
   */
  function assignBlessings(players) {
    const all = players.map(normalizePlayer).filter((p) => p.name);
    const paladins = all.filter(isPaladin);
    const tanks = all.filter(isTank);
    const melee = all.filter((p) => isMeleeDps(p) || isTank(p));
    const casters = all.filter(
      (p) => isRangedDps(p) || isHealer(p) || /mage|warlock|priest|boom|ele|shadow|balance/i.test(p.spec + p.class)
    );
    const healers = all.filter(isHealer);

    // Priority: Holy pals assign support blessings, Ret Might, Prot Sanctuary
    const holy = paladins.filter(isHolyPaladin);
    const ret = paladins.filter(isRetPaladin);
    const prot = paladins.filter(isProtPaladin);
    const otherPals = paladins.filter((p) => !holy.includes(p) && !ret.includes(p) && !prot.includes(p));

    const queue = [].concat(holy, prot, ret, otherPals);
    const assignments = [];

    function assign(blessing, who, targets, why) {
      if (!who) return null;
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

    // Sanctuary → tanks (prot first)
    const sanctP = prot[0] || holy[0] || queue[0];
    if (sanctP && tanks.length) {
      assign('Greater Blessing of Sanctuary', sanctP, tanks, 'Tank mitigation + block value');
    }

    // Might → melee / hunters (ret preferred)
    const mightP =
      ret.find((p) => !assignments.some((a) => a.paladin === p.name)) ||
      queue.find((p) => !assignments.some((a) => a.paladin === p.name));
    const mightTargets = all.filter(
      (p) => isMeleeDps(p) || isTank(p) || isHunter(p)
    );
    if (mightP && mightTargets.length) {
      assign('Greater Blessing of Might', mightP, mightTargets, 'AP for melee & hunters — max physical DPS');
    }

    // Kings → ideally all (best all-purpose). Prefer holy not used.
    const kingsP = queue.find((p) => !assignments.some((a) => a.paladin === p.name));
    if (kingsP) {
      assign('Greater Blessing of Kings', kingsP, all, '+10% stats — best overall raid buff');
    }

    // Wisdom → casters & healers
    const wisP = queue.find((p) => !assignments.some((a) => a.paladin === p.name));
    const wisTargets = all.filter((p) => isHealer(p) || isRangedDps(p) || isEleShaman(p) || isBoomkin(p) || isShadowPriest(p) || isWarlock(p) || /mage|priest|lock|ele|balance|shadow/i.test(p.class + p.spec));
    if (wisP && wisTargets.length) {
      assign('Greater Blessing of Wisdom', wisP, wisTargets, 'Mana regen for casters & healers');
    }

    // Salvation → melee DPS (not tanks) for threat
    const salvP = queue.find((p) => !assignments.some((a) => a.paladin === p.name));
    const salvTargets = all.filter((p) => isMeleeDps(p) && !isTank(p));
    if (salvP && salvTargets.length) {
      assign(
        'Greater Blessing of Salvation',
        salvP,
        salvTargets,
        'Threat reduction for melee DPS (never on tanks)'
      );
    }

    // Light → healers if we still have a paladin
    const lightP = queue.find((p) => !assignments.some((a) => a.paladin === p.name));
    if (lightP && healers.length) {
      assign('Greater Blessing of Light', lightP, healers, 'Extra healing on heals landing on them');
    }

    // If only 1–2 paladins, note stacking limits
    const notes = [];
    if (paladins.length === 0) {
      notes.push('No paladins signed — bring flasks/scrolls; no Greater Blessings.');
    } else if (paladins.length < 3) {
      notes.push(
        `Only ${paladins.length} paladin(s): prioritize Kings + Might (or Sanctuary for hard tank fights).`
      );
    } else {
      notes.push(`${paladins.length} paladins — full blessing coverage possible.`);
    }
    notes.push('Re-cast Greater Blessings after wipes. Use class macros / PallyPower.');
    notes.push('Tanks: Sanctuary or Kings — never Salvation.');

    // Per-player blessing receipt summary
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

  /** Extra raid-wide utility assignments */
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
    }

    const shamans = all.filter((p) => /shaman/i.test(p.class));
    if (shamans.length) {
      out.push({
        title: 'Bloodlust / Heroism',
        detail: shamans.map((s) => `${s.name} (${s.spec || 'Shaman'})`).join(', '),
        why: 'Call lust on burn phases — coordinate one lust window',
      });
    }

    const hunters = all.filter(isHunter);
    if (hunters.length) {
      out.push({
        title: 'Misdirect / Tranq',
        detail: hunters.map((h) => h.name).join(', '),
        why: 'MD pulls to tanks; tranq enrages',
      });
    }

    const priests = all.filter((p) => /priest/i.test(p.class));
    if (priests.some(isShadowPriest)) {
      out.push({
        title: 'Shadow Priest',
        detail: priests.filter(isShadowPriest).map((p) => p.name).join(', '),
        why: 'Stay in caster group for Weaving / Misery',
      });
    }

    const druids = all.filter((p) => /druid/i.test(p.class));
    if (druids.some(isBoomkin)) {
      out.push({
        title: 'Moonkin Aura',
        detail: druids.filter(isBoomkin).map((p) => p.name).join(', '),
        why: 'Stack with casters in G5',
      });
    }

    return out;
  }

  function analyze(players) {
    const list = (players || []).map(normalizePlayer).filter((p) => p.name);
    // de-dupe by name
    const seen = new Set();
    const unique = list.filter((p) => {
      const k = p.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const groups = buildGroups(unique);
    const blessings = assignBlessings(unique);
    const utility = utilityAssignments(unique);

    const counts = {
      total: unique.length,
      tanks: unique.filter(isTank).length,
      healers: unique.filter(isHealer).length,
      melee: unique.filter(isMeleeDps).length,
      ranged: unique.filter(isRangedDps).length,
      paladins: unique.filter(isPaladin).length,
      shamans: unique.filter((p) => /shaman/i.test(p.class)).length,
    };

    const tips = [];
    if (counts.total < 10) tips.push('Few raiders — import Raid-Helper or load demo first.');
    if (counts.paladins === 0) tips.push('No paladins: no Greater Blessings.');
    if (!unique.some(isEnhShaman)) tips.push('No Enh shaman: melee lose Windfury — huge physical DPS loss.');
    if (counts.tanks < 2) tips.push('Under 2 tanks signed.');
    if (counts.healers < 4 && counts.total >= 20) tips.push('Low healers for 25-man.');
    if (unique.some(isHunter) && groups[3] && !groups[3].members.some(isHunter)) {
      tips.push('Move hunters together for Trueshot stacking.');
    }
    tips.push('TBC: group buffs are strong — keep WF melee and caster stacks intact.');

    return {
      counts,
      groups,
      blessings,
      utility,
      tips,
      generatedAt: new Date().toISOString(),
    };
  }

  /** Build player list from app playerInfo + optional RH event list */
  function fromAppState(playerInfo, rhEvents) {
    const map = {};
    Object.keys(playerInfo || {}).forEach((k) => {
      const info = playerInfo[k] || {};
      const name = info.displayName || k;
      map[name.toLowerCase()] = {
        displayName: name,
        class: info.class,
        spec: info.spec,
        rhRole: info.rhRole,
        ilvl: info.ilvl,
      };
    });
    if (rhEvents && rhEvents[0] && rhEvents[0].list) {
      rhEvents[0].list.forEach((s) => {
        if (s.isAbsence) return;
        const main = String(s.name || '').split('/')[0].trim();
        const key = main.toLowerCase();
        if (!map[key]) {
          map[key] = {
            displayName: main,
            class: s.class,
            spec: s.spec,
            rhRole: s.role,
          };
        } else {
          if (!map[key].class && s.class) map[key].class = s.class;
          if (!map[key].spec && s.spec) map[key].spec = s.spec;
          if (!map[key].rhRole && s.role) map[key].rhRole = s.role;
        }
      });
    }
    return Object.values(map);
  }

  global.RaidComp = {
    analyze,
    fromAppState,
    buildGroups,
    assignBlessings,
    normalizePlayer,
  };
})(typeof window !== 'undefined' ? window : globalThis);
