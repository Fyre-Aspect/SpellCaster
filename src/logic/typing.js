export function checkAnswer(typed, expected) {
  return typed.trim() === expected.trim();
}

export function charStates(typed, expected) {
  const states = [];
  for (let i = 0; i < expected.length; i++) {
    if (i >= typed.length) states.push("empty");
    else states.push(typed[i] === expected[i] ? "correct" : "wrong");
  }
  return states;
}

export function correctCharCount(typed, expected) {
  const limit = Math.min(typed.length, expected.length);
  let count = 0;
  for (let i = 0; i < limit; i++) {
    if (typed[i] === expected[i]) count++;
  }
  return count;
}
