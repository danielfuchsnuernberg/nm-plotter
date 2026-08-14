# NM Plotter — handoff

Paste this at the start of the next chat, and attach `index.html`, `sw.js` **and the `gates/` folder**.

---

## Where things stand

**Current build: v331**, service worker cache `nmplotter-v331`. The version now shows in the header strip (derived from the Settings footer, not authored twice) and in the archive filename. Desktop/Mac only.
`index.html` ~2.44 MB, single file, all libraries inlined.

v311 made two changes, both in the left column:

1. The coordinate-format hint is behind a **`?` in the panel head** (next to `+`),
   not permanently under the rows. It cost 94 px. It did *not* get its own
   collapsible header — a shut header still costs 30 px to save 94, and this
   panel already has six of them. Remembered, default off.
2. `.rows` is **capped at ten rows (334 px) and scrolls past that**. Capped, not
   fixed: a four-point route renders exactly as before. Only long routes stop
   pushing the tiles and the open section down the panel.

---

## THE VERSION LIVES IN THREE HAND-MAINTAINED PLACES

v311 shipped with the changelog and `sw.js` bumped and the **Settings footer**
left at v309. The footer is the only one visible from the cockpit, so the app
reported the wrong version to the one person checking whether the deploy had
landed — and he cleared caches chasing a deploy that had already worked.

`verchk.py` now fails the build unless all three agree, and asserts the cache
never goes backwards and never sweeps `nmplotter-terrain`. It is regression-
tested against the original fault: re-inject the stale footer and it exits 1.

**Bumping the CACHE is not optional cosmetics.** If the cache name does not
change, the service worker keeps serving the old shell and the corrected file
is never fetched — the fix ships and nothing happens.

---

## The gate pack was NOT in the repo — rebuilt, now in `gates/`

The zip that started this session held `index.html`, `sw.js` and `HANDOFF.md`
only. Every gate named in the v309 handoff was gone. **Commit `gates/`.**

```
npm install jsdom fake-indexeddb acorn acorn-walk   # one-time
./gate.sh                 gate the release candidate (work.html)
./gate.sh other.html      gate another build
```

| Gate | Catches |
|---|---|
| `cascade.js` | Not a gate — the ONE shared specificity resolver, and now **media-aware**. It used to flatten `@media` blocks into the rule set, so the touch-only `input[type="text"]{font-size:16px !important}` iOS zoom guard was reported as winning on a Mac, where it never applies. It now evaluates media conditions against a desktop profile; the evaluator is unit-tested against all six conditions in the file. |
| `scopeproof.js` | **AST scope check.** Finds calls to functions that are not in scope — the `openAirfieldCard` bug class, invisible to `node --check` (the file parses) and to grep (the name is there, just in another room). Needs `npm install acorn acorn-walk`. Counts `window.X =` as a global, or it cries wolf on three working exports. |
| `validate.py` | Script blocks parse, no width media queries outside comments, no phone/tablet leftovers, unexpected duplicate ids. |
| `measure.js` | Left-column uniformity; the v311 rows cap and `?` rules **win** their cascade. |
| `btnchk.js` | Two checks. (1) Fixed height with no centring rule = label at the top of the box. (2) **v321:** every left-column control, checked as an ELEMENT, must resolve to `--lc-h`, and no rule may address a container class absent from the markup. The old version only inspected rules that *did* set a height, so a token rule pointed at a non-existent `.flog-tools` matched nothing and went unseen. |
| `gutterchk.js` | The 8 px scrollbar takes layout width. Checks its own premise first, and knows the difference between the v311 and v312 layouts. |
| `parity.js` | The standing two-search-bar rule. Reports "0 gap(s)" when clean. |
| `clickagent.js` | Presses ~135 controls, reports throws and uncaught errors. |
| `gate316.js` | Replaces `gate311.js`, which tested the `?` button v316 removed. Drives the More/Less disclosure and proves the formats line never hides. |
| `gate315.js` | The Route-name placeholder is quiet and matches the row-field convention, the typed name keeps the amber identity, and the zoom guard stays excluded from the desktop model but present in the app. |
| `gate318.js` | Backup/restore round trip: plants state, builds a bundle, **wipes the device**, restores, compares byte-for-byte. Needs `npm install fake-indexeddb` — jsdom has no IndexedDB. |
| `gate319.js` | Only the Times log scrolls: every child of the Times body except `#tmxLog` must be `flex:0 0`, checked against the real element rather than a hand-written list. |
| `gate320.js` | Drag auto-scroll driven with real drag events at real coordinates. Checks every stop path — dragend, drop, dragexit, Escape, blur — because a loop left running scrolls the panel on its own. |
| `gate322.js` | The plotted-point card is still wired (its parts compared against the **v309 file this session started from**), and a searched coordinate opens that same card by both click and Enter. |
| `gate325.js` | **Clicking a plotted point must OPEN A CARD.** Plots one point on an aerodrome and one in open country, clicks the dot and the label for each, fails if any of the four opens nothing. Reproduces the v325 bug exactly on the old code. |
| `gate327.js` | The divider's collapse button: hides everything below the line, persists, and — the two easy ones to get wrong — pressing it never starts a drag, and the hide rules beat the v313 section rule on **specificity** (800 > 700), not source order. |
| `gate328.js` | Fuel Calc defaults are REAL values, not placeholders, and the arithmetic off them is right (60 NM → 110.0 kg trip, 73.3 kg reserve, 183 kg total). |
| `gate330.js` | The PLAN block: name, Save and Save to Cloud moved out of Saved Routes, moved **not duplicated**, still inside a `.wplib` (which is what gives the name box its styling — v330 lost it), and Save driven for real so the saved record carries both the name and the notes. |
| `gate314.js` | The strip cannot move (containment + `flex:1 1 0` on sections, the assertion that would have caught the jump) and the divider drags, clamps, persists and resets. Regression-tested: re-inject `flex:1 1 auto` and it fails. |

**Still missing** and deliberately not faked: `cssguard`, `unwrapchk`,
`revertchk`, `libtest`, `workersim`, and `gate263/264/269/270/271/272/277/285/
293/295/297/301`. I do not know what they asserted, and a gate that guesses is
worse than none.

**Three assertions were wrong on first run. I fixed the assertion, not the file,
and said so each time:**
- `validate.py` searched for a bare `max-width:430px`; `.wx-modal` uses it
  legitimately as a modal width. Now looks for a `430px` *breakpoint*.
- `clickagent.js` reported three failures that were jsdom not implementing
  `alert()`. Stubbed `alert`/`confirm`/`prompt` (`confirm` returns false so the
  sweep never destroys state).
- `btnchk.js` flagged Leaflet's popup close button and a 6 px dot as uncentred
  labels. Neither is a control in this column and neither has a label.

---

## Rules I had to learn the hard way (v309 list, still true)

1. **Measure, don't eyeball — and make sure the measurement reads the WINNER.**
   `getComputedStyle` in jsdom does not resolve specificity. `measure.js`
   resolves it itself.
2. **`[hidden]` does not hide anything in the left column unless you let it.**
   `.panel.left [hidden]{display:none !important}` is what makes it real, and
   v311 depends on it — the hint hides via the attribute. `measure.js` asserts it.
3. **Unwrapping a `@media` block is not a no-op.**
4. **jsdom has no layout, so nothing can see a wrapped row.**
5. **Check structure, not class names.**
6. **One variable per build.**
7. **A handler that throws is a handler that is missing.** `openAirfieldCard`
   is declared inside an IIFE; the route code called it by bare name from top
   level and got a silent ReferenceError whenever a plotted point sat within
   0.25 NM of an aerodrome. I twice reported "the code is byte-identical to
   v309, so it is fine" — identical to a file that already had the bug. Reading
   code answers "did I change it". Only running it answers "does it work".
8. **Anchored greps only.** I broke this twice in one session — `sed -n` over a
   line range that contained the 575-record airfield array, and a `grep` that hit
   the Leaflet blob. Both dumped enormous output. Truncate with `cut -c1-160`.

---

## Deploy sequence (fixed)

1. Edit `/home/claude/nm/work.html` with assert-guarded Python replaces
   (`assert s.count(old)==1` for **every** anchor before writing anything).
2. Run `./gate.sh`.
3. Copy to `/mnt/user-data/outputs/index.html`.
4. Bump `CACHE` in `sw.js` (never backwards; `nmplotter-terrain` is preserved).
5. Delete the old dated archive, write a new `NMPlotter_YYYY-MM-DD_HHMMUTC.html`.
6. `present_files` on index.html, sw.js, the archive and the living documents.

Danny pushes via GitHub Desktop and hard-resets Safari. Never send rendered
screenshots — he reviews on his own machine.

---

## Design tokens — do not hand-size anything

On `.panel.left`: `--lc-h 28px`, `--lc-h-sq 28px`, `--lc-h-tile 56px`,
`--lc-r 5px`, `--lc-gap 6px`, `--lc-label 10px`, `--lc-value 13px`.
New in v311: `--rows-max 334px` (ten rows).

**Caveat:** `#rows .row input{height:28px}` near line 4875 beats the 30 px token
by specificity. The v311 cap is calculated from the real 28 px, not the token —
`measure.js` reads both and asserts the arithmetic rather than trusting either.
See SUGGESTIONS #3.

---

## Open items

**Waiting on Danny**
- Judge on the device whether an explicit "collapse everything below" toggle is
  still wanted. My read is that capping the rows already solved it, because the
  tiles sit *below* the rows and never pushed them off screen — but that is a
  guess about how it feels, and you are the one flying with it.
- `cloud-agent.html` run 2026-08-14: **56 passed, 0 failed.** The Worker LIST-name patch is confirmed (section 3b: plain list, `?full=1` and the record all agree). Two of its notes were STALE TEXT describing pre-fix app behaviour and have been removed; section 5 now hunts for leftover slug-id routes instead of asserting the old app behaviour. Self-tested against a fake Worker (`gates/agentlegacy.js`).
- Old cloud routes under pre-v291 slug ids: **run cloud-agent section 5** — it now lists them by id and name. For each: load it in the app, Save to Cloud, delete the old id.
- Re-push waypoints once so the cloud carries the corrected names.

**Known and unresolved**
- **Map labels float/jump during zoom — investigated, NOT fixed, and I could
  not reproduce it (no browser here, jsdom has no layout).** The lead in the
  v309 handoff is a dead end in this build: `rotfix` and the iPhone zoom-sync
  do not exist in this file at all. What I did find, as *candidates* — plural,
  deliberately, because closing this on one cause is how it comes back:

  1. **`zoomSnap: 0`** (line ~5806) makes the zoom continuous, so
     `map.getZoom()` returns fractional values and never settles on an integer.
  2. **Five label families gate themselves on integer thresholds against that
     fractional zoom:** aerodrome overlay (`MAJOR_LABEL_Z 7`, `STRIP_SOLID_Z 9`,
     `STRIP_LABEL_Z 10`, ~11139), enroute fixes (`>= 8`, ~13561), procedure
     fixes (`PF_ZGATE 7`, `PF_ZLABEL 9`, ~13583), TMA (`tma-zoom` at `>= 9`,
     ~14883).
  3. **None of those recompute during the gesture** — all five subscribe to
     `zoomend`/`moveend` only. So a whole family appears or disappears in one
     step when the gesture stops, and a trackpad that settles near a boundary
     (8.99 vs 9.01) can flip it back and forth between gestures.

  This predates v294 and v307 entirely, which matches "if it persists it
  predates this session".

  **A decisive test you can run in 30 seconds, with no new build:** the
  aerodrome and enroute declutter are both opt-in and default OFF
  (`nmplotter_af_declutter`, `nmplotter_enr_declutter`). Turn them **off** and
  zoom. If the floating stops, it is the threshold interaction above and I know
  what to fix. If it continues, it is none of this and I am looking in the
  wrong place.

  **Still the first question, and it decides everything:** *which* labels?
  All of the above are aerodrome / fix / airspace labels. The amber **route**
  labels are drawn by different code and none of this touches them.
- ~~No backup for My Maps or Notes.~~ **Solved in v318** — Settings > Backup & restore writes one file covering all 45 `nmplotter_*` keys plus the flight log, and optionally maps and charts. A cloud version could sit on top later; see the changelog for why it is a file and not the Worker.
- `dlBack` is a duplicate id, allowed explicitly by `validate.py`.
- ADCOM was dropped by decision. Do not revive it unasked.

**Signed off, so do not 'fix' it back**
- v331 puts Save to Cloud for routes in the PLAN block at the top, NOT in the
  Saved Routes section. This breaks the v309 rule that Save to Cloud sits in the
  same place in all four sections. It was raised twice and approved: the four
  sections are libraries of stored things, the PLAN block is the plan in hand.

**Never do without explicit sign-off**
- No aviation data — frequency, coordinate, sector boundary — ships without
  Danny confirming it in writing. Transcribe, present a verification table, wait.
- The AYNZ ATIS was wrong in the pack for months (128.6 is the AWOS; ATIS is
  128.1). That is what guessing looks like later.

---

## Working style

Direct and fast. "Go for it" means build it; "show me first" means mock it. Do
not ship unrequested changes. He sends screenshots and expects them read
precisely. When he says something is still wrong after you said you fixed it,
he is right — go and measure before answering.
