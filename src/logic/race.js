export const BOT_DIFFICULTIES = {
  easy: {
    id: "easy",
    label: "Easy",
    baseWpm: 25,
    minWpm: 20,
    maxWpm: 30,
    stumbleWpm: 12,
    stumbleChance: 1 / 8,
    rerollSeconds: 1.5,
  },
  medium: {
    id: "medium",
    label: "Medium",
    baseWpm: 35,
    minWpm: 28,
    maxWpm: 42,
    stumbleWpm: 18,
    stumbleChance: 1 / 8,
    rerollSeconds: 1.5,
  },
  hard: {
    id: "hard",
    label: "Hard",
    baseWpm: 50,
    minWpm: 42,
    maxWpm: 58,
    stumbleWpm: 28,
    stumbleChance: 1 / 8,
    rerollSeconds: 1.5,
  },
  insane: {
    id: "insane",
    label: "Insane",
    baseWpm: 72,
    minWpm: 60,
    maxWpm: 84,
    stumbleWpm: 40,
    stumbleChance: 1 / 8,
    rerollSeconds: 1.5,
  },
};

export const DIFFICULTY_ORDER = ["easy", "medium", "hard", "insane"];

export function wpmToCharsPerSecond(wpm) {
  return (wpm * 5) / 60;
}

export function createBot(profile = BOT_DIFFICULTIES.medium, random = Math.random) {
  let wpm = profile.baseWpm;
  let untilReroll = profile.rerollSeconds;
  return {
    get wpm() {
      return wpm;
    },
    tick(dtSeconds) {
      untilReroll -= dtSeconds;
      if (untilReroll <= 0) {
        untilReroll += profile.rerollSeconds;
        wpm =
          random() < profile.stumbleChance
            ? profile.stumbleWpm
            : profile.minWpm + random() * (profile.maxWpm - profile.minWpm);
      }
      return wpmToCharsPerSecond(wpm) * dtSeconds;
    },
  };
}

export function computeWpm(correctChars, elapsedSeconds) {
  if (elapsedSeconds < 0.5) return 0;
  return correctChars / 5 / (elapsedSeconds / 60);
}

export function computeAccuracy(correctKeystrokes, totalKeystrokes) {
  if (totalKeystrokes === 0) return 100;
  return (correctKeystrokes / totalKeystrokes) * 100;
}
