import { snippets, BLANK_MARKER } from "./snippets.js";
import { checkAnswers } from "./checker.js";
import {
  state,
  resetState,
  recordCorrectSnippet,
  recordWrongSubmit,
  STARTING_LIVES,
} from "./state.js";

const hudEl = document.querySelector("#hud");
const gameEl = document.querySelector("#game");

function hudItem(label, value) {
  const item = document.createElement("span");
  item.className = "hud-item";
  const labelEl = document.createElement("span");
  labelEl.className = "hud-label";
  labelEl.textContent = label;
  const valueEl = document.createElement("span");
  valueEl.className = "hud-value";
  valueEl.textContent = value;
  item.append(labelEl, valueEl);
  return item;
}

function renderHud() {
  const hearts =
    "♥".repeat(state.lives) + "♡".repeat(STARTING_LIVES - state.lives);
  hudEl.replaceChildren(
    hudItem("Score", state.score),
    hudItem("Combo", `×${state.combo}`),
    hudItem("Lives", hearts)
  );
}

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

function renderGameOver(container) {
  const panel = document.createElement("div");
  panel.className = "game-over";
  const title = document.createElement("p");
  title.className = "game-over-title";
  title.textContent = "Game Over";
  const scoreLine = document.createElement("p");
  scoreLine.className = "game-over-score";
  scoreLine.textContent = `Final score: ${state.score}`;
  panel.append(title, scoreLine);
  container.replaceChildren(panel);
}

function submitAnswers(snippet, inputs) {
  if (state.gameOver || inputs.some((input) => input.disabled)) return;

  const results = checkAnswers(
    inputs.map((input) => input.value),
    snippet.answers
  );
  inputs.forEach((input, i) => {
    input.classList.toggle("correct", results[i]);
    input.classList.toggle("wrong", !results[i]);
  });

  if (results.every(Boolean)) {
    inputs.forEach((input) => (input.disabled = true));
    recordCorrectSnippet(snippet.difficulty, snippets.length);
    renderHud();
    setTimeout(() => renderSnippet(snippets[state.snippetIndex], gameEl), 600);
  } else {
    recordWrongSubmit();
    renderHud();
    if (state.gameOver) renderGameOver(gameEl);
  }
}

console.log("snippets loaded:", snippets.length);
resetState();
renderHud();
renderSnippet(snippets[state.snippetIndex], gameEl);
