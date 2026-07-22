# NM Plotter — Session Handoff (2026-07-19)

*Paste this whole file into the new chat as the first message. It brings Claude fully up to speed on state, conventions, what shipped, what's open, and what's parked.*

**Danny has a NEW IDEA to raise at the start of the next session.** He deferred it twice to finish the IFR procedure work. Ask him about it before proposing anything else.

---

## Who / what

Danny = BK117 MedEvac pilot, Lae PNG. Sole dev/user of **NM Plotter**: an advisory backup flight-planning PWA. **Garmin is always primary; every layer is advisory and carries its AIP edition date.** Single-file HTML PWA + paired `sw.js`. Hosted on GitHub Pages (repo `danielfuchsnuernberg/nm-plotter`, live at `danielfuchsnuernberg.github.io`). Danny pushes via GitHub Desktop, then hard-resets Safari to clear the cache.

Core fields: **AYPY**/Port Moresby Jacksons, **AYNZ**/Nadzab, **AYGA**/Goroka, **AYMH**/Mt Hagen, **AYMD**/Madang, **AYTK**/Tokua. Devices: iPad mini (primary, offline cockpit use), iPhone, Mac — all Safari.

## Current live state

- **Live version: v262.** SW cache constant: `nmplotter-v262`.
- Working file: `/home/claude/nm/work.html` (~14,050 lines) + `/home/claude/nm/sw.js`. **Uploaded fresh each session.**
- Current archive in outputs: `NMPlotter_2026-07-19_0810UTC.html`.
- Nothing pending mid-flight. v262 fully shipped, **untested on device** (v259–v262 all await Danny's confirmation).

## Deploy discipline (FIXED — follow exactly every round)

1. Edit `work.html` with **Python assert-guarded string replacements** (`assert src.count(old)==1` before every replace; re-grep anchors each turn — line numbers drift).
2. Run `/home/claude/nm/validate.py` (**rebuild it each session — it does not persist**; see Validator below).
3. Copy `work.html` → `/mnt/user-data/outputs/index.html`.
4. Bump SW `const CACHE = 'nmplotter-vNNN';` forward (never backward; preserve `nmplotter-terrain`).
5. **Update the Settings build stamp** — `<div class="set-ver" id="setVersion">NM Plotter &middot; vNNN &middot; YYYY-MM-DD</div>`. *This drifted for ~23 versions before being caught. Never skip it.*
6. Add a CHANGELOG entry (newest first, near top of `work.html`, ~line 12). Anchor on `'  CHANGELOG (newest first):\n'` and prepend.
7. Write dated archive `NMPlotter_YYYY-MM-DD_HHMMUTC.html` to outputs; **delete the previous archive so only one remains.**
8. Verify the deploy actually landed: `diff -q work.html /mnt/user-data/outputs/index.html`.
9. `present_files(index.html, sw.js, archive)`. Then Danny pushes + hard-resets.

### Validator (`validate.py`) — invariants that must hold
- `node --check` passes on **all 5** inline `<script>` blocks
- `@media` total = **15**; iPhone band `@media (max-width:540px)` = **1**; iPad band `@media (min-width:541px) and (max-width:900px)` = **1**
- Only permitted duplicate id = `dlBack` (2). Use regex `\bid="([A-Za-z][A-Za-z0-9_-]*)"` to avoid JS template-literal false positives.

**The validator does NOT catch the three failure modes below.** All three shipped broken code this session.

---

## ⚠️ THE THREE SILENT-FAILURE MODES (each cost a live bug this session)

### 1. Scope collisions — block 5 is one giant shared scope
Block 5 (lines ~4497–13641) is **one enormous scope**; most app functions live directly in it. Adding a function with an existing name **silently overrides it** via hoisting — no syntax error, no validator failure.

*What happened:* v255's procedure profile declared `function profSvg(key,label)` in the same scope as the terrain profile's `function profSvg(prof, alt, margin)`. The later declaration won, so **the Terrain Profile button was broken in v255–v257** and nobody noticed until a line-anchor audit. Fixed in v258 (`pfProfSvg`).

**Before adding any top-level function or var:**
```bash
grep -cE "(function|var|let|const) +NAME\b" work.html   # must be 0
```
Prefer prefixed names (`pf*`, `pa*`, `rp*`, `nm*`).

### 2. CSS cascade — source order beats intent
Media queries add **no specificity**. If a base rule appears *later* in the stylesheet than a media-query override for the same selector, **the base wins**.

*What happened:* v257 tried to match the plate window's width to the My-altitude window by adding `.nmpo-ctrl` rules inside two media blocks (~line 3492). But `.nmpo-ctrl`'s base rule is at ~3714 — *after* them — so the base 248px kept winning and **the fix did nothing at all**. Danny reported it twice. Fixed in v259 by bumping specificity (`.nmpo-ctrl.nmpo-ctrl`).

**Before shipping a CSS fix:** check the line number of the base rule vs the override. Later + equal specificity = later wins.

### 3. Guarding on `window.X` when X is a top-level `const`
Top-level `const`/`let` do **not** attach to `window`. `window.NM_REGION` is `undefined` even though `NM_REGION` is in scope.

*What happened:* v262's coordinate matcher guarded with `if(!(window.NM_REGION && NM_REGION.airfields)) return null;` — permanently false, so **the whole feature would have silently done nothing**. Caught in pre-deploy verification, fixed to `typeof NM_REGION === 'undefined'`.

**Rule:** only use `window.X` for things explicitly assigned as `window.X = ...` (e.g. `window.NMProcFix`, `window.NMEnroute`, `window.NMCharts`). For everything else use `typeof X === 'undefined'`.

**General lesson:** after any fix, verify the mechanism actually resolves — don't assume an edit that applied cleanly is an edit that works.

## ⚠️ CRITICAL GREP HAZARD

Leaflet/protomaps/jsPDF/html2canvas are inlined as giant minified single lines. Grepping common tokens (`add`, `collapsed`, `L.map(`, `click`, `map.on`, `renderRoutes`) **dumps the whole library and burns enormous context.** Grep ONLY distinctive standalone tokens, pipe through `grep -v`, or `view` narrow line ranges. Useful anchors often appear at the very END of a polluted grep result.

## Standing principles / working style

- Advisory only, Garmin primary. Safety-critical nav data must be **Danny-verified against the AIP plate** before ship.
- **I draft, Danny verifies.** Claude may transcribe plate data but never presents it as authoritative. **Never OCR safety-critical numbers and present them as fact.**
- **POC/mock before significant NEW visual layers or features.** Small refinements ship directly.
- Danny reviews on his own devices — **do NOT render screenshots back to him.** He sends screenshots to Claude.
- UI standards: uniform buttons (**no text wrapping / misalignment**), consistent spacing, no emoji, never mix icon+text in one button, sibling components share styling. **Self-check before presenting.**
- **Watch for growth-without-bound in card sections.** "One row per item" designs blow up the airport card. Danny rejected the wide card (v250) and the stacked procedure list (v256) for this. The fix that worked: a picker + one row of uniform actions, constant height regardless of item count.
- **Collapsed-by-default with a count in the header** is his preferred pattern for card sections (Charts, My notes, Procedures).
- One coherent deliverable per round; Danny tests on-device between rounds. Own mistakes plainly. He tunes numeric values iteratively — offer the knob.
- Honest pushback valued; he gives clear positive feedback when something lands.

## Palette / CSS vars

`--accent:#ffb020` (app amber), `--accent-2:#7fb3d5` (blue), `--panel:#0d1219`, `--inset:#12191f`, `--border:#1a2330`, `--border-strong:#2a3744`, `--text:#dce6f0`, `--text-dim:#8a9bb0`, `--text-faint:#5f7186`, `--text-fainter:#46566a`, `--bad`, `--mono` (JetBrains Mono), `--sans`.
Feature colors: procedure-fix / selected-procedure lime `#8de84a`; route & Direct-to amber `#f0a500`; enroute-fix magenta `#e0479e`; navaid `#c792ea`; VFR/good green `#34d399`; GPS blue `#2b8cff`; missed-approach `#7fb3d5`; danger red `#ff5a52`.

**z-index ladder:** map base < `.terr-panel` 560 < `.map-search` 600 < `.nmpo-ctrl` / `.debrief` 1200 < `.qf-scrim` 1400 < **`.cr-overlay` (all modals) 4500** < `.gps-ov` / `.chart-ov` 5000 < `.pcal-ov` / `.nm-dct-toast` 6000.

---

## SHIPPED THIS SESSION (v250–v262)

**v250 — card widened + internal scroll + top-clamp. → REVERTED.** Danny: "very ugly." Kept: AYPY **ATIS 117 → 128.0** (117.0 is the PY VOR; that was the only decimal-less frequency in all 575 fields) and the corrected build stamp.

**v251 — revert of v250.**

**v252 — collapsible card sections.** Charts and My notes collapse to a tappable header with count; both collapsed by default. Classes `.af-coll`, `.af-coll-h`, `.af-coll-cv`, `.af-coll-b`.

**v253 — procedure altitudes step 1.** Baked verified altitudes onto 11 AYPY RNAV fixes (`alt`, `aa`, `av`). Procedures section on the airfield card; selecting a procedure lights up only its fixes with altitude labels. API: `NMProcListFor`, `NMProcSelected`, `NMSelectProc`.

**v254 — the on-device altitude editor.** Per-fix altitude + AT/A-A toggle + verified tick, saved to `localStorage['nmplotter_procalt']`, overriding baked data. API: `NMEditProcAlt`.

**v255 — briefing profile + ILS model + loose ends.** Profile view (approach descends left-to-right, missed continues right; MDA/DA, glidepath, course, TCH, THR elev, missed text). RNAV distances computed by haversine — **validated to match the plate tables exactly**. `PROC_META` carries plate-transcribed profile points for DME-based ILS approaches. Missed leg drawn distinctly. YPYSH corrected MAHF → MAF.

**v256 — compact procedure rows + scrubbable profile.** Short labels, uniform buttons, section collapsed with count. Profile gained a draggable crosshair (distance + interpolated altitude + nearest fix).

**v257 — attempted window-width match. → INEFFECTIVE** (see failure mode 2).

**v258 — BUGFIX: terrain profile name collision** (see failure mode 1). `profSvg` → `pfProfSvg`. Affected v255–v257.

**v259 — Procedures made genuinely compact + width fix that works.** The stacked list (one fat row per approach) became a **picker + one row of three uniform buttons** (Show/Hide, Profile, Edit) — constant height regardless of approach count. ALT shows in the picker; Profile/Edit grey out when N/A. Width fix via specificity bump.

**v260 — modals above map furniture.** `.cr-overlay` was z1000 while `.nmpo-ctrl` is z1200, so the plate window painted over Settings, Saved Routes, the altitude editor and the profile. Modals now **4500**.

**v261 — search pick renames the row.** `fillRow` only set the name when the row was empty, so replacing AYPY with fix NIXUT moved the coordinate but left the label "AYPY" — and since airfield matching keyed off the label, the app offered the wrong airfield card.

**v262 — plotted point + aerodrome merged into one place.** Route point and aerodrome each drew their own marker+label, so plotting to AYPY/AYMA/SHAOL stacked two labels and tapping gave the thin route-point card. Now: duplicate route label suppressed (place keeps its label; amber route dot still drags/deletes), and tapping a plotted point on a field opens the **full airfield card** (charts, freqs, procedures) with route actions kept alongside (**Forecast, Copy, Delete point**). **Matching is by coordinate, not label text.** Tolerance `RP_SNAP_NM = 0.25` NM — a knob if it feels wrong.

### Data verified from plates this session (Danny-confirmed)

**AYPY RNAV 14L** (12 SEP 2019) — VIMIB 2900 (AT) → YPYNF ≥1700 → YPYNZ ≥1000 → YPYNM ≥830 (MAPt); missed YPYNT/YPYNH ≥2900. LNAV/VNAV DA 680, LNAV MDA 830, Circling A 1290. TCH 50, THR 103, 3°, MSA 2900/7900.

**AYPY RNAV 32R** (12 SEP 2019) — ISLOK 2900 (AT) → YPYSF ≥2000 → YPYSM ≥850 (MAPt); missed YPYST/YPYSH ≥2900. LNAV/VNAV DA 810, LNAV MDA 850. TCH 50, THR 128, 3°.

**AYPY ILS 14L** (10 SEP 2020) — IAF 7.6 NM/2500 → FAF 3.9/1400 GP check → LLZ min 1000 → DA 450 (347) / LLZ MDA 660 (557). Missed: 142° to 1500, right 322° climb 2500, hold 9 DME PY.

**AYPY ILS 32R PROC A** (21 APR 2022) — initial TESEM 4000, outbound 160° 2.5 min; platform 5.8/2000 → GP check 3.8/1400 → DA 450 (322) / LLZ 550 (422). Missed: 322° to 2500, LEFT to TESEM, cross 4000.

**AYPY ILS 32R PROC B** (21 APR 2022) — ISLOK 12.6/4000 → platform 5.8/2000 → GP check 3.8/1400 → DA 450. Holds: ISLOK 322° LEFT, TESEM 142° RIGHT, both MNM 4000.

⚠️ **Plate currency still unconfirmed** — editions span 2019–2022. Danny was asked twice and has not confirmed they are current cycle. **Re-raise before relying on them.**

---

## OPEN WORK — waiting on Danny

1. **On-device testing of v252–v262** — nothing since v258's terrain-profile fix has been confirmed. Priority checks: single label + full airfield card on AYPY/AYMA/SHAOL (v262); drag/delete a plotted point on a field still works; Procedures picker usable on iPad (v259); plate and My-altitude windows finally the same width (v259); Settings opens above the plate window (v260).
2. **AYPY VOR 117.0** — asked three times, never answered. The bad "117 as ATIS" was removed; 117.0 (PY VOR/DME, 117X) was never re-added. Add as a card frequency row, or consider it covered by the Navaids layer?
3. **Procedure altitudes for the other 5 airports** — AYNZ, AYGA, AYMH, AYMD have fixes but no altitudes; **AYTK (Tokua) has no procedure fixes at all** and needs both. Danny can enter them in the editor, or send plates to be drafted.
4. **Feature Matrix** — built and current (Matrix v2, 73 features) but **never pushed to the repo and never exported**. Claude has no idea which features he wants on which device. He asked what it was at one point — re-explain briefly if it comes up.

## OPEN — small, offered but undecided

- **`RP_SNAP_NM` = 0.25 NM** — how close a route point must be to a field/fix to merge. One-number knob.
- **iPhone profile modal width** — `.pv-modal` is 720px; scrolls horizontally on iPhone rather than reflowing. Flagged, untested.
- **iPad band window widths** — in the iPad media band the My-altitude panel moves to top-right at **322px** while the plate window stays bottom-left at base width. Deliberately not matched.
- **Charts list density** — denser option (small icon instead of the 46×34 thumbnail) offered, awaiting call.
- **Plate switcher scope** — lists only *calibrated* plates; offered to list all with uncalibrated greyed out.
- **GPS overlay D°M.M′ longitude spacing** — `E147°` (his Garmin) vs `E 147°` (app). One-line change.
- **Direct-to / GPS on the on-map search-result rows + Freqs-tab list** — deliberately excluded; offer if he wants it everywhere.
- **Current-leg colouring** — colour the active route leg differently (flown / active / ahead), per the Garmin-FMS convention where **magenta = active leg**. Danny raised it, Claude scoped it, never picked up. **Palette clash:** route is amber `#f0a500`, and magenta `#e0479e` is already the enroute-fix colour. Live unbuilt idea.

## PARKED (deliberate, with reasons)

- **Arcs & holding patterns.** Published holds are easy data (fix + inbound course + turn + leg length). The blocker is the **radio-assigned hold**: Danny needs to punch in an ATC-given hold mid-flight and have it drawn correctly. Parked until that input UX is designed. *His call, and a good one.*
- **Departure profiles.** The profile engine supports departures (POC had ground-left → climb-right, which Danny approved) but **no departure data exists** and `PROC_META` has no departure entries. Approach-only today.
- **ENR 4.3.2 procedure waypoints** — largely superseded by this session's work; revisit scope.

## BACKLOG (longer-standing)

- **ENR 4.3.1 enroute points** → magenta layer.
- **Frequencies tab** — needs Danny's bush-strip CTAF + en-route HF data (**data-blocked**; JSON model approved, proximity matching designed).
- **iPad layout zones 2–3 audit** — *audit what's genuinely outstanding before proposing* (prior over-offer logged).
- **Airfield label declutter** — dots at low zoom, labels appearing as zoom increases. Scoped, no blocker.
- **Pilot Tools Suite** — NM Plotter + Chart Analyst + W&B under one shell; `SUITE_ARCHITECTURE.md` exists.
- **Per-region downloadable data packs** — engine/data separation north star.
- **Pull-only cloud sync** — HARD RULE: never auto-sync in a way that could overwrite an in-use route mid-flight.

---

## Technical reference — procedure system

### Data structures

**`PROC_FIXES`** (~13,140) — map-placeable procedure fixes:
```js
{id:'VIMIB', role:'IF/IAF', lat:-9.275856, lon:147.118225,
 ap:'AYPY', ty:'RNAV', rwy:'14L', alt:2900, aa:false, av:true}
```
`role` ∈ IAF, IF/IAF, IAF/HOLD, IF, FAF, SDF, MAPT, MATF, MAHF, MAF. `aa` = at-or-above (else mandatory AT), `av` = verified. Exposed via `window.NMProcFix.data()`.

**`PROC_META`** (~11,215) — procedure-level data keyed `AP|TY|RWY[|VARIANT]`:
```js
'AYPY|ILS|32R|PROC B':{thr:128, tch:50, gp:3.0, crs:322, da:450, mda:550, ref:'THR',
  init:'ISLOK 4000 (13 PY)',
  pts:[{d:12.6,alt:4000,l:'ISLOK IAF'}, ...],   // ILS only: plate distance table
  missed:'...', src:'AIP PNG · 21 APR 2022'}
```
`pts` present ⇒ ILS-style. Absent ⇒ RNAV, distances computed from fixes. `ref` labels the x-axis origin.

### Key functions

| Name | Purpose |
|---|---|
| `pfKey(f)` | builds `AP\|TY\|RWY[\|VARIANT]` |
| `pfProcLabel(p)` / `pfProcShort(p)` | full label for modals / short label for the picker |
| `pfProcs(ap)` | merges fix-derived + `PROC_META`-only procedures |
| `pfEffAlt(f)` | **effective** altitude = user override ?? baked. *Always use this, never `f.alt`.* |
| `pfNm(...)` | haversine, NM |
| `renderSelProc()` | draws the selected procedure (split approach / missed polylines) |
| `openProcAltEditor(key)` | the editor modal |
| `profPoints(key)` | unified point list (RNAV computed / ILS from `pts`) |
| `pfProfSvg(key,label)` | builds the profile SVG — **renamed in v258, do not shadow `profSvg`** |
| `openProcProfile(key)` | profile modal + crosshair wiring |
| `rpNm / rpAirfieldAt / rpFixAt` | v262 coordinate matching for plotted route points |

**Globals:** `window.NMProcListFor`, `NMProcSelected`, `NMSelectProc`, `NMEditProcAlt`, `NMProcProfile`, `NMProcHasProfile`, `NMProcFix.data()`, `NMEnroute.data()`, `NMCharts`.

**Storage:** `localStorage['nmplotter_procalt']` → `{ "AYPY|VIMIB": {alt, aa, av} }`. Per-device, survives app updates.

**Card integration:** `airfieldCardHtml(f, distNm, rp)` — `rp` is the plotted-point context added in v262. `openAirfieldCard(f, distNm, rp)` wires the route actions. `wireProcedures(root,f,pop)` wires the picker.

### Companion files in `/mnt/user-data/outputs/`

- `NMPlotter_FeatureMatrix.html` — **Matrix v2**, 73 features, iPad/iPhone tick columns, localStorage-persisted, Export/Import/Reset. *Keep current when features ship.*
- `NMPlotter_Profile_POC.html` — original profile POC (includes the **departure** orientation the app doesn't implement).
- `NMPlotter_ProcAlt_POC.html` — procedure selection + editor POC.
- `NMPlotter_CardLayout_Demo.html` — four card-layout options; Danny chose Collapsible.

## Stack / infra

Inlined libs: Leaflet 1.9.4, protomaps-leaflet 5.1.0, jsPDF, html2canvas. Offline vector basemap `png.pmtiles` (44 MB, `maxDataZoom:13, maxZoom:18`); CARTO dark online fallback. Cloudflare Workers: `nmplotter-routes` (KV) and `nmplotter-wx` (METAR proxy, 5-min TTL). Sources: PNG AIP (NiuSky Pacific, eff. 30 OCT 2025); OurAirports (15-aerodrome frequency seed); Open-Meteo (point forecasts + terrain tiles); aviationweather.gov via the wx proxy.

Layer z-index (bottom→top): CARTO base (z1) → PNG pmtiles vector (z3) → satellite (z5) → terrain (z6) → labels (z7) → overlayPane (markers/route/procedures).

## Key line anchors (RE-VERIFY each session — they drift)

- CHANGELOG top: line 12 · build stamp: `id="setVersion"`
- `state` ~4674 · `NM_REGION` ~4698 (**top-level const, not on window**) · plotted-point render ~5010–5090 · `openRoutePointCard` ~5150
- `rpNm` / `rpAirfieldAt` / `rpFixAt` ~5565 (just after `escapeHtml`)
- `airfieldCardHtml` ~8860 · card actions markup ~8935 · `wireProcedures` ~8905 · `openAirfieldCard` ~9205
- Terrain profile's own `profSvg` ~10620 (**do not shadow**)
- `procSelLayer` ~11205 · `PROC_META` ~11215 · `pfEffAlt` ~11250 · `openProcAltEditor` ~11310 · `profPoints` ~11350 · `pfProfSvg` ~11370 · `openProcProfile` ~11425
- `window.NMEnroute` ~12540 · `NMProcFix` ~13315 · `PROC_FIXES` ~13140
- CSS: `.cr-overlay` ~3047 (z4500) · `.terr-panel` base ~3449 · media overrides ~3492/3496 · `.af-proc-pick` ~3620 · `.nmpo-ctrl` base ~3714 (**after its media rules — specificity-bumped**)

---

*End of handoff. Live = v262. Suggested opening: ask Danny about the new idea he has queued, and get the v259–v262 on-device checks confirmed.*
