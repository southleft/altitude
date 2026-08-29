# Task F — Review a Figma-generation curation (attempt {{ATTEMPT}})

Altitude generates each component's Figma set from its contract. Where a fact
is **not derivable** from the contract, a per-component curation file supplies
it: `libs/*/components/<name>/figma.gen.json`. Those values are judgement
calls — `scripts/contracts/figma/component-config.mjs` says so in as many
words for several of them — and a wrong one produces a set that is built
confidently and wrongly, passing every determinism and schema gate.

## The curation under review

- Component: **`{{TAG}}`**
- Curation key: **`{{KEY}}`**
- Value as written: **`{{PRESENTED}}`**

## Your job

Decide whether that value is **correct for this component**.

Read the component's own contract at `.altitude/contracts/altitude/{{TAG}}.contract.json`
(a brand-layer component may instead be under `.altitude/contracts/southleft/`),
and the component's source under `libs/al-web-components/components/` or
`libs/sl-web-components/components/`.

Some of the values you will be shown are the real, reviewed curation for this
component. Others are real values **belonging to a different component** —
well-formed and plausible, wrong here. Telling them apart requires knowing what
this component actually is.

## What each key means

| Key | What it decides | How it goes wrong |
| --- | --- | --- |
| `anatomyCase` | which measured case seeds the contract's anatomy | the alphabetical-first default "picks badly": al-badge sampled the DOT form and every generated badge rendered as a dot; al-checkbox sampled Indeterminate with the label hidden |
| `caseAxes` | pairs a measured case dimension to a prop the name-matcher cannot reach, plus the spelling of its values | the axis exists with the wrong labels, or does not fan out at all |
| `nestedProps` | which variant a nested instance switches to | al-banner's dismiss control rendering as a labelled "Button" instead of the icon-only form |

The anatomy sample should be the component's **default, representative** form —
not whichever case sorts first alphabetically, and not an edge case that hides
part of the component.

## What to return

Strict JSON matching the curation schema:

- `verdict` — `correct` or `wrong`.
- `reasoning` — what about THIS component decides it. Name the prop, variant or
  structural fact you checked. "It looks plausible" is not reasoning.
- `correctedValue` — when the verdict is `wrong`, what the value should be, as
  precisely as you can from the contract. Omit it when the verdict is `correct`.
- `confidence` — `high`, `medium` or `low`.

Do not assume something is wrong just because you are being asked about it.
Roughly half of these are correct, and reporting a good curation as broken is
as costly as missing a bad one.
