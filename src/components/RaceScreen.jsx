import { motion, useReducedMotion } from "motion/react";
import TrackScene from "../scene/TrackScene.jsx";
import { BOT_DIFFICULTIES } from "../logic/race.js";
import Hud from "./Hud.jsx";
import CodePanel from "./CodePanel.jsx";
import PowerupBar from "./PowerupBar.jsx";

// The plates that sit on top of the track — same shape as the duel arena's,
// so every mode names who is playing in the same place
function RacerPlate({ name, photo, badge, tone, pct }) {
  return (
    <div className={`racer-plate ${tone}`}>
      {photo ? (
        <img className="hp-avatar" src={photo} alt="" referrerPolicy="no-referrer" />
      ) : (
        <span className="hp-avatar hp-avatar-fallback">{badge}</span>
      )}
      <span className="racer-plate-name" title={name}>
        {name}
      </span>
      <span className="racer-plate-pct">{pct}%</span>
    </div>
  );
}

export default function RaceScreen({ game, user }) {
  const reduced = useReducedMotion();
  const playerName = game.live.playerName ?? "You";
  const botName = `${BOT_DIFFICULTIES[game.difficulty].label} Bot`;
  const modeLabel =
    game.mode === "race"
      ? `Round ${game.round}`
      : game.mode === "endless"
        ? `Endless · ${game.live.snippets} finished`
        : `Time Trial · ${game.live.snippets} finished`;
  const stars =
    "★".repeat(game.challenge.difficulty) +
    "☆".repeat(Math.max(0, 3 - game.challenge.difficulty));
  return (
    <motion.div
      className="race-screen"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="track-wrap">
        <TrackScene
          playerProgress={game.live.playerProgress}
          botProgress={game.live.botProgress}
          showBot={game.mode === "race"}
          reducedMotion={!!reduced}
          finished={game.screen === "finished"}
          winner={game.result?.winner ?? "player"}
        />
        <div className="battle-overlay">
          <RacerPlate
            name={playerName}
            photo={user?.photo}
            badge={playerName.charAt(0).toUpperCase()}
            tone="player"
            pct={Math.round(game.live.playerProgress * 100)}
          />
          {game.mode === "race" && (
            <>
              <div className="versus-chip" aria-hidden="true">
                VS
              </div>
              <RacerPlate
                name={botName}
                badge="B"
                tone="bot"
                pct={Math.round(game.live.botProgress * 100)}
              />
            </>
          )}
        </div>
      </div>
      <Hud
        live={game.live}
        mode={game.mode}
        playerName={playerName}
        botName={botName}
        muted={game.muted}
        onToggleMute={game.toggleMute}
      />
      <CodePanel game={game} />
      {game.mode === "race" && <PowerupBar game={game} />}
      <footer className="race-footer">
        <span>{modeLabel}</span>
        <span>Challenge level: {stars}</span>
        {game.mode !== "race" && (
          <button
            type="button"
            className="end-run-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              game.endRun();
            }}
          >
            &#9209; End &amp; Score
          </button>
        )}
      </footer>
    </motion.div>
  );
}
