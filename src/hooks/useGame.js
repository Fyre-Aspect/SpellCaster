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
import { computeAccuracy, computeWpm, createBot } from "../logic/race.js";
import { gameReducer, initialState } from "../logic/machine.js";

const BEST_KEY = "spellcaster.best.v1";
const PEEK_PENALTY_CHARS = 4;
const COMBO_STEP = 10;
const COMBO_VISIBLE_MS = 1000;

function loadBest() {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
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
    streak: 0,
    combo: null,
    errorPing: 0,
    peekedCurrent: false,
  };
}

export default function useGame() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [live, setLive] = useState(emptyLive);
  const [best, setBest] = useState(loadBest);
  const [count, setCount] = useState(null);
  const [peekHeld, setPeekHeld] = useState(false);
  const dataRef = useRef(null);
  const comboTimerRef = useRef(null);

  const snippet = useMemo(() => snippetForRound(state.round), [state.round]);
  const segments = useMemo(() => parseTemplate(snippet.template), [snippet]);

  const syncLive = useCallback(() => {
    const d = dataRef.current;
    if (!d) return;
    const expected = d.answers[d.blankIndex] ?? "";
    const typedCorrect = d.completedChars + correctCharCount(d.typed, expected);
    const effective = Math.max(0, typedCorrect - d.penaltyChars);
    let playerProgress = Math.min(1, effective / d.total);
    let botProgress = Math.min(1, d.botChars / d.total);
    if (d.finished && d.winner === "player") playerProgress = 1;
    if (d.finished && d.winner === "bot") botProgress = 1;
    setLive({
      blankIndex: d.blankIndex,
      typed: d.typed,
      playerProgress,
      botProgress,
      wpm: computeWpm(typedCorrect, d.elapsed),
      accuracy: computeAccuracy(d.correctKeystrokes, d.keystrokes),
      elapsed: d.elapsed,
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
        winner,
        timeSeconds: d.elapsed,
        wpm: computeWpm(typedCorrect, d.elapsed),
        accuracy: computeAccuracy(d.correctKeystrokes, d.keystrokes),
        round: d.round,
        snippetId: d.snippet.id,
        newBest: false,
      };
      if (winner === "player") {
        const prev = loadBest();
        if (!prev || stats.wpm > prev.wpm) {
          const next = { wpm: stats.wpm, timeSeconds: stats.timeSeconds };
          try {
            localStorage.setItem(BEST_KEY, JSON.stringify(next));
          } catch {
            /* storage unavailable */
          }
          setBest(next);
          stats.newBest = true;
        }
      }
      syncLive();
      dispatch({ type: "FINISH", stats });
    },
    [syncLive]
  );

  const initRace = useCallback(
    (round) => {
      const s = snippetForRound(round);
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      dataRef.current = {
        round,
        snippet: s,
        answers: s.answers,
        total: totalAnswerChars(s.answers),
        blankIndex: 0,
        typed: "",
        completedChars: 0,
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
        bot: createBot(),
        finished: false,
        winner: null,
      };
      setPeekHeld(false);
      syncLive();
    },
    [syncLive]
  );

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
          finishRace("player");
          return;
        }
      }
      syncLive();
    },
    [finishRace, syncLive]
  );

  useEffect(() => {
    if (state.screen !== "countdown") return;
    initRace(state.round);
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
  }, [state.screen, state.round, initRace]);

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
        d.botChars += d.bot.tick(dt);
        if (d.botChars >= d.total) finishRace("bot");
        else syncLive();
      }
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [state.screen, finishRace, syncLive]);

  useEffect(() => {
    function onKeyDown(e) {
      if (state.screen === "menu") {
        if (e.key === "Enter") {
          e.preventDefault();
          dispatch({ type: "START" });
        }
        return;
      }
      if (state.screen === "finished") {
        if (e.key === "Enter") {
          e.preventDefault();
          dispatch({ type: "RACE_AGAIN" });
        }
        return;
      }
      if (state.screen !== "racing") return;
      if (e.key === "Control") {
        if (!e.repeat) {
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
  }, [state.screen, applyPeekPenalty, typeChar, syncLive]);

  useEffect(() => {
    return () => {
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    };
  }, []);

  return {
    screen: state.screen,
    round: state.round,
    result: state.result,
    snippet,
    segments,
    live,
    best,
    count,
    peekHeld,
    peekPenalty: PEEK_PENALTY_CHARS,
    start: () => dispatch({ type: "START" }),
    raceAgain: () => dispatch({ type: "RACE_AGAIN" }),
    peekStart: () => {
      if (state.screen === "racing") {
        applyPeekPenalty();
        setPeekHeld(true);
      }
    },
    peekEnd: () => setPeekHeld(false),
  };
}
