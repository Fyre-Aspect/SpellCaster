import { AnimatePresence } from "motion/react";
import useGame from "./hooks/useGame.js";
import Menu from "./components/Menu.jsx";
import RaceScreen from "./components/RaceScreen.jsx";
import Countdown from "./components/Countdown.jsx";
import Finished from "./components/Finished.jsx";

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
            showAnswers={game.showAnswers}
            onToggleAnswers={game.toggleAnswers}
            onStart={game.start}
          />
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
        {game.screen === "finished" && (
          <Finished
            key="finished"
            result={game.result}
            onRaceAgain={game.raceAgain}
            onMenu={game.toMenu}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
