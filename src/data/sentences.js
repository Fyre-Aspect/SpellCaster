const RAW_SENTENCES = [
  {
    id: "quick-fox",
    difficulty: 1,
    text: "The quick brown fox jumps over the lazy dog.",
  },
  {
    id: "typing-spell",
    difficulty: 1,
    text: "Typing is a spell you cast with both hands.",
  },
  {
    id: "small-steps",
    difficulty: 1,
    text: "Small steps every day beat big plans someday.",
  },
  {
    id: "wizard-time",
    difficulty: 1,
    text: "A wizard never rushes, yet always arrives on time.",
  },
  {
    id: "practice-daily",
    difficulty: 1,
    text: "Practice a little every day and speed will follow.",
  },
  {
    id: "code-read",
    difficulty: 2,
    text: "Code is read far more often than it is written.",
  },
  {
    id: "accuracy-first",
    difficulty: 2,
    text: "Accuracy first, speed second; the combo follows.",
  },
  {
    id: "expert-beginner",
    difficulty: 2,
    text: "Every expert was once a beginner who kept going.",
  },
  {
    id: "invent-future",
    difficulty: 2,
    text: "The best way to predict the future is to invent it.",
  },
  {
    id: "debug-detective",
    difficulty: 2,
    text: "Debugging is like being the detective in a crime movie.",
  },
  {
    id: "simplicity-soul",
    difficulty: 3,
    text: "Simplicity is the soul of efficiency, so keep your code clean.",
  },
  {
    id: "solve-then-write",
    difficulty: 3,
    text: "First, solve the problem; then, write the code that solves it.",
  },
  {
    id: "magic-work",
    difficulty: 3,
    text: "The magic you are looking for is in the work you are avoiding.",
  },
  {
    id: "talk-cheap",
    difficulty: 3,
    text: "Talk is cheap; show me the code, said a very famous programmer.",
  },
  {
    id: "programs-people",
    difficulty: 3,
    text: "Programs must be written for people to read, machines to execute.",
  },
];

if (RAW_SENTENCES.length === 0) {
  throw new Error(
    "Spellcaster sentence bank is empty: add at least one sentence to src/data/sentences.js."
  );
}

for (const sentence of RAW_SENTENCES) {
  if (sentence.text.trim().length === 0) {
    throw new Error(`Sentence "${sentence.id}" is empty.`);
  }
}

export const SENTENCES = [...RAW_SENTENCES].sort(
  (a, b) => a.difficulty - b.difficulty
);
