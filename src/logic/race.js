export const BOT = {
  baseWpm: 35,
  minWpm: 28,
  maxWpm: 42,
  stumbleWpm: 18,
  stumbleChance: 1 / 8,
  rerollSeconds: 1.5,
};

export function wpmToCharsPerSecond(wpm) {
  return (wpm * 5) / 60;
}

export function createBot(random = Math.random) {
  let wpm = BOT.baseWpm;
  let untilReroll = BOT.rerollSeconds;
  return {
    get wpm() {
      return wpm;
    },
    tick(dtSeconds) {
      untilReroll -= dtSeconds;
      if (untilReroll <= 0) {
        untilReroll += BOT.rerollSeconds;
        wpm =
          random() < BOT.stumbleChance
            ? BOT.stumbleWpm
            : BOT.minWpm + random() * (BOT.maxWpm - BOT.minWpm);
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
