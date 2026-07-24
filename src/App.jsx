import { AnimatePresence } from "motion/react";
import useGame from "./hooks/useGame.js";
import useAuth from "./hooks/useAuth.js";
import Landing from "./components/Landing.jsx";
import Menu from "./components/Menu.jsx";
import RaceScreen from "./components/RaceScreen.jsx";
import BattleScreen from "./components/BattleScreen.jsx";
import Countdown from "./components/Countdown.jsx";
import Finished from "./components/Finished.jsx";
import PauseOverlay from "./components/PauseOverlay.jsx";
import FireballTransition from "./components/FireballTransition.jsx";

export default function App() {
  const auth = useAuth();
  const game = useGame({ playerName: auth.user?.name });
  return (
    <div className="app">
      <AnimatePresence mode="wait">
        {game.screen === "landing" ? (
          <Landing
            key="landing"
            onEnter={game.enter}
            user={auth.user}
            ready={auth.ready}
            busy={auth.busy}
            error={auth.error}
            onSignIn={auth.signInGoogle}
            onSignOut={auth.logout}
          />
        ) : game.screen === "menu" ? (
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
            battleStyle={game.battleStyle}
            onSelectBattleStyle={game.selectBattleStyle}
            net={game.net}
            onHostOnline={game.hostOnline}
            onJoinOnline={game.joinOnline}
            onQuickMatch={game.quickMatch}
            onCancelOnline={game.cancelOnline}
            user={auth.user}
            onSignIn={auth.signInGoogle}
            onSignOut={auth.logout}
            busy={auth.busy}
            muted={game.muted}
            onToggleMute={game.toggleMute}
            campaign={game.campaign}
            onStartCampaignLevel={game.startCampaignLevel}
          />
        ) : game.mode === "battle" ||
          game.mode === "pvp" ||
          game.mode === "online" ? (
          <BattleScreen key="battle" game={game} user={auth.user} />
        ) : (
          <RaceScreen key="race" game={game} user={auth.user} />
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
            net={game.net}
            onRaceAgain={game.raceAgain}
            onCampaignNext={game.campaignNext}
            onMenu={game.toMenu}
          />
        )}
      </AnimatePresence>
      {game.transition && (
        <FireballTransition
          onMidpoint={game.transitionMid}
          onDone={game.transitionDone}
        />
      )}
    </div>
  );
}
