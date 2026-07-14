export const BLANK_MARKER = "@@";

const RAW_SNIPPETS = [
  {
    id: "double",
    difficulty: 1,
    template: "const double = nums.@@(@@);",
    answers: ["map", "n => n * 2"],
  },
  {
    id: "shout",
    difficulty: 1,
    template: 'const shout = (word) @@ word.@@() + "!";',
    answers: ["=>", "toUpperCase"],
  },
  {
    id: "greet",
    difficulty: 1,
    template: '@@ greet(name) {\n  @@ "Hello, " + @@ + "!";\n}',
    answers: ["function", "return", "name"],
  },
  {
    id: "evens",
    difficulty: 1,
    template: "const evens = nums.@@(@@);",
    answers: ["filter", "n => n % 2 === 0"],
  },
  {
    id: "first-active",
    difficulty: 1,
    template: "const first = items.@@(@@);",
    answers: ["find", "item => item.active"],
  },
  {
    id: "names",
    difficulty: 2,
    template: 'const names = users.@@(user => @@).@@(", ");',
    answers: ["map", "user.name", "join"],
  },
  {
    id: "total",
    difficulty: 2,
    template: "const total = cart.@@((sum, item) => @@, @@);",
    answers: ["reduce", "sum + item.price", "0"],
  },
  {
    id: "sleep",
    difficulty: 2,
    template: "const sleep = (ms) =>\n  new @@((resolve) => @@(@@, ms));",
    answers: ["Promise", "setTimeout", "resolve"],
  },
  {
    id: "unique",
    difficulty: 2,
    template: "const unique = (items) => @@;",
    answers: ["[...new Set(items)]"],
  },
  {
    id: "by-age",
    difficulty: 2,
    template: "const byAge = [...people].@@((a, b) => @@);",
    answers: ["sort", "a.age - b.age"],
  },
  {
    id: "word-counts",
    difficulty: 3,
    template: "const counts = {};\nfor (const word @@ words) {\n  counts[word] = @@;\n}",
    answers: ["of", "(counts[word] ?? 0) + 1"],
  },
  {
    id: "clamp",
    difficulty: 3,
    template: "function clamp(n, min, max) {\n  return @@;\n}",
    answers: ["Math.min(max, Math.max(min, n))"],
  },
  {
    id: "debounce",
    difficulty: 3,
    template:
      "function debounce(fn, delay) {\n  let timer;\n  return (...args) => {\n    @@(timer);\n    timer = @@(() => @@, delay);\n  };\n}",
    answers: ["clearTimeout", "setTimeout", "fn(...args)"],
  },
  {
    id: "range",
    difficulty: 3,
    template: "const range = (n) =>\n  @@(@@, @@);",
    answers: ["Array.from", "{ length: n }", "(_, i) => i"],
  },
  {
    id: "fetch-json",
    difficulty: 3,
    template: "@@ function fetchJson(url) {\n  const res = @@;\n  return @@;\n}",
    answers: ["async", "await fetch(url)", "await res.json()"],
  },
];

if (RAW_SNIPPETS.length === 0) {
  throw new Error(
    "Spellcaster snippet bank is empty: add at least one snippet to src/data/snippets.js."
  );
}

for (const snippet of RAW_SNIPPETS) {
  const blanks = snippet.template.split(BLANK_MARKER).length - 1;
  if (blanks !== snippet.answers.length) {
    throw new Error(
      `Snippet "${snippet.id}" has ${blanks} blanks but ${snippet.answers.length} answers.`
    );
  }
  if (snippet.answers.some((a) => a.trim().length === 0)) {
    throw new Error(`Snippet "${snippet.id}" has an empty answer.`);
  }
}

export const SNIPPETS = [...RAW_SNIPPETS].sort(
  (a, b) => a.difficulty - b.difficulty
);

export function parseTemplate(template) {
  const parts = template.split(BLANK_MARKER);
  const segments = [];
  let blankIndex = 0;
  parts.forEach((text, i) => {
    if (text.length > 0) segments.push({ type: "text", value: text });
    if (i < parts.length - 1) segments.push({ type: "blank", index: blankIndex++ });
  });
  return segments;
}

export function totalAnswerChars(answers) {
  return answers.reduce((sum, answer) => sum + answer.length, 0);
}
