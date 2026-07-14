const HISTORY_KEY = "spellcaster.history.v1";
export const HISTORY_LIMIT = 50;

export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function recordRun(run) {
  const history = [run, ...loadHistory()].slice(0, HISTORY_LIMIT);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    /* storage unavailable */
  }
  return history;
}

export function summarizeHistory(history) {
  if (history.length === 0) return null;
  const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const races = history.filter((r) => r.mode === "race");
  return {
    count: history.length,
    avgWpm: avg(history.map((r) => r.wpm)),
    avgAccuracy: avg(history.map((r) => r.accuracy)),
    bestWpm: Math.max(...history.map((r) => r.wpm)),
    racePlayed: races.length,
    raceWins: races.filter((r) => r.winner === "player").length,
    // Oldest-first so the sparkline reads left to right
    recentWpm: history
      .slice(0, 20)
      .map((r) => r.wpm)
      .reverse(),
  };
}
