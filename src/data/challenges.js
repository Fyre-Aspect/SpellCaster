import { BLANK_MARKER, SNIPPETS, parseTemplate } from "./snippets.js";
import { SENTENCES } from "./sentences.js";
import { aiSnippets, aiSentences } from "./aiPool.js";

export const CONTENT_TYPES = {
  blanks: { id: "blanks", label: "Fill the blanks" },
  full: { id: "full", label: "Full code" },
  sentences: { id: "sentences", label: "Sentences" },
};

function fullCodeOf(snippet) {
  const parts = snippet.template.split(BLANK_MARKER);
  return parts.reduce(
    (code, part, i) => code + part + (snippet.answers[i] ?? ""),
    ""
  );
}

function lineSegments(code) {
  const segments = [];
  const answers = [];
  code.split("\n").forEach((line, i) => {
    const indent = line.match(/^\s*/)[0];
    const content = line.slice(indent.length);
    const prefix = i > 0 ? `\n${indent}` : indent;
    if (prefix) segments.push({ type: "text", value: prefix });
    if (content) {
      segments.push({ type: "blank", index: answers.length });
      answers.push(content);
    }
  });
  return { segments, answers };
}

export function challengeForRound(round, contentType) {
  if (contentType === "sentences") {
    // AI extras append to the bank so later rounds see fresh material
    const bank = SENTENCES.concat(aiSentences());
    const sentence = bank[(round - 1) % bank.length];
    return {
      id: sentence.id,
      difficulty: sentence.difficulty,
      segments: [{ type: "blank", index: 0 }],
      answers: [sentence.text],
    };
  }
  const snippetBank = SNIPPETS.concat(aiSnippets());
  const snippet = snippetBank[(round - 1) % snippetBank.length];
  if (contentType === "full") {
    const { segments, answers } = lineSegments(fullCodeOf(snippet));
    return {
      id: snippet.id,
      difficulty: snippet.difficulty,
      segments,
      answers,
    };
  }
  return {
    id: snippet.id,
    difficulty: snippet.difficulty,
    segments: parseTemplate(snippet.template),
    answers: snippet.answers,
  };
}
