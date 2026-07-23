// The solo campaign: an escalating ladder of duels. Some levels are hordes
// (several weaker foes fought back-to-back on one health bar), others are
// single bruisers or bosses. Foe tactics reuse the battle AI:
//   hp         - the foe's health
//   damageMult - scales how hard its attacks land
//   idleSeconds- pause between its casts (lower = more aggressive)
//   castWpm    - how fast it types its incantations (lower = slower casts)

export const CAMPAIGN = [
  {
    id: "l1",
    name: "Training Grounds",
    subtitle: "A lone straw dummy to warm up on",
    icon: "🎯",
    kind: "duel",
    baseGold: 20,
    foes: [{ name: "Straw Dummy", hp: 45, damageMult: 0.5, idleSeconds: 3.0, castWpm: 22 }],
  },
  {
    id: "l2",
    name: "Goblin Rabble",
    subtitle: "Three scrappy goblins, one after another",
    icon: "👺",
    kind: "horde",
    baseGold: 26,
    foes: [
      { name: "Goblin", hp: 28, damageMult: 0.6, idleSeconds: 2.6, castWpm: 24 },
      { name: "Goblin", hp: 30, damageMult: 0.6, idleSeconds: 2.5, castWpm: 25 },
      { name: "Goblin Chief", hp: 40, damageMult: 0.75, idleSeconds: 2.2, castWpm: 27 },
    ],
  },
  {
    id: "l3",
    name: "Cinder Imp",
    subtitle: "A fast little flame-flinger",
    icon: "🔥",
    kind: "duel",
    baseGold: 30,
    foes: [{ name: "Cinder Imp", hp: 78, damageMult: 0.9, idleSeconds: 1.9, castWpm: 32 }],
  },
  {
    id: "l4",
    name: "Bandit Ambush",
    subtitle: "Two cutthroats block the road",
    icon: "🗡️",
    kind: "horde",
    baseGold: 36,
    foes: [
      { name: "Bandit", hp: 58, damageMult: 0.85, idleSeconds: 2.1, castWpm: 30 },
      { name: "Bandit Boss", hp: 72, damageMult: 1.0, idleSeconds: 1.8, castWpm: 34 },
    ],
  },
  {
    id: "l5",
    name: "Frost Warden",
    subtitle: "Mini-boss — a patient, punishing duelist",
    icon: "❄️",
    kind: "boss",
    baseGold: 46,
    foes: [{ name: "Frost Warden", hp: 105, damageMult: 1.05, idleSeconds: 1.6, castWpm: 36 }],
  },
  {
    id: "l6",
    name: "Venom Brood",
    subtitle: "A swarm of poison-slick broodlings",
    icon: "🐍",
    kind: "horde",
    baseGold: 50,
    foes: [
      { name: "Broodling", hp: 44, damageMult: 0.95, idleSeconds: 1.9, castWpm: 32 },
      { name: "Broodling", hp: 46, damageMult: 0.95, idleSeconds: 1.8, castWpm: 33 },
      { name: "Brood Mother", hp: 66, damageMult: 1.1, idleSeconds: 1.6, castWpm: 36 },
    ],
  },
  {
    id: "l7",
    name: "Storm Caller",
    subtitle: "Lightning-fast casts, little mercy",
    icon: "⚡",
    kind: "duel",
    baseGold: 58,
    foes: [{ name: "Storm Caller", hp: 130, damageMult: 1.2, idleSeconds: 1.35, castWpm: 44 }],
  },
  {
    id: "l8",
    name: "The Ashen Twins",
    subtitle: "Two burning siblings, back to back",
    icon: "🔥",
    kind: "horde",
    baseGold: 64,
    foes: [
      { name: "Ash", hp: 92, damageMult: 1.15, idleSeconds: 1.5, castWpm: 40 },
      { name: "Cinder", hp: 96, damageMult: 1.2, idleSeconds: 1.4, castWpm: 42 },
    ],
  },
  {
    id: "l9",
    name: "Shadow Knight",
    subtitle: "Boss — a relentless armored caster",
    icon: "🛡️",
    kind: "boss",
    baseGold: 74,
    foes: [{ name: "Shadow Knight", hp: 155, damageMult: 1.35, idleSeconds: 1.15, castWpm: 52 }],
  },
  {
    id: "l10",
    name: "Archmage Vhalor",
    subtitle: "Final boss — the master of the tower",
    icon: "🧙",
    kind: "boss",
    baseGold: 110,
    foes: [{ name: "Archmage Vhalor", hp: 195, damageMult: 1.5, idleSeconds: 1.0, castWpm: 62 }],
  },
];

export function campaignLevel(index) {
  return CAMPAIGN[index] ?? null;
}
