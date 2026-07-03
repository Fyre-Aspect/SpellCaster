export const initialState = { screen: "menu", round: 1, result: null };

export function gameReducer(state, event) {
  switch (state.screen) {
    case "menu":
      if (event.type === "START") {
        return { screen: "countdown", round: 1, result: null };
      }
      return state;
    case "countdown":
      if (event.type === "GO") {
        return { ...state, screen: "racing" };
      }
      return state;
    case "racing":
      if (event.type === "FINISH") {
        return { ...state, screen: "finished", result: event.stats };
      }
      return state;
    case "finished":
      if (event.type === "RACE_AGAIN") {
        return { screen: "countdown", round: state.round + 1, result: null };
      }
      return state;
    default:
      return state;
  }
}
