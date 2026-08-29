# Figma cleanliness rules

Owner-authored (2026-08-29). **Read this BEFORE generating or editing ANYTHING
in Figma** — component lane (`altitude-figma-generate`), page/snippet lane
(`altitude-figma-snippet`), repairs (`altitude-figma-repair`), and hand edits
alike. Where a rule is enforced by the pipeline, the mechanism is named;
where it is not yet, that gap is the backlog, not an excuse.

## Components & structure

1. **Use existing Figma components wherever possible instead of inventing your
   own** — inventing is the exception and needs a reason.
   *(Enforced: nested by-name resolution places INSTANCES of real sets; the
   face-divergence probe degrades honestly and NAMES the miss when a set's
   face is hollow — fix the set, don't keep rebuilding.)*
2. **If you build something bespoke and it repeats enough to be a component —
   make it an actual component.** Repeated frame constructions are a smell.
3. **One component per page**, variations organized under the page-list
   sections **Atoms / Molecules / Organisms / Templates** (empty page headers
   as section dividers), **alphabetized within each section**.
4. **Frame names pair with how the code structures it** — a frame's name
   should read like its code counterpart (BEM block/element or component
   name), never `Frame 427`. Promoted sets carry the REAL name ("Hero", never
   "Site Hero"; scratch builds keep a prefix only until promotion —
   `--set-name` on the generators).

## Layout

5. **No absolute positioning unless necessary** — auto layout is the default;
   absolute is for true overlays (textures, glyph fields) only.
   *(Enforced: the generators emit absolute only for measured
   position:absolute / margin-auto facts.)*
6. **Most components are height:auto and width:auto-or-100%.** Heights are
   NOT clipped — responsiveness needs them free. In a grid, the GRID owns the
   width, so children are width:100% of their track.
7. **Anything with hug sizing in its design — buttons and other atoms —
   KEEPS hug** unless explicitly specified otherwise.
   *(Enforced: the spans-parent gate — an instance only fills when its
   measured box spans its parent.)*
8. **Follow the code's token structure for max/min widths and heights and
   container sizing** — and always double-check against the screenshot.

## Organisms

9. **Organism width is 1440px desktop, 768px tablet, 350px mobile.**
10. **Every organism carries Desktop / Tablet / Mobile variants.**
    *(NOT yet enforced — pipeline backlog: measure at three viewports, fan
    out a Breakpoint variant axis.)*

## Fidelity

11. **Backgrounds and accents that are SVGs or programmatic in code are
    SHAPES/SVGs in Figma** — never screenshots.
    *(Enforced: gridTex parses CSS grid textures into native rectangles;
    rasters are last resort, for genuine canvas pixels only.)*
12. **The verification loop is mandatory, in BOTH directions and for EDITS
    too:** screenshot the local/live site component → analyze with the
    contract + code → build → screenshot the Figma result → compare → loop
    until identical or close. Same loop when editing Figma or editing code.
    *(Enforced: `generate-snippet --measure --verify` and
    `verify-figma.mjs`'s auto image pair; the numeric bbox diff is the gate,
    images are the evidence.)*

## Provenance

- These rules are owner-authored and binding. When a generator cannot satisfy
  one, it must REPORT the violation as a named miss (the `missingVars` /
  degradations convention) — silence is the only forbidden outcome.

## The loop, structured (borrowed from .mm's verification shape)

Monday Morning's verify-spec loop (Generate → Critique → Revise, tiered
findings, convergence) is the template for every Figma generation/edit:

1. **Generate** — build from measured facts (never freehand).
2. **Critique** — run the numeric verify + image pair; every discrepancy gets
   a row (node path, expected vs actual, delta) — the critique table.
3. **Classify** — each row is one of: generic-rule gap / missing measured
   fact / curation call / genuine site bug — the tier decides where the fix
   lands (generator / measure layer / gen.json / an .mm issue).
4. **Revise** — apply at the classified layer only; re-run.
5. **Converge** — stop when rows are within tolerance or every remaining row
   is a NAMED, accepted degradation. Two identical consecutive runs = stable.

The loop applies equally to first builds, Figma edits, and code edits.
