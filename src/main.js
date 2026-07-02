import { snippets, BLANK_MARKER } from "./snippets.js";

function renderSnippet(snippet, container) {
  const pre = document.createElement("pre");
  pre.className = "snippet";
  const code = document.createElement("code");

  const parts = snippet.code.split(BLANK_MARKER);
  if (parts.length - 1 !== snippet.answers.length) {
    console.warn(
      `Snippet "${snippet.id}" has ${parts.length - 1} blanks but ${snippet.answers.length} answers`
    );
  }

  parts.forEach((part, i) => {
    code.append(part);
    if (i < parts.length - 1) {
      const blank = document.createElement("span");
      blank.className = "blank";
      code.append(blank);
    }
  });

  pre.append(code);
  container.replaceChildren(pre);
}

console.log("snippets loaded:", snippets.length);
renderSnippet(snippets[0], document.querySelector("#game"));
