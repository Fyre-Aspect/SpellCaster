import { motion, useReducedMotion } from "motion/react";

export default function Menu({ best, showAnswers, onToggleAnswers, onStart }) {
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
      <div className="best-chip">
        {best
          ? `Best win: ${Math.round(best.wpm)} WPM in ${best.timeSeconds.toFixed(1)}s`
          : "No wins recorded yet"}
      </div>
      <motion.button
        className="btn btn-big"
        autoFocus
        onClick={onStart}
        whileHover={reduced ? undefined : { scale: 1.05, rotate: -1.5 }}
        whileTap={reduced ? undefined : { scale: 0.95 }}
      >
        Start Race
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
        <li>Press Enter to start</li>
      </ul>
    </motion.section>
  );
}
