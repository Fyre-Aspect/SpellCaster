import { motion, useReducedMotion } from "motion/react";
import { MODES } from "../logic/machine.js";
import { BATTLE_STYLES } from "../logic/battle.js";
import { BOT_DIFFICULTIES, DIFFICULTY_ORDER } from "../logic/race.js";
import { CONTENT_TYPES } from "../data/challenges.js";
import Sparkline from "./Sparkline.jsx";
import Lobby from "./Lobby.jsx";

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
  aiCount,
  battleStyle,
  onSelectBattleStyle,
  net,
  onHostOnline,
  onJoinOnline,
  onCancelOnline,
  muted,
  onToggleMute,
}) {
  const reduced = useReducedMotion();
  const isOnline = selectedMode === "online";
  const isBattle = selectedMode === "battle" || selectedMode === "pvp" || isOnline;
  return (
    <motion.section
      className="menu"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <h1 className="title">SPELLCASTER</h1>
      <p className="tagline">Fill the missing code. Outtype the bot!</p>
      <div className="mode-row">
        {Object.values(MODES).map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`mode-btn ${selectedMode === mode.id ? "selected" : ""}`}
            onClick={() => onSelectMode(mode.id)}
          >
            <span className="mode-name">{mode.label}</span>
            <span className="mode-desc">{mode.desc}</span>
          </button>
        ))}
      </div>
      {(selectedMode === "race" || selectedMode === "battle") && (
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
      )}
      {isBattle && (
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
      )}
      {!isBattle && (
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
      )}
      {isOnline && (
        <p className="online-note">Host&apos;s spell style is used for both players</p>
      )}
      {!isOnline && (
        <div className="best-chip">{bestText(selectedMode, best)}</div>
      )}
      {!isOnline && aiCount > 0 && (
        <div className="ai-chip">
          ✨ {aiCount} fresh AI challenges in today&apos;s mix
        </div>
      )}
      {!isOnline && summary && (
        <div className="stats-card">
          <span className="stats-line">
            {summary.count} game{summary.count === 1 ? "" : "s"} &middot; avg
            speed {Math.round(summary.avgWpm)} &middot; best{" "}
            {Math.round(summary.bestWpm)}
            {summary.racePlayed > 0 &&
              ` · ${Math.round((summary.raceWins / summary.racePlayed) * 100)}% race wins`}
          </span>
          <Sparkline values={summary.recentWpm} />
        </div>
      )}
      {isOnline ? (
        <Lobby
          net={net}
          onHost={onHostOnline}
          onJoin={onJoinOnline}
          onCancel={onCancelOnline}
        />
      ) : (
        <motion.button
          className="btn btn-big"
          autoFocus
          onClick={onStart}
          whileHover={reduced ? undefined : { scale: 1.05, rotate: -1.5 }}
          whileTap={reduced ? undefined : { scale: 0.95 }}
        >
          {MODES[selectedMode].startLabel}
        </motion.button>
      )}
      <div className="toggle-row">
        {content === "blanks" && !isBattle && (
          <button type="button" className="toggle-btn" onClick={onToggleAnswers}>
            Answers shown: {showAnswers ? "ON" : "OFF"}
          </button>
        )}
        <button type="button" className="toggle-btn" onClick={onToggleMute}>
          Sound: {muted ? "OFF" : "ON"}
        </button>
      </div>
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
                Duel a friend anywhere &mdash; both of you cast at the same
                time, first to drop the other&apos;s HP wins
              </li>
            )}
            <li>
              Pick spells with 1&ndash;5 &mdash; stronger spells take longer to
              type
            </li>
            <li>Type fast with no mistakes to hit harder &middot; perfect + quick = CRIT</li>
            <li>
              {isOnline
                ? "Esc leaves the duel"
                : "Press Enter to start · Esc pauses"}
            </li>
          </>
        ) : (
          <>
            {content !== "blanks" ? (
              <li>{CONTENT_HINTS[content]}</li>
            ) : showAnswers ? (
              <li>
                The missing code is shown faintly in the blanks — type over it!
              </li>
            ) : (
              <li>
                Answers are hidden — hold Ctrl to peek (costs a little
                progress)
              </li>
            )}
            <li>
              Backspace fixes slips &middot; brackets close themselves as you
              type &middot; Enter finishes lines that end in {") } ;"}
            </li>
            {selectedMode === "race" ? (
              <li>Press Enter to start &middot; Esc pauses</li>
            ) : (
              <li>
                Press Enter to start &middot; Esc pauses &middot; End &amp;
                Score wraps up your run
              </li>
            )}
          </>
        )}
      </ul>
    </motion.section>
  );
}
