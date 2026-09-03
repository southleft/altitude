# API vocabulary

One name per idea, across every `al-*` element. Declared in
`.altitude/api-vocabulary.json`, enforced by `scripts/check-api-vocabulary.mjs`.

## Canonical axes

| Prop | Means | Values |
|---|---|---|
| `emphasis` | Visual weight inside one component's hierarchy | `primary` `secondary` `tertiary` `neutral` `bare` `ghost` `plain` |
| `status` | Semantic state the user must read | `info` `success` `warning` `danger` |
| `size` | The one t-shirt scale; use a subset, never a respelling | `xs` `sm` `md` `lg` `xl` `xxl` `xxxl` |
| `position` | Anchoring of a floating element to its trigger | `top` `bottom` `left` `right` `top-left` `top-center` `top-right` `bottom-left` `bottom-center` `bottom-right` `left-top` `right-top` `inset` |
| `direction` | Flow of a component's own children | `row` `column` |
| `orientation` | Axis a single element is drawn along | `horizontal` `vertical` |
| `shape` | Silhouette of the box | `default` `sharp` `pill` `circle` `square` `rounded` `rect` |
| `align` | Cross-axis alignment of children | `start` `center` `end` `stretch` `baseline` |
| `justify` | Main-axis distribution of children | `start` `center` `end` `between` `around` `evenly` `stretch` |

Booleans take `is*` (a state the component is in) or `has*` (a part it owns).
A bare name is legal only where HTML already fixed the meaning — `disabled`,
`checked`, `required`, `open`, `multiple` and the rest of the standard list.

Reserved, always rejected: `variant`, `alignment`, `placement`,
`flyoutPosition`, `labelPosition`, `layout`, `appearance`, `kind`, `color`,
`severity`, `level`. Each hides which axis it means; `variant` alone carries
seven meanings in the library today.

Anything else — `label`, `href`, `value`, `fieldId` — is free-form and unjudged.

## Adding a prop

1. Is it one of the axes above? Use that name and draw values from its set.
2. Is it a boolean? `isFoo` or `hasFoo`, or the exact HTML attribute name.
3. Neither? Name it for the thing, not for a category.
4. Regenerate `libs/al-web-components/custom-elements.json`, then run
   `node scripts/check-api-vocabulary.mjs`. A violation not in the ledger fails
   immediately, at any count.

`node scripts/check-api-vocabulary.mjs --report` prints the whole census — every
axis, every spelling, every boolean family — so the numbers are reproducible
rather than quoted.

## Working the ratchet down

`exceptions` in `.altitude/api-vocabulary.json` is a debt ledger: each entry
names an existing violation and why it survives. Every entry is counted, and the
count is pinned in `.altitude/baselines/api-vocabulary.json`.

To pay debt down: rename the prop, delete its ledger entry, then run

```
node scripts/check-api-vocabulary.mjs --update
```

The pin must match the measurement exactly. Rising fails. **Falling also
fails** until you run `--update` — otherwise a fix leaves slack that silently
readmits the same violation later. `--update` refuses while an unledgered
violation is outstanding, so debt cannot be laundered into the baseline.

Ledger entries that no longer match a real violation fail too; delete them.

The sibling gate `scripts/check-cem-render.mjs` works the same way against
`.altitude/baselines/cem-render.json`, checking that every documented `@slot`
and `@csspart` exists in the render.
