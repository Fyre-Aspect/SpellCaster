// Compares typed values against correct answers using a trimmed exact-string match.
// Returns one boolean per answer, in blank order. Pure function, no DOM.
export function checkAnswers(typedValues, answers) {
  return answers.map((answer, i) => (typedValues[i] ?? "").trim() === answer.trim());
}
