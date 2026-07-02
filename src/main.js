import { snippets, BLANK_MARKER } from "./snippets.js";
import { checkAnswers } from "./checker.js";

function renderSnippet(snippet, container) {
  const pre = document.createElement("pre");
  pre.className = "snippet";
  const code = document.createElement("code");
  const inputs = [];

  const parts = snippet.code.split(BLANK_MARKER);
  if (parts.length - 1 !== snippet.answers.length) {
    console.warn(
      `Snippet "${snippet.id}" has ${parts.length - 1} blanks but ${snippet.answers.length} answers`
    );
  }

  parts.forEach((part, i) => {
    code.append(part);
    if (i < parts.length - 1) {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "blank";
      input.autocomplete = "off";
      input.spellcheck = false;
      const answer = snippet.answers[i] ?? "";
      input.style.width = `${Math.max(4, answer.length + 1)}ch`;
      inputs.push(input);
      code.append(input);
    }
  });

  code.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submitAnswers(snippet, inputs);
  });

  pre.append(code);
  container.replaceChildren(pre);
  inputs[0]?.focus();
}

function submitAnswers(snippet, inputs) {
  const results = checkAnswers(
    inputs.map((input) => input.value),
    snippet.answers
  );
  inputs.forEach((input, i) => {
    input.classList.toggle("correct", results[i]);
    input.classList.toggle("wrong", !results[i]);
  });
}

console.log("snippets loaded:", snippets.length);
renderSnippet(snippets[0], document.querySelector("#game"));
