import test from "node:test";
import assert from "node:assert/strict";
import { checkAnswers } from "./checker.js";

test("all correct answers match", () => {
  assert.deepEqual(checkAnswers(["filter", "0"], ["filter", "0"]), [true, true]);
});

test("surrounding whitespace is trimmed", () => {
  assert.deepEqual(checkAnswers(["  filter ", "\t0\n"], ["filter", "0"]), [true, true]);
});

test("wrong answers are marked at their own position", () => {
  assert.deepEqual(checkAnswers(["map", "0"], ["filter", "0"]), [false, true]);
});

test("match is case-sensitive", () => {
  assert.deepEqual(checkAnswers(["Filter"], ["filter"]), [false]);
});

test("empty input is wrong, not a crash", () => {
  assert.deepEqual(checkAnswers(["", "0"], ["filter", "0"]), [false, true]);
});

test("missing inputs count as wrong", () => {
  assert.deepEqual(checkAnswers([], ["filter", "0"]), [false, false]);
});

test("internal whitespace is not normalized", () => {
  assert.deepEqual(checkAnswers(["n%2"], ["n % 2"]), [false]);
});

test("result length always equals answers length", () => {
  assert.equal(checkAnswers(["a", "b", "c"], ["a"]).length, 1);
});
