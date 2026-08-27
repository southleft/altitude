---
name: altitude-figma-sync
description: "Sync the Altitude Figma library with the code in libs/al-web-components — audit and fix design variables, repair or create component sets, and recover which design TOKEN each CSS declaration uses. Triggers: 'make Figma match the code', 'sync tokens to Figma', 'audit Figma variables', 'build/repair a Figma component from the code', 'add the missing components to Figma', 'check design parity', 'which token does this component use'. Encodes the correct file, the library's conventions, and ~10 non-obvious traps that each cost an hour to find. Read this BEFORE touching the Figma file."
---

# altitude-figma-sync

Keeping the Altitude Figma library honest against `libs/al-web-components`.

Read the **Hard-won traps** section before writing anything. Every entry there is a bug
that was actually hit and diagnosed; most look like something else when you meet them.

---

## 0. The file. Get this right first.

| | |
|---|---|
| **Canonical library** | **`Altitude Design System`** — `y83n4o9LOGs74oAoguFcGS` |
| Decoy — do not use | `Altitude DS` — `NGpu9IJj2pRhNru1QTGmuF` (an empty scratch file) |

An entire component build was once shipped into the decoy. Confirm with
`figma_get_status` before any write, and pin the target:

```
figma_navigate({ url: "https://www.figma.com/design/y83n4o9LOGs74oAoguFcGS/...", lock: true })
```

**Writes need the Desktop Bridge plugin open IN THAT FILE** (Figma Desktop → Plugins →
Development → Figma Desktop Bridge → Run). Manifest lives at
`~/.figma-console-mcp/plugin/manifest.json` — it is usually already on disk; "I don't
have the manifest" almost always means "I haven't imported it yet".

Two MCP servers get conflated constantly:

- `figma-console` — 121 tools, **write-capable**, needs the Desktop Bridge.
- `figma-dev-mode-mcp-server` — 6 tools, all `get_*`, **read-only**, no setup. Handy for
  reading structure fast, but it abbreviates variable names (it shows
  `color/content/default` where the real variable is `theme/color/content/default`).
  **Never audit names with it** — use `figma_get_variables` through the bridge.

Also available: the **`altitude` MCP** (`libs/altitude-mcp`, already in `.mcp.json`) —
eight tools: `altitude_list_components`, `altitude_get_tokens`, `altitude_get_component`,
`altitude_validate`, `altitude_search_icons`, `altitude_check_parity`,
`altitude_list_ds_projects`, `altitude_generate_theme` (roster of record:
`libs/altitude-mcp/src/lib/tools.mjs`; `check:mcp-docs` gates this list). Use it for
code-side facts instead of grepping — `altitude_check_parity` in particular is the
tool this skill's own reconciliation loop starts from. **Before building or repairing a component's set**, call
`altitude_get_component({ tag, project })` and read its `referenceDoc` field (or open
`.altitude/contracts/docs/<project>/<tag>.md` directly) — the GENERATED, per-component
reference doc (T20, spec 2026-08-25-contract-backed-figma-parity-and-generation) spells
out exactly this: structure, variant axes + values, slots and the icon-placeholder
convention, states, token bindings (including per-variant/per-state
`conditionalBindings`), and the Figma set's name/nodeId — or, for a component mapped by
name only, the by-name resolution rule instead of a node id that would go stale. It is
built from the same contract + parity manifest this skill's other steps already read, so
it's the fast summary; the contract JSON is still the fact of record for anything the doc
abridges.

---

## 1. Variable audit (code → Figma)

```bash
node scripts/figma-atoms/bridge-io.mjs --port 9229   # keep running
# dump live variables out of Figma via figma_execute -> POST /figma-live-vars.json
node scripts/audit-figma-vs-code.mjs                 # diff
node scripts/figma-var-fixes.mjs                     # emit ops -> apply via figma_execute
```

Four collections, and the shape is deliberate — do not "simplify" it:
`Tier 1` (primitives) · `Tier 2` (semantic non-colour) · `Tier 2 Theme` (Light/Dark) ·
`Tier 2 Brand`. **Read the exact collection names live before matching on them** — two
spellings have been observed at different dates (`Tier 2 Theme` in
`audit-figma-vs-code.mjs:130`, 2026-08-20; `Tier 2 | Theme` in
`scripts/contracts/figma/conventions.mjs:68`, live-read 2026-08-26). The CODE has exactly
two brands (altitude, southleft — `tokens-config.v5.mjs:591-603`); if the Figma file
still carries stray `Northright`/`Odyssey` brand modes, delete them rather than
re-adding code (`.altitude/FIGMA-SYNC.md` § verified corrections, `BRANDS.md` §7).

The audit needs an **alias table** because the two systems genuinely disagree on names:
`font-size.*` ↔ `typography/font-size/*`, `color.brand.paper.*` ↔ `color/neutral/paper/*`,
etc. Without it a name diff is pure noise. The table lives in both
`scripts/audit-figma-vs-code.mjs` and `scripts/figma-atoms/token-map.mjs` — keep them in step.

**Never delete Figma-only variables.** Real designs use `steel`, `slate` and
`color/status/*`. Report them; let a human decide.

---

## 2. Recovering which token a component uses

This is the core technique. **Do not infer tokens from colours** — many tokens share a
hex, and it cannot recover spacing or radius at all (`16` is simultaneously
`theme/space/@`, `space/16`, `font-size/16` and `line-height/16`; that mistake once bound
a button's font-size to a spacing token).

The component CSS already names its tokens:

```css
.al-c-button { background-color: var(--al-theme-color-background-primary-default); }
```

So read the **authored declaration** off each matching CSS rule and keep the custom
property name. `scripts/figma-atoms/measure-lib.js` does this; `token-map.mjs` converts
`--al-theme-space` → `theme/space/@`.

The whole pipeline is two commands (2026-08-20 — supersedes the by-hand flow below):

```bash
node scripts/figma-atoms/measure-components.mjs     # harness + Chromium, 5 states x 2 modes
node scripts/figma-atoms/build-component-ops.mjs    # → .altitude/figma-sync/ops/<key>.json
```

Each ops file carries `State x axes` rows with variable bindings, per-state
`differsFromDefault` flags, and the child box tree. **Apply to Figma one component at a
time**, `figma_check_design_parity` after each. Axis conventions come from the library's
own Toggle set: `State` is ALWAYS the interaction axis (Default/Hover/Focus/Disabled);
semantic conditions (`Checked`, `Selected`, `Expanded`) get their own axis; and
attribute-driven states (`isdisabled`, `iserror`) map into State VALUES via `stateCases`
in plan.mjs — their rows are real renderings, so their computed values are trustworthy.

```bash
node node_modules/.pnpm/esbuild@0.28.1/node_modules/esbuild/bin/esbuild \
  libs/al-web-components/dist/components/bundle/bundle.js \
  --bundle --format=esm --outfile=.altitude/figma-sync/atoms-bundle.js
node scripts/figma-atoms/harness.mjs --port 7341
# browser: http://localhost:7341/?mode=light|dark  then  window.__spec('default'|'hover'|…)
node scripts/figma-atoms/build-spec.mjs
```

`dist/` ships bare `lit` specifiers a browser cannot resolve — hence the esbuild step.

### After a repair verifies clean — re-baseline the parity manifest

A repair or new build is only "done" once the parity manifest says so. This
skill's job ends at a verified Figma set; it does NOT automatically flip that
component to `in-sync` — a separate operator step stamps it:

```bash
node scripts/figma-atoms/check-parity.mjs         # Figma sizes vs BROWSER sizes — must be clean
pnpm run parity:synced <al-tag...>                # or parity:synced:sl for southleft
```

Skipping this leaves the component reporting stale drift (`code-drift` /
`missing-in-figma`) in `altitude_check_parity`, `GET /parity.json` and the
docs-site ParityPanel even though the Figma side is now correct — a Figma-
side agent that follows this skill alone, without this step, leaves the
status red after a genuinely correct repair. `parity:synced` also reads the
tag's tracked contract (if any — `.altitude/contracts/<project>/<tag>.contract.json`)
and stamps `lastSync.contractHash` / `lastSync.contractVersion` alongside the
code hash and Figma digest, so a later edit to the contract itself shows up
as `contractDrifted` even when code and Figma both still match. See
`.altitude/PARITY.md` for the full model.

---

## 3. Library conventions (copy these exactly)

- Page per component named `🛠 <Component>`, grouped under divider pages
  `----- ATOMS -----` / `----- MOLECULES -----` / `----- ORGANISMS -----`.
- Each page: ONE frame named for the component containing `Labels` (Text + Bracket
  annotations), `Instances` (Row frames of fixed cells with live instances), and the
  COMPONENT SET.
- Variant naming `Prop=Value, Prop2=Value`, **Title Case** values.
- **Interaction states are variants**, not just visual states:
  `State = Default | Hover | Active | Focus | Disabled`.
  Mapping (confirmed by `figma_analyze_component_set`): Hover→`:hover`,
  Focus→`:focus-visible`, Active→`:active`, Disabled→`:disabled, [aria-disabled="true"]`.
- The default variant is called **`Primary`**, not `default`.
- Full property surface beyond variants: `Text` (TEXT), `Is Full Width` (BOOLEAN),
  `Slot Before` / `Slot After` (BOOLEAN), `Icon Before` / `Icon After` (INSTANCE_SWAP →
  icon components on `🛠 Icons`). Add with `figma_add_component_property` on the
  **COMPONENT_SET**, never a single variant.
- Icon-only is a SEPARATE set (`Button (Icon)`), not an axis.
- Focus renders as a **2px stroke**, not a CSS-style outline.

**Generating a set FROM a contract is a different skill.** The conventions
above are for HAND-repairing the library. Everything about
`scripts/contracts/generate-figma.mjs` — generator module layout,
`figma.gen.json` curation, the fan-out/omit conventions (T23/T27/T31), the
`--sheet` prop sheet, the Phosphor icon source (T28/T29) — lives in the
sibling skill **`altitude-figma-generate`**. Read that one before generating.

**Prefer repairing an existing set over rebuilding it** — rebuilding discards the
property surface, the instances and the documentation scaffold.

Useful tools: `figma_analyze_component_set` (variant axes + per-state diffs + prop map),
`figma_arrange_component_set` (non-destructive labelled grid),
`figma_add_component_property`, `figma_check_design_parity`.

---

## 4. Hard-won traps

**Plugin API**
1. The bridge runs `documentAccess: dynamic-page`. The synchronous variable APIs THROW.
   Use `getLocalVariablesAsync()`, `getLocalVariableCollectionsAsync()`,
   `getVariableByIdAsync()`, `setCurrentPageAsync()`.
2. `combineAsVariants` requires the components to ALREADY be on the target page —
   `page.appendChild(comp)` first, or it throws "must be in the same page as the parent".
3. The plugin sandbox **has `fetch`**, and the manifest whitelists `localhost:9223`–`9232`.
   Use `bridge-io.mjs` to move JSON both ways instead of inlining big payloads.
4. `setBoundVariableForPaint` keeps the LITERAL colour you pass as a fallback and Figma
   does not always refresh it — pass black and a variant can render **black** despite a
   correct binding. Resolve the variable inside Figma and use its real RGBA as the literal.
5. **Opacity variables are FRACTIONS (0–1) — `opacity/40` = `0.4`, matching the code.**
   (Corrected 2026-08-22 — this trap previously said the opposite, describing the file
   BEFORE `scripts/figma-var-fixes.mjs:39-43` deliberately rewrote the four opacity
   variables to fractions; verified live: `opacity/40` → `0.4000000059604645`.) Opacity
   is a straight value comparison now, no unit conversion in either direction. Do not
   "fix" a fraction back to a percentage. See `.altitude/FIGMA-SYNC.md` § "Opacity is a
   FRACTION on the Figma side".

**CSS reading**
6. `shadowRoot.textContent` does NOT include slotted light-DOM text. Resolve
   `slot.assignedNodes({flatten:true})`, and take typography from `slot.parentElement` —
   the flattened-tree parent slotted text actually inherits from.
7. Component CSS lives in `@layer al.component`. An appended stylesheet — layered or not —
   CANNOT override it, and inline styles behaved unreliably too. So **never try to apply**
   `:hover` etc. Rewrite the pseudo to a class purely to decide WHICH rules match; their
   authored values are the state delta.
8. `!important` is per DECLARATION, not per rule. Scoring it per rule lets one
   `!important` in `.al-c-button` promote every declaration in that rule above all
   variant and state rules — presents as "specificity is broken".
9. Shorthands containing `var()` yield EMPTY longhands ("pending substitution"), so
   `getPropertyValue('padding-top')` returns `''`. Probe the shorthand explicitly and
   expand it yourself.
10. Tokens hide behind per-component override hooks:
    `padding: var(--al-button-padding, var(--al-theme-space-xs) var(--al-theme-space))`.
    The first `var()` is a HOOK, not a token. Walk the fallback chain to the first custom
    property actually defined on the element.
11. Using the computed value to arbitrate between candidate tokens works ONLY in the
    default state. For hover/focus/active/disabled the computed value is still the
    default, so arbitration would pick the BASE rule over the state's own rule.
12. `main.css` bakes **dark** into `:root`; light is the separate override bundle
    `dist/css/css/theme/tokens-light.css`. Load main.css then tokens-light.css for light.
13. Serve harness assets with `cache-control: no-store`. A cached `measure-lib.js` makes a
    correct fix look broken.
14. **`background:` (the shorthand) authors 38 fill tokens across 19 components** —
    probing only `background-color` silently loses them (that is how toggle-button's
    hover token vanished). Probe the shorthand; keep gradients (`skeleton`, list fades)
    as background-image, never as a solid fill bound to the gradient's first var().
15. **Unwrap `var()` chains left-to-right, one var() each.** Re-recursing on the whole
    string from index 0 burns one depth level per already-resolved var, so later vars in
    a shorthand never unwrap — `outline: var(width) solid var(--al-theme-color-focus-ring,
    fallback)` kept the undefined focus-ring hook, which is why the Button repair had to
    hardcode the focus colour.

---

## External refs — giorris.dev (load on signal)

These are transport-neutral reference docs — written for the same figma-console/Desktop
Bridge plugin API this skill drives, not tied to any particular project. They are not
mirrored into this repo; fetch the one you need via `WebFetch` when its signal fires below,
rather than loading all seven up front. Adapted from
https://www.giorris.dev/figma/refs/refs-map.md.

| Ref | URL | Load when |
|---|---|---|
| Sizing Modes | https://www.giorris.dev/figma/refs/rules/sizing-modes.md | Building or repairing ANY component set — auto-layout sizing (hug/fill/fixed), and the "call `resize()` before setting sizing properties" ordering trap. |
| Icon Recoloring | https://www.giorris.dev/figma/refs/rules/icon-recoloring.md | The component uses `al-icon` / `Icon Before` / `Icon After` INSTANCE_SWAP props, or an icon needs to pick up a semantic colour token instead of its baked-in fill. |
| Token Seeding | https://www.giorris.dev/figma/refs/rules/token-seeding.md | Bulk-creating or backfilling Figma variables from code (the `scripts/figma-var-fixes.mjs` / `audit-figma-vs-code.mjs` flow in §1) rather than fixing one binding at a time. |
| Nested Components | https://www.giorris.dev/figma/refs/rules/nested-components.md | A molecule has a repeated per-item child that is itself a component set — `al-menu`'s menu-items, `al-tabs`' tab instances, `al-list`'s list-items, `al-checkbox-group`'s checkboxes (see trap 20's state-leak problem). |
| Slots | https://www.giorris.dev/figma/refs/rules/slots.md | The component's item count is unbounded at authoring time — `al-table` rows, `al-command-palette` actions, `al-combobox` items — the "N instances hand-placed" pattern breaks down. |
| Floating Overlays | https://www.giorris.dev/figma/refs/rules/floating-overlays.md | Building/repairing `al-dialog`, `al-drawer`, `al-popover`, `al-dropdown-panel`, `al-command-palette`, or a tooltip — anything that is `position: fixed`/`absolute` in the browser and needs a `measureRoot` (see trap 31, still unimplemented as of this writing). |
| Figma Variables and Libraries | https://www.giorris.dev/figma/refs/figma-variables-and-libraries.md | Working across the four variable collections in §1 (Tier 1/2/2 Theme/2 Brand), or anything touching library publishing rather than a single file's local variables. |

**Cheat sheet — source-code signal → refs to load:**

- Starting ANY component build or repair (new set, `figma_add_component_property`, variant
  axis work) → **Sizing Modes**.
- Component template renders `<al-icon>` or has an icon-swap prop → **Icon Recoloring**.
- About to run the variable audit/fix scripts, or hand-authoring a batch of new Figma
  variables → **Token Seeding** + **Figma Variables and Libraries**.
- Molecule has a repeated per-item state that is its own component set (menu-item, tab,
  list-item, chip, checkbox in a group) → **Nested Components**.
- Component's content is open-ended (table rows, palette actions, combobox/select options)
  rather than a fixed small set of named slots → **Slots**.
- Component shape is a dropdown/popover/tooltip/dialog/drawer — anything overlay-positioned
  outside normal flow → **Floating Overlays**.
- Auditing or seeding variables across Tier 1/2/2 Theme/2 Brand collections, or anything
  about how the library is published/consumed → **Figma Variables and Libraries**.

---

## 5. Known state — live sources, not a dated snapshot

Do not trust coverage numbers written into any doc, this one included. The live answers:

- **Coverage roster**: `.altitude/contracts/COVERAGE.md` — per-component table of real
  sets, contract/anatomy readiness, and which components are BLOCKED on measured anatomy
  (snapshot 2026-08-26: 37 real sets live, 36 mapped to code, 35 components generated in
  one sweep, 15 of them composites nesting real-set instances).
- **Parity**: `pnpm run parity:projects` / the `altitude_check_parity` MCP tool /
  `GET /parity.json` — per-component drift status, refreshed by the tools themselves.
- Two durable traps live here: (16) a COMPONENT page cannot be `remove()`d while it is
  the CURRENT page — `setCurrentPageAsync` elsewhere first. (17) `::before`/`::after`
  content (checkbox check mask, radio dot, toggle knob styling) is INVISIBLE to the DOM
  walk — hand-built sets place glyphs as icon instances (the library's check icon is
  named `done`, not `check`); generated sets curate `glyphs` in `figma.gen.json` instead.
- The layout-first removals (`al-button-group`, `al-chip-group`, `al-toast-group`, etc. —
  AGENTS.md "Arrangement vs. semantics") have no code component: **never build or repair
  a Figma set for them**. The roster of record is the CEM / `altitude_list_components`,
  never any doc's history.

Full history and rationale: `.mm/specs/2026-08-20-altitude-figma-atoms/spec.md`.

---

## 6. Molecules — composition (2026-08-21)

Molecules are composites: built correctly a molecule contains real **INSTANCES** of the
atom sets, so fixing an atom propagates. That is one new file plus four pipeline changes.

```bash
node scripts/figma-atoms/measure-components.mjs   # PLAN now includes molecules
node scripts/figma-atoms/build-component-ops.mjs
node scripts/figma-atoms/build-molecules.mjs      # delete+build all, one at a time
node scripts/figma-atoms/check-parity.mjs         # Figma sizes vs BROWSER sizes
node scripts/figma-atoms/reorder-pages.mjs        # molecules live AFTER the divider
```

- `instance-map.mjs` — the join between the code's ATTRIBUTES and Figma's VARIANT
  PROPERTIES, plus the atom set node ids. It is the inverse of `plan.mjs`. In THIS
  hand-built/ops pipeline, icons resolve BY NAME against the flat components on
  `🛠 Icons` (`al-icon-search` → `search`, `<al-icon name="x">` → `x`). GENERATED sets
  do NOT use that page as their icon source — since T28 they resolve icons from the
  Phosphor library (see `altitude-figma-generate`); `🛠 Icons` stays live as the DS
  "Icon" wrapper host and the Phosphor bootstrap-scan target.
- `tiers.mjs` — which keys are molecules. Placement depends on it.
- `export-png.mjs` / `check-parity.mjs` / `delete-page.mjs` — verification and iteration.

**Result: 15 molecule sets, 83 variants, 0 missing variables, 80/83 within 4px of the
browser.** The 3 known-off: Chip Group (-25px width, chip instances hug narrower),
Empty State (-20px, paragraph margins auto-layout cannot reproduce), Pagination Small
(-59px, its nested `al-select` is a molecule not yet in Figma so it flattens).

### Traps (continuing the numbering)

18. **Mixed line endings in this repo.** `harness.mjs` and `plan.mjs` are CRLF;
    `build-page.mjs` is LF. A multi-line patch anchor written with `\n` silently fails to
    match a CRLF file and reads exactly like a wrong anchor. Normalise → patch → restore.
19. **Slotted children were never marked as instance boundaries.** `measure-lib` only set
    `host` when descending a component's OWN template. A molecule reaches most of its
    children through a `<slot>`, and that branch called `tree()` on the element — which
    walks light DOM only, so it neither entered the child's shadow root nor flagged it.
    Every slotted atom flattened into anonymous boxes. Both paths now call `boundary()`.
20. **State deltas leak out of instanced children.** The state signature was a deep tree
    diff, so a molecule inherited its children's interaction states: `al-menu` has no
    `:hover` rule at all, yet its menu-items do — 10 variants where 2 were real, and the
    8 fakes rendered identically because instances are pinned to `State=Default`. Prune
    each instanced subtree to its RESOLVED props before taking the signature; that still
    catches Checkbox Group's Disabled, which genuinely propagates `isdisabled` to children.
21. **A new instance inherits the default variant's BOOLEANS.** Figma's Button default has
    both icon slots ON, so `<al-button>Save</al-button>` rendered with two icons it never
    had. Measure which named slots the host actually fills (`hostSlots`) and set
    `Slot Before` / `Slot After` explicitly.
22. **`calc()` multiples of a token are silently dropped — Figma variables cannot do
    arithmetic.** `padding: calc(var(--al-theme-space) * 3) var(--al-theme-space)` reports
    `theme-space` on all four sides, so Figma bound 16px where the browser paints 48px and
    empty-state came out 84px short. Emit the computed LITERAL (`{lit: 48}`) when a
    declaration multiplies a token; keep the binding on the sides that do not.
23. **Visually-hidden also comes as a 1px CLIP**, not just `al-u-is-vishidden`.
    checkbox-group's hidden legend measures 1x1 and kept full-size glyphs, printing the
    legend across the first checkbox. Treat text in a ≤2x2 box as hidden.
24. **Never force an auto-layout onto a root that is not flex in the browser.** Defaulting
    to HORIZONTAL laid al-tabs' tablist and its panel side by side — 557x40 against a real
    291x79. Non-flex roots keep their measured absolute geometry.
25. **A text node auto-resizes and throws away a measured box that is taller than one
    line** (al-range's 64px label on a 24px line → component 40px short). Pin the size —
    but CAP it at ~3 lines: some nodes carry text while their box is really a layout
    container (file-upload's dropzone wrapper is 180px around a 24px line, and pinning it
    made the component 156px too tall).
26. **Placement is silent.** `build-page.mjs` inserts before the MOLECULES divider, which
    is right for an atom and puts a molecule at the bottom of ATOMS. Now driven by
    `tiers.mjs`. Moving a page from before the divider to after it is also off by one —
    insert relative to a known page instead.
27. **`node.mainComponent` is a SYNC getter and throws under `dynamic-page`.** Use
    `await node.getMainComponentAsync()` (same family as trap 1).
28. **`figma_get_component_image` needs a `FIGMA_ACCESS_TOKEN`** this setup does not have.
    The plugin sandbox can `exportAsync` and return base64 instead — `export-png.mjs`.
29. **Array/object inputs are JS PROPERTIES, not attributes.** Table's `columns`+`data`,
    command-palette's `actions`, combobox's `items`. Without them the component renders
    its empty state and you measure nothing — Table falls back to a bare `<slot>`. The
    harness ships them as `data-alprops` JSON and assigns them after upgrade, then awaits
    each element's `updateComplete` (a Lit render from a property is async).
30. **A second figma-console server is fine.** It binds the next free port (9225) and the
    Desktop Bridge follows it — no need to kill an existing instance holding 9223.

### Deliberately NOT built

- **Theme Switcher** — zero `@property` accessors and an EMPTY stylesheet
  (`.al-c-theme-switcher {}`). It is an `al-button` + `al-popover` + `al-menu`
  composition and all its substance is behavioural. A set would duplicate three
  components and own no pixels. Recorded in `NOT_COMPONENTS`.
- **Command Palette** — PARKED (`skip: true`). A `position:fixed` overlay whose shadow
  root measures 0x0 in flow even with `isActive` set; needs a bespoke build.
- **Combobox** — deferred to Wave B: it nests `al-input` (itself a molecule) and its open
  state needs `al-dropdown-panel` + `al-list`, neither of which is in Figma.

### 31. Overlay molecules need a `measureRoot` (not yet implemented)

`al-dialog`, `al-drawer`, `al-popover` and `al-command-palette` all set
`:host { display: contents }`, so the HOST has no box, and their content lives in a
`position: fixed` (dialog/drawer/command-palette) or `position: absolute` (popover)
`__container` inside the shadow root. `__spec` measures the shadow root's first element
child, which for all four is a `width: max-content` wrapper around the TRIGGER — so the
component measures trigger-sized or 0x0 and the generic builder emits an empty set.

The fix is a per-plan-entry `measureRoot` selector (`.al-c-dialog__container`) threaded
into `__spec`. One change unblocks all four, and Card after Popover (Card's realistic
story slots a Popover).

### 32. Molecule sets must be resolved BY NAME, not by node id

A molecule page is deleted and rebuilt on every iteration, minting a NEW component-set id
each time, so a pinned id goes stale after the next build. `instance-map.mjs` gives
molecules `id: null` and the builder looks them up by name. Atom sets are repaired in
place, keep their ids, and stay pinned — that asymmetry is deliberate.
