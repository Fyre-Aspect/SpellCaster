import { motion, useReducedMotion } from "motion/react";
import TrackScene from "../scene/TrackScene.jsx";
import { BOT_DIFFICULTIES } from "../logic/race.js";
import Hud from "./Hud.jsx";
import CodePanel from "./CodePanel.jsx";

export default function RaceScreen({ game }) {
  const reduced = useReducedMotion();
  const modeLabel =
    game.mode === "race"
      ? `Round ${game.round} · Bot: ${BOT_DIFFICULTIES[game.difficulty].label}`
      : game.mode === "endless"
        ? `Endless · ${game.live.snippets} snippets done`
        : `Time Trial · ${game.live.snippets} snippets done`;
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
        />
      </div>
      <Hud live={game.live} mode={game.mode} />
      <CodePanel game={game} />
      <footer className="race-footer">
        <span>{modeLabel}</span>
        <span>Snippet: {game.challenge.id}</span>
        <span>Difficulty {game.challenge.difficulty} / 3</span>
      </footer>
    </motion.div>
  );
}
