import { BOT_DIFFICULTIES, wpmToCharsPerSecond } from "./race.js";
import { aiIncantations, aiCodeSpells } from "../data/aiPool.js";
import { CODE_SPELLS } from "../data/spellCode.js";

// The trade-off the mode is built on: heavier effects demand longer,
// harder incantations. parWpm is the speed that earns full power.
export const SPELLS = {
  firebolt: {
    id: "firebolt",
    name: "Firebolt",
    icon: "\u{1F525}",
    type: "attack",
    power: 11,
    parWpm: 30,
    tier: "short",
    desc: "Quick hit",
  },
  meteor: {
    id: "meteor",
    name: "Meteor",
    icon: "☄️",
    type: "attack",
    power: 30,
    parWpm: 38,
    tier: "long",
    desc: "Huge hit",
  },
  venom: {
    id: "venom",
    name: "Venom",
    icon: "\u{1F40D}",
    type: "poison",
    power: 3.5,
    duration: 8,
    parWpm: 34,
    tier: "medium",
    desc: "Damage over 8s",
  },
  mend: {
    id: "mend",
    name: "Mend",
    icon: "\u{1F49A}",
    type: "heal",
    power: 18,
    parWpm: 34,
    tier: "medium",
    desc: "Heal yourself",
  },
  ward: {
    id: "ward",
    name: "Shield",
    icon: "\u{1F6E1}️",
    type: "shield",
    power: 20,
    parWpm: 30,
    tier: "short",
    desc: "Block damage",
  },
};

export const SPELL_ORDER = ["firebolt", "meteor", "venom", "mend", "ward"];

export const BATTLE_STYLES = {
  words: { id: "words", label: "\u{1F4DC} Word spells", desc: "Type magic phrases" },
  code: { id: "code", label: "\u{1F4BB} Code spells", desc: "Type real JavaScript" },
};

const INCANTATIONS = {
  short: [
    "Ember, fly true!",
    "Sting of cinders!",
    "Flare up, little flame!",
    "Glass and glow, guard me!",
    "Quick spark, quicker strike!",
    "Bright bolt, bite deep!",
  ],
  medium: [
    "Creeping fang of the marsh, drip slow and deep.",
    "Green whisper, wind through the veins of my foe.",
    "Knit the torn thread; warm light, mend what broke.",
    "Rise again, heart of oak, steady and whole.",
    "Bitter bloom, unfold your quiet ruin.",
    "Gentle river, wash the wound and carry off the ache.",
  ],
  long: [
    "From the black vault beyond the moons, hurl down your burning crown of stone!",
    "Sky-forge, split open and spill your molten heart upon my enemy below!",
    "Old fire, older than mountains, fall screaming through the silent dark!",
    "Comet of the shattered heavens, carve your bright grave into the earth!",
  ],
};

// Returns { text, synopsis } — synopsis is null for word spells
export function incantationFor(spellId, style = "words", random = Math.random) {
  const tier = SPELLS[spellId].tier;
  if (style === "code") {
    const bank = CODE_SPELLS[tier].concat(aiCodeSpells(tier));
    const pick = bank[Math.floor(random() * bank.length)];
    return { text: pick.code, synopsis: pick.synopsis };
  }
  const bank = INCANTATIONS[tier].concat(aiIncantations(tier));
  return { text: bank[Math.floor(random() * bank.length)], synopsis: null };
}

const ENEMY_TIERS = {
  easy: { hp: 70, damageMult: 0.7, idleSeconds: 2.6 },
  medium: { hp: 95, damageMult: 1.0, idleSeconds: 1.8 },
  hard: { hp: 115, damageMult: 1.25, idleSeconds: 1.2 },
  insane: { hp: 140, damageMult: 1.5, idleSeconds: 0.8 },
};

// Enemy loadout leans on attacks; it heals only when hurt
const ENEMY_SPELL_WEIGHTS = [
  ["firebolt", 0.45],
  ["meteor", 0.2],
  ["venom", 0.2],
  ["mend", 0.15],
];

function pickEnemySpell(b, random) {
  const hurt = b.enemyHp < b.enemyMax * 0.6;
  let roll = random();
  for (const [id, weight] of ENEMY_SPELL_WEIGHTS) {
    if (id === "mend" && !hurt) continue;
    roll -= weight;
    if (roll <= 0) return id;
  }
  return "firebolt";
}

export function createBattle(difficultyId, random = Math.random) {
  const tier = ENEMY_TIERS[difficultyId] ?? ENEMY_TIERS.medium;
  return {
    pvp: false,
    difficulty: difficultyId,
    playerHp: 100,
    playerMax: 100,
    playerShield: 0,
    playerPoison: null, // { perSecond, left } — enemy venom on you
    enemyHp: tier.hp,
    enemyMax: tier.hp,
    enemyShield: 0,
    enemyPoison: null, // your venom on the enemy
    enemy: { casting: null, idleLeft: 1.5 + random() },
    over: false,
    winner: null,
  };
}

// Two wizards, one keyboard: identical stats, alternating casts
export function createPvpBattle() {
  return {
    pvp: true,
    playerHp: 100,
    playerMax: 100,
    playerShield: 0,
    playerPoison: null,
    enemyHp: 100,
    enemyMax: 100,
    enemyShield: 0,
    enemyPoison: null,
    enemy: { casting: null },
    turn: "player",
    over: false,
    winner: null,
  };
}

// Internet duel: both wizards cast at once. The remote player's HP, shield,
// and poison are authoritative on their machine and mirrored here via
// network state messages; we only simulate our own side.
export function createOnlineBattle() {
  return {
    pvp: false,
    online: true,
    playerHp: 100,
    playerMax: 100,
    playerShield: 0,
    playerPoison: null,
    enemyHp: 100,
    enemyMax: 100,
    enemyShield: 0,
    enemyPoison: null,
    enemy: { casting: null },
    over: false,
    winner: null,
  };
}

const OTHER_SIDE = { player: "enemy", enemy: "player" };

function damageSide(b, side, amount) {
  const shieldKey = `${side}Shield`;
  const absorbed = Math.min(b[shieldKey], amount);
  b[shieldKey] -= absorbed;
  b[`${side}Hp`] -= amount - absorbed;
  return amount - absorbed;
}

function settle(b) {
  if (b.over) return;
  if (b.playerHp <= 0) {
    b.playerHp = 0;
    b.over = true;
    b.winner = "enemy";
  } else if (!b.online && b.enemyHp <= 0) {
    // Online: the opponent's death is announced by their machine, not
    // inferred from our optimistic mirror of their HP
    b.enemyHp = 0;
    b.over = true;
    b.winner = "player";
  }
}

function tickPoison(b, dt) {
  if (b.enemyPoison) {
    damageSide(b, "enemy", b.enemyPoison.perSecond * dt);
    b.enemyPoison.left -= dt;
    if (b.enemyPoison.left <= 0) b.enemyPoison = null;
  }
  if (b.playerPoison) {
    damageSide(b, "player", b.playerPoison.perSecond * dt);
    b.playerPoison.left -= dt;
    if (b.playerPoison.left <= 0) b.playerPoison = null;
  }
}

function resolveEnemySpell(b, spellId, tier, random) {
  const spell = SPELLS[spellId];
  const variance = 0.85 + random() * 0.3;
  if (spell.type === "attack") {
    const dealt = damageSide(
      b,
      "player",
      Math.round(spell.power * tier.damageMult * variance)
    );
    return { type: "enemyHit", spellId, amount: dealt };
  }
  if (spell.type === "poison") {
    b.playerPoison = {
      perSecond: spell.power * tier.damageMult * variance,
      left: spell.duration,
    };
    return { type: "enemyHit", spellId, amount: 0 };
  }
  if (spell.type === "heal") {
    const healed = Math.round(spell.power * variance);
    b.enemyHp = Math.min(b.enemyMax, b.enemyHp + healed);
    return { type: "enemyHeal", spellId, amount: healed };
  }
  return null;
}

export function tickBattle(b, dt, random = Math.random, style = "words") {
  const events = [];
  if (b.over) return events;
  tickPoison(b, dt);

  if (b.pvp || b.online) {
    // No AI in PvP or online duels — real time only advances poison
    settle(b);
    return events;
  }

  const tier = ENEMY_TIERS[b.difficulty] ?? ENEMY_TIERS.medium;
  const enemy = b.enemy;
  if (enemy.casting) {
    enemy.casting.left -= dt;
    if (enemy.casting.left <= 0) {
      const ev = resolveEnemySpell(b, enemy.casting.spellId, tier, random);
      if (ev) events.push(ev);
      enemy.casting = null;
      enemy.idleLeft = tier.idleSeconds * (0.7 + random() * 0.6);
    }
  } else {
    enemy.idleLeft -= dt;
    if (enemy.idleLeft <= 0) {
      const spellId = pickEnemySpell(b, random);
      const { text } = incantationFor(spellId, style, random);
      const cps = wpmToCharsPerSecond(
        (BOT_DIFFICULTIES[b.difficulty] ?? BOT_DIFFICULTIES.medium).baseWpm
      );
      const total = Math.max(1.2, text.length / cps);
      enemy.casting = { spellId, total, left: total };
      events.push({ type: "enemyStart", spellId });
    }
  }

  settle(b);
  return events;
}

// A cast the online opponent made, landing on our own (authoritative) side.
// Returns the damage actually dealt after our shield absorbs its share.
export function applyRemoteCast(b, { kind, raw, perSecond, duration }) {
  if (kind === "attack") {
    const dealt = damageSide(b, "player", raw);
    settle(b);
    return dealt;
  }
  if (kind === "poison") {
    b.playerPoison = { perSecond, left: duration };
  }
  // heal/shield only affect the caster — their state broadcast covers it
  return 0;
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

function castPower(spell, { accuracy, seconds, chars }) {
  const acc = clamp(accuracy / 100, 0, 1);
  const wpm = seconds > 0 ? chars / 5 / (seconds / 60) : 0;
  const speedMult = clamp(wpm / spell.parWpm, 0.45, 1.4);
  const crit = accuracy >= 100 && wpm >= spell.parWpm * 1.15;
  const mult = acc * acc * speedMult * (crit ? 1.5 : 1);
  return { mult, crit, wpm };
}

// Accuracy and speed are the whole weapon: sloppy or slow casts fizzle,
// perfect fast ones crit. `side` is who is casting ("player" in solo play).
export function applyCast(b, spellId, metrics, side = "player") {
  const spell = SPELLS[spellId];
  const { mult, crit, wpm } = castPower(spell, metrics);
  const amount = Math.max(1, Math.round(spell.power * mult));
  const foe = OTHER_SIDE[side];
  let dealt = 0;
  if (spell.type === "attack") {
    dealt = damageSide(b, foe, amount);
  } else if (spell.type === "poison") {
    b[`${foe}Poison`] = { perSecond: spell.power * mult, left: spell.duration };
    dealt = Math.round(spell.power * mult * spell.duration);
  } else if (spell.type === "heal") {
    b[`${side}Hp`] = Math.min(b[`${side}Max`], b[`${side}Hp`] + amount);
  } else if (spell.type === "shield") {
    const key = `${side}Shield`;
    b[key] = Math.max(b[key], amount);
  }
  if (b.pvp) b.turn = foe;
  settle(b);
  return {
    type: spell.type,
    amount:
      spell.type === "attack" || spell.type === "poison" ? dealt : amount,
    // Pre-shield damage and poison parameters, so a remote opponent can
    // apply the cast against their own authoritative state
    raw: amount,
    perSecond: spell.type === "poison" ? spell.power * mult : 0,
    duration: spell.duration ?? 0,
    crit,
    wpm: Math.round(wpm),
  };
}
