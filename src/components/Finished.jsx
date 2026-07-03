import { motion, useReducedMotion } from "motion/react";

export default function Finished({ result, onRaceAgain }) {
  const reduced = useReducedMotion();
  const won = result.winner === "player";
  return (
    <motion.div
      className="overlay finished-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="result-card"
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 44, scale: 0.88 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={
          reduced
            ? { duration: 0.2 }
            : { type: "spring", stiffness: 260, damping: 22 }
        }
      >
        <h2 className={`result-title ${won ? "win" : "lose"}`}>
          {won ? "You win!" : "The bot wins"}
        </h2>
        {result.newBest && (
          <motion.div
            className="new-best"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
          >
            New best WPM!
          </motion.div>
        )}
        <dl className="result-stats">
          <div>
            <dt>Time</dt>
            <dd>{result.timeSeconds.toFixed(1)}s</dd>
          </div>
          <div>
            <dt>WPM</dt>
            <dd>{Math.round(result.wpm)}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{Math.round(result.accuracy)}%</dd>
          </div>
          <div>
            <dt>Round</dt>
            <dd>{result.round}</dd>
          </div>
        </dl>
        <motion.button
          className="btn btn-big"
          autoFocus
          onClick={onRaceAgain}
          whileHover={reduced ? undefined : { scale: 1.05 }}
          whileTap={reduced ? undefined : { scale: 0.95 }}
        >
          Race Again
        </motion.button>
        <p className="enter-hint">press Enter</p>
      </motion.div>
    </motion.div>
  );
}
