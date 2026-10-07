---
title: HTML/CSS Round Trip
description: How @open-pencil/dom-css carries scene facts through HTML and CSS, which carrier wins on re-import, and how fidelity is measured.
---

# HTML/CSS round trip

`@open-pencil/dom-css` converts a scene graph to HTML/CSS and back. Every exported element carries two facts: what it **is** (node type, component identity, token bindings) and what it **means** (CSS declarations). Anything that cannot carry both is reported as a named degradation instead of being dropped silently.

## Two carriers

| Carrier | Holds | Wins when |
| --- | --- | --- |
| CSS declarations (`style`, stylesheets) | Colour, layout, spacing, typography, transforms | The property is CSS-expressible |
| `data-op-*` attributes and `element.design` | Node type, component identity, token bindings, variant axes, vector geometry, paint structure | CSS cannot express it |

Facts travel in two forms:

- `element.design` is typed and used by the in-memory model round trip.
- `data-op-*` attributes are strings and are the only form that survives HTML serialisation. They also make exported markup legible: a `div` states that it is a Button instance bound to `--color-primary`.

`sceneGraphToDesignDocument()` writes both. `designDocumentToSceneGraph()` prefers `design` and falls back to parsing the attributes. Export with `includeDesignFacts: false` to emit plain HTML/CSS without them.

## Precedence on re-import

1. **CSS-expressible properties: CSS wins, and the fact is not carried.** `padding-left`, `gap`, `border-radius`, `font-size`, `opacity`, `transform`, and `width` stay editable in the markup, so an edit to them comes back.
2. **CSS-inexpressible facts: the fact wins.** Component properties, variant axes, instance overrides, `vectorNetwork`, Hug/Fill sizing, mixed-format text runs, OpenType axes, and masks have no competing CSS value.
3. **Partially expressible: both travel.** `fills`, `strokes`, `effects`, `blendMode`, `independentStrokeWeights`, and `x`/`y` get an idiomatic CSS declaration for standalone rendering, while the fact keeps what CSS rounds off. For example, CSS colours are 8-bit, so a fill channel of `0.123` cannot survive `rgb()`.

For category 3, editing only the CSS does not change the design, because the fact overrides it. Edit the matching `data-op-*` attribute as well, or remove it to make the CSS authoritative.

Motion is derived output. A component set's [motion spec](/user-guide/motion) travels in `data-op-motion`; variants and instances get a `transition` declaration generated from it with role-token fallbacks. The declaration is never read back, because it has lost the triggers, target variants, and token bindings, so edit `data-op-motion` (or the design) to change motion.

## Untrusted markup

Exported markup is meant to be edited by people and agents, so `data-op-*` values are validated with Valibot before they reach the graph:

- Fills, strokes, and effects are validated entry by entry against the scene-graph `Fill`, `Stroke`, and `Effect` shapes. Invalid entries are dropped; valid siblings are kept. If every entry is invalid, the CSS-derived paint stands.
- Residual fields must be on the carried allow-list and have the same kind as the field's default for the node type. Identity and tree structure (`id`, `parentId`, `childIds`) are never written from markup.
- `data-op-motion` is validated transition by transition; unknown triggers, properties, and use cases are dropped, and a spec with no valid transition is reported.
- Malformed JSON is ignored.

Each rejection is reported as a degradation that names the element and attribute.

## Token bindings

A bound value exports as `var(--token-name, <literal>)`. The literal is the fallback, so the CSS renders standalone and re-links when the token file is present. `variableCollectionsToCSS()` emits the matching `:root` block. Variable names flatten by hierarchy (`color/primary/default` becomes `--color-primary-default`), and `cssVarPrefix` adds a namespace.

When a document has no source graph, as on the Code panel's HTML path, variables are rebuilt from the markup: identity and name come from `data-op-vars`, the type is inferred from the bound field (colours are `COLOR`, spacing, padding, radii, and font size are `FLOAT`, font family is `STRING`, visibility is `BOOLEAN`), and the value comes from the `var()` fallback when one was written. The rebuilt collection has a single mode.

## Transforms

The exporter writes `rotate(Ndeg) scaleX(-1) scaleY(-1)`. Browsers report computed transforms as `matrix(...)` or `matrix3d(...)`, so the importer decomposes 2D matrices into rotation and flips. A matrix cannot distinguish a flip on both axes from a 180° rotation, so reflections are read as a horizontal flip with a matching rotation; when the authored inline transform is still in functional form, it is preferred. Transforms with depth are ignored rather than partially applied.

## Vector geometry

`VECTOR`, `BOOLEAN_OPERATION`, `STAR`, `POLYGON`, and `LINE` nodes export as inline SVG on `element.rawHTML`, so the artwork is present in the markup. Geometry fidelity is independent of this: `vectorNetwork` and related fields round-trip through the fact carrier. `inlineVectorSVG: false` turns the SVG off.

Raw geometry is exact but large. `geometryFacts: false` drops `vectorNetwork`, `fillGeometry`, and `strokeGeometry` from the facts for readable markup; pass an `omittedGeometry` array to receive the list of omitted fields per node.

## Named degradations

Pass a `degradations` array to any import function to collect what the import could not honour. Each call owns its array, so concurrent imports never share a report.

```ts
import { htmlToSceneGraph, type ImportDegradation } from '@open-pencil/dom-css'

const degradations: ImportDegradation[] = []
const graph = await htmlToSceneGraph(html, { degradations })
```

Recorded degradations include:

- `CANVAS` re-imported as `FRAME`, because a canvas cannot be nested inside a page.
- Unknown node types, which fall back to `FRAME`.
- Invalid `data-op-*` values, as described above.
- Variables rebuilt from markup, with the number that had no CSS fallback value.

Hidden and `internalOnly` nodes are skipped by design and are not degradations.

## Encoding notes

- Maps and Sets use a tagged encoding (`{"__map__":[...]}`), because `JSON.stringify(new Map())` silently produces `{}`.
- Only non-default residual values travel. They are compared with the default node for the node's type, which keeps a one-element export short.

## Measuring fidelity

| Command | What it does |
| --- | --- |
| `bun test packages/dom-css/tests` | Unit tests, each pinning one fact. |
| `bun run conformance:gate` | Aggregate fidelity floor on a fixture built in code. Exits 1 on regression and needs no `.fig`. |
| `bun run conformance:gate <file.fig>` | The same absolute floors against a real file. |
| `bun run conformance:gate:update` | Re-records `tools/conformance/fidelity-baseline.json` from the synthetic fixture. |
| `bun run conformance:roundtrip <file.fig>` | Per-property measurement. `--focus <prop>` explains one property's losses. |
| `bun run conformance:report` | Source-derived inventory of what the bridge references, written to `.slate/CONFORMANCE.md`. |

`--update` refuses to record a baseline from an external `.fig`, because nobody else could reproduce it. The conformance tooling lives in `tools/conformance/`.
