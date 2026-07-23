import { POWERUPS, powerupsForMode } from "../logic/powerups.js";

// A slim strip of buy-and-use power-ups shown during solo races and duels.
// Coins come from the shared campaign purse; clicking spends them instantly.
export default function PowerupBar({ game }) {
  const list = powerupsForMode(game.mode);
  if (list.length === 0) return null;

  const { coins = 0, danger = false, activePowerups = {} } = game.live;
  const dangerNote =
    game.mode === "race" ? "Falling behind!" : "Low HP — heal up!";

  return (
    <div className={`powerup-bar${danger ? " in-danger" : ""}`}>
      <span className="powerup-coins" title="Your coins">
        🪙 {coins}
      </span>
      {danger && <span className="powerup-alert">⚠️ {dangerNote}</span>}
      <div className="powerup-list">
        {list.map((id, i) => {
          const p = POWERUPS[id];
          const active = !!activePowerups[id];
          const afford = coins >= p.cost;
          const panic = danger && p.signature && !active && afford;
          return (
            <button
              key={id}
              type="button"
              className={`powerup-btn${active ? " active" : ""}${
                panic ? " panic" : ""
              }`}
              disabled={!afford || active}
              title={`${p.name} — ${p.desc} · Alt+${i + 1}`}
              onClick={(e) => {
                e.currentTarget.blur();
                game.usePowerup(id);
              }}
            >
              <span className="powerup-hotkey">⌥{i + 1}</span>
              <span className="powerup-icon">{p.icon}</span>
              <span className="powerup-meta">
                <span className="powerup-name">{p.name}</span>
                <span className="powerup-cost">
                  {active ? "ACTIVE" : `🪙 ${p.cost}`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
