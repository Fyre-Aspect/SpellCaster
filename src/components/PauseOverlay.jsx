import { motion, useReducedMotion } from "motion/react";

export default function PauseOverlay({
  mode,
  onResume,
  onRestart,
  onEndRun,
  onMenu,
}) {
  const reduced = useReducedMotion();
  const solo = mode !== "race" && mode !== "battle";
  return (
    <motion.div
      className="overlay pause-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="result-card pause-card"
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.9 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={
          reduced
            ? { duration: 0.15 }
            : { type: "spring", stiffness: 300, damping: 24 }
        }
      >
        <h2 className="result-title pause-title">Paused</h2>
        <div className="pause-actions">
          <button type="button" className="btn btn-big" autoFocus onClick={onResume}>
            Resume
          </button>
          <button type="button" className="btn btn-secondary" onClick={onRestart}>
            Restart
          </button>
          {solo && (
            <button type="button" className="btn btn-secondary" onClick={onEndRun}>
              End &amp; Score
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onMenu}>
            Quit to Menu
          </button>
        </div>
        <p className="enter-hint">
          Esc to resume &middot; R to restart &middot; M for menu
        </p>
      </motion.div>
    </motion.div>
  );
}
