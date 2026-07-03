import { motion, useReducedMotion } from "motion/react";

export default function Menu({ best, onStart }) {
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
      <p className="tagline">Fill the missing code. Outtype the bot.</p>
      <div className="best-chip">
        {best
          ? `Best win: ${Math.round(best.wpm)} WPM in ${best.timeSeconds.toFixed(1)}s`
          : "No wins recorded yet"}
      </div>
      <motion.button
        className="btn btn-big"
        autoFocus
        onClick={onStart}
        whileHover={reduced ? undefined : { scale: 1.05 }}
        whileTap={reduced ? undefined : { scale: 0.95 }}
      >
        Start Race
      </motion.button>
      <ul className="hints">
        <li>Type the glowing blank, left to right</li>
        <li>Backspace fixes mistakes in the current blank</li>
        <li>Hold Ctrl to peek at the answer (costs 4 chars of progress)</li>
        <li>Press Enter to start</li>
      </ul>
    </motion.section>
  );
}
