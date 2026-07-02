// Data model: each blank in `code` is marked with the single token {{blank}}.
// `answers` holds the correct text for each blank, in order of appearance.
export const BLANK_MARKER = "{{blank}}";

export const snippets = [
  {
    id: "filter-evens",
    code: "const evens = numbers.{{blank}}((n) => n % 2 === {{blank}});",
    answers: ["filter", "0"],
    difficulty: 1,
  },
  {
    id: "map-double",
    code: "const doubled = values.{{blank}}((v) => v {{blank}} 2);",
    answers: ["map", "*"],
    difficulty: 1,
  },
  {
    id: "greet-function",
    code: 'function greet(name) {\n  {{blank}} "Hello, " + {{blank}};\n}',
    answers: ["return", "name"],
    difficulty: 2,
  },
  {
    id: "reduce-sum",
    code: "const total = prices.{{blank}}((sum, p) => sum + p, {{blank}});",
    answers: ["reduce", "0"],
    difficulty: 3,
  },
];
