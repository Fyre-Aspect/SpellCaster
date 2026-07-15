import { AnimatePresence } from "motion/react";
import useGame from "./hooks/useGame.js";
import Menu from "./components/Menu.jsx";
import RaceScreen from "./components/RaceScreen.jsx";
import BattleScreen from "./components/BattleScreen.jsx";
import Countdown from "./components/Countdown.jsx";
import Finished from "./components/Finished.jsx";
import PauseOverlay from "./components/PauseOverlay.jsx";

export default function App() {
  const game = useGame();
  return (
    <div className="app">
      <AnimatePresence mode="wait">
        {game.screen === "menu" ? (
          <Menu
            key="menu"
            best={game.best}
            selectedMode={game.selectedMode}
            onSelectMode={game.selectMode}
            difficulty={game.difficulty}
            onSelectDifficulty={game.selectDifficulty}
            content={game.content}
            onSelectContent={game.selectContent}
            showAnswers={game.showAnswers}
            onToggleAnswers={game.toggleAnswers}
            onStart={game.start}
            summary={game.summary}
            aiCount={game.aiCount}
            muted={game.muted}
            onToggleMute={game.toggleMute}
          />
        ) : game.mode === "battle" ? (
          <BattleScreen key="battle" game={game} />
        ) : (
          <RaceScreen key="race" game={game} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {game.screen === "countdown" && (
          <Countdown key="countdown" value={game.count} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {game.screen === "paused" && (
          <PauseOverlay
            key="paused"
            mode={game.mode}
            onResume={game.resume}
            onRestart={game.restartRun}
            onEndRun={game.endRun}
            onMenu={game.toMenu}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {game.screen === "finished" && (
          <Finished
            key="finished"
            result={game.result}
            summary={game.summary}
            onRaceAgain={game.raceAgain}
            onMenu={game.toMenu}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
