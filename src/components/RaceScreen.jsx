import { motion, useReducedMotion } from "motion/react";
import TrackScene from "../scene/TrackScene.jsx";
import { BOT_DIFFICULTIES } from "../logic/race.js";
import Hud from "./Hud.jsx";
import CodePanel from "./CodePanel.jsx";
import PowerupBar from "./PowerupBar.jsx";

export default function RaceScreen({ game }) {
  const reduced = useReducedMotion();
  const modeLabel =
    game.mode === "race"
      ? `Round ${game.round} · Bot: ${BOT_DIFFICULTIES[game.difficulty].label}`
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
      </div>
      <Hud
        live={game.live}
        mode={game.mode}
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
