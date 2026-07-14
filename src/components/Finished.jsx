import { motion, useReducedMotion } from "motion/react";

export default function Finished({ result, summary, onRaceAgain, onMenu }) {
  const reduced = useReducedMotion();
  const isRace = result.mode === "race";
  const won = isRace && result.winner === "player";
  const title = isRace
    ? won
      ? "You win!"
      : "The bot wins"
    : result.mode === "trial"
      ? "Time's up!"
      : "Run complete!";
  const rows = isRace
    ? [
        ["Time", `${result.timeSeconds.toFixed(1)}s`],
        ["WPM", Math.round(result.wpm)],
        ["Accuracy", `${Math.round(result.accuracy)}%`],
        ["Round", result.round],
      ]
    : result.mode === "trial"
      ? [
          ["Chars", result.chars],
          ["Snippets", result.snippets],
          ["WPM", Math.round(result.wpm)],
          ["Accuracy", `${Math.round(result.accuracy)}%`],
        ]
      : [
          ["Snippets", result.snippets],
          ["Time", `${result.timeSeconds.toFixed(1)}s`],
          ["WPM", Math.round(result.wpm)],
          ["Accuracy", `${Math.round(result.accuracy)}%`],
        ];
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
        <h2 className={`result-title ${isRace && !won ? "lose" : "win"}`}>
          {title}
        </h2>
        {result.newBest && (
          <motion.div
            className="new-best"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
          >
            {result.mode === "trial" ? "New best score!" : "New best WPM!"}
          </motion.div>
        )}
        <dl className="result-stats">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {summary && summary.count > 1 && (
          <p className="wpm-delta">
            {result.wpm >= summary.avgWpm ? "+" : ""}
            {Math.round(result.wpm - summary.avgWpm)} WPM vs your average
          </p>
        )}
        {result.misses?.length > 0 ? (
          <div className="miss-section">
            <h3 className="miss-title">Trouble spots</h3>
            <ul className="miss-list">
              {result.misses.map((m, i) => (
                <li key={i}>
                  <code className="miss-answer">{m.answer}</code>
                  {m.wrong > 0 && (
                    <span className="miss-badge">&times;{m.wrong} wrong</span>
                  )}
                  {m.peeked && <span className="miss-badge peeked">peeked</span>}
                </li>
              ))}
            </ul>
          </div>
        ) : result.blanksTotal > 0 ? (
          <p className="miss-flawless">Flawless — no trouble spots!</p>
        ) : null}
        <div className="result-actions">
          <motion.button
            className="btn btn-big"
            autoFocus
            onClick={onRaceAgain}
            whileHover={reduced ? undefined : { scale: 1.05 }}
            whileTap={reduced ? undefined : { scale: 0.95 }}
          >
            {isRace ? "Race Again" : "Go Again"}
          </motion.button>
          <button type="button" className="btn btn-secondary" onClick={onMenu}>
            Menu
          </button>
        </div>
        <p className="enter-hint">Enter to go again &middot; Esc for menu</p>
      </motion.div>
    </motion.div>
  );
}
