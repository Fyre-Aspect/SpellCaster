import { motion, useReducedMotion } from "motion/react";
import TrackScene from "../scene/TrackScene.jsx";
import Hud from "./Hud.jsx";
import CodePanel from "./CodePanel.jsx";

export default function RaceScreen({ game }) {
  const reduced = useReducedMotion();
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
          reducedMotion={!!reduced}
        />
      </div>
      <Hud live={game.live} />
      <CodePanel game={game} />
      <footer className="race-footer">
        <span>Round {game.round}</span>
        <span>Snippet: {game.snippet.id}</span>
        <span>Difficulty {game.snippet.difficulty} / 3</span>
      </footer>
    </motion.div>
  );
}
