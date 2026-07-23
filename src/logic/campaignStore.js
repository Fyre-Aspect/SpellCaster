import { CAMPAIGN } from "../data/campaign.js";

const KEY = "spellcaster.campaign.v1";

// Shape: { cleared: { [levelId]: bestStars }, gold: number }
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (data && typeof data === "object") {
      return { cleared: data.cleared ?? {}, gold: data.gold ?? 0 };
    }
  } catch {
    /* storage unavailable */
  }
  return { cleared: {}, gold: 0 };
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}

// A level is unlocked if it's the first, or the previous one is cleared
export function isLevelUnlocked(index, cleared) {
  if (index <= 0) return true;
  const prev = CAMPAIGN[index - 1];
  return !!prev && cleared[prev.id] > 0;
}

// Stars from how the duel went: HP kept and accuracy typed
export function starsFor(hpFraction, accuracy) {
  if (hpFraction >= 0.6 && accuracy >= 92) return 3;
  if (hpFraction >= 0.3 || accuracy >= 85) return 2;
  return 1;
}

function goldFor(level, stars, firstClear) {
  const base = level.baseGold;
  const starBonus = (stars - 1) * Math.round(base * 0.25);
  if (firstClear) return base + starBonus;
  // Replays pay a trickle so the shop can't be farmed instantly
  return Math.round(base * 0.35) + (stars - 1) * 5;
}

export function loadCampaign() {
  const state = load();
  return {
    cleared: state.cleared,
    gold: state.gold,
    // Highest index the player may enter (first uncleared after a cleared run)
    unlockedCount: CAMPAIGN.reduce(
      (n, _l, i) => (isLevelUnlocked(i, state.cleared) ? i + 1 : n),
      1
    ),
    totalStars: Object.values(state.cleared).reduce((a, b) => a + b, 0),
  };
}

// Record a win: bump gold, keep the best star score. Returns the payout.
export function recordCampaignWin(index, stars) {
  const level = CAMPAIGN[index];
  if (!level) return null;
  const state = load();
  const prevStars = state.cleared[level.id] ?? 0;
  const firstClear = prevStars === 0;
  const earned = goldFor(level, stars, firstClear);
  state.gold += earned;
  state.cleared[level.id] = Math.max(prevStars, stars);
  save(state);
  return { earned, gold: state.gold, firstClear, bestStars: state.cleared[level.id] };
}

export function spendGold(amount) {
  const state = load();
  if (state.gold < amount) return false;
  state.gold -= amount;
  save(state);
  return true;
}

// Pay out coins from non-campaign wins (races, quick duels) so every mode
// feeds the shared purse. Returns { earned, gold } for display.
export function awardGold(amount) {
  const state = load();
  const earned = Math.max(0, Math.round(amount));
  state.gold += earned;
  save(state);
  return { earned, gold: state.gold };
}

export function currentGold() {
  return load().gold;
}
