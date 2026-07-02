// Game state and the rules that change it. No DOM in this file.
export const BASE_COMBO = 1;
export const STARTING_LIVES = 3;
const POINTS_PER_SNIPPET = 100;

export const state = {
  score: 0,
  combo: BASE_COMBO,
  lives: STARTING_LIVES,
  snippetIndex: 0,
  gameOver: false,
};

export function resetState() {
  state.score = 0;
  state.combo = BASE_COMBO;
  state.lives = STARTING_LIVES;
  state.snippetIndex = 0;
  state.gameOver = false;
}

// A fully correct snippet: score points scaled by combo, then raise the combo
// and advance to the next snippet (wrapping around).
export function recordCorrectSnippet(difficulty, snippetCount) {
  if (state.gameOver) return;
  state.score += POINTS_PER_SNIPPET * difficulty * state.combo;
  state.combo += 1;
  state.snippetIndex = (state.snippetIndex + 1) % snippetCount;
}

// A wrong submit: combo falls back to base and one life is lost.
export function recordWrongSubmit() {
  if (state.gameOver) return;
  state.combo = BASE_COMBO;
  state.lives -= 1;
  if (state.lives <= 0) {
    state.lives = 0;
    state.gameOver = true;
  }
}
