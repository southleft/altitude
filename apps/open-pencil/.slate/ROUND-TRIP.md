# Round-trip contract

How a design crosses into HTML/CSS and back without losing itself. This is the
implementation of **Option C**: every element carries two facts — what it **is** and what
it **means** — and anything that cannot carry both becomes a *named* degradation.

Measured on a real 98,645-node design system: **90.2% → 99.9%** property-value survival,
with node type, token bindings, component identity, paint structure and text metrics all
moving from partial or total loss to 100%.

---

## The two carriers

| | Carrier | Holds | Wins when |
|---|---|---|---|
| **What it means** | CSS declarations (`style`, stylesheets) | Anything CSS can express: colour, layout, spacing, typography, transforms | The property is CSS-expressible |
| **What it is** | `data-op-*` attributes / `element.design` | Node type, component identity, token bindings, variant axes, vector geometry, paint structure | CSS cannot express it |

Facts travel twice on purpose:

- `element.design` — typed, used by the in-memory model round trip.
- `data-op-*` attributes — strings, and the **only** form that survives HTML
  serialisation. Exported markup states that a div is a Button instance bound to
  `--al-color-primary`, which is what makes it legible to a person or an agent.

`from-scene-graph` writes both. `to-scene-graph` prefers `design`, falling back to parsing
the attributes.

## Precedence — who wins on re-import

This is the rule that decides whether an edit to the exported code survives.

**1. CSS-expressible properties: CSS wins. The fact is not carried at all.**

`padding-left`, `gap`, `border-radius`, `font-size`, `opacity`, `transform`, `width`.
Someone editing the exported markup — a person or an agent — must be able to change these
and have the change come back. So they are deliberately **absent** from the fact carrier.
An edit that silently fails to apply is worse than a value that is openly missing.

**2. CSS-inexpressible facts: the fact wins. Nothing in CSS can contradict it.**

Component properties, variant axes, instance overrides, `vectorNetwork`, sizing intent
(Hug/Fill), mixed-format text runs, OpenType axes, masks. There is no competing CSS value,
so restoring them verbatim can never clobber an edit.

**3. Partially expressible: both travel.**

`fills`, `strokes`, `effects`, `blendMode`, `independentStrokeWeights`, `x`/`y`. CSS gets
an idiomatic declaration so the markup renders correctly standalone; the fact preserves
what CSS rounds off. Concretely: CSS colours are 8-bit, so a fill channel of `0.123`
cannot survive `rgb()` — `0.123 × 255 = 31.365`, and `31/255 = 0.1216`. The fact is the
only way that value comes home.

> **Known limitation.** For category 3, editing the CSS alone will not change the design —
> the fact overrides it. An agent editing exported markup should change the `data-op-*`
> attribute too, or delete it to signal "CSS is authoritative here". This is a deliberate
> choice in favour of fidelity, not an oversight.

## Token bindings

A bound value exports as `var(--token-name, <literal>)`. The literal is the fallback, so
the CSS renders standalone and re-links when the token file is present.
`variableCollectionsToCSS()` emits the matching `:root` block.

Every reader goes through `pickStyle()`, which unwraps `var(--x, literal)` back to the
literal. Without that, `parseCSSNumber('var(--gap, 12px)')` returns nothing — switching on
token export silently dropped `itemSpacing` on 601 nodes before this existed.

Variable names flatten by hierarchy: `color/primary/default` → `--color-primary-default`.
A `cssVarPrefix` option namespaces them (`--al-color-primary-default`).

## Vector geometry

Vector nodes (`VECTOR`, `BOOLEAN_OPERATION`, `STAR`, `POLYGON`, `LINE`) export as **inline
SVG** via the app's existing `renderNodesToSVG`, carried on `element.rawHTML`. A vector
rendered as an empty `<div>` is a lie — the artwork has to be in the markup.

Fidelity is independent of this: `vectorNetwork` and friends round-trip through the fact
carrier whether or not SVG is emitted. `inlineVectorSVG: false` turns the SVG off.

## Named degradations

Nothing fails silently. `lastImportDegradations()` reports what the last import could not
honour:

- **`CANVAS` → `FRAME`** — a canvas cannot be nested inside a page. Deliberate; the gate
  ignores this transition specifically.
- **Variables rebuilt from markup** — an HTML-only document recovers variable *identity*
  and *name* from `data-op-vars`, but values live in the CSS and are not recovered.

Hidden and `internalOnly` nodes are skipped by design, not degraded — see §3.1 of
`FINDINGS.md`. On the real fixture that is 87% of the file, and **all** of it is
accounted for.

## Encoding notes

- **Maps and Sets get a tagged encoding** (`{"__map__":[...]}`). `JSON.stringify(new Map())`
  is `{}` — silent, not an error — so `instanceOverrides` was carried in an attribute that
  *looked* correct while the fact inside had been destroyed.
- **Only non-default values travel.** Residual facts are diffed against
  `createDefaultNode()` for the node's type. Without it every node carried
  `starInnerRadius: 0.38` and `maskType: "ALPHA"`, turning a one-div export into several
  hundred bytes of noise and destroying the readability the carrier exists to provide.

## Guarding it

| Command | What it does |
|---|---|
| `bun test packages/dom-css/tests` | 70 unit tests, ~700ms. Each pins one fact that used to be lost. |
| `bun run conformance:gate` | Aggregate fidelity floor on a fixture built in code. Exit 1 on regression. CI-safe — needs no `.fig`. |
| `bun run conformance:gate -- <file.fig>` | Same floors against a real file. |
| `bun run conformance:roundtrip <file.fig>` | Deep per-property measurement. `--focus <prop>` explains one property's losses. |
| `bun run conformance:report` | Source-derived inventory of what the bridge references. |

The gate is verified to fail: disabling the design-fact carrier makes it exit 1 and name
every regressed property. A gate that cannot fail guards nothing.

`--update` re-records the baseline, and refuses to do so from an external `.fig` — a
baseline nobody else can reproduce is not a baseline.
