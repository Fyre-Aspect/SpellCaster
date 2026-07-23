import { motion, useReducedMotion } from "motion/react";

export default function Finished({
  result,
  summary,
  net,
  onRaceAgain,
  onCampaignNext,
  onMenu,
}) {
  const reduced = useReducedMotion();
  const camp = result.campaign ?? null;
  const isCampaign = !!camp;
  const isRace = result.mode === "race";
  const isPvp = result.mode === "pvp";
  const isOnline = result.mode === "online";
  const isBattle = result.mode === "battle" || isPvp || isOnline;
  const won =
    isPvp || ((isRace || isBattle) && result.winner === "player");
  const lost = (isRace || isBattle) && !won;
  const title = isCampaign
    ? won
      ? "Level Cleared!"
      : "Defeated!"
    : isOnline
    ? result.opponentLeft
      ? "Opponent left — you win!"
      : won
        ? "Victory!"
        : "You are defeated!"
    : isPvp
      ? result.winner === "player"
        ? "Player 1 wins!"
        : "Player 2 wins!"
      : isBattle
        ? won
          ? "Victory!"
          : "You are defeated!"
        : isRace
          ? won
            ? "You win!"
            : "The bot wins"
          : result.mode === "trial"
            ? "Time's up!"
            : "Run complete!";
  // Rematch needs the connection alive and both players to agree
  const peerGone = isOnline && (net?.status === "error" || result.opponentLeft);
  const rematchWaiting = isOnline && net?.rematchWaiting;
  const rows = isBattle
    ? [
        ["Damage", result.damageDealt],
        [
          "Casts",
          result.perfectCasts > 0
            ? `${result.casts} (${result.perfectCasts} crit)`
            : result.casts,
        ],
        ["Time", `${result.timeSeconds.toFixed(1)}s`],
        ["Accuracy", `${Math.round(result.accuracy)}%`],
      ]
    : isRace
      ? [
          ["Time", `${result.timeSeconds.toFixed(1)}s`],
          ["Speed", Math.round(result.wpm)],
          ["Accuracy", `${Math.round(result.accuracy)}%`],
          ["Round", result.round],
        ]
      : result.mode === "trial"
        ? [
            ["Score", result.chars],
            ["Finished", result.snippets],
            ["Speed", Math.round(result.wpm)],
            ["Accuracy", `${Math.round(result.accuracy)}%`],
          ]
        : [
            ["Finished", result.snippets],
            ["Time", `${result.timeSeconds.toFixed(1)}s`],
            ["Speed", Math.round(result.wpm)],
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
        <h2 className={`result-title ${lost ? "lose" : "win"}`}>{title}</h2>
        {isCampaign && (
          <div className="campaign-reward">
            {won && (
              <div className="reward-stars">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className={`reward-star ${i < camp.stars ? "on" : ""}`}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.3, rotate: -30 }}
                    animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ delay: 0.15 + i * 0.12, type: "spring", stiffness: 300, damping: 14 }}
                  >
                    ★
                  </motion.span>
                ))}
              </div>
            )}
            <div className="reward-gold">
              <span className="reward-earned">🪙 +{camp.earned}</span>
              <span className="reward-total">{camp.gold} total</span>
            </div>
            {won && camp.firstClear && (
              <div className="reward-firstclear">✨ First clear bonus!</div>
            )}
          </div>
        )}
        {result.newBest && (
          <motion.div
            className="new-best"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
          >
            {result.mode === "trial"
              ? "New best score!"
              : result.mode === "battle"
                ? "New best duel!"
                : "New best WPM!"}
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
            {result.wpm >= summary.avgWpm ? "▲ " : "▼ "}
            {Math.abs(Math.round(result.wpm - summary.avgWpm))}{" "}
            {result.wpm >= summary.avgWpm ? "faster" : "slower"} than your
            usual speed
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
        {isCampaign ? (
          <div className="result-actions">
            {won && camp.hasNext && (
              <motion.button
                className="btn btn-big"
                autoFocus
                onClick={onCampaignNext}
                whileHover={reduced ? undefined : { scale: 1.05 }}
                whileTap={reduced ? undefined : { scale: 0.95 }}
              >
                Next Level
              </motion.button>
            )}
            <button
              type="button"
              className={`btn ${won && camp.hasNext ? "btn-secondary" : "btn-big"}`}
              autoFocus={!(won && camp.hasNext)}
              onClick={onRaceAgain}
            >
              Retry
            </button>
            <button type="button" className="btn btn-secondary" onClick={onMenu}>
              Menu
            </button>
          </div>
        ) : (
          <div className="result-actions">
            {!peerGone && (
              <motion.button
                className="btn btn-big"
                autoFocus
                disabled={rematchWaiting}
                onClick={onRaceAgain}
                whileHover={reduced || rematchWaiting ? undefined : { scale: 1.05 }}
                whileTap={reduced || rematchWaiting ? undefined : { scale: 0.95 }}
              >
                {isOnline
                  ? rematchWaiting
                    ? "Waiting for opponent…"
                    : "Rematch"
                  : isPvp
                    ? "Rematch"
                    : isBattle
                      ? "Duel Again"
                      : isRace
                        ? "Race Again"
                        : "Go Again"}
              </motion.button>
            )}
            <button
              type="button"
              className={`btn ${peerGone ? "btn-big" : "btn-secondary"}`}
              autoFocus={peerGone}
              onClick={onMenu}
            >
              Menu
            </button>
          </div>
        )}
        <p className="enter-hint">
          {isCampaign
            ? won && camp.hasNext
              ? "Enter for next level · Esc for menu"
              : "Enter to retry · Esc for menu"
            : isOnline
              ? peerGone
                ? "Esc for menu"
                : "Rematch needs both players · Esc for menu"
              : "Enter to go again · Esc for menu"}
        </p>
      </motion.div>
    </motion.div>
  );
}
