export default function Hud({ live, mode, muted, onToggleMute }) {
  const playerPct = Math.round(live.playerProgress * 100);
  const botPct = Math.round(live.botProgress * 100);
  const isTrial = mode === "trial";
  const timeValue = isTrial ? (live.remaining ?? 0) : live.elapsed;
  return (
    <div className="hud">
      <div className="stat">
        <span className="stat-label">Speed</span>
        <span className="stat-value">{Math.round(live.wpm)}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Accuracy</span>
        <span className="stat-value">{Math.round(live.accuracy)}%</span>
      </div>
      <div className="stat">
        <span className="stat-label">{isTrial ? "Time left" : "Time"}</span>
        <span className="stat-value">{timeValue.toFixed(1)}s</span>
      </div>
      <div className="stat">
        <span className="stat-label">Streak</span>
        <span className="stat-value">
          {live.streak >= 20 ? `\u{1F525}${live.streak}` : live.streak}
        </span>
      </div>
      {mode !== "race" && (
        <div className="stat">
          <span className="stat-label">Finished</span>
          <span className="stat-value">{live.snippets}</span>
        </div>
      )}
      <div className="stat stat-wide">
        <div className="progress-row">
          <span className="stat-label player-label">You</span>
          <div className="bar player-bar">
            <div className="bar-fill player" style={{ width: `${playerPct}%` }} />
          </div>
          <span className="pct">{playerPct}%</span>
        </div>
        {mode === "race" && (
          <div className="progress-row">
            <span className="stat-label bot-label">Bot</span>
            <div className="bar bot-bar">
              <div className="bar-fill bot" style={{ width: `${botPct}%` }} />
            </div>
            <span className="pct">{botPct}%</span>
          </div>
        )}
      </div>
      <button
        type="button"
        className="mute-btn"
        aria-label={muted ? "Unmute sound" : "Mute sound"}
        onClick={(e) => {
          onToggleMute();
          e.currentTarget.blur();
        }}
      >
        {muted ? "\u{1F507}" : "\u{1F50A}"}
      </button>
    </div>
  );
}
