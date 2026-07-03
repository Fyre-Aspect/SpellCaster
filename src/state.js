// Game state and the rules that change it. No DOM in this file.
export const BASE_COMBO = 1;
export const STARTING_LIVES = 3;
const POINTS_PER_SNIPPET = 100;

export const state = {
  score: 0,
  combo: BASE_COMBO,
  lives: STARTING_LIVES,
  queue: [],
  queueIndex: 0,
  gameOver: false,
  runComplete: false,
  screen: "title",
};

// Starts a run: resets everything and builds the queue easiest-first
// (lower difficulty, then fewer blanks). An empty bank is a precondition
// failure, not a state to play through — fail loudly.
export function startRun(snippetBank) {
  if (!Array.isArray(snippetBank) || snippetBank.length === 0) {
    throw new Error(
      "Spellcaster: snippet bank is empty — add snippets to src/snippets.js before starting a run"
    );
  }
  state.score = 0;
  state.combo = BASE_COMBO;
  state.lives = STARTING_LIVES;
  state.queue = [...snippetBank].sort(
    (a, b) => a.difficulty - b.difficulty || a.answers.length - b.answers.length
  );
  state.queueIndex = 0;
  state.gameOver = false;
  state.runComplete = false;
  state.screen = "playing";
}

export function currentSnippet() {
  return state.queue[state.queueIndex];
}

// A fully correct snippet: score points scaled by combo, raise the combo,
// advance the queue; an exhausted queue ends the run.
export function recordCorrectSnippet() {
  if (state.gameOver) return;
  const snippet = state.queue[state.queueIndex];
  state.score += POINTS_PER_SNIPPET * snippet.difficulty * state.combo;
  state.combo += 1;
  state.queueIndex += 1;
  if (state.queueIndex >= state.queue.length) {
    state.runComplete = true;
    state.gameOver = true;
    state.screen = "gameOver";
  }
}

// A wrong submit: combo falls back to base and one life is lost.
export function recordWrongSubmit() {
  if (state.gameOver) return;
  state.combo = BASE_COMBO;
  state.lives -= 1;
  if (state.lives <= 0) {
    state.lives = 0;
    state.gameOver = true;
    state.screen = "gameOver";
  }
}
