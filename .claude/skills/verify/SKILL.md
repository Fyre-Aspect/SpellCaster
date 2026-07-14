# Verify SpellCaster changes

Drive the real app in headless Chrome via puppeteer-core. Do not unit-test logic files — the surface is the browser.

## Launch

```bash
npm run dev   # Vite, http://localhost:5173/ (run in background)
```

Driver setup (once per session, in the scratchpad dir, NOT the repo):

```bash
npm init -y && npm install puppeteer-core
```

Launch Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe` with these flags or headless timer throttling will desync everything (countdown timers stall, screenshots eat multiple seconds while the ~5s race finishes underneath you):

```js
args: [
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
]
```

## Driving the game

- Menu: `.menu`, start button `.btn-big`, mode buttons `.mode-btn`, difficulty `.diff-btn`. Fresh profile = race mode, Medium bot, answers shown ON.
- Countdown is ~2.9s; typing is ignored until it ends. Wait for racing with: no `.count` AND `.blank.active` present. **Careful:** that condition is also true on the finished screen (code panel stays mounted behind the overlay) — check `.result-card` absence too.
- To type the answer: read `.blank.active .char.hint` spans (answers-shown mode reveals them), replace ` ` with a real space, then `page.keyboard.type(...)`. Keydown-driven: `keyboard.press`/`type` both work; input goes to a global window keydown listener, no focus target needed.
- Wrong chars get class `.char.wrong`; Backspace deletes one char. Esc: aborts race / ends solo run. Enter on finished = go again.
- Race is short (Easy bot + first snippet ≈ 15 chars ≈ win in <10s). Pick Easy via `.diff-btn` for win tests; avoid screenshots mid-race (slow).
- Finished: `.result-card`, `.result-title` ("You win!" / "The bot wins" / "Run complete!"). Best records in localStorage `spellcaster.best.*`.
- Collect `page.on("pageerror")` — zero expected.

## Gotchas

- `npm run build` takes ~45s (three.js chunk); fine as a syntax gate but not a verification.
- Error boundary can be tested by temporarily throwing in App.jsx behind a `?boom` query param — revert before committing.
- **A long-lived dev server degrades badly** after several puppeteer sessions + HMR edits: CDP evaluates stall for 10+ seconds and typed keys stop registering, which looks exactly like an app bug. It isn't. Restart `npm run dev` per verification session, or better, verify against `npm run build && npm run preview` (port 4173) — the prod build never exhibits this.
- Add `--mute-audio` to Chrome args now that the app has WebAudio SFX.
- Audio verification: count oscillator starts by wrapping `OscillatorNode.prototype.start` via `evaluateOnNewDocument`; you can't hear headless audio. Expect 4 osc starts through a countdown, +1 per keystroke.
- When writing `hint.replace(/ /g, " ")` in driver code, ALWAYS use the ` ` escape — a literal nbsp pasted into the pattern is indistinguishable from a space and has caused hours of confusion. The hint spans in the DOM contain nbsp for spaces; puppeteer silently drops nbsp (insertText path, no keydown).
- Driver probes that type N chars must account for blanks shorter than N — the blank completes and `.blank.active` moves on, so "chars registered" reads 0 from the next blank.
