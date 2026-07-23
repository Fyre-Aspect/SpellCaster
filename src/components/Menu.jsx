import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { MODES } from "../logic/machine.js";
import { BATTLE_STYLES } from "../logic/battle.js";
import { BOT_DIFFICULTIES, DIFFICULTY_ORDER } from "../logic/race.js";
import { CONTENT_TYPES } from "../data/challenges.js";
import Lobby from "./Lobby.jsx";
import ModeCarousel from "./ModeCarousel.jsx";
import AccountMenu from "./AccountMenu.jsx";

const CONTENT_HINTS = {
  blanks: null,
  full: "Type the whole snippet line by line — it's shown faintly",
  sentences: "Type the whole sentence — punctuation counts!",
};

function bestText(mode, best) {
  if (mode === "pvp") {
    return "Winner takes the bragging rights!";
  }
  if (!best) return "No record yet — set one!";
  if (mode === "race") {
    return `Best win: speed ${Math.round(best.wpm)} in ${best.timeSeconds.toFixed(1)}s`;
  }
  if (mode === "battle") {
    return `Best duel win: speed ${Math.round(best.wpm)} in ${best.timeSeconds.toFixed(1)}s`;
  }
  if (mode === "endless") {
    return `Best run: speed ${Math.round(best.wpm)} · ${best.snippets} finished`;
  }
  return `Best trial: ${best.chars} points (speed ${Math.round(best.wpm)})`;
}

// Cycle a selection within an ordered list, clamped to the ends
function step(order, current, dir) {
  const i = order.indexOf(current);
  const next = Math.min(order.length - 1, Math.max(0, i + dir));
  return order[next];
}

export default function Menu({
  best,
  selectedMode,
  onSelectMode,
  difficulty,
  onSelectDifficulty,
  content,
  onSelectContent,
  showAnswers,
  onToggleAnswers,
  onStart,
  summary,
  battleStyle,
  onSelectBattleStyle,
  net,
  onHostOnline,
  onJoinOnline,
  onCancelOnline,
  user,
  onSignIn,
  onSignOut,
  busy,
  muted,
  onToggleMute,
}) {
  const reduced = useReducedMotion();
  const isOnline = selectedMode === "online";
  const isBattle = selectedMode === "battle" || selectedMode === "pvp" || isOnline;

  // Rows the arrow keys can rove through, top to bottom
  const rows = useMemo(() => {
    const r = ["modes"];
    if (selectedMode === "race" || selectedMode === "battle") r.push("difficulty");
    r.push("options");
    if (!isOnline) r.push("start");
    return r;
  }, [selectedMode, isOnline]);

  const [activeIdx, setActiveIdx] = useState(0);
  const overlayOpenRef = useRef(false);

  useEffect(() => {
    setActiveIdx((i) => Math.min(i, rows.length - 1));
  }, [rows]);

  const activeRow = rows[activeIdx];
  const rowClass = (id) => `nav-row${activeRow === id ? " nav-active" : ""}`;

  // Full keyboard navigation: up/down pick a row, left/right change its value
  useEffect(() => {
    const onKey = (e) => {
      if (overlayOpenRef.current) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(rows.length - 1, i + 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const row = rows[activeIdx];
        if (row === "modes") {
          e.preventDefault();
          onSelectMode(step(Object.keys(MODES), selectedMode, dir));
        } else if (row === "difficulty") {
          e.preventDefault();
          onSelectDifficulty(step(DIFFICULTY_ORDER, difficulty, dir));
        } else if (row === "options") {
          e.preventDefault();
          if (isBattle) {
            onSelectBattleStyle(step(Object.keys(BATTLE_STYLES), battleStyle, dir));
          } else {
            onSelectContent(step(Object.keys(CONTENT_TYPES), content, dir));
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    rows,
    activeIdx,
    selectedMode,
    difficulty,
    content,
    battleStyle,
    isBattle,
    onSelectMode,
    onSelectDifficulty,
    onSelectContent,
    onSelectBattleStyle,
  ]);

  return (
    <motion.section
      className="menu"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <AccountMenu
        user={user}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
        busy={busy}
        summary={summary}
        muted={muted}
        onToggleMute={onToggleMute}
        showAnswers={showAnswers}
        onToggleAnswers={onToggleAnswers}
        onOverlayChange={(open) => {
          overlayOpenRef.current = open;
        }}
      />

      <h1 className="title">SPELLCASTER</h1>
      <p className="tagline">Type spells. Outcast your rival.</p>

      <div className={rowClass("modes")}>
        <ModeCarousel selectedMode={selectedMode} onSelectMode={onSelectMode} />
      </div>

      {(selectedMode === "race" || selectedMode === "battle") && (
        <div className={`option-group ${rowClass("difficulty")}`}>
          <span className="option-label">Difficulty</span>
          <div className="diff-row">
            {DIFFICULTY_ORDER.map((id) => {
              const profile = BOT_DIFFICULTIES[id];
              return (
                <button
                  key={id}
                  type="button"
                  className={`diff-btn ${difficulty === id ? "selected" : ""}`}
                  onClick={() => onSelectDifficulty(id)}
                >
                  {profile.label} &middot; {profile.baseWpm} WPM
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isBattle ? (
        <div className={`option-group ${rowClass("options")}`}>
          <span className="option-label">Spell style</span>
          <div className="content-row">
            {Object.values(BATTLE_STYLES).map((style) => (
              <button
                key={style.id}
                type="button"
                className={`content-btn ${battleStyle === style.id ? "selected" : ""}`}
                onClick={() => onSelectBattleStyle(style.id)}
                title={style.desc}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={`option-group ${rowClass("options")}`}>
          <span className="option-label">Challenge</span>
          <div className="content-row">
            {Object.values(CONTENT_TYPES).map((type) => (
              <button
                key={type.id}
                type="button"
                className={`content-btn ${content === type.id ? "selected" : ""}`}
                onClick={() => onSelectContent(type.id)}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isOnline ? (
        <>
          <p className="online-note">Host&apos;s spell style is used for both players</p>
          <Lobby
            net={net}
            onHost={onHostOnline}
            onJoin={onJoinOnline}
            onCancel={onCancelOnline}
          />
        </>
      ) : (
        <>
          <div className="best-chip">{bestText(selectedMode, best)}</div>
          <div className={rowClass("start")}>
            <motion.button
              className="btn btn-big"
              onClick={onStart}
              whileHover={reduced ? undefined : { scale: 1.05, rotate: -1.5 }}
              whileTap={reduced ? undefined : { scale: 0.95 }}
            >
              {MODES[selectedMode].startLabel}
            </motion.button>
          </div>
        </>
      )}

      <ul className="hints">
        {isBattle ? (
          <>
            {selectedMode === "pvp" && (
              <li>
                Grab a friend! You take turns &mdash; pick a spell, type it,
                then pass the keyboard
              </li>
            )}
            {isOnline && (
              <li>
                Duel a friend anywhere &mdash; both cast at once, first to drop
                the other&apos;s HP wins
              </li>
            )}
            <li>Pick spells with 1&ndash;5 &mdash; stronger spells take longer to type</li>
            <li>
              {isOnline
                ? "Arrow keys navigate · Esc leaves the duel"
                : "Arrow keys navigate · Enter starts · Esc pauses"}
            </li>
          </>
        ) : (
          <>
            {content !== "blanks" ? (
              <li>{CONTENT_HINTS[content]}</li>
            ) : showAnswers ? (
              <li>The missing code is shown faintly in the blanks — type over it!</li>
            ) : (
              <li>Answers are hidden — hold Ctrl to peek (costs a little progress)</li>
            )}
            <li>Arrow keys navigate · Enter starts · Esc pauses</li>
          </>
        )}
      </ul>
    </motion.section>
  );
}
