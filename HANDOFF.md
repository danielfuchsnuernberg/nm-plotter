# NM Plotter — handoff

Paste this at the start of the next chat, and attach `index.html`, `sw.js` **and the `gates/` folder**.

---

## Where things stand

**Current build: v311**, service worker cache `nmplotter-v311`. Desktop/Mac only.
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

## The gate pack was NOT in the repo — rebuilt, now in `gates/`

The zip that started this session held `index.html`, `sw.js` and `HANDOFF.md`
only. Every gate named in the v309 handoff was gone. **Commit `gates/`.**

```
./gate.sh                 gate the release candidate (work.html)
./gate.sh poc312.html     gate the layout POC instead
```

| Gate | Catches |
|---|---|
| `cascade.js` | Not a gate — the ONE shared specificity resolver. measure.js and gate312.js had each grown their own copy; folded onto this one, output byte-identical before and after. |
| `validate.py` | Script blocks parse, no width media queries outside comments, no phone/tablet leftovers, unexpected duplicate ids. |
| `measure.js` | Left-column uniformity; the v311 rows cap and `?` rules **win** their cascade. |
| `btnchk.js` | Fixed height with no centring rule = label at the top of the box. Rule-level, because jsdom has no layout. |
| `gutterchk.js` | The 8 px scrollbar takes layout width. Checks its own premise first, and knows the difference between the v311 and v312 layouts. |
| `parity.js` | The standing two-search-bar rule. Reports "0 gap(s)" when clean. |
| `clickagent.js` | Presses ~135 controls, reports throws and uncaught errors. |
| `gate311.js` | Boots the real file and drives the `?` toggle — proof it **executes**. |
| `gate312.js` | Every v312 rule wins its cascade; JS byte-identical to v311. |

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
7. **Anchored greps only.** I broke this twice in one session — `sed -n` over a
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

On `.panel.left`: `--lc-h 30px`, `--lc-h-sq 30px`, `--lc-h-tile 56px`,
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
- Run `cloud-agent.html` from the GitHub Pages URL (must be same-origin).
- Seven old cloud routes stored under pre-v291 slug ids: re-push, then delete.
- Re-push waypoints once so the cloud carries the corrected names.

**Known and unresolved**
- Map labels float/jump during zoom. v307 reverted the zoom to pre-v294. If it
  persists it predates that session. Ask **which** labels — amber route labels
  and aerodrome labels are different code.
- No backup for My Maps or Notes.
- `dlBack` is a duplicate id, allowed explicitly by `validate.py`.
- ADCOM was dropped by decision. Do not revive it unasked.

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
