export default function Hud({ live, mode }) {
  const playerPct = Math.round(live.playerProgress * 100);
  const botPct = Math.round(live.botProgress * 100);
  const isTrial = mode === "trial";
  const timeValue = isTrial ? (live.remaining ?? 0) : live.elapsed;
  return (
    <div className="hud">
      <div className="stat">
        <span className="stat-label">WPM</span>
        <span className="stat-value">{Math.round(live.wpm)}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Accuracy</span>
        <span className="stat-value">{Math.round(live.accuracy)}%</span>
      </div>
      <div className="stat">
        <span className="stat-label">{isTrial ? "Left" : "Time"}</span>
        <span className="stat-value">{timeValue.toFixed(1)}s</span>
      </div>
      <div className="stat">
        <span className="stat-label">Streak</span>
        <span className="stat-value">{live.streak}</span>
      </div>
      {mode !== "race" && (
        <div className="stat">
          <span className="stat-label">Snippets</span>
          <span className="stat-value">{live.snippets}</span>
        </div>
      )}
      <div className="stat stat-wide">
        <div className="progress-row">
          <span className="stat-label player-label">You</span>
          <div className="bar">
            <div className="bar-fill player" style={{ width: `${playerPct}%` }} />
          </div>
          <span className="pct">{playerPct}%</span>
        </div>
        {mode === "race" && (
          <div className="progress-row">
            <span className="stat-label bot-label">Bot</span>
            <div className="bar">
              <div className="bar-fill bot" style={{ width: `${botPct}%` }} />
            </div>
            <span className="pct">{botPct}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
