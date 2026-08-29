# Task D — Reconcile a component's code contract against its Figma contract (attempt {{ATTEMPT}})

You are reconciling **`{{TAG}}`** in the Altitude design system.

Two descriptions of the same component are on disk:

- **Code contract** (what the component's source says it is):
  `{{CODE_CONTRACT_PATH}}`
- **Canvas contract** (what the Figma component set actually contains):
  `{{CANVAS_CONTRACT_PATH}}`

Read both. Report **every disagreement between them**, and nothing else.

## What counts as a disagreement

Use these dimensions:

| `dimension` | The disagreement is about |
| --- | --- |
| `prop` | a code prop with no matching Figma component property, or vice versa |
| `variant-axis` | an enum prop / Figma VARIANT property present on one side only, or typed wrong |
| `variant-value` | the two sides' option sets for one axis differ |
| `state` | an interaction state present on one side only |
| `slot` | a code slot with no Figma expression, or a Figma slot property with no code slot |
| `token-binding` | a Figma variable referenced by one side and not the other |

And these kinds: `missing-in-canvas`, `missing-in-code`, `value-mismatch`,
`present-despite-omission`.

The `key` is the name the disagreement is about — the prop name, the axis
name, the state name, or the Figma variable name. Use the name **exactly as it
appears in the contract**, not a normalized or prettified version.

## Things that are NOT disagreements

Do not report these. They are properties of the format, not defects:

- The canvas side records `degradations[]` — facts a Figma set structurally
  **cannot** express (events, code binding names, ARIA attributes, CSS parts,
  the `--al-*` custom property behind a Figma variable). Something absent from
  canvas *because it is listed there* is not drift.
- A code prop carrying `bindings.figma.omit: true` is deliberately not
  expressed in Figma. Absent from canvas is **correct** for those. (It is a
  disagreement only if the canvas exposes it anyway — that is
  `present-despite-omission`.)
- The `State` axis on the Figma side has no code prop counterpart by design.
  States are behaviour, compared through the `state` dimension instead.
- Structural anatomy. The two trees are keyed by unrelated naming schemes
  (DOM tag/class vs Figma layer name) with no reliable 1:1 mapping, so the
  node trees are not comparable and are not being asked about.

## The two sides may also agree

If the two contracts do not disagree, return an empty `findings` array and
`verdict: "in-sync"`. **Do not manufacture a finding to have something to
report.** Reporting drift that is not there is as wrong as missing drift that
is.

## Direction

For each finding, set `winner` to the side that should be treated as correct:

- token VALUES and which token a part uses → `code`
- whether a variant or state EXISTS → `code`
- variant axis NAMES and LABELS → `canvas`
- anything you genuinely cannot settle from the two contracts → `ask-a-human`

Return strict JSON matching the reconcile schema.
