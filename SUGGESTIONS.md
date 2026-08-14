# SUGGESTIONS — open

Things I have raised that you have not picked up or declined. Nothing here has
been built.

| # | Suggestion | Why | Raised |
|---|---|---|---|
| 1 | **v312: rows take the column, add-ons pinned below.** `.panel-body` stops scrolling and becomes a fixed flex column — Notes on top, `.rows` at `flex:1` scrolling internally, tiles and sections pinned beneath. The plotting area then owns the panel structurally instead of you having to keep it tidy. | This is your own reasoning applied to the layout rather than to a toggle. It also removes the nested scrollbar that v311 introduces. Cost: every section holding a long list (Waypoints library, Times log, Flights) currently leans on `.panel-body` to scroll and would need its own. Mock first. | v311 |
| 2 | **A hard "collapse everything below" toggle.** | You asked for it. I have not built it because v311 may have already solved the problem it was aimed at — see the note in HANDOFF. Judge it on the device first. | v311 |
| 3 | **`#rows .row input {height:28px}` contradicts the token.** Line ~4875 sets the row controls to 28 px by a more specific selector, while `--lc-h` says 30 px for every input in this column. | This is the exact shape of the v303 bug: a more specific older rule quietly beating the token. It may well be deliberate — 28 px keeps a long route shorter — but right now nothing says so, and the next person to trust the tokens will be wrong. Either delete it and let the token win, or write the reason next to it. I have not touched it: unrequested, and a second variable. | v311 |
| 4 | **Native HTML5 drag does not auto-scroll a container in Safari.** With more than ten rows, dragging row 1 down to row 15 will need a manual scroll partway. | Consequence of the v311 cap, not a fault in it. Only bites on long routes. Fixable with a scroll-on-drag-near-edge handler if it annoys you. | v311 |
| 5 | **The gate pack is not in the repo.** `index.html`, `sw.js` and `HANDOFF.md` were all that shipped; every `.js`/`.py` gate was missing. | I have rebuilt four (`validate.py`, `measure.js`, `clickagent.js`, `gate311.js`, plus `gate.sh`). The other ~15 named in HANDOFF are still gone. Worth committing the gate pack alongside the app so a session never starts blind again. | v311 |
| 6 | **My Maps and Notes still have no backup.** | Everything else is in the cloud; those two are localStorage/IndexedDB on one Mac. Carried over from the v309 handoff. | pre-v311 |

## Closed

| Suggestion | Shipped |
|---|---|
| Hide the coordinate-format hint behind a control instead of leaving it permanently on screen | v311 |
| Cap the coordinate rows so a long route stops pushing everything down the panel | v311 |
