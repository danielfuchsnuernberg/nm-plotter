# SUGGESTIONS — open

Things I have raised that you have not picked up or declined. Nothing here has
been merged into `index.html`.

| # | Suggestion | Why | Raised |
|---|---|---|---|
| 1 | **v312 layout — POC built, awaiting your verdict.** `NMPlotter_v312-POC_layout.html`. The panel body stops scrolling and becomes a fixed flex column; the rows shrink-and-scroll instead of pushing the tiles down; an open section takes the leftover space and scrolls inside itself. **CSS only** — the JavaScript is byte-identical to v311, and the whole thing is one appended block that reverts by deletion. | Far cheaper than I estimated when I proposed it. I said it would touch every section; it does not — a shut section is already `display:none` under `.tiled`, so only the open one needs a rule. Cannot be measured here: jsdom has no layout. Needs your eyes on the device. | v311 |
| 2 | **A hard "collapse everything below" toggle.** | You asked for it. Still not built. v311 capped the rows and the v312 POC pins the tiles, so the problem it was aimed at may already be gone. Judge after the POC. | v311 |
| 3 | **`#rows .row input {height:28px}` contradicts the token.** Line ~4875 sets row controls to 28 px by a more specific selector while `--lc-h` says 30 px for every input in this column. | Exactly the shape of the v303 bug: an older, more specific rule quietly beating the token. It may be deliberate — 28 px keeps a long route shorter — but nothing says so, and the next person to trust the tokens will be wrong. Either delete it and let the token win, or write the reason beside it. Untouched: unrequested, and a second variable. | v311 |
| 4 | **Native HTML5 drag does not auto-scroll a container in Safari.** With more rows than fit, dragging row 1 down to row 15 needs a manual scroll partway. | Consequence of putting overflow on `.rows` — true in v311 and in the v312 POC. Only bites on long routes. Fixable with a scroll-on-drag-near-edge handler if it annoys you. | v311 |
| 5 | **The Times section scrolls as a whole in the v312 POC.** Its body holds the stamp tiles, the totals, Save to log / Clear *and* the log, and all of that scrolls together. | Ideally only the log would scroll and the actions would stay put. Not done: it needs a rule specific to `#tmlib`, and I did not want a second idea inside a POC meant to test one. Flag it if it bothers you when you try it. | v312 |
| 6 | **Commit the `gates/` folder to the repo.** Rebuilt this session: `cascade.js`, `validate.py`, `measure.js`, `btnchk.js`, `gutterchk.js`, `parity.js`, `clickagent.js`, `gate311.js`, `gate312.js`, `gate.sh`, README. | The gate went from 4 checks back to 8. Still missing from the v309 pack: `cssguard`, `unwrapchk`, `revertchk`, `libtest`, `workersim` and the twelve numbered feature gates. I did not fake those — I do not know what they asserted, and a gate that guesses is worse than none. | v311 |
| 7 | **My Maps and Notes still have no backup.** | Everything else is in the cloud; those two are localStorage/IndexedDB on one Mac. Carried from the v309 handoff. | pre-v311 |

## Closed

| Suggestion | Shipped |
|---|---|
| Hide the coordinate-format hint behind a control instead of leaving it on screen | v311 |
| Cap the coordinate rows so a long route stops pushing everything down the panel | v311 |
