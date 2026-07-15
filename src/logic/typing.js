const QUOTE_CHARS = new Set(['"', "'", "`"]);

// True at positions strictly inside a string literal (not the quotes).
// Typos there are forgiven — console.log messages don't have to be exact.
export function lenientMask(expected) {
  const mask = new Array(expected.length).fill(false);
  let quote = null;
  for (let i = 0; i < expected.length; i++) {
    const ch = expected[i];
    if (quote) {
      if (ch === quote) quote = null;
      else mask[i] = true;
    } else if (QUOTE_CHARS.has(ch)) {
      quote = ch;
    }
  }
  return mask;
}

export function charMatches(typedChar, expectedChar, isLenient) {
  if (typedChar === expectedChar) return true;
  return !!isLenient && typedChar !== undefined;
}

export function checkAnswer(typed, expected, mask = null) {
  if (!mask) return typed.trim() === expected.trim();
  if (typed.length < expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (!charMatches(typed[i], expected[i], mask[i])) return false;
  }
  return true;
}

export function charStates(typed, expected, mask = null) {
  const states = [];
  for (let i = 0; i < expected.length; i++) {
    if (i >= typed.length) states.push("empty");
    else {
      states.push(
        charMatches(typed[i], expected[i], mask?.[i]) ? "correct" : "wrong"
      );
    }
  }
  return states;
}

export function correctCharCount(typed, expected, mask = null) {
  const limit = Math.min(typed.length, expected.length);
  let count = 0;
  for (let i = 0; i < limit; i++) {
    if (charMatches(typed[i], expected[i], mask?.[i])) count++;
  }
  return count;
}
