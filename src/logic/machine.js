export const MODES = {
  race: {
    id: "race",
    label: "Race the Bot",
    desc: "Beat the bot to the finish line",
    startLabel: "Start Race",
  },
  endless: {
    id: "endless",
    label: "Endless Solo",
    desc: "Chill run — type snippets forever",
    startLabel: "Start Run",
  },
  trial: {
    id: "trial",
    label: "Time Trial",
    desc: "60 seconds, score as much as you can",
    startLabel: "Start Trial",
    timeLimit: 60,
  },
};

export const initialState = { screen: "menu", mode: "race", round: 1, result: null };

export function gameReducer(state, event) {
  switch (state.screen) {
    case "menu":
      if (event.type === "START") {
        return {
          screen: "countdown",
          mode: event.mode ?? state.mode,
          round: 1,
          result: null,
        };
      }
      return state;
    case "countdown":
      if (event.type === "GO") {
        return { ...state, screen: "racing" };
      }
      if (event.type === "ABORT") {
        return { ...state, screen: "menu", round: 1, result: null };
      }
      return state;
    case "racing":
      if (event.type === "FINISH") {
        return { ...state, screen: "finished", result: event.stats };
      }
      if (event.type === "NEXT_SNIPPET") {
        return { ...state, round: state.round + 1 };
      }
      if (event.type === "ABORT") {
        return { ...state, screen: "menu", round: 1, result: null };
      }
      return state;
    case "finished":
      if (event.type === "RACE_AGAIN") {
        return { ...state, screen: "countdown", round: state.round + 1, result: null };
      }
      if (event.type === "MENU") {
        return { ...state, screen: "menu", round: 1, result: null };
      }
      return state;
    default:
      return state;
  }
}
