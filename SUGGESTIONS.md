# SUGGESTIONS — open

Things I have raised that you have not picked up or declined. Nothing here has
been merged into `index.html`.

| # | Suggestion | Why | Raised |
|---|---|---|---|
| 1 | **The empty space below the strip when nothing is open.** With the strip glued, the area under it is reserved whether or not a section is open. | The unavoidable price of the strip never moving — reserve the room or it is not reserved. The v314 divider now lets you drag it away when you want more coordinate space, so this may already be a non-issue. Judge it in use. | v314 |
| 2 | **A hard "collapse everything below" toggle.** | You asked for this back at v311. Still not built, and I think it is now dead: v313 glued the strip and v314 lets you drag the divider, which is a better version of the same control. Say the word and I will close it or build it. | v311 |
| 6 | **Commit the `gates/` folder to the repo.** Now ten gates, 115 assertions: `cascade.js`, `validate.py`, `verchk.py`, `measure.js`, `btnchk.js`, `gutterchk.js`, `parity.js`, `clickagent.js`, `gate314.js`, `gate315.js`, `gate316.js`, `gate.sh`, README. | Still missing from the v309 pack: `cssguard`, `unwrapchk`, `revertchk`, `libtest`, `workersim` and the twelve numbered feature gates. I did not fake those — I do not know what they asserted, and a gate that guesses is worse than none. | v311 |
| 7 | **Floating map labels: investigated, diagnosis in HANDOFF, awaiting one answer from you.** Which labels float — aerodrome/fix/airspace, or the amber route labels? | The iPhone lead is a dead end here (`rotfix` and the zoom-sync do not exist in this build). I found a concrete candidate — integer zoom thresholds tested against the fractional zoom that `zoomSnap:0` produces, in five label families that only recompute on `zoomend`. There is a 30-second test in HANDOFF that decides it without a new build. I have shipped no fix: I cannot reproduce it here, and guessing at a fix for a bug I cannot see is how it comes back. | v312 |
| 8 | **A cloud copy of the backup, once the Worker source is to hand.** The file covers the risk; the cloud would cover "the Mac is gone and so is the file". | Needs the routes-Worker source, which is not in this repo — a new collection has to be accepted server-side. Blobs should stay out of it regardless; KV over JSON is the wrong pipe for a 20 MB chart. | v318 |

## Closed

| Suggestion | Shipped |
|---|---|
| Two heights in the left column — coordinate rows outside the token system | v326 (one token, 28px, 21 controls) |
| cloud-agent reporting two bugs that were already fixed (stale note text) | 2026-08-14 |
| Clicking a plotted point near an aerodrome opened no card (silent ReferenceError) | v325 |
| `scopeproof.js` written and folded into the gate — the whole bug class, not just the one instance | v325 |
| Point card for coordinates searched in the map search bar | v322 |
| Flights cloud button sat lower than the others — token rule aimed at a `.flog-tools` container that does not exist | v321 |
| Dead `.wplib-seg` CSS removed (unreachable, not created by any script) | v321 |
| Times: Save to log / Clear scrolled away with the log | v319 |
| Drag auto-scroll for long routes | v320 |
| My Maps, Notes, airfield notes and pilot-entered frequencies had no backup | v318 |
| Glue the tile strip so adding waypoints stops pushing it down | v313 |
| The strip still jumped when switching tiles — flex-basis `auto` let a tall section squeeze the window | v313 |
| Drag the divider to resize the coordinates window | v314 |
| Bring the informative text back (it costs no fixed height inside the window) | v313 |
| "Route name (optional)" placeholder reading as heavy chrome | v315 |
| Replace the `?` with an inline More/Less on the format reference | v316 |
| `cascade.js` ignored `@media`, reporting rules that never apply on desktop | v315 |
| Version readout agrees across changelog, footer and sw.js — gated by `verchk.py` | v311a |
| Hide the coordinate-format hint behind a control instead of leaving it on screen | v311 |
| Cap the coordinate rows so a long route stops pushing everything down the panel | v311 |
