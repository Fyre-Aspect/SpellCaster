// Consumable power-ups bought mid-match with coins (campaign gold). Battle
// power-ups help you survive or burst down a duel; race power-ups help you
// claw back or pull away from the bot. Versus modes (pvp/online) and the
// score-chasing solo modes (endless/trial) are excluded so nobody can buy an
// unfair edge or pad a personal best.

export const POWERUPS = {
  // --- Battle (Quick Duel + Campaign) ---
  potion: {
    id: "potion",
    scope: "battle",
    icon: "🧪",
    name: "Health Potion",
    cost: 15,
    desc: "Heal +35 HP now",
    signature: true, // the "panic" button, highlighted when you're in danger
  },
  ward: {
    id: "ward",
    scope: "battle",
    icon: "🛡️",
    name: "Aegis",
    cost: 15,
    desc: "+30 shield now",
  },
  berserk: {
    id: "berserk",
    scope: "battle",
    icon: "💪",
    name: "2× Strength",
    cost: 28,
    desc: "Double damage · 8s",
  },
  freeze: {
    id: "freeze",
    scope: "battle",
    icon: "❄️",
    name: "Time Freeze",
    cost: 22,
    desc: "Foe frozen · 4s",
  },

  // --- Race (vs the bot) ---
  autocast: {
    id: "autocast",
    scope: "race",
    icon: "⚡",
    name: "Auto-Cast",
    cost: 24,
    desc: "Types for you · 3s",
    signature: true,
  },
  surge: {
    id: "surge",
    scope: "race",
    icon: "🚀",
    name: "Surge",
    cost: 14,
    desc: "Leap forward",
  },
  trip: {
    id: "trip",
    scope: "race",
    icon: "🍌",
    name: "Trip the Bot",
    cost: 16,
    desc: "Slow the bot · 4s",
  },
};

export const BATTLE_POWERUPS = ["potion", "ward", "berserk", "freeze"];
export const RACE_POWERUPS = ["autocast", "surge", "trip"];

// Seconds a timed effect lasts (instant ones are absent). Also used to block
// re-buying an effect that's still running.
export const POWERUP_DURATION = {
  berserk: 8,
  freeze: 4,
  autocast: 3,
  trip: 4,
};

// Tuning knobs for each effect's magnitude.
export const POWERUP_FX = {
  potionHeal: 35,
  wardShield: 30,
  wardShieldCap: 60,
  berserkMult: 2,
  surgeChars: 28,
  autocastCps: 11, // chars/sec of free progress while active (~130 wpm burst)
  tripMult: 0.3, // bot speed multiplier while tripped
};

// A tiny gap between purchases stops a double-click double-spending.
export const POWERUP_COOLDOWN_MS = 450;

export function powerupsForMode(mode) {
  if (mode === "battle") return BATTLE_POWERUPS; // includes campaign duels
  if (mode === "race") return RACE_POWERUPS;
  return []; // pvp / online / endless / trial: no power-ups
}
