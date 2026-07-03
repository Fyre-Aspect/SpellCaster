import { snippets, BLANK_MARKER } from "./snippets.js";
import { checkAnswers } from "./checker.js";
import {
  state,
  startRun,
  currentSnippet,
  recordCorrectSnippet,
  recordWrongSubmit,
  STARTING_LIVES,
} from "./state.js";

const hudEl = document.querySelector("#hud");
const gameEl = document.querySelector("#game");
const hintToggleEl = document.querySelector("#hint-toggle");
const flashEl = document.querySelector("#flash");
const titleScreenE1 = document.querySelector("#title-screen");
const playScreenE1 = document.querySelector("#play-screen");
const gameOverScreenE1 = document.querySelector("#game-over-screen");
const startBtn = document.querySelector("#start-btn");
const titleHighScoreEl = document.querySelector("#title-high-score");


let hintsEnabled = false;
let currentInputs = [];
let currentAnswers = [];
const SNIPPET_MS = 12000;
let timerId = null;
const HIGH_SCORE_KEY = "spellcaster.highScore";
let highScore = loadHighScore();

function applyHints() {
  hintToggleEl.textContent = hintsEnabled ? "💡 Answers: On" : "💡 Answers: Off";
  hintToggleEl.setAttribute("aria-pressed", String(hintsEnabled));
  currentInputs.forEach((input, i) => {
    input.placeholder = hintsEnabled ? (currentAnswers[i] ?? "") : "";
  });
}

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
    "❤️".repeat(state.lives) + "🖤".repeat(STARTING_LIVES - state.lives);
  hudEl.replaceChildren(
    hudItem("Score", `⭐ ${state.score}`),
    hudItem("Combo", `🔥 ×${state.combo}`),
    hudItem("Lives", hearts)
  );
}

function loadHighScore() {
  const raw = localStorage.getItem(HIGH_SCORE_KEY);
  const value = Number.parseInt(raw,10);
  return Number.isFinite(value) ? value : 0;
}

function saveHighScore(score) {
  localStorage.setItem(HIGH_SCORE_KEY, String(score));
}

function showScreen() {
  titleScreenE1.classList.toggle("active", state.screen === "title");
  playScreenE1.classList.toggle("active", state.screen === "playing");
  gameOverScreenE1.classList.toggle("active", state.screen === "gameOver");
}

function stopTimer() {
  if (timerId !== null){
    clearInterval(timerId);
    timerId = null;
  }
}

function startTimer(bar, inputs) {
  const startedAt = Date.now();
  timerId = setInterval(() => {
    const remaining = SNIPPET_MS - (Date.now() - startedAt);
    const fraction = Math.max(0, remaining / SNIPPET_MS);
    bar.style.width = `${fraction * 100}%`;
    bar.classList.toggle("warning", fraction < 0.25);
    if (remaining <= 0) {
      stopTimer();
      handleTimeUp(inputs);
    }

  }, 50);

}

function handleTimeout(inputs) {
  inputs.forEach((input) => (input.disabled = true));
  recordWrongSubmit();
  flash("miss");
  renderHud();
  if (state.gameOver) {
    renderGameOver(gameEl);
  } else {
    setTimeout(() => renderSnippet(currentSnippet(), gameEl), 600);
  }
}

function flash(kind) {
  flashE1.classList.remove("flash-miss", "flash-correct");
  void flashE1.offsetWidth;
  flashE1.classList.add(kind === "correct" ? "flash-correct" : "flash-miss");
}


function showComboPopup(combo) {
  const popup = document.createElement("div");
  popup.className = "combo-popup";
  popup.textContent = `🔥 ×${combo}`;
  document.body.appendChild(popup);
  popup.addEventListener("animationend", () => popup.remove());
}

function renderSnippet(snippet, container) {
  stopTimer();

  const pre = document.createElement("pre");
  pre.className = "snippet";
  const code = document.createElement("code");
  const inputs = [];

  const bar = document.createElement("div");
  bar.className = "timerbar";

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

  currentInputs = inputs;
  currentAnswers = snippet.answers;
  applyHints();

  pre.append(code);
  container.replaceChildren(bar, pre);
  inputs[0]?.focus();

  startTimer(bar, inputs);
}


function renderGameOver(container) {
  const panel = document.createElement("div");
  panel.className = "game-over";
  const emoji = document.createElement("p");
  emoji.className = "game-over-emoji";
  emoji.textContent = state.runComplete ? "🏆" : "💀";
  const title = document.createElement("p");
  title.className = state.runComplete
    ? "game-over-title win"
    : "game-over-title";
  title.textContent = state.runComplete ? "RUN COMPLETE!" : "GAME OVER";
  const scoreLine = document.createElement("p");
  scoreLine.className = "game-over-score";
  scoreLine.textContent = `Final score: ⭐ ${state.score}`;
  const again = document.createElement("button");
  again.type = "button";
  again.className = "btn";
  again.textContent = "🔄 Play Again";
  again.addEventListener("click", startGame);
  panel.append(emoji, title, scoreLine, again);
  container.replaceChildren(panel);
  again.focus();
}

function submitAnswers(snippet, inputs) {
  if (state.gameOver || inputs.some((input) => input.disabled)) return;

  const results = checkAnswers(
    inputs.map((input) => input.value),
    snippet.answers
  );
  inputs.forEach((input, i) => {
    input.classList.remove("correct", "wrong");
    void input.offsetWidth;
    input.classList.add(results[i] ? "correct" : "wrong");
  });

  if (results.every(Boolean)) {
    stopTimer();
    inputs.forEach((input) => (input.disabled = true));
    recordCorrectSnippet();
    flash("correct");
    showComboPopup(state.combo);
    renderHud();
    setTimeout(() => {
      if (state.gameOver) {
        renderGameOver(gameEl);
      } else {
        renderSnippet(currentSnippet(), gameEl);
      }
    }, 600);
  } else {
    recordWrongSubmit();
    flash("miss");
    renderHud();
    if (state.gameOver) {
      stopTimer();
      renderGameOver(gameEl);
    } else {
      inputs[results.indexOf(false)]?.focus();
    }
  }
}


function startGame() {
  stopTimer();
  startRun(snippets);
  renderHud();
  renderSnippet(currentSnippet(), gameEl);
}


hintToggleEl.addEventListener("click", () => {
  hintsEnabled = !hintsEnabled;
  applyHints();
});

console.log("snippets loaded:", snippets.length);
startGame();
