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
