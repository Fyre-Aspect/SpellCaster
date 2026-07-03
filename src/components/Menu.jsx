import { motion, useReducedMotion } from "motion/react";
import { MODES } from "../logic/machine.js";
import { BOT_DIFFICULTIES, DIFFICULTY_ORDER } from "../logic/race.js";

function bestText(mode, best) {
  if (!best) return "No record yet — set one!";
  if (mode === "race") {
    return `Best win: ${Math.round(best.wpm)} WPM in ${best.timeSeconds.toFixed(1)}s`;
  }
  if (mode === "endless") {
    return `Best run: ${Math.round(best.wpm)} WPM · ${best.snippets} snippets`;
  }
  return `Best trial: ${best.chars} chars (${Math.round(best.wpm)} WPM)`;
}

export default function Menu({
  best,
  selectedMode,
  onSelectMode,
  difficulty,
  onSelectDifficulty,
  showAnswers,
  onToggleAnswers,
  onStart,
}) {
  const reduced = useReducedMotion();
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
      {selectedMode === "race" && (
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
      <div className="best-chip">{bestText(selectedMode, best)}</div>
      <motion.button
        className="btn btn-big"
        autoFocus
        onClick={onStart}
        whileHover={reduced ? undefined : { scale: 1.05, rotate: -1.5 }}
        whileTap={reduced ? undefined : { scale: 0.95 }}
      >
        {MODES[selectedMode].startLabel}
      </motion.button>
      <button type="button" className="toggle-btn" onClick={onToggleAnswers}>
        Answers shown: {showAnswers ? "ON" : "OFF"}
      </button>
      <ul className="hints">
        {showAnswers ? (
          <li>The missing code is shown faintly in the blanks — type over it!</li>
        ) : (
          <li>Answers are hidden — hold Ctrl to peek (costs 4 chars of progress)</li>
        )}
        <li>Backspace fixes mistakes in the current blank</li>
        {selectedMode === "race" ? (
          <li>Press Enter to start &middot; Esc quits a race</li>
        ) : (
          <li>Press Enter to start &middot; Esc ends a solo run</li>
        )}
      </ul>
    </motion.section>
  );
}
