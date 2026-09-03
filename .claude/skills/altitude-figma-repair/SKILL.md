---
name: altitude-figma-repair
description: >-
  Fix ONE wrong thing in an existing Altitude Figma component set — a wrong colour, a
  missing/misnamed variant axis, an unbound token, a typo'd variant, a state that renders
  identically to Default — by patching the live nodes IN PLACE, using the component's
  contract as the statement of what they SHOULD be. Triggers: 'the icon colour is wrong in
  Figma', 'the divider is missing its vertical variant', 'field note colours are off',
  'this set doesn't match the code', 'update the Figma contract to record this change',
  'fix X in Figma without regenerating', 'targeted fix instead of regenerating'. Use this
  INSTEAD of `altitude-figma-generate` whenever the set is broadly right and one fact is
  wrong — regenerating replaces the whole set, mints new node ids, and orphans every
  instance and pinned node id pointing at it. Read this BEFORE writing to Figma.
---

# altitude-figma-repair

Contract-driven, in-place repair of a Figma component set.

Sibling skills: **`altitude-figma-generate`** (build a set FROM the contract — destructive,
whole-set), **`altitude-figma-sync`** (variable audits, measurement pipeline, hand-BUILDING
a set; its traps 1/3/4/5/27 all apply here), **`altitude-facts`** (code-side API truth).

## Why this exists

`generate-figma.mjs --page …` deletes and rebuilds `"<Name> — Generated"`. That is correct
when the set is wrong *in structure*. It is the wrong tool when one binding is wrong,
because it:

- mints a **new component-set node id**, so every pinned id (parity manifest, contract
  `bindings.figma.nodeId`, other components' nested instances) goes stale;
- discards any hand edit the owner made on the canvas since the last run.

A repair changes the one node that is wrong and leaves every id intact.

## The loop

```
0. OBSERVE   node scripts/contracts/extract-canvas.mjs --component al-X
             node scripts/contracts/diff-contracts.mjs --component al-X
1. DECIDE    which side is right — code, or canvas? (see "Who is right", below)
2. PATCH     figma_execute: mutate the specific node(s). Never delete the set.
3. RE-OBSERVE pnpm run parity:refresh        # ← Figma -> manifest. NOT optional.
4. CURATE    hand-edit the contract ONLY for facts derivation cannot reach (pairWith)
5. DERIVE    node scripts/contracts/emit-contracts.mjs --refresh
6. GATE      node scripts/contracts/emit-contracts.mjs --check --check-drift --check-determinism
             node scripts/contracts/build-component-docs.mjs && pnpm run gate:contracts
7. STAMP     pnpm run parity:synced al-X
```

**Step 3 is the one everybody skips.** `props[].bindings.figma` is DERIVED from the parity
manifest's cached observation of the real set — not read live. Edit Figma, skip
`parity:refresh`, and step 5 will faithfully re-derive from a stale snapshot and quietly
erase the curation you just wrote. Symptom: you set a binding, run `--refresh`, and the
binding comes back `null`. That is not a bug; the manifest genuinely had not seen your edit.

## Who is right — code or canvas?

Not automatic. The split that holds in this repo:

| Kind of fact | Source of truth | Repair direction |
|---|---|---|
| Token **values** (a colour's hex, a space's px) | **code** (`styles/tokens-dtcg/`) | fix the Figma *variable* |
| Which **token** a part uses | **code** (the component's `.scss`) | fix the Figma *binding* |
| Variant **axis names and labels** | **canvas** (what a designer reads) | curate `pairWith` in the contract |
| Whether a variant/state **exists at all** | **code** (the CEM / measured states) | add or delete the Figma variant |
| **Anatomy / structure** | code, but see below | if structure is wrong, this is the wrong skill — regenerate |

CLAUDE.md is explicit that Figma Variables are generated FROM the DTCG tokens, "never the
reverse" — so a value disagreement is always Figma's to lose. Axis *labels* are the
exception, because they are a design-surface decision (`Orientation`, not `variant`).

## Curating a pairing the emitter cannot derive (`pairWith`)

`figmaPropBindingFor()` pairs a code prop to a Figma component-property **by normalized
name only** — `normKey` lowercases, strips non-alphanumerics, and strips the `is`/`has`
prefixes in `NAME_ALIAS_PREFIXES`. A deliberate semantic rename is therefore
**underivable**: code `variant` will never meet Figma `Orientation`.

Curate it on the prop, in the contract:

```jsonc
"bindings": {
  "code":  { "attribute": "variant" },
  "figma": { "kind": "VARIANT", "property": "Orientation",
             "options": ["Horizontal", "Vertical"],
             "pairWith": "Orientation" }        // ← the curated half
}
```

Only the **pairing** is hand-owned. `kind` and `options` are still re-derived from the
manifest on every `--refresh`, so this can never assert an axis Figma does not have — if
the property disappears, the whole binding drops to `null` and `--check-drift` says so.
(`scripts/contracts/emit-contracts.mjs`, `carryForwardPropAxisCuration`.)

Two props may legitimately share one axis: `al-field-note`'s `isError` and `isDisabled` are
both `pairWith: "State"`, because the canvas collapses both booleans into `State =
Default | Error | Disabled`. That records "this prop is expressed on the State axis" —
honest, and strictly better than `null`. It does **not** record which value maps to which
prop; no contract field carries that today.

## Hard-won traps

Every one of these was hit and diagnosed on 2026-08-27. They are ordered by how much time
they cost.

### 1. A pinned node id keeps resolving AFTER the node is deleted

`figma.getNodeByIdAsync('3435:877')` happily returns a detached `COMPONENT_SET` whose
parent chain reaches **no PAGE**. `node.removed` is `false`. So "it resolved" is not proof
it is in the document.

Found live: **11 of 20 pinned ids in the parity manifest were ghosts** (the owner had
rebuilt those pages). `extract-canvas.mjs` resolved the ghost first and extracted from it,
so the tooling reported a *deleted* set as in-sync, and reported the OLD set's axes while
the live set had different ones. Two tools disagreed about the same component because one
resolved by id and the other by name.

Always liveness-check:

```js
function isLive(n) {
  try { if (n.removed) return false; } catch (e) { return false; }
  let q = n;
  while (q && q.type !== 'PAGE') q = q.parent;
  return !!q && figma.root.children.indexOf(q) !== -1;
}
```

Fixed in `extract-canvas.mjs` (2026-08-27). `refresh-figma-digests.mjs` was never affected —
it scans `🛠` pages by name and so cannot see a ghost. **If two tools report different axes
for one component, suspect this first.**

### 2. Opacity is a PERCENTAGE, and a value comparison PASSES when the canvas is broken

A variable bound to a node's `opacity` is resolved in the unit the UI shows (percent) and
divided by 100 — even though the field itself is 0–1.

| `opacity/40` stored | `node.opacity` renders |
|---|---|
| `0.4` (matches the code token) | `0.004` — invisible |
| `40` | `0.4` — correct |

This trap has now flipped the repo's own docs **twice**, because the obvious verification
is the wrong one: comparing the stored number to the code token (`0.4 === 0.4`) *succeeds*
exactly when every disabled state in the library is silently broken. **The only valid check
is to bind it and read back `node.opacity`.** See `.altitude/FIGMA-SYNC.md` § "Opacity is a
PERCENTAGE on the Figma side".

Generalisation: before trusting any audit that compares Figma values to code values, ask
whether that field has a *unit convention*. Value equality is not the same as correctness.

### 3. Renaming variant children IS renaming the axis

Figma derives `componentPropertyDefinitions` for VARIANT props from the child COMPONENT
names. There is no separate "rename axis" call — rename the children and the axis follows:

```js
c.name = 'State=Default, Orientation=Vertical';   // adds/renames the Orientation axis
```

Every child must carry the same axis set, or Figma reports the set as having conflicting
properties. This is also how you fix a typo'd value (`Verical` → `Vertical`) without
touching anything else.

### 4. An unbound fill that happens to be the right colour is still broken

A hand-picked colour can match its token exactly and still be wrong, because it does not
follow mode/brand switches. `al-field-note`'s three variants had *visually correct*
hardcoded fills and **zero** bound variables. Check `fills[0].boundVariables.color`, never
just the RGB.

When you bind, pass the variable's **own resolved RGBA** as the literal —
`setBoundVariableForPaint` keeps whatever literal you hand it as the fallback and Figma does
not always refresh it (sync skill, trap 4). Resolve aliases yourself; a Tier-2 variable is
usually an alias chain down to Tier 1.

### 5. Recolour must not be gated behind glyph resolution

In `build-set-code.mjs` the nested-icon branch did the `swapComponent` **and** the recolour
inside one `if (glyphName && nestedGlyphByName[glyphName])`. When the Phosphor glyph failed
to resolve, the wrapper instance was still placed — keeping its cached default glyph
(`PaperPlaneTilt`) and a hardcoded **white** fill. Presents as "the chip's close icon is the
wrong colour"; the actual cause is a *missing icon*, two steps upstream.

Placement, glyph swap, and recolour are three independent steps. A failure in one must not
skip the others.

### 6. Phosphor glyphs resolve only from a VERIFIED in-file component SET

`isVerifiedPhosphorIconSet()` requires the owning node to be a `COMPONENT_SET` whose variant
properties match a known-genuine Phosphor icon. A **lone `COMPONENT`** named `X` sitting on
a scratch page does *not* qualify, so the lookup misses even though something called `X` is
right there. A new glyph needs a human to bootstrap one real instance (generate skill,
trap 8). Check `misses` / `missingVars` — the generator degrades honestly and names it.

### 7. A Phosphor glyph ships a FULL-BLEED bounding vector — never paint it

A Phosphor icon instance contains the real shapes **plus** one VECTOR the same size as the
icon box (16x16 for a 16px icon). Painting every vector fills that bounding box solid and
the glyph reads as a knocked-out silhouette — a coloured square with a white mark in it.

Paint only the vectors SMALLER than the box, and clear the glyph instance's own fill:

```js
const box = Math.max(glyph.width, glyph.height);
glyph.fills = [];
for (const v of glyph.findAll(n => n.type === 'VECTOR')) {
  if (Math.round(v.width) >= Math.round(box) && Math.round(v.height) >= Math.round(box)) { v.fills = []; continue; }
  v.fills = [paint];
}
```

This is why neither of the two obvious strategies works alone, and why the generate skill's
trap 6 (wrapper carries its own fill) and its `recolorIconChildren` note (do NOT recolor the
instance root, because CheckCircle-style icons go solid) look contradictory: some Phosphor
icons carry the paint on the instance, some on the vectors, and some ship a bounding vector.
Size-filtering the vectors is the rule that holds for all three.

### 8. `addComponentProperty(name, 'INSTANCE_SWAP', …)` wants a NODE ID, not a key

`defaultValue` for an INSTANCE_SWAP property is the default component's **node id**
(`'3509:4324'`). Passing `component.key` — the obvious guess, and what every other
key-taking API in the plugin surface wants — fails with the unhelpful
`in addComponentProperty: Property value is incompatible with component property type`,
which reads like a TYPE error, not an id-vs-key error. Confirmed against the live Button
set, whose `Icon Before` / `Icon After` both store `defaultValue: "3509:4324"`.

Related: `importComponentByKeyAsync` only accepts a **COMPONENT** key, never a
COMPONENT_SET key. To reach a glyph inside a remote icon SET, take the key off a live
instance's `getMainComponentAsync()` (a specific variant), not off the set.

Also: `addComponentProperty` does NOT dedupe. A retry after a partial failure silently adds
`Slot After2`; check `componentPropertyDefinitions` first and `deleteComponentProperty` any
duplicate you created.

### 9. `--refresh` materialises half-landed changes into a gate failure

`emit-contracts.mjs` emitted a new `layout.wrap` anatomy fact that
`contract.schema.json` had never been taught to allow. Nothing failed while the contracts on
disk predated the change; the first `--refresh` wrote `wrap` into 7 contracts and
`--check` went red. `--check-drift` stayed **green** throughout, because disk and derivation
agreed — they were just both invalid.

So: after any `--refresh`, run `--check` (schema) too, and if it fails on a field you did
not touch, check whether the emitter grew a fact the schema lacks. Complete the landing;
do not revert the contracts.

### 10. Two sets on one page can share a NAME — and the tools then disagree

Eight `🛠` pages carried the owner's hand-built reference set AND the generated set,
**both named e.g. `List Item`**. `refresh-figma-digests.mjs` scans by name and takes the
first; `extract-canvas.mjs` resolves by pinned id. So the manifest described the
REFERENCE set while the generated artifacts described the GENERATED one, and the two never
agreed. (The artifact that exposed this at the time was the prop sheet, retired 2026-08-29;
the name collision it exposed is still live.)

The generated sets were also the broken ones: `al-list-item`'s had **zero padding** and
**unbound pure-black text** (invisible in dark mode), plus only 3 of 6 states.

Fix both halves: rename the reference set to `"<Name> (reference)"` so by-name resolution
is unambiguous (it then shows up in the manifest's `figmaOnly` list, which is correct —
it is reference material with no code component), and pin the manifest at the maintained
set. 14 more pages still have this collision as of 2026-08-27.

### 11. The contract can UNDER- and OVER-state the variant matrix

Both directions are live:

- **Under**: a state reaches the contract only with a measured `stateOverride` or an SCSS
  delta, and attribute-driven cases (Error/Disabled) are recorded as anatomy CASES, not
  states. Eight components' sets were missing states their reference sets had.
- **Over**: a cartesian case-axis fan-out invents combos never measured — al-progress's
  `Shape=Bar × Size=Lg|Md|Xl` are not real (`circleSize` only applies when `isCircle`),
  so 6 phantom variants had to be pruned.

Consequence, while the prop sheet existed: regenerating the grid from the contract's ops
dropped the states you had just restored and failed on the phantoms you had just pruned
(`setProperties: Unable to find a variant with those property values`).

**The prop sheet is gone** (retired 2026-08-29, owner direction): a component page is now
ONE frame — the doc header above the real COMPONENT_SET — and the variant break-out grid
is not generated at all. Expand variants by hand with Propstar when a page wants them.
`generate-figma.mjs --sheet` exits 2 with a message saying so, and
`rebuild-sheet-from-set.mjs` was deleted with it. So there is no sheet to re-sync after a
repair; that whole step is gone.

The trap that survives the sheet is the **contract** half above: after restoring a state
or pruning a phantom, re-run `emit-contracts.mjs --check-drift` and re-read what the
contract now claims the matrix is. A repaired canvas and a stale contract disagree exactly
as loudly as the old sheet did.

### 12. A `width: 100%` component measures ZERO WIDE

`al-progress`'s bar is `width: 100%` (progress.scss:15,26) inside an unconstrained
harness, so its track measured `{w: 0, h: 4}` and generation produced an **empty 100×100
frame** — `createFrame`'s default, with no children at all. The circle (intrinsic size)
generated fine.

Any `width: 100%` / `flex: 1` component hits this. The durable fix is a harness width in
the measurement pass; the repair is to build that node by hand at a representative width
with the contract's own token bindings (`--al-theme-color-background-neutral-strong` for
the track, `--al-theme-color-content-primary-default` for the fill). Do not "fix" it by
deleting the node — an invisible component reads as a generator bug forever.

### 13. "The Figma set has no padding" is usually a MEASUREMENT bug, not a Figma bug

Before repairing padding on the canvas, check whether the contract carries it at all.

`measure-lib.js` recovers tokens by reading the **authored declaration** off each matching
CSS rule — so its `PROPS` list must contain the exact property name the SCSS wrote. Until
2026-08-27 it listed only the PHYSICAL longhands (`padding-top/right/bottom/left`), while
**27 components author LOGICAL properties** (`padding-block-start`, `padding-inline-start`,
…) — 64 declarations in total. Every one of those tokens was invisible to the contract, so
those components generated into Figma with **no padding at all**.

`al-list-item` was the proof: `list-item.scss:43-46` sets
`padding-block-start: var(--al-list-item-link-padding-block-start, var(--al-theme-space-xs))`,
and its contract's link node bound `font`, `letter-spacing`, `width` — and nothing else.
The canvas was faithfully reproducing an empty fact.

Fixed by adding the logical names to `PROPS` and folding them onto the physical sides in
`expand()` (LTR: `inline-start` → left). **The same class of bug is still open for `<th>`
padding and for `calc()` values** — see the spec's follow-up tasks.

The general lesson: when a generated set is missing a visual property, diff the CONTRACT
against the SCSS *before* touching Figma. A repair applied on the canvas is wiped by the
next generation; a fix in the probe list corrects every component at once.

### 14. Do not hand-edit a derived field to "record" a change

Only `status`, `version`, and the curation fields (`axis`, `omit`, `pairWith`, slot
`figmaAxis`/`figmaOmit`) survive a `--refresh`. Anything else you hand-write into a contract
is overwritten the next time anyone refreshes, and `--check-drift` will flag it in the
meantime. "Record it in the contract" almost always means *fix the observation source and
re-derive*, not *type the answer into the JSON*.

## Verification

A repair is done when all of these are true — not before:

```bash
node scripts/contracts/emit-contracts.mjs --check              # schema, both projects
node scripts/contracts/emit-contracts.mjs --check-drift        # contract <-> code
node scripts/contracts/emit-contracts.mjs --check-determinism
node scripts/contracts/build-component-docs.mjs                # regenerate, then:
pnpm run gate:contracts                                        # all five legs
node scripts/contracts/diff-contracts.mjs --component al-X     # contract <-> canvas
pnpm run parity:synced al-X                                    # stamp, or it reports drift forever
```

Skipping `parity:synced` leaves a correctly-repaired component showing red in
`altitude_check_parity`, `GET /parity.json` and the docs ParityPanel.
