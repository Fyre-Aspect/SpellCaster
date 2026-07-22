import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { totalAnswerChars } from "../data/snippets.js";
import { challengeForRound, CONTENT_TYPES } from "../data/challenges.js";
import {
  checkAnswer,
  correctCharCount,
  lenientMask,
} from "../logic/typing.js";
import {
  BATTLE_STYLES,
  SPELL_ORDER,
  applyCast,
  createBattle,
  createPvpBattle,
  incantationFor,
  tickBattle,
} from "../logic/battle.js";
import { aiPoolCount, refreshAiPool } from "../data/aiPool.js";
import {
  BOT_DIFFICULTIES,
  computeAccuracy,
  computeWpm,
  createBot,
} from "../logic/race.js";
import { gameReducer, initialState, MODES } from "../logic/machine.js";
import { loadHistory, recordRun, summarizeHistory } from "../logic/stats.js";
import {
  initAudio,
  keyTick,
  errorBuzz,
  comboPop,
  countBeep,
  goBeep,
  winFanfare,
  loseSlide,
  finishChime,
  uiClick,
  isMuted,
  toggleMuted,
} from "../audio/sfx.js";

const ANSWERS_KEY = "spellcaster.show-answers.v1";
const MODE_KEY = "spellcaster.mode.v1";
const DIFFICULTY_KEY = "spellcaster.difficulty.v1";
const CONTENT_KEY = "spellcaster.content.v1";
const BATTLE_STYLE_KEY = "spellcaster.battlestyle.v1";
const POP_VISIBLE_MS = 1400;
const PEEK_PENALTY_CHARS = 4;
const COMBO_STEP = 10;
const COMBO_VISIBLE_MS = 1000;

// IDE-style pairs: typing the opener when its mate is the very next expected
// char inserts both, like an editor's auto-close
const AUTO_PAIRS = {
  "(": ")",
  "[": "]",
  "{": "}",
  '"': '"',
  "'": "'",
  "`": "`",
};

// A trailing run of closers/punctuation that Enter may complete in one press
const CLOSER_TAIL_RE = /^[)\]};,\s]*$/;
const HAS_CLOSER_RE = /[)\]}]/;

const isBattleMode = (mode) => mode === "battle" || mode === "pvp";

function bestKeyFor(mode, difficulty, content) {
  if (mode === "race") {
    return `spellcaster.best.race.${difficulty}.${content}.v1`;
  }
  if (mode === "battle") {
    return `spellcaster.best.battle.${difficulty}.v1`;
  }
  return `spellcaster.best.${mode}.${content}.v1`;
}

// String-literal contents are lenient in code content; sentences and
// word-spell incantations are typed exactly
function maskFor(d, expected) {
  if (!expected || d.content === "sentences") return null;
  if (isBattleMode(d.mode)) {
    return d.battleStyle === "code" ? lenientMask(expected) : null;
  }
  return lenientMask(expected);
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

function collectMisses(d) {
  return d.blankLog.filter((b) => b.wrong > 0 || b.peeked).slice(0, 10);
}

function recordRunFrom(d, stats) {
  recordRun({
    at: Date.now(),
    mode: stats.mode,
    difficulty: d.difficulty,
    content: d.content,
    wpm: stats.wpm,
    accuracy: stats.accuracy,
    timeSeconds: stats.timeSeconds,
    winner: stats.winner,
    snippets: d.snippetsCompleted,
    chars: stats.chars ?? null,
    round: d.round,
  });
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
    battle: null,
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
  const [content, setContent] = useState(() =>
    loadChoice(CONTENT_KEY, "blanks", Object.keys(CONTENT_TYPES))
  );
  const [battleStyle, setBattleStyle] = useState(() =>
    loadChoice(BATTLE_STYLE_KEY, "words", Object.keys(BATTLE_STYLES))
  );
  const [bestBump, setBestBump] = useState(0);
  const [historyBump, setHistoryBump] = useState(0);
  const [aiBump, setAiBump] = useState(0);
  const [muted, setMuted] = useState(isMuted);
  const dataRef = useRef(null);
  const comboTimerRef = useRef(null);
  const castPopTimerRef = useRef(null);
  const enemyPopTimerRef = useRef(null);

  const history = useMemo(() => loadHistory(), [historyBump]);
  const summary = useMemo(() => summarizeHistory(history), [history]);

  const challenge = useMemo(
    () => challengeForRound(state.round, content),
    [state.round, content]
  );

  const bestKey = bestKeyFor(selectedMode, difficulty, content);
  const best = useMemo(() => loadJson(bestKey), [bestKey, bestBump]);

  const syncLive = useCallback(() => {
    const d = dataRef.current;
    if (!d) return;
    const expected = d.answers[d.blankIndex] ?? "";
    const snippetCorrect =
      d.completedChars + correctCharCount(d.typed, expected, maskFor(d, expected));
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
      battle: d.battle
        ? {
            pvp: d.battle.pvp,
            turn: d.battle.pvp ? d.battle.turn : null,
            playerHp: Math.max(0, Math.ceil(d.battle.playerHp)),
            playerMax: d.battle.playerMax,
            playerShield: Math.round(d.battle.playerShield),
            playerPoisonLeft: d.battle.playerPoison
              ? Math.ceil(d.battle.playerPoison.left)
              : 0,
            enemyHp: Math.max(0, Math.ceil(d.battle.enemyHp)),
            enemyMax: d.battle.enemyMax,
            enemyShield: Math.round(d.battle.enemyShield),
            enemyPoisonLeft: d.battle.enemyPoison
              ? Math.ceil(d.battle.enemyPoison.left)
              : 0,
            enemyCast: d.battle.enemy.casting
              ? {
                  spellId: d.battle.enemy.casting.spellId,
                  progress:
                    1 -
                    d.battle.enemy.casting.left / d.battle.enemy.casting.total,
                }
              : null,
            selectedSpell: d.selectedSpell,
            incantation: d.answers[0] ?? null,
            synopsis: d.castSynopsis ?? null,
            style: d.battleStyle,
            castSeq: d.castSeq,
            lastCast: d.lastCast,
            lastEnemyCast: d.lastEnemyCast,
          }
        : null,
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
        d.completedChars +
        correctCharCount(d.typed, expected, maskFor(d, expected));
      const stats = {
        mode: "race",
        difficulty: d.difficulty,
        winner,
        timeSeconds: d.elapsed,
        wpm: computeWpm(typedCorrect, d.elapsed),
        accuracy: computeAccuracy(d.correctKeystrokes, d.keystrokes),
        round: d.round,
        snippetId: d.challenge.id,
        newBest: false,
        misses: collectMisses(d),
        blanksTotal: d.blankLog.length,
      };
      recordRunFrom(d, stats);
      setHistoryBump((b) => b + 1);
      if (winner === "player") {
        const key = bestKeyFor("race", d.difficulty, d.content);
        const prev = loadJson(key);
        if (!prev || stats.wpm > prev.wpm) {
          saveJson(key, { wpm: stats.wpm, timeSeconds: stats.timeSeconds });
          setBestBump((b) => b + 1);
          stats.newBest = true;
        }
        winFanfare();
      } else {
        loseSlide();
      }
      syncLive();
      dispatch({ type: "FINISH", stats });
    },
    [syncLive]
  );

  const finishRun = useCallback(() => {
    const d = dataRef.current;
    if (!d || d.finished || d.mode === "race" || isBattleMode(d.mode)) return;
    d.finished = true;
    d.winner = null;
    if (d.timeLimit != null && d.elapsed > d.timeLimit) d.elapsed = d.timeLimit;
    const expected = d.answers[d.blankIndex] ?? "";
    const runCorrect =
      d.runChars +
      d.completedChars +
      correctCharCount(d.typed, expected, maskFor(d, expected));
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
      snippetId: d.challenge.id,
      newBest: false,
      misses: collectMisses(d),
      blanksTotal: d.blankLog.length,
    };
    recordRunFrom(d, stats);
    setHistoryBump((b) => b + 1);
    const key = bestKeyFor(d.mode, d.difficulty, d.content);
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
    finishChime();
    syncLive();
    dispatch({ type: "FINISH", stats });
  }, [syncLive]);

  const finishBattle = useCallback(
    (winner) => {
      const d = dataRef.current;
      if (!d || d.finished) return;
      d.finished = true;
      d.winner = winner;
      const stats = {
        mode: d.mode,
        difficulty: d.difficulty,
        winner,
        timeSeconds: d.elapsed,
        wpm: computeWpm(d.completedChars, d.elapsed),
        accuracy: computeAccuracy(d.correctKeystrokes, d.keystrokes),
        casts: d.casts,
        perfectCasts: d.perfectCasts,
        damageDealt: d.damageDealt,
        hpLeft: Math.max(0, Math.ceil(d.battle.playerHp)),
        round: d.round,
        snippetId: "duel",
        newBest: false,
        misses: collectMisses(d),
        blanksTotal: d.blankLog.length,
      };
      recordRunFrom(d, stats);
      setHistoryBump((b) => b + 1);
      if (d.mode === "pvp") {
        // Someone in the room won either way
        winFanfare();
      } else if (winner === "player") {
        const key = bestKeyFor("battle", d.difficulty, d.content);
        const prev = loadJson(key);
        if (!prev || stats.wpm > prev.wpm) {
          saveJson(key, { wpm: stats.wpm, timeSeconds: stats.timeSeconds });
          setBestBump((b) => b + 1);
          stats.newBest = true;
        }
        winFanfare();
      } else {
        loseSlide();
      }
      syncLive();
      dispatch({ type: "FINISH", stats });
    },
    [syncLive]
  );

  const initRace = useCallback(
    (round, mode, difficultyId, contentId) => {
      const c = challengeForRound(round, contentId);
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      dataRef.current = {
        mode,
        difficulty: difficultyId,
        content: contentId,
        round,
        startRound: round,
        challenge: c,
        answers: c.answers,
        total: totalAnswerChars(c.answers),
        blankIndex: 0,
        typed: "",
        autoClosedChar: null,
        autoClosedAt: -1,
        castKeystrokes: 0,
        castCorrect: 0,
        completedChars: 0,
        runChars: 0,
        snippetsCompleted: 0,
        penaltyChars: 0,
        peekedBlanks: new Set(),
        blankLog: [],
        currentBlankWrong: 0,
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
        battle: null,
      };
      if (isBattleMode(mode)) {
        const d = dataRef.current;
        d.battle =
          mode === "pvp" ? createPvpBattle() : createBattle(difficultyId);
        d.battleStyle = battleStyle;
        d.selectedSpell = null;
        d.answers = [];
        d.castSynopsis = null;
        d.castSeq = 0;
        d.castStart = 0;
        d.castKeystrokes = 0;
        d.castCorrect = 0;
        d.casts = 0;
        d.perfectCasts = 0;
        d.damageDealt = 0;
        d.lastCast = null;
        d.lastEnemyCast = null;
        d.enemySeq = 0;
      }
      setPeekHeld(false);
      syncLive();
    },
    [syncLive, battleStyle]
  );

  const advanceSnippet = useCallback((d) => {
    d.runChars += d.total;
    d.snippetsCompleted += 1;
    d.round += 1;
    const c = challengeForRound(d.round, d.content);
    d.challenge = c;
    d.answers = c.answers;
    d.total = totalAnswerChars(c.answers);
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

  // Returns true when the run just finished (caller should stop)
  const completeBlank = useCallback(
    (d, expected) => {
      d.blankLog.push({
        answer: expected,
        wrong: d.currentBlankWrong,
        peeked: d.peekedBlanks.has(d.blankIndex),
      });
      d.currentBlankWrong = 0;
      d.completedChars += expected.length;
      d.typed = "";
      d.autoClosedChar = null;
      d.autoClosedAt = -1;
      if (isBattleMode(d.mode)) {
        // The finished incantation becomes a cast: power scales with how
        // accurately and quickly it was typed. In PvP the current turn's
        // player is the caster.
        const side = d.mode === "pvp" ? d.battle.turn : "player";
        const seconds = Math.max(0.3, d.elapsed - d.castStart);
        const accuracy = computeAccuracy(d.castCorrect, d.castKeystrokes);
        const result = applyCast(
          d.battle,
          d.selectedSpell,
          {
            accuracy,
            seconds,
            chars: expected.length,
          },
          side
        );
        d.casts += 1;
        if (result.crit) d.perfectCasts += 1;
        if (result.type === "attack" || result.type === "poison") {
          d.damageDealt += result.amount;
        }
        d.castSeq += 1;
        const cast = { seq: d.castSeq, spellId: d.selectedSpell, side, ...result };
        const timerRef = side === "enemy" ? enemyPopTimerRef : castPopTimerRef;
        const slot = side === "enemy" ? "lastEnemyCast" : "lastCast";
        d[slot] = cast;
        d.selectedSpell = null;
        d.answers = [];
        d.castSynopsis = null;
        d.blankIndex = 0;
        const seq = d.castSeq;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          const cur = dataRef.current;
          if (cur && cur[slot]?.seq === seq) {
            cur[slot] = null;
            syncLive();
          }
        }, POP_VISIBLE_MS);
        goBeep();
        if (d.battle.over) {
          finishBattle(d.battle.winner);
          return true;
        }
        return false;
      }
      d.blankIndex += 1;
      if (d.blankIndex >= d.answers.length) {
        if (d.mode === "race") {
          finishRace("player");
          return true;
        }
        advanceSnippet(d);
      }
      return false;
    },
    [advanceSnippet, finishRace, finishBattle, syncLive]
  );

  const typeChar = useCallback(
    (key) => {
      const d = dataRef.current;
      if (!d || d.finished) return;
      const expected = d.answers[d.blankIndex];
      // Battle mode: nothing to type until a spell is picked
      if (expected == null) return;
      // VS Code-style type-over: pressing the closer we just auto-inserted
      // is absorbed instead of counting as a mistake
      if (
        d.autoClosedChar === key &&
        d.autoClosedAt === d.typed.length &&
        key !== expected[d.typed.length]
      ) {
        d.keystrokes += 1;
        d.correctKeystrokes += 1;
        d.castKeystrokes += 1;
        d.castCorrect += 1;
        d.autoClosedChar = null;
        d.autoClosedAt = -1;
        keyTick(d.streak);
        syncLive();
        return;
      }
      d.keystrokes += 1;
      d.castKeystrokes += 1;
      if (d.typed.length >= expected.length) {
        d.streak = 0;
        d.errorPing += 1;
        d.currentBlankWrong += 1;
        errorBuzz();
        syncLive();
        return;
      }
      const mask = maskFor(d, expected);
      const correct =
        key === expected[d.typed.length] ||
        (mask?.[d.typed.length] ?? false);
      d.typed += key;
      if (correct) {
        d.correctKeystrokes += 1;
        d.castCorrect += 1;
        d.streak += 1;
        keyTick(d.streak);
        const closer = AUTO_PAIRS[key];
        if (closer && expected[d.typed.length] === closer) {
          d.typed += closer;
          d.autoClosedChar = closer;
          d.autoClosedAt = d.typed.length;
        }
        if (d.streak % COMBO_STEP === 0) {
          comboPop();
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
        d.currentBlankWrong += 1;
        errorBuzz();
      }
      if (checkAnswer(d.typed, expected, mask)) {
        if (completeBlank(d, expected)) return;
      }
      syncLive();
    },
    [completeBlank, syncLive]
  );

  // Enter finishes a trailing run of closing brackets (e.g. "});" or ")"),
  // like an editor where those chars were auto-inserted already
  const typeEnter = useCallback(() => {
    const d = dataRef.current;
    if (!d || d.finished) return;
    const expected = d.answers[d.blankIndex] ?? "";
    const rest = expected.slice(d.typed.length);
    if (!rest || !CLOSER_TAIL_RE.test(rest) || !HAS_CLOSER_RE.test(rest)) {
      return;
    }
    d.keystrokes += 1;
    d.correctKeystrokes += 1;
    d.castKeystrokes += 1;
    d.castCorrect += 1;
    d.streak += 1;
    keyTick(d.streak);
    d.typed = expected;
    if (completeBlank(d, expected)) return;
    syncLive();
  }, [completeBlank, syncLive]);

  const selectSpell = useCallback(
    (spellId) => {
      const d = dataRef.current;
      if (!d || d.finished || !isBattleMode(d.mode)) return;
      if (d.selectedSpell === spellId) return;
      const inc = incantationFor(spellId, d.battleStyle);
      d.selectedSpell = spellId;
      d.answers = [inc.text];
      d.castSynopsis = inc.synopsis;
      d.blankIndex = 0;
      d.typed = "";
      d.autoClosedChar = null;
      d.autoClosedAt = -1;
      d.currentBlankWrong = 0;
      d.castStart = d.elapsed;
      d.castKeystrokes = 0;
      d.castCorrect = 0;
      uiClick();
      syncLive();
    },
    [syncLive]
  );

  useEffect(() => {
    if (state.screen !== "countdown") return;
    initRace(state.round, state.mode, difficulty, content);
    setCount(3);
    countBeep();
    const tick = (value) => () => {
      setCount(value);
      if (value === "GO") goBeep();
      else countBeep();
    };
    const timers = [
      setTimeout(tick(2), 750),
      setTimeout(tick(1), 1500),
      setTimeout(tick("GO"), 2250),
      setTimeout(() => dispatch({ type: "GO" }), 2900),
    ];
    return () => {
      timers.forEach(clearTimeout);
      setCount(null);
    };
  }, [state.screen, state.round, state.mode, difficulty, content, initRace]);

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
        } else if (isBattleMode(d.mode)) {
          const events = tickBattle(d.battle, dt, Math.random, d.battleStyle);
          for (const ev of events) {
            if (ev.type === "enemyHit" || ev.type === "enemyHeal") {
              if (ev.type === "enemyHit") errorBuzz();
              d.enemySeq += 1;
              const seq = d.enemySeq;
              d.lastEnemyCast = {
                seq,
                spellId: ev.spellId,
                side: "enemy",
                type:
                  ev.type === "enemyHeal"
                    ? "heal"
                    : ev.spellId === "venom"
                      ? "poison"
                      : "attack",
                amount: ev.amount,
                crit: false,
              };
              if (enemyPopTimerRef.current) {
                clearTimeout(enemyPopTimerRef.current);
              }
              enemyPopTimerRef.current = setTimeout(() => {
                const cur = dataRef.current;
                if (cur && cur.lastEnemyCast?.seq === seq) {
                  cur.lastEnemyCast = null;
                  syncLive();
                }
              }, POP_VISIBLE_MS);
            }
          }
          if (d.battle.over) finishBattle(d.battle.winner);
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
  }, [state.screen, finishRace, finishRun, finishBattle, syncLive]);

  useEffect(() => {
    function onKeyDown(e) {
      // A focused button handles Enter natively — don't also dispatch
      const onButton =
        e.target instanceof HTMLElement && e.target.closest("button") !== null;
      if (state.screen === "menu") {
        if (e.key === "Enter" && !onButton) {
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
        if (e.key === "Enter" && !onButton) {
          e.preventDefault();
          dispatch({ type: "RACE_AGAIN" });
        }
        if (e.key === "Escape") {
          e.preventDefault();
          dispatch({ type: "MENU" });
        }
        return;
      }
      if (state.screen === "paused") {
        if (e.key === "Escape" || (e.key === "Enter" && !onButton)) {
          e.preventDefault();
          dispatch({ type: "RESUME" });
        } else if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          dispatch({ type: "RESTART", round: dataRef.current?.startRound });
        } else if (e.key === "m" || e.key === "M") {
          e.preventDefault();
          dispatch({ type: "MENU" });
        }
        return;
      }
      if (state.screen !== "racing") return;
      if (e.key === "Escape") {
        e.preventDefault();
        const d = dataRef.current;
        if (d && !d.finished) dispatch({ type: "PAUSE" });
        return;
      }
      if (e.key === "Control") {
        if (!showAnswers && content === "blanks" && !e.repeat) {
          applyPeekPenalty();
          setPeekHeld(true);
        }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isBattleMode(dataRef.current?.mode) && /^[1-5]$/.test(e.key)) {
        e.preventDefault();
        selectSpell(SPELL_ORDER[Number(e.key) - 1]);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        typeEnter();
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        const d = dataRef.current;
        if (d && !d.finished && d.typed.length > 0) {
          d.typed = d.typed.slice(0, -1);
          d.autoClosedChar = null;
          d.autoClosedAt = -1;
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
    content,
    applyPeekPenalty,
    typeChar,
    typeEnter,
    selectSpell,
    finishRun,
    syncLive,
  ]);

  useEffect(() => {
    initAudio();
    refreshAiPool().then((updated) => {
      if (updated) setAiBump((b) => b + 1);
    });
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- aiBump re-reads the pool
  const aiCount = useMemo(() => aiPoolCount(), [aiBump]);

  useEffect(() => {
    return () => {
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      if (castPopTimerRef.current) clearTimeout(castPopTimerRef.current);
      if (enemyPopTimerRef.current) clearTimeout(enemyPopTimerRef.current);
    };
  }, []);

  return {
    screen: state.screen,
    mode: state.mode,
    round: state.round,
    result: state.result,
    challenge,
    live,
    best,
    history,
    summary,
    aiCount,
    count,
    peekHeld,
    peekPenalty: PEEK_PENALTY_CHARS,
    showAnswers,
    selectedMode,
    difficulty,
    content,
    selectMode: (mode) => {
      setSelectedMode(mode);
      saveChoice(MODE_KEY, mode);
    },
    selectDifficulty: (id) => {
      setDifficulty(id);
      saveChoice(DIFFICULTY_KEY, id);
    },
    selectContent: (id) => {
      setContent(id);
      saveChoice(CONTENT_KEY, id);
    },
    battleStyle,
    selectBattleStyle: (id) => {
      setBattleStyle(id);
      saveChoice(BATTLE_STYLE_KEY, id);
    },
    muted,
    toggleMute: () => {
      const next = toggleMuted();
      setMuted(next);
      if (!next) uiClick();
    },
    toggleAnswers: () => {
      setShowAnswers((prev) => {
        const next = !prev;
        saveChoice(ANSWERS_KEY, String(next));
        return next;
      });
    },
    start: () => dispatch({ type: "START", mode: selectedMode }),
    raceAgain: () => {
      let round;
      if (state.mode === "race") {
        const won = state.result?.winner === "player";
        round = won ? state.round + 1 : state.round;
      } else {
        // Solo replays continue through the bank instead of resetting
        round = state.round + 1;
      }
      dispatch({ type: "RACE_AGAIN", round });
    },
    pause: () => dispatch({ type: "PAUSE" }),
    resume: () => dispatch({ type: "RESUME" }),
    selectSpell,
    restartRun: () =>
      dispatch({ type: "RESTART", round: dataRef.current?.startRound }),
    endRun: finishRun,
    toMenu: () => dispatch({ type: "MENU" }),
    peekStart: () => {
      if (state.screen === "racing" && !showAnswers && content === "blanks") {
        applyPeekPenalty();
        setPeekHeld(true);
      }
    },
    peekEnd: () => setPeekHeld(false),
  };
}
