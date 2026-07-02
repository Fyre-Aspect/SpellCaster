import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  state,
  resetState,
  recordCorrectSnippet,
  recordWrongSubmit,
  BASE_COMBO,
  STARTING_LIVES,
} from "./state.js";

beforeEach(() => resetState());

test("reset restores starting values", () => {
  recordCorrectSnippet(2, 4);
  recordWrongSubmit();
  resetState();
  assert.deepEqual(state, {
    score: 0,
    combo: BASE_COMBO,
    lives: STARTING_LIVES,
    snippetIndex: 0,
    gameOver: false,
  });
});

test("correct snippet scores difficulty x combo, then raises combo", () => {
  recordCorrectSnippet(2, 4);
  assert.equal(state.score, 200); // 100 * 2 * combo 1
  assert.equal(state.combo, 2);
  recordCorrectSnippet(2, 4);
  assert.equal(state.score, 600); // + 100 * 2 * combo 2
  assert.equal(state.combo, 3);
});

test("correct snippet advances the index and wraps around", () => {
  state.snippetIndex = 3;
  recordCorrectSnippet(1, 4);
  assert.equal(state.snippetIndex, 0);
});

test("wrong submit resets combo to base and removes one life", () => {
  recordCorrectSnippet(1, 4);
  recordCorrectSnippet(1, 4);
  assert.equal(state.combo, 3);
  recordWrongSubmit();
  assert.equal(state.combo, BASE_COMBO);
  assert.equal(state.lives, STARTING_LIVES - 1);
  assert.equal(state.gameOver, false);
});

test("losing the last life sets game over", () => {
  for (let i = 0; i < STARTING_LIVES; i++) recordWrongSubmit();
  assert.equal(state.lives, 0);
  assert.equal(state.gameOver, true);
});

test("no state changes are accepted after game over", () => {
  for (let i = 0; i < STARTING_LIVES; i++) recordWrongSubmit();
  const frozen = { ...state };
  recordCorrectSnippet(3, 4);
  recordWrongSubmit();
  assert.deepEqual(state, frozen);
});
