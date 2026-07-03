import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  parseTemplate,
  snippetForRound,
  totalAnswerChars,
} from "../data/snippets.js";
import { checkAnswer, correctCharCount } from "../logic/typing.js";
import {
  BOT_DIFFICULTIES,
  computeAccuracy,
  computeWpm,
  createBot,
} from "../logic/race.js";
import { gameReducer, initialState, MODES } from "../logic/machine.js";

const ANSWERS_KEY = "spellcaster.show-answers.v1";
const MODE_KEY = "spellcaster.mode.v1";
const DIFFICULTY_KEY = "spellcaster.difficulty.v1";
const PEEK_PENALTY_CHARS = 4;
const COMBO_STEP = 10;
const COMBO_VISIBLE_MS = 1000;

function bestKeyFor(mode, difficulty) {
  return mode === "race"
    ? `spellcaster.best.race.${difficulty}.v1`
    : `spellcaster.best.${mode}.v1`;
}

function loadJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

function loadChoice(key, fallback, validValues) {
  try {
    const value = localStorage.getItem(key);
    return validValues.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function saveChoice(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

function loadShowAnswers() {
  try {
    return localStorage.getItem(ANSWERS_KEY) !== "false";
  } catch {
    return true;
  }
}

function emptyLive() {
  return {
    blankIndex: 0,
    typed: "",
    playerProgress: 0,
    botProgress: 0,
    wpm: 0,
    accuracy: 100,
    elapsed: 0,
    remaining: null,
    snippets: 0,
    streak: 0,
    combo: null,
    errorPing: 0,
    peekedCurrent: false,
  };
}

export default function useGame() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [live, setLive] = useState(emptyLive);
  const [count, setCount] = useState(null);
  const [peekHeld, setPeekHeld] = useState(false);
  const [showAnswers, setShowAnswers] = useState(loadShowAnswers);
  const [selectedMode, setSelectedMode] = useState(() =>
    loadChoice(MODE_KEY, "race", Object.keys(MODES))
  );
  const [difficulty, setDifficulty] = useState(() =>
    loadChoice(DIFFICULTY_KEY, "medium", Object.keys(BOT_DIFFICULTIES))
  );
  const [bestBump, setBestBump] = useState(0);
  const dataRef = useRef(null);
  const comboTimerRef = useRef(null);

  const snippet = useMemo(() => snippetForRound(state.round), [state.round]);
  const segments = useMemo(() => parseTemplate(snippet.template), [snippet]);

  const bestKey = bestKeyFor(selectedMode, difficulty);
  const best = useMemo(() => loadJson(bestKey), [bestKey, bestBump]);

  const syncLive = useCallback(() => {
    const d = dataRef.current;
    if (!d) return;
    const expected = d.answers[d.blankIndex] ?? "";
    const snippetCorrect = d.completedChars + correctCharCount(d.typed, expected);
    const runCorrect = d.runChars + snippetCorrect;
    let playerProgress;
    if (d.mode === "race") {
      const effective = Math.max(0, snippetCorrect - d.penaltyChars);
      playerProgress = Math.min(1, effective / d.total);
    } else {
      playerProgress = Math.min(1, snippetCorrect / d.total);
    }
    let botProgress = d.mode === "race" ? Math.min(1, d.botChars / d.total) : 0;
    if (d.finished && d.winner === "player") playerProgress = 1;
    if (d.finished && d.winner === "bot") botProgress = 1;
    setLive({
      blankIndex: d.blankIndex,
      typed: d.typed,
      playerProgress,
      botProgress,
      wpm: computeWpm(runCorrect, d.elapsed),
      accuracy: computeAccuracy(d.correctKeystrokes, d.keystrokes),
      elapsed: d.elapsed,
      remaining: d.timeLimit != null ? Math.max(0, d.timeLimit - d.elapsed) : null,
      snippets: d.snippetsCompleted,
      streak: d.streak,
      combo: d.combo,
      errorPing: d.errorPing,
      peekedCurrent: d.peekedBlanks.has(d.blankIndex),
    });
  }, []);

  const finishRace = useCallback(
    (winner) => {
      const d = dataRef.current;
      if (!d || d.finished) return;
      d.finished = true;
      d.winner = winner;
      const expected = d.answers[d.blankIndex] ?? "";
      const typedCorrect =
        d.completedChars + correctCharCount(d.typed, expected);
      const stats = {
        mode: "race",
        difficulty: d.difficulty,
        winner,
        timeSeconds: d.elapsed,
        wpm: computeWpm(typedCorrect, d.elapsed),
        accuracy: computeAccuracy(d.correctKeystrokes, d.keystrokes),
        round: d.round,
        snippetId: d.snippet.id,
        newBest: false,
      };
      if (winner === "player") {
        const key = bestKeyFor("race", d.difficulty);
        const prev = loadJson(key);
        if (!prev || stats.wpm > prev.wpm) {
          saveJson(key, { wpm: stats.wpm, timeSeconds: stats.timeSeconds });
          setBestBump((b) => b + 1);
          stats.newBest = true;
        }
      }
      syncLive();
      dispatch({ type: "FINISH", stats });
    },
    [syncLive]
  );

  const finishRun = useCallback(() => {
    const d = dataRef.current;
    if (!d || d.finished || d.mode === "race") return;
    d.finished = true;
    d.winner = null;
    if (d.timeLimit != null && d.elapsed > d.timeLimit) d.elapsed = d.timeLimit;
    const expected = d.answers[d.blankIndex] ?? "";
    const runCorrect =
      d.runChars + d.completedChars + correctCharCount(d.typed, expected);
    const score = Math.max(0, runCorrect - d.penaltyChars);
    const stats = {
      mode: d.mode,
      winner: null,
      timeSeconds: d.elapsed,
      wpm: computeWpm(runCorrect, d.elapsed),
      accuracy: computeAccuracy(d.correctKeystrokes, d.keystrokes),
      snippets: d.snippetsCompleted,
      chars: score,
      round: d.round,
      snippetId: d.snippet.id,
      newBest: false,
    };
    const key = bestKeyFor(d.mode);
    const prev = loadJson(key);
    if (d.mode === "endless") {
      if (d.snippetsCompleted >= 1 && (!prev || stats.wpm > prev.wpm)) {
        saveJson(key, { wpm: stats.wpm, snippets: stats.snippets });
        setBestBump((b) => b + 1);
        stats.newBest = true;
      }
    } else if (score > 0 && (!prev || score > prev.chars)) {
      saveJson(key, { chars: score, wpm: stats.wpm });
      setBestBump((b) => b + 1);
      stats.newBest = true;
    }
    syncLive();
    dispatch({ type: "FINISH", stats });
  }, [syncLive]);

  const initRace = useCallback(
    (round, mode, difficultyId) => {
      const s = snippetForRound(round);
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      dataRef.current = {
        mode,
        difficulty: difficultyId,
        round,
        snippet: s,
        answers: s.answers,
        total: totalAnswerChars(s.answers),
        blankIndex: 0,
        typed: "",
        completedChars: 0,
        runChars: 0,
        snippetsCompleted: 0,
        penaltyChars: 0,
        peekedBlanks: new Set(),
        keystrokes: 0,
        correctKeystrokes: 0,
        streak: 0,
        combo: null,
        comboSeq: 0,
        errorPing: 0,
        botChars: 0,
        elapsed: 0,
        bot: mode === "race" ? createBot(BOT_DIFFICULTIES[difficultyId]) : null,
        timeLimit: MODES[mode].timeLimit ?? null,
        finished: false,
        winner: null,
      };
      setPeekHeld(false);
      syncLive();
    },
    [syncLive]
  );

  const advanceSnippet = useCallback((d) => {
    d.runChars += d.total;
    d.snippetsCompleted += 1;
    d.round += 1;
    const s = snippetForRound(d.round);
    d.snippet = s;
    d.answers = s.answers;
    d.total = totalAnswerChars(s.answers);
    d.blankIndex = 0;
    d.typed = "";
    d.completedChars = 0;
    d.peekedBlanks = new Set();
    dispatch({ type: "NEXT_SNIPPET" });
  }, []);

  const applyPeekPenalty = useCallback(() => {
    const d = dataRef.current;
    if (!d || d.finished) return;
    if (!d.peekedBlanks.has(d.blankIndex)) {
      d.peekedBlanks.add(d.blankIndex);
      d.penaltyChars += PEEK_PENALTY_CHARS;
      syncLive();
    }
  }, [syncLive]);

  const typeChar = useCallback(
    (key) => {
      const d = dataRef.current;
      if (!d || d.finished) return;
      const expected = d.answers[d.blankIndex];
      d.keystrokes += 1;
      if (d.typed.length >= expected.length) {
        d.streak = 0;
        d.errorPing += 1;
        syncLive();
        return;
      }
      const correct = key === expected[d.typed.length];
      d.typed += key;
      if (correct) {
        d.correctKeystrokes += 1;
        d.streak += 1;
        if (d.streak % COMBO_STEP === 0) {
          d.comboSeq += 1;
          d.combo = { id: d.comboSeq, value: d.streak };
          if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
          comboTimerRef.current = setTimeout(() => {
            if (dataRef.current) {
              dataRef.current.combo = null;
              syncLive();
            }
          }, COMBO_VISIBLE_MS);
        }
      } else {
        d.streak = 0;
        d.errorPing += 1;
      }
      if (checkAnswer(d.typed, expected)) {
        d.completedChars += expected.length;
        d.blankIndex += 1;
        d.typed = "";
        if (d.blankIndex >= d.answers.length) {
          if (d.mode === "race") {
            finishRace("player");
            return;
          }
          advanceSnippet(d);
        }
      }
      syncLive();
    },
    [advanceSnippet, finishRace, syncLive]
  );

  useEffect(() => {
    if (state.screen !== "countdown") return;
    initRace(state.round, state.mode, difficulty);
    setCount(3);
    const timers = [
      setTimeout(() => setCount(2), 750),
      setTimeout(() => setCount(1), 1500),
      setTimeout(() => setCount("GO"), 2250),
      setTimeout(() => dispatch({ type: "GO" }), 2900),
    ];
    return () => {
      timers.forEach(clearTimeout);
      setCount(null);
    };
  }, [state.screen, state.round, state.mode, difficulty, initRace]);

  useEffect(() => {
    if (state.screen !== "racing") return;
    let rafId;
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const d = dataRef.current;
      if (d && !d.finished) {
        d.elapsed += dt;
        if (d.mode === "race") {
          d.botChars += d.bot.tick(dt);
          if (d.botChars >= d.total) finishRace("bot");
          else syncLive();
        } else if (d.timeLimit != null && d.elapsed >= d.timeLimit) {
          finishRun();
        } else {
          syncLive();
        }
      }
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [state.screen, finishRace, finishRun, syncLive]);

  useEffect(() => {
    function onKeyDown(e) {
      if (state.screen === "menu") {
        if (e.key === "Enter") {
          e.preventDefault();
          dispatch({ type: "START", mode: selectedMode });
        }
        return;
      }
      if (state.screen === "countdown") {
        if (e.key === "Escape") {
          e.preventDefault();
          dispatch({ type: "ABORT" });
        }
        return;
      }
      if (state.screen === "finished") {
        if (e.key === "Enter") {
          e.preventDefault();
          dispatch({ type: "RACE_AGAIN" });
        }
        if (e.key === "Escape") {
          e.preventDefault();
          dispatch({ type: "MENU" });
        }
        return;
      }
      if (state.screen !== "racing") return;
      if (e.key === "Escape") {
        e.preventDefault();
        const d = dataRef.current;
        if (d && !d.finished) {
          if (d.mode === "race") dispatch({ type: "ABORT" });
          else finishRun();
        }
        return;
      }
      if (e.key === "Control") {
        if (!showAnswers && !e.repeat) {
          applyPeekPenalty();
          setPeekHeld(true);
        }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        const d = dataRef.current;
        if (d && !d.finished && d.typed.length > 0) {
          d.typed = d.typed.slice(0, -1);
          syncLive();
        }
        return;
      }
      if (e.key.length === 1) {
        e.preventDefault();
        typeChar(e.key);
      }
    }
    function onKeyUp(e) {
      if (e.key === "Control") setPeekHeld(false);
    }
    function onBlur() {
      setPeekHeld(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [
    state.screen,
    selectedMode,
    showAnswers,
    applyPeekPenalty,
    typeChar,
    finishRun,
    syncLive,
  ]);

  useEffect(() => {
    return () => {
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    };
  }, []);

  return {
    screen: state.screen,
    mode: state.mode,
    round: state.round,
    result: state.result,
    snippet,
    segments,
    live,
    best,
    count,
    peekHeld,
    peekPenalty: PEEK_PENALTY_CHARS,
    showAnswers,
    selectedMode,
    difficulty,
    selectMode: (mode) => {
      setSelectedMode(mode);
      saveChoice(MODE_KEY, mode);
    },
    selectDifficulty: (id) => {
      setDifficulty(id);
      saveChoice(DIFFICULTY_KEY, id);
    },
    toggleAnswers: () => {
      setShowAnswers((prev) => {
        const next = !prev;
        saveChoice(ANSWERS_KEY, String(next));
        return next;
      });
    },
    start: () => dispatch({ type: "START", mode: selectedMode }),
    raceAgain: () => dispatch({ type: "RACE_AGAIN" }),
    toMenu: () => dispatch({ type: "MENU" }),
    peekStart: () => {
      if (state.screen === "racing" && !showAnswers) {
        applyPeekPenalty();
        setPeekHeld(true);
      }
    },
    peekEnd: () => setPeekHeld(false),
  };
}
