import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  state,
  startRun,
  currentSnippet,
  recordCorrectSnippet,
  recordWrongSubmit,
  BASE_COMBO,
  STARTING_LIVES,
} from "./state.js";

const bank = [
  { id: "medium", answers: ["x"], difficulty: 2 },
  { id: "easy-two-blanks", answers: ["x", "y"], difficulty: 1 },
  { id: "easy-one-blank", answers: ["x"], difficulty: 1 },
  { id: "hard", answers: ["x"], difficulty: 3 },
];

beforeEach(() => startRun(bank));

test("startRun resets state and queues easiest snippets first", () => {
  assert.equal(state.score, 0);
  assert.equal(state.combo, BASE_COMBO);
  assert.equal(state.lives, STARTING_LIVES);
  assert.equal(state.gameOver, false);
  assert.equal(state.runComplete, false);
  assert.deepEqual(
    state.queue.map((s) => s.id),
    ["easy-one-blank", "easy-two-blanks", "medium", "hard"]
  );
  assert.equal(currentSnippet().id, "easy-one-blank");
});

test("startRun does not reorder the original bank", () => {
  assert.deepEqual(
    bank.map((s) => s.id),
    ["medium", "easy-two-blanks", "easy-one-blank", "hard"]
  );
});

test("startRun throws on an empty bank", () => {
  assert.throws(() => startRun([]), /snippet bank is empty/);
});

test("correct snippet scores current difficulty x combo, raises combo, advances", () => {
  recordCorrectSnippet(); // easy-one-blank: 100 * 1 * combo 1
  assert.equal(state.score, 100);
  assert.equal(state.combo, 2);
  assert.equal(currentSnippet().id, "easy-two-blanks");
  recordCorrectSnippet(); // easy-two-blanks: + 100 * 1 * combo 2
  assert.equal(state.score, 300);
  assert.equal(state.combo, 3);
});

test("finishing the queue ends the run cleanly", () => {
  for (let i = 0; i < bank.length; i++) recordCorrectSnippet();
  assert.equal(state.gameOver, true);
  assert.equal(state.runComplete, true);
});

test("wrong submit resets combo to base and removes one life", () => {
  recordCorrectSnippet();
  recordCorrectSnippet();
  recordWrongSubmit();
  assert.equal(state.combo, BASE_COMBO);
  assert.equal(state.lives, STARTING_LIVES - 1);
  assert.equal(state.gameOver, false);
});

test("losing the last life sets game over without run complete", () => {
  for (let i = 0; i < STARTING_LIVES; i++) recordWrongSubmit();
  assert.equal(state.lives, 0);
  assert.equal(state.gameOver, true);
  assert.equal(state.runComplete, false);
});

test("no state changes are accepted after game over", () => {
  for (let i = 0; i < STARTING_LIVES; i++) recordWrongSubmit();
  const frozen = { ...state };
  recordCorrectSnippet();
  recordWrongSubmit();
  assert.deepEqual(state, frozen);
});
