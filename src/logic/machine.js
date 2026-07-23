export const MODES = {
  campaign: {
    id: "campaign",
    label: "Campaign",
    desc: "Climb the ladder — beat wizards, earn gold",
    startLabel: "Open Campaign",
    group: "solo",
  },
  race: {
    id: "race",
    label: "Race the Bot",
    desc: "Beat the bot to the finish line",
    startLabel: "Start Race",
    group: "solo",
  },
  battle: {
    id: "battle",
    label: "Quick Duel",
    desc: "One-off fight against an AI wizard",
    startLabel: "Start Duel",
    group: "solo",
  },
  endless: {
    id: "endless",
    label: "Endless Solo",
    desc: "Chill run — type as long as you like",
    startLabel: "Start Run",
    group: "solo",
  },
  trial: {
    id: "trial",
    label: "Time Trial",
    desc: "60 seconds, score as much as you can",
    startLabel: "Start Trial",
    timeLimit: 60,
    group: "solo",
  },
  pvp: {
    id: "pvp",
    label: "Local PvP",
    desc: "Two players, one keyboard — take turns casting",
    startLabel: "Start PvP",
    group: "versus",
  },
  online: {
    id: "online",
    label: "Online Duel",
    desc: "Battle a friend over the internet",
    startLabel: "Create Room",
    group: "versus",
  },
};

export const MODE_GROUPS = [
  { id: "solo", label: "Solo" },
  { id: "versus", label: "Versus" },
];

export const initialState = { screen: "landing", mode: "race", round: 1, result: null };

export function gameReducer(state, event) {
  switch (state.screen) {
    case "landing":
      if (event.type === "ENTER") {
        return { ...state, screen: "menu" };
      }
      return state;
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
      if (event.type === "PAUSE") {
        return { ...state, screen: "paused" };
      }
      if (event.type === "ABORT") {
        return { ...state, screen: "menu", round: 1, result: null };
      }
      return state;
    case "paused":
      if (event.type === "RESUME") {
        return { ...state, screen: "racing" };
      }
      if (event.type === "RESTART") {
        return {
          ...state,
          screen: "countdown",
          round: event.round ?? state.round,
          result: null,
        };
      }
      if (event.type === "FINISH") {
        return { ...state, screen: "finished", result: event.stats };
      }
      if (event.type === "MENU") {
        return { ...state, screen: "menu", round: 1, result: null };
      }
      return state;
    case "finished":
      if (event.type === "RACE_AGAIN") {
        return {
          ...state,
          screen: "countdown",
          round: event.round ?? state.round + 1,
          result: null,
        };
      }
      if (event.type === "MENU") {
        return { ...state, screen: "menu", round: 1, result: null };
      }
      return state;
    default:
      return state;
  }
}
