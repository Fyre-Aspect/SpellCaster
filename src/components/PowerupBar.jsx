import { POWERUPS, powerupsForMode } from "../logic/powerups.js";

// A slim strip of buy-and-use power-ups shown during solo races and duels.
// Coins come from the shared campaign purse; clicking spends them instantly.
export default function PowerupBar({ game }) {
  const list = powerupsForMode(game.mode);
  if (list.length === 0) return null;

  const { coins = 0, danger = false, activePowerups = {} } = game.live;
  const dangerNote =
    game.mode === "race" ? "Falling behind!" : "Low HP — heal up!";
  const cheapest = Math.min(...list.map((id) => POWERUPS[id].cost));

  return (
    <div className={`powerup-bar${danger ? " in-danger" : ""}`}>
      <span className="powerup-coins" title="Your coins — win matches to earn more">
        🪙 {coins}
      </span>
      {danger ? (
        <span className="powerup-alert">⚠️ {dangerNote}</span>
      ) : (
        coins < cheapest && (
          <span className="powerup-broke">Win matches to earn coins</span>
        )
      )}
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
              }${!afford && !active ? " broke" : ""}`}
              disabled={!afford || active}
              title={
                active
                  ? `${p.name} — active right now`
                  : afford
                    ? `${p.name} — ${p.desc} · Alt+${i + 1}`
                    : `${p.name} — ${p.desc} · needs ${p.cost - coins} more coins`
              }
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
