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
  applyRemoteCast,
  createBattle,
  createCampaignBattle,
  createOnlineBattle,
  createPvpBattle,
  incantationFor,
  setCampaignFoe,
  tickBattle,
} from "../logic/battle.js";
import { CAMPAIGN } from "../data/campaign.js";
import {
  awardGold,
  currentGold,
  loadCampaign,
  recordCampaignWin,
  spendGold,
  starsFor,
} from "../logic/campaignStore.js";
import {
  POWERUPS,
  POWERUP_DURATION,
  POWERUP_FX,
  POWERUP_COOLDOWN_MS,
  powerupsForMode,
} from "../logic/powerups.js";
import { createNet, normalizeCode, randomCode } from "../logic/net.js";
import { isConfirmKey, onNativeControl } from "../logic/keys.js";
import { aiPoolCount, refreshAiPool } from "../data/aiPool.js";
import {
  BOT_DIFFICULTIES,
  computeAccuracy,
  computeWpm,
  createBot,
  wpmToCharsPerSecond,
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

const isBattleMode = (mode) =>
  mode === "battle" || mode === "pvp" || mode === "online";

const NET_IDLE = { status: "idle", code: null, error: null, rematchWaiting: false };
const NET_STATE_MS = 120; // throttle for online state broadcasts
// Both sides broadcast state continuously; a gap this long means the
// opponent's tab closed or their connection dropped (WebRTC's own
// disconnect detection is far slower). Generous enough to ride out a stall
// on a bad connection — calling a live opponent dead is far worse than
// taking another second to notice a real one.
const NET_TIMEOUT_MS = 8000;
// The frame loop stops in a backgrounded tab, so it cannot be the only thing
// keeping us alive in the opponent's eyes. Timers still fire when hidden.
const NET_HEARTBEAT_MS = 1000;

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

// Coins paid out for non-campaign wins so the shared purse fills from any mode
const RACE_WIN_GOLD = 6;
const DUEL_WIN_GOLD = 10;

// A timed power-up counts as "active" while its backing timer is still running,
// which blocks re-buying it and drives the button's live state.
function isPowerupActive(d, id) {
  if (!d) return false;
  const b = d.battle;
  switch (id) {
    case "berserk":
      return !!b && b.playerBerserkLeft > 0;
    case "freeze":
      return !!b && b.enemyFrozen > 0;
    case "autocast":
      return d.autocastLeft > 0;
    case "trip":
      return d.botSlowLeft > 0;
    default:
      return false; // instant effects are never "active"
  }
}

// Apply a purchased power-up to the live match state (dataRef). Effects that
// unfold over time set a timer that the RAF loop / tickBattle wind down.
function applyPowerupEffect(d, id) {
  const dur = POWERUP_DURATION[id] ?? 0;
  const b = d.battle;
  switch (id) {
    case "potion":
      b.playerHp = Math.min(b.playerMax, b.playerHp + POWERUP_FX.potionHeal);
      break;
    case "ward":
      b.playerShield = Math.min(
        POWERUP_FX.wardShieldCap,
        b.playerShield + POWERUP_FX.wardShield
      );
      break;
    case "berserk":
      b.playerDamageMult = POWERUP_FX.berserkMult;
      b.playerBerserkLeft = dur;
      break;
    case "freeze":
      b.enemyFrozen = dur;
      break;
    case "surge":
      d.raceBonusChars += POWERUP_FX.surgeChars;
      break;
    case "autocast":
      d.autocastLeft = dur;
      break;
    case "trip":
      d.botSlowLeft = dur;
      break;
    default:
      break;
  }
}

function emptyLive() {
  return {
    playerName: "You",
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
    coins: currentGold(),
    danger: false,
    activePowerups: {},
    battle: null,
  };
}

// Names go on the arena plates and across the wire to the other player, so
// keep them short and printable whatever the source
export function displayName(raw, fallback = "You") {
  const name = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!name) return fallback;
  // First name only — full names blow out the plate
  return name.split(" ")[0].slice(0, 14);
}

export default function useGame({ playerName } = {}) {
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
  const [netState, setNetState] = useState(NET_IDLE);
  const [transition, setTransition] = useState(false);
  const transitionActiveRef = useRef(false);
  const transitionActionRef = useRef(null);
  const [campaignBump, setCampaignBump] = useState(0);
  const campaignRef = useRef(null); // { index } while a campaign level is active
  const dataRef = useRef(null);
  const comboTimerRef = useRef(null);
  const castPopTimerRef = useRef(null);
  const enemyPopTimerRef = useRef(null);
  const netRef = useRef(null);
  const netMsgRef = useRef(null);
  const netPeerLeftRef = useRef(null);
  const netStyleRef = useRef(null);
  const netPeerNameRef = useRef(null); // the online opponent's display name
  const battleStyleRef = useRef(battleStyle);
  battleStyleRef.current = battleStyle;
  const playerNameRef = useRef("You");
  playerNameRef.current = displayName(playerName);
  // Signed-out players have no name to show the world — "You" would read as
  // the opponent's own plate on their screen
  const netNameRef = useRef("Challenger");
  netNameRef.current = displayName(playerName, "Challenger");
  const localRematchRef = useRef(false);
  const remoteRematchRef = useRef(false);

  const history = useMemo(() => loadHistory(), [historyBump]);
  const summary = useMemo(() => summarizeHistory(history), [history]);
  const campaign = useMemo(() => loadCampaign(), [campaignBump]);

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
      // Progress spans the whole multi-snippet sprint, not one snippet.
      // raceBonusChars is free progress granted by Surge / Auto-Cast.
      const effective = Math.max(
        0,
        runCorrect + (d.raceBonusChars || 0) - d.penaltyChars
      );
      playerProgress = Math.min(1, effective / d.raceTarget);
    } else {
      playerProgress = Math.min(1, snippetCorrect / d.total);
    }
    let botProgress = d.mode === "race" ? Math.min(1, d.botChars / d.raceTarget) : 0;
    if (d.finished && d.winner === "player") playerProgress = 1;
    if (d.finished && d.winner === "bot") botProgress = 1;
    // Power-up affordances: what's currently running, and whether the player is
    // in trouble (behind the bot / low HP) so the UI can flag the rescue button.
    const activePowerups = {};
    for (const id of powerupsForMode(d.mode)) {
      if (isPowerupActive(d, id)) activePowerups[id] = true;
    }
    const danger = d.finished
      ? false
      : d.mode === "race"
        ? botProgress > playerProgress + 0.1
        : !!d.battle && d.battle.playerHp <= d.battle.playerMax * 0.33;
    setLive({
      coins: d.coins ?? 0,
      playerName: d.playerName ?? "You",
      danger,
      activePowerups,
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
            online: !!d.battle.online,
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
            playerName: d.playerName ?? "You",
            enemyName: d.battle.enemyName ?? null,
            campaign: d.campaign
              ? {
                  levelName: d.campaign.level.name,
                  icon: d.campaign.level.icon,
                  foeIndex: d.campaign.foeIndex,
                  foeCount: d.campaign.foes.length,
                }
              : null,
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
        d.runChars +
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
        const reward = awardGold(RACE_WIN_GOLD);
        stats.coinsEarned = reward.earned;
        stats.coinsTotal = reward.gold;
        setCampaignBump((b) => b + 1);
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
        opponentLeft: !!d.opponentLeft,
        misses: collectMisses(d),
        blanksTotal: d.blankLog.length,
      };
      // Campaign wins pay gold and stars and unlock the next level
      if (d.campaign) {
        const won = winner === "player";
        const hpFrac =
          d.battle.playerMax > 0
            ? Math.max(0, d.battle.playerHp) / d.battle.playerMax
            : 0;
        const stars = won ? starsFor(hpFrac, stats.accuracy) : 0;
        const reward = won ? recordCampaignWin(d.campaign.index, stars) : null;
        setCampaignBump((b) => b + 1);
        stats.campaign = {
          index: d.campaign.index,
          levelId: d.campaign.level.id,
          levelName: d.campaign.level.name,
          icon: d.campaign.level.icon,
          won,
          stars,
          earned: reward?.earned ?? 0,
          gold: reward?.gold ?? loadCampaign().gold,
          firstClear: reward?.firstClear ?? false,
          hasNext: d.campaign.index < CAMPAIGN.length - 1,
        };
      }
      recordRunFrom(d, stats);
      setHistoryBump((b) => b + 1);
      if (d.mode === "online" && winner === "enemy" && !d.opponentLeft) {
        // Tell the opponent we died — their mirror of our HP is not
        // authoritative, so they wait for this announcement
        netRef.current?.send({ t: "gameover" });
      }
      if (d.campaign) {
        if (winner === "player") winFanfare();
        else loseSlide();
      } else if (d.mode === "pvp") {
        // Someone in the room won either way
        winFanfare();
      } else if (d.mode === "online") {
        if (winner === "player") winFanfare();
        else loseSlide();
      } else if (winner === "player") {
        const key = bestKeyFor("battle", d.difficulty, d.content);
        const prev = loadJson(key);
        if (!prev || stats.wpm > prev.wpm) {
          saveJson(key, { wpm: stats.wpm, timeSeconds: stats.timeSeconds });
          setBestBump((b) => b + 1);
          stats.newBest = true;
        }
        const reward = awardGold(DUEL_WIN_GOLD);
        stats.coinsEarned = reward.earned;
        stats.coinsTotal = reward.gold;
        setCampaignBump((b) => b + 1);
        winFanfare();
      } else {
        loseSlide();
      }
      syncLive();
      dispatch({ type: "FINISH", stats });
    },
    [syncLive]
  );

  // In a horde level, a downed foe is replaced by the next one instead of
  // ending the duel. Returns true when the battle is truly over.
  const advanceOrFinish = useCallback(() => {
    const d = dataRef.current;
    if (!d?.battle?.over) return false;
    const camp = d.campaign;
    if (
      camp &&
      d.battle.winner === "player" &&
      camp.foeIndex < camp.foes.length - 1
    ) {
      camp.foeIndex += 1;
      const foe = camp.foes[camp.foeIndex];
      const healed = Math.round(d.battle.playerMax * 0.15);
      d.battle.playerHp = Math.min(d.battle.playerMax, d.battle.playerHp + healed);
      setCampaignFoe(d.battle, foe);
      d.battle.over = false;
      d.battle.winner = null;
      // Fresh pick against the new foe
      d.selectedSpell = null;
      d.answers = [];
      d.castSynopsis = null;
      d.blankIndex = 0;
      d.typed = "";
      goBeep();
      syncLive();
      return false;
    }
    finishBattle(d.battle.winner);
    return true;
  }, [finishBattle, syncLive]);

  const teardownNet = useCallback(() => {
    netRef.current?.destroy();
    netRef.current = null;
    netStyleRef.current = null;
    netPeerNameRef.current = null;
    localRematchRef.current = false;
    remoteRematchRef.current = false;
  }, []);

  // Swap display names as soon as the channel opens, so both arenas show
  // who they're actually fighting
  const sendGreeting = useCallback(() => {
    netRef.current?.send({ t: "hello", name: netNameRef.current });
  }, []);

  // Broadcast our authoritative side (HP, shield, poison, what we're
  // casting) to the online opponent, throttled unless forced
  const sendNetState = useCallback((force = false) => {
    const d = dataRef.current;
    const net = netRef.current;
    if (!d || d.mode !== "online" || !d.battle || !net?.connected) return;
    const now = performance.now();
    if (!force && now - d.lastNetSend < NET_STATE_MS) return;
    d.lastNetSend = now;
    const expected = d.answers[0] ?? "";
    net.send({
      t: "state",
      hp: Math.max(0, Math.ceil(d.battle.playerHp)),
      max: d.battle.playerMax,
      shield: Math.round(d.battle.playerShield),
      poisonLeft: d.battle.playerPoison ? d.battle.playerPoison.left : 0,
      casting:
        d.selectedSpell && expected
          ? {
              spellId: d.selectedSpell,
              progress: Math.min(
                1,
                d.typed.length / Math.max(1, expected.length)
              ),
            }
          : null,
    });
  }, []);

  const hostOnline = useCallback(() => {
    teardownNet();
    setNetState({ ...NET_IDLE, status: "starting" });
    let attempts = 0;
    const tryHost = () => {
      const net = createNet({
        onWaiting: (code) => setNetState({ ...NET_IDLE, status: "waiting", code }),
        onConnected: (isHost) => {
          setNetState((n) => ({ ...n, status: "connected", error: null }));
          sendGreeting();
          if (isHost) {
            // Host's spell style rules the match
            netStyleRef.current = battleStyleRef.current;
            netRef.current?.send({ t: "start", style: battleStyleRef.current });
            dispatch({ type: "START", mode: "online" });
          }
        },
        onMessage: (m) => netMsgRef.current?.(m),
        onPeerLeft: () => netPeerLeftRef.current?.(),
        onError: (kind) => {
          netRef.current?.destroy();
          netRef.current = null;
          if (kind === "code-taken" && attempts < 3) {
            attempts += 1;
            tryHost();
            return;
          }
          setNetState({ ...NET_IDLE, status: "error", error: kind });
        },
      });
      netRef.current = net;
      net.host(randomCode());
    };
    tryHost();
  }, [teardownNet, sendGreeting]);

  // Quick Match: no codes, no friend required — the net layer finds whoever
  // else is looking right now and drops us straight into a duel.
  const quickMatch = useCallback(() => {
    teardownNet();
    setNetState({ ...NET_IDLE, status: "searching", quick: true });
    const net = createNet({
      onSearching: () =>
        setNetState({ ...NET_IDLE, status: "searching", quick: true }),
      // No code to show: we're holding a public slot until someone arrives
      onWaiting: () => setNetState({ ...NET_IDLE, status: "queued", quick: true }),
      onConnected: (isHost) => {
        setNetState((n) => ({ ...n, status: "connected", error: null }));
        sendGreeting();
        if (isHost) {
          netStyleRef.current = battleStyleRef.current;
          netRef.current?.send({ t: "start", style: battleStyleRef.current });
          dispatch({ type: "START", mode: "online" });
        }
      },
      onMessage: (m) => netMsgRef.current?.(m),
      onPeerLeft: () => netPeerLeftRef.current?.(),
      onError: (kind) => {
        netRef.current?.destroy();
        netRef.current = null;
        setNetState({ ...NET_IDLE, status: "error", error: kind, quick: true });
      },
    });
    netRef.current = net;
    net.quick();
  }, [teardownNet, sendGreeting]);

  const joinOnline = useCallback(
    (rawCode) => {
      const code = normalizeCode(rawCode);
      if (!code) {
        setNetState({ ...NET_IDLE, status: "error", error: "bad-code" });
        return;
      }
      teardownNet();
      setNetState({ ...NET_IDLE, status: "connecting", code });
      const net = createNet({
        onWaiting: () => {},
        onConnected: () => {
          setNetState((n) => ({ ...n, status: "connected", error: null }));
          sendGreeting();
        },
        onMessage: (m) => netMsgRef.current?.(m),
        onPeerLeft: () => netPeerLeftRef.current?.(),
        onError: (kind) => {
          netRef.current?.destroy();
          netRef.current = null;
          setNetState({ ...NET_IDLE, status: "error", error: kind });
        },
      });
      netRef.current = net;
      net.join(code);
    },
    [teardownNet, sendGreeting]
  );

  const cancelOnline = useCallback(() => {
    netRef.current?.send({ t: "bye" });
    teardownNet();
    setNetState(NET_IDLE);
  }, [teardownNet]);

  const initRace = useCallback(
    (round, mode, difficultyId, contentId) => {
      const c = challengeForRound(round, contentId);
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      dataRef.current = {
        mode,
        playerName: playerNameRef.current || "You",
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
        raceTarget: 0,
        // Power-ups: shared coin purse plus per-match effect timers
        coins: currentGold(),
        coinsEarned: 0,
        powerCdUntil: 0,
        raceBonusChars: 0, // free progress from Surge / Auto-Cast
        autocastLeft: 0,
        botSlowLeft: 0, // seconds the bot is slowed by Trip
      };
      if (mode === "race") {
        // A race is a sprint to a shared distance sized so the bot would
        // finish in ~45s — long enough to feel like a real race (30–60s),
        // chaining snippets as needed to cover it.
        const botCps = wpmToCharsPerSecond(BOT_DIFFICULTIES[difficultyId].baseWpm);
        dataRef.current.raceTarget = Math.min(320, Math.max(120, Math.round(botCps * 45)));
      }
      if (isBattleMode(mode)) {
        const d = dataRef.current;
        const camp = mode === "battle" ? campaignRef.current : null;
        if (camp && CAMPAIGN[camp.index]) {
          const level = CAMPAIGN[camp.index];
          d.campaign = { index: camp.index, level, foeIndex: 0, foes: level.foes };
          d.battle = createCampaignBattle(level.foes[0]);
        } else {
          d.campaign = null;
          d.battle =
            mode === "pvp"
              ? createPvpBattle()
              : mode === "online"
                ? createOnlineBattle(netPeerNameRef.current)
                : createBattle(difficultyId);
        }
        // Local PvP is two people at one keyboard, not the account holder
        if (mode === "pvp") d.playerName = "Player 1";
        // Online matches use the host's spell style for both players
        d.battleStyle =
          mode === "online" ? (netStyleRef.current ?? battleStyle) : battleStyle;
        d.opponentLeft = false;
        d.lastNetSend = 0;
        d.lastNetRecv = performance.now();
        localRematchRef.current = false;
        remoteRematchRef.current = false;
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
        const spellId = d.selectedSpell;
        const cast = { seq: d.castSeq, spellId, side, ...result };
        const timerRef = side === "enemy" ? enemyPopTimerRef : castPopTimerRef;
        const slot = side === "enemy" ? "lastEnemyCast" : "lastCast";
        d[slot] = cast;
        // Online: relay the cast so the opponent applies it against their
        // authoritative HP and shows our spell flying in. Our own enemyHp is
        // an optimistic mirror that their next state broadcast corrects.
        if (d.mode === "online") {
          netRef.current?.send({
            t: "cast",
            spellId,
            kind: result.type,
            raw: result.raw,
            perSecond: result.perSecond,
            duration: result.duration,
            crit: result.crit,
            amount: result.amount,
          });
        }
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
        if (d.battle.over) return advanceOrFinish();
        return false;
      }
      d.blankIndex += 1;
      if (d.mode === "race") {
        // Reached the finish distance? win. Otherwise keep the sprint going,
        // loading the next snippet when this one runs out of blanks.
        if (d.runChars + d.completedChars >= d.raceTarget) {
          finishRace("player");
          return true;
        }
        if (d.blankIndex >= d.answers.length) advanceSnippet(d);
        return false;
      }
      if (d.blankIndex >= d.answers.length) {
        advanceSnippet(d);
      }
      return false;
    },
    [advanceSnippet, finishRace, advanceOrFinish, syncLive]
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
      // Re-picking the spell you're already casting does nothing if you
      // haven't started typing; if you have, it restarts that incantation
      // (a quick way to bail on a botched line) rather than being a dead click.
      if (d.selectedSpell === spellId && d.typed.length === 0) return;
      const reroll = d.selectedSpell === spellId;
      const inc = reroll
        ? { text: d.answers[0], synopsis: d.castSynopsis }
        : incantationFor(spellId, d.battleStyle);
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
      if (d.mode === "online") sendNetState(true);
      syncLive();
    },
    [syncLive, sendNetState]
  );

  // Buy-and-use a power-up with coins, right now, mid-match
  const usePowerup = useCallback(
    (id) => {
      const d = dataRef.current;
      if (!d || d.finished) return;
      const p = POWERUPS[id];
      if (!p) return;
      // Only this mode's power-ups, and not one that's already running
      if (!powerupsForMode(d.mode).includes(id)) return;
      if (isPowerupActive(d, id)) return;
      // Debounce so a stray double-click can't double-spend
      const now = performance.now();
      if (now < d.powerCdUntil) return;
      if (d.coins < p.cost || !spendGold(p.cost)) {
        errorBuzz(); // can't afford
        return;
      }
      d.powerCdUntil = now + POWERUP_COOLDOWN_MS;
      d.coins -= p.cost;
      setCampaignBump((b) => b + 1); // menu/campaign gold reflects the spend
      applyPowerupEffect(d, id);
      comboPop();
      // Surge can shove you past the finish line the instant it lands
      if (
        d.mode === "race" &&
        d.runChars + d.completedChars + d.raceBonusChars >= d.raceTarget
      ) {
        finishRace("player");
        return;
      }
      syncLive();
    },
    [syncLive, finishRace]
  );

  // Show an incoming online cast: enemy projectile + damage pop
  const showEnemyOnlineCast = useCallback(
    (d, spellId, result) => {
      d.enemySeq += 1;
      const seq = d.enemySeq;
      d.lastEnemyCast = { seq, spellId, side: "enemy", ...result };
      if (enemyPopTimerRef.current) clearTimeout(enemyPopTimerRef.current);
      enemyPopTimerRef.current = setTimeout(() => {
        const cur = dataRef.current;
        if (cur && cur.lastEnemyCast?.seq === seq) {
          cur.lastEnemyCast = null;
          syncLive();
        }
      }, POP_VISIBLE_MS);
    },
    [syncLive]
  );

  const handleNetMessage = useCallback(
    (m) => {
      if (!m || typeof m !== "object") return;
      const d = dataRef.current;
      // Any message proves the opponent is alive — refresh the watchdog
      if (d) d.lastNetRecv = performance.now();
      if (m.t === "hello") {
        // Opponent introduced themselves — show their name on the arena plate
        netPeerNameRef.current = displayName(m.name, "Opponent");
        if (d?.battle?.online) {
          d.battle.enemyName = netPeerNameRef.current;
          syncLive();
        }
        return;
      }
      if (m.t === "start") {
        // Joiner: host has chosen the style and kicked off the duel
        netStyleRef.current =
          m.style && Object.keys(BATTLE_STYLES).includes(m.style)
            ? m.style
            : "words";
        dispatch({ type: "START", mode: "online" });
        return;
      }
      if (m.t === "bye") {
        // Opponent backed out before the match started
        teardownNet();
        setNetState({ ...NET_IDLE, status: "error", error: "peer-left" });
        return;
      }
      if (!d || d.mode !== "online" || !d.battle) return;
      if (m.t === "state") {
        // Mirror the opponent's authoritative side
        const b = d.battle;
        b.enemyHp = m.hp;
        b.enemyMax = m.max;
        b.enemyShield = m.shield;
        // perSecond 0 so our local poison tick never double-counts — the
        // opponent's HP already reflects their own venom damage
        b.enemyPoison =
          m.poisonLeft > 0 ? { left: m.poisonLeft, perSecond: 0 } : null;
        b.enemy.casting = m.casting
          ? { spellId: m.casting.spellId, progress: m.casting.progress }
          : null;
        if (!d.finished) syncLive();
        return;
      }
      if (m.t === "cast") {
        if (d.finished) return;
        const result = {
          type: m.kind,
          amount: m.amount,
          crit: m.crit,
        };
        showEnemyOnlineCast(d, m.spellId, result);
        const dealt = applyRemoteCast(d.battle, {
          kind: m.kind,
          raw: m.raw,
          perSecond: m.perSecond,
          duration: m.duration,
        });
        if (m.kind === "attack" && dealt > 0) errorBuzz();
        if (d.battle.over) {
          finishBattle(d.battle.winner);
        } else {
          sendNetState(true);
          syncLive();
        }
        return;
      }
      if (m.t === "gameover") {
        // Opponent reports they died — we win regardless of our HP mirror
        if (d.finished) return;
        d.battle.over = true;
        d.battle.winner = "player";
        finishBattle("player");
        return;
      }
      if (m.t === "rematch") {
        remoteRematchRef.current = true;
        if (localRematchRef.current) {
          startOnlineRematchRef.current?.();
        } else {
          setNetState((n) => ({ ...n, rematchWaiting: true }));
        }
        return;
      }
    },
    [syncLive, showEnemyOnlineCast, finishBattle, sendNetState, teardownNet]
  );

  const netPeerLeft = useCallback(() => {
    const d = dataRef.current;
    if (
      state.screen === "racing" &&
      d &&
      d.mode === "online" &&
      d.battle &&
      !d.finished
    ) {
      // Opponent vanished mid-duel — award the win by forfeit
      d.opponentLeft = true;
      d.battle.over = true;
      d.battle.winner = "player";
      finishBattle("player");
    } else if (state.screen === "countdown") {
      // They dropped before the duel even began. There is no result worth
      // showing, and FINISH is not a move the countdown accepts — announcing
      // a win here would strand the player on a frozen arena.
      teardownNet();
      setNetState({ ...NET_IDLE, status: "error", error: "peer-left" });
      dispatch({ type: "ABORT" });
    } else if (state.screen === "finished") {
      remoteRematchRef.current = false;
      setNetState((n) => ({ ...n, status: "error", error: "peer-left" }));
    } else {
      teardownNet();
      setNetState({ ...NET_IDLE, status: "error", error: "peer-left" });
    }
  }, [finishBattle, teardownNet, state.screen]);

  // Both players restart once each has asked for a rematch
  const startOnlineRematch = useCallback(() => {
    localRematchRef.current = false;
    remoteRematchRef.current = false;
    setNetState((n) => ({ ...n, rematchWaiting: false }));
    dispatch({ type: "RACE_AGAIN", round: 1 });
  }, []);

  const requestOnlineRematch = useCallback(() => {
    if (!netRef.current?.connected) {
      setNetState((n) => ({ ...n, status: "error", error: "peer-left" }));
      return;
    }
    localRematchRef.current = true;
    netRef.current.send({ t: "rematch" });
    if (remoteRematchRef.current) startOnlineRematch();
    else setNetState((n) => ({ ...n, rematchWaiting: true }));
  }, [startOnlineRematch]);

  const leaveOnline = useCallback(() => {
    netRef.current?.send({ t: "bye" });
    teardownNet();
    setNetState(NET_IDLE);
    dispatch({ type: "MENU" });
  }, [teardownNet]);

  // Spell-cast screen wipe: defer a navigation until the fireball reaches
  // centre so the screen swaps hidden behind the veil. One at a time.
  const playTransition = useCallback((action) => {
    if (transitionActiveRef.current) {
      action?.();
      return;
    }
    transitionActiveRef.current = true;
    transitionActionRef.current = action ?? null;
    setTransition(true);
  }, []);

  const transitionMid = useCallback(() => {
    const action = transitionActionRef.current;
    transitionActionRef.current = null;
    action?.();
  }, []);

  const transitionDone = useCallback(() => {
    transitionActiveRef.current = false;
    transitionActionRef.current = null;
    setTransition(false);
  }, []);

  const startOnlineRematchRef = useRef(null);
  startOnlineRematchRef.current = startOnlineRematch;
  netMsgRef.current = handleNetMessage;
  netPeerLeftRef.current = netPeerLeft;

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
    // Nobody broadcasts during the countdown, and the two sides start it up to
    // a second apart — start the disconnect watchdog from the first live frame
    // instead of from a silence that was never a symptom of anything.
    if (dataRef.current) dataRef.current.lastNetRecv = last;
    // Keep proving we're alive even while the tab is in the background, where
    // the frame loop (and with it the usual broadcast) stops dead
    const heartbeat =
      state.mode === "online"
        ? setInterval(() => sendNetState(true), NET_HEARTBEAT_MS)
        : null;
    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const d = dataRef.current;
      if (d && !d.finished) {
        d.elapsed += dt;
        if (d.mode === "race") {
          // Trip slows the bot; Auto-Cast types free progress for you
          const slow = d.botSlowLeft > 0 ? POWERUP_FX.tripMult : 1;
          if (d.botSlowLeft > 0) d.botSlowLeft = Math.max(0, d.botSlowLeft - dt);
          d.botChars += d.bot.tick(dt) * slow;
          if (d.autocastLeft > 0) {
            d.raceBonusChars += POWERUP_FX.autocastCps * dt;
            d.autocastLeft = Math.max(0, d.autocastLeft - dt);
          }
          if (d.runChars + d.completedChars + d.raceBonusChars >= d.raceTarget) {
            finishRace("player");
          } else if (d.botChars >= d.raceTarget) {
            finishRace("bot");
          } else {
            syncLive();
          }
        } else if (isBattleMode(d.mode)) {
          // Watchdog: opponent stopped broadcasting → treat as a disconnect
          if (
            d.mode === "online" &&
            !d.finished &&
            performance.now() - d.lastNetRecv > NET_TIMEOUT_MS
          ) {
            netPeerLeftRef.current?.();
            rafId = requestAnimationFrame(frame);
            return;
          }
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
          if (d.battle.over) advanceOrFinish();
          else {
            if (d.mode === "online") sendNetState();
            syncLive();
          }
        } else if (d.timeLimit != null && d.elapsed >= d.timeLimit) {
          finishRun();
        } else {
          syncLive();
        }
      }
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      if (heartbeat) clearInterval(heartbeat);
    };
  }, [
    state.screen,
    state.mode,
    finishRace,
    finishRun,
    finishBattle,
    advanceOrFinish,
    syncLive,
    sendNetState,
  ]);

  useEffect(() => {
    function onKeyDown(e) {
      // A focused button/input handles Enter and Space natively — never
      // double-fire on top of it
      const onControl = onNativeControl(e);
      const confirm = isConfirmKey(e);
      if (state.screen === "landing") {
        if (confirm && !onControl) {
          e.preventDefault();
          initAudio();
          uiClick();
          playTransition(() => dispatch({ type: "ENTER" }));
        }
        return;
      }
      // The menu owns its own keyboard model (rows + confirm) — see Menu.jsx
      if (state.screen === "menu") return;
      if (state.screen === "countdown") {
        if (e.key === "Escape") {
          e.preventDefault();
          if (state.mode === "online") {
            netRef.current?.send({ t: "bye" });
            teardownNet();
            setNetState(NET_IDLE);
          }
          dispatch({ type: "ABORT" });
        }
        return;
      }
      if (state.screen === "finished") {
        if (state.mode === "online") {
          if (e.key === "Escape") {
            e.preventDefault();
            leaveOnline();
          }
          // Rematch needs both players — handled by the button, not Enter
          return;
        }
        if (confirm && !onControl) {
          e.preventDefault();
          playTransition(() => dispatch({ type: "RACE_AGAIN" }));
        }
        if (e.key === "Escape") {
          e.preventDefault();
          playTransition(() => dispatch({ type: "MENU" }));
        }
        return;
      }
      if (state.screen === "paused") {
        if (e.key === "Escape" || (confirm && !onControl)) {
          e.preventDefault();
          dispatch({ type: "RESUME" });
        } else if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          dispatch({ type: "RESTART", round: dataRef.current?.startRound });
        } else if (e.key === "m" || e.key === "M") {
          e.preventDefault();
          playTransition(() => dispatch({ type: "MENU" }));
        }
        return;
      }
      if (state.screen !== "racing") return;
      if (e.key === "Escape") {
        e.preventDefault();
        const d = dataRef.current;
        // Real-time online can't pause — Esc forfeits and leaves
        if (d && d.mode === "online" && !d.finished) {
          leaveOnline();
        } else if (d && !d.finished) {
          dispatch({ type: "PAUSE" });
        }
        return;
      }
      if (e.key === "Control") {
        if (!showAnswers && content === "blanks" && !e.repeat) {
          applyPeekPenalty();
          setPeekHeld(true);
        }
        return;
      }
      // Alt+1/2/3 fire the mode's power-ups without clashing with typing
      if (e.altKey && !e.ctrlKey && !e.metaKey && /^[1-3]$/.test(e.key)) {
        const list = powerupsForMode(dataRef.current?.mode);
        const id = list[Number(e.key) - 1];
        if (id) {
          e.preventDefault();
          usePowerup(id);
        }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Number keys pick/switch a spell — but a digit that's actually part of
      // the incantation you're typing (code spells can contain digits) is a
      // literal keystroke, never a spell switch. So only hijack 1–5 while
      // nothing is typed yet AND it isn't the incantation's first character.
      const dNow = dataRef.current;
      if (isBattleMode(dNow?.mode) && /^[1-5]$/.test(e.key)) {
        const expected = dNow.answers[dNow.blankIndex];
        const isLiteralChar =
          dNow.typed.length > 0 || (expected != null && expected[0] === e.key);
        if (!isLiteralChar) {
          e.preventDefault();
          selectSpell(SPELL_ORDER[Number(e.key) - 1]);
          return;
        }
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
    state.mode,
    showAnswers,
    content,
    applyPeekPenalty,
    typeChar,
    typeEnter,
    selectSpell,
    usePowerup,
    finishRun,
    syncLive,
    leaveOnline,
    teardownNet,
    playTransition,
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
      netRef.current?.destroy();
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
    transition,
    transitionMid,
    transitionDone,
    enter: () => {
      initAudio();
      uiClick();
      playTransition(() => dispatch({ type: "ENTER" }));
    },
    campaign,
    start: () => {
      campaignRef.current = null;
      playTransition(() => dispatch({ type: "START", mode: selectedMode }));
    },
    startCampaignLevel: (index) => {
      if (!Number.isInteger(index) || index < 0 || index >= CAMPAIGN.length) {
        return;
      }
      campaignRef.current = { index };
      playTransition(() => dispatch({ type: "START", mode: "battle" }));
    },
    campaignNext: () => {
      const cur = state.result?.campaign?.index;
      if (cur == null || cur + 1 >= CAMPAIGN.length) return;
      campaignRef.current = { index: cur + 1 };
      playTransition(() => dispatch({ type: "RACE_AGAIN", round: 1 }));
    },
    raceAgain: () => {
      if (state.mode === "online") {
        requestOnlineRematch();
        return;
      }
      let round;
      if (state.mode === "race") {
        const won = state.result?.winner === "player";
        round = won ? state.round + 1 : state.round;
      } else {
        // Solo replays continue through the bank instead of resetting
        round = state.round + 1;
      }
      playTransition(() => dispatch({ type: "RACE_AGAIN", round }));
    },
    pause: () => dispatch({ type: "PAUSE" }),
    resume: () => dispatch({ type: "RESUME" }),
    selectSpell,
    usePowerup,
    restartRun: () =>
      dispatch({ type: "RESTART", round: dataRef.current?.startRound }),
    endRun: finishRun,
    toMenu: () => {
      if (state.mode === "online") {
        leaveOnline();
        return;
      }
      playTransition(() => dispatch({ type: "MENU" }));
    },
    net: netState,
    hostOnline,
    joinOnline,
    quickMatch,
    cancelOnline,
    peekStart: () => {
      if (state.screen === "racing" && !showAnswers && content === "blanks") {
        applyPeekPenalty();
        setPeekHeld(true);
      }
    },
    peekEnd: () => setPeekHeld(false),
  };
}
