# NM Plotter — gate pack

**Commit this folder to the repo.** It was missing when this session started:
the zip held `index.html`, `sw.js` and `HANDOFF.md` only, and every gate named
in the v309 handoff was gone. A build that ships without its gates ships with
less protection than the last one, and nobody can see that happening.

## Run it

```
cd <the folder holding your working index.html, named work.html>
./gate.sh                 # gate the release candidate
./gate.sh poc312.html     # gate the layout POC instead
```

`gate.sh` checks **exit codes**, and reports a crash separately from a failure —
grepping for the word FAIL cannot see a harness that died before it printed
anything.

Needs `npm install jsdom` once.

## What each one is for

| Gate | Catches |
|---|---|
| `cascade.js` | Not a gate — the shared specificity resolver the others use. One copy, deliberately. |
| `validate.py` | Script blocks parse, no width media queries outside comments, no leftover phone/tablet code, unexpected duplicate ids. |
| `measure.js` | Left-column uniformity, and that the v311 rows cap and `?` button rules **win** their cascade. |
| `btnchk.js` | A fixed height with no centring rule puts the label at the top of the box. jsdom has no layout, so this works on the rules instead. |
| `gutterchk.js` | The 8 px scrollbar **takes layout width**. Any container that scrolls only sometimes changes width at the threshold. Checks its own premise first. |
| `parity.js` | The standing two-search-bar rule: a dataset searchable in one bar must be searchable in the other. Reports "0 gap(s)" when clean. |
| `clickagent.js` | Presses all ~135 controls, reports throws and uncaught errors. |
| `gate311.js` | Boots the real file and drives the `?` toggle — proof the code **executes**, not merely parses. |
| `gate312.js` | Every v312 rule is an override; proves each one wins, and that the JS is byte-identical to v311. |

## Still missing from the v309 pack

`cssguard`, `unwrapchk`, `revertchk`, `libtest`, `workersim`, and
`gate263/264/269/270/271/272/277/285/293/295/297/301`. I did not fake these —
I do not know what they asserted, and a gate that guesses is worse than none.

## Two rules that cost versions

1. **Resolve specificity yourself.** `getComputedStyle` in jsdom reports the
   declared value, not the winner. For five versions `measure.js` reported
   "all uniform" while a more specific rule quietly won. It was reading the loser.
2. **When an assertion is wrong, fix the assertion and say so.** Three did this
   session: `validate.py` searched for a bare `max-width:430px` that `.wx-modal`
   uses legitimately as a modal width; `clickagent.js` reported jsdom not
   implementing `alert()` as three code faults; `btnchk.js` flagged Leaflet's
   popup close button and a 6 px dot as uncentred labels. None was a fault in
   the app. A gate that goes stale is worse than no gate.
