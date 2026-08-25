# The Southleft brand layer — `@southleft/sl-web-components`

> Read this before touching `libs/sl-web-components/`. It is a real package (not
> a Storybook-only playground) with its own build, its own docs registration,
> and two traps that do not exist anywhere else in the repo: a generated
> artifact you must remember to regenerate by hand, and a same-tag override
> mechanism where import order is load-bearing.

## What this package is

`@southleft/sl-web-components` (`libs/sl-web-components/`) is Southleft's
**brand layer** — the page-section components that are Southleft's alone
(hero, CTA band, marquee, media card, logo wall, section header, page hero)
plus two components that **override** base Altitude components under the same
tag (`al-header`, `al-footer`). It is described generically as a `brandLibrary`
in `.altitude/ds-projects.json` (`projects.southleft.brandLibrary`,
`.altitude/ds-projects.json:116`) — any design system may declare one; today
only Southleft does.

It is built on `@southleft/al-web-components` (a `workspace:*` dependency,
`libs/sl-web-components/package.json:36`), not a fork of it.

### The 9 components

All nine extend `ALElement` **directly** via a **relative source import**, not
the `@southleft/al-web-components` package specifier:

```ts
import { ALElement } from '../../../al-web-components/components/ALElement';
```

Full rationale is in `libs/sl-web-components/vite.config.mjs:88-104`: the bare
specifier resolves three different ways depending on who is compiling it
(`tsc` follows `exports` to `dist/**/*.d.ts`; plain Vite follows `exports` to
built `dist/*.js`; the Storybook config aliases the bare name to the package
root, under which `ALElement` does not exist at all). A relative source path
resolves identically in all three. The cost — accepted for now — is that the
build inlines the Altitude modules it touches instead of leaving them
external, because nothing yet consumes `dist` as a real npm dependency
(`apps/southleft` still imports nothing from this package — spec
`2026-08-22-southleft-brand-design-system-as-a-linked-layer-on-altitude`, T11).

Six of the nine are new tags (`sl-hero`, `sl-cta-band`, `sl-marquee`,
`sl-logo-wall`, `sl-section-header`, `sl-page-hero` — class names `SLHero`,
`SLCtaBand`, etc., `libs/sl-web-components/components/bundle.ts`).
**`SLCard`, `SLHeader` and `SLFooter` are different: they do not register a new
tag.** `SLCard` is the brand implementation of `al-card` — a superset of the
base card that adds the `service`, `tool`, `article` and `work` variants. The
last two were `sl-media-card` until the card started owning its own padding, at
which point the reason for a separate component (Altitude's card wraps its image
region in the card's padding, so media can never reach the edge) stopped
applying.

```ts
// libs/sl-web-components/components/header/header.ts:73-74
export class SLHeader extends ALElement {
  static el = 'al-header';
```

This is **tag capture**, not subclassing-and-registering-under-a-new-name.
`SLHeader.el` is the literal string `al-header` — the same tag the base
`al-header` component registers under one namespace, spec
`2026-08-23-one-al-namespace-across-brand-and-base`. Whichever module's
`customElements.define('al-header', …)` executes first wins the tag for the
life of the page; `customElements.define` is first-come and cannot be undone.
The base `al-header` module is therefore **never imported** by `header.ts` —
importing it would register the base class under the tag first and the brand
implementation would silently never upgrade (every named slot goes unassigned,
because the element that actually won the tag has one unnamed slot). See the
full comment at `libs/sl-web-components/components/header/header.ts:1-39`.

**Consequence: define-order is load-bearing wherever both a brand layer and
the base library are loaded on the same page.** The brand layer's module must
evaluate first, or its override of `al-header`/`al-footer` never takes effect.
Both reference integrations get this right and both leave a comment explaining
why — read them before wiring up a third:

- `apps/southleft/src/layouts/Base.astro` (~:184-201) — imports
  `@southleft/sl-web-components/components/footer` and `.../header` instead
  of the base `al-web-components` equivalents. Never both.
- `apps/docs/src/layouts/Shell.astro` (~:139-155, order comment ~:139-155) —
  renders `<BrandRuntime />` **before** `<LiveRuntime />` for exactly this
  reason: `LiveRuntime` imports the *whole* base library, and if it ran first
  it would claim `al-header` before the brand implementation the page exists
  to document ever got a chance to.

`.altitude/ds-projects.json`'s `brandLibrary.supersedes` (`al-header:
al-header`, `al-footer: al-footer`, `.altitude/ds-projects.json:120-124`) is
what declares this override to the docs registry (see "Docs registration"
below) — it maps a tag to itself specifically to say "this collision is
deliberate," not a routing accident.

## Build

The root `build` script wires all three packages in order
(`package.json:19`):

```
@southleft/al-web-components → @southleft/sl-web-components → @southleft/al-react
```

This package's own build (`libs/sl-web-components/package.json:31`):

```bash
pnpm --filter @southleft/sl-web-components build
# = del-cli dist && vite build -c vite.config.mjs && tsc
```

Vite emits the runtime JS to `dist/components/**`; `tsc` emits declarations
to `dist/sl-web-components/components/**` (a different subtree — not a typo,
see the long `//` comment on `exports["."]` in
`libs/sl-web-components/package.json:12`, caused by the relative-import trick
above pulling Altitude sources into the `tsc` program and shifting the
inferred `rootDir`). `package.json`'s `sideEffects` array
(`libs/sl-web-components/package.json:47-53`) lists both source and dist
paths — every component module ends in a `customElements.define` guarded by
`alAutoRegistry`, and a bundler that thinks the module is side-effect-free
will drop the whole import, silently un-registering the element in a
production build.

### THE TRAP: the custom-elements manifest is not part of `build`

```bash
pnpm --filter @southleft/sl-web-components build:custom-elements.json
# = cem analyze --config custom-elements-manifest.config.mjs --outdir .
```

This is a **separate script**, not a step inside `build`
(`libs/sl-web-components/package.json:29-33`). The committed
`libs/sl-web-components/custom-elements.json` is the **sole source** the docs
registry reads for every `/docs/southleft` page — `libraryRecords()` in
`apps/docs/src/lib/registry.mjs:200` parses it directly off disk, it does not
regenerate it. If you change a component's JSDoc, add a `@slot`/`@event`, or
change its public API and forget to re-run `build:custom-elements.json`, the
docs site keeps rendering the stale API forever with no build error. A CI
gate to catch this drift is being added in a parallel spec; until it lands,
**regenerate by hand as part of any change that touches JSDoc or the public
API**, and commit the result.

## Two styling layers — know which one you're in

1. **Altitude-owned brand tokens.** `libs/al-web-components/styles/tokens-dtcg/tier-2/brand/southleft/`
   — real design tokens in the hand-authored DTCG source that build into `:host([brand='southleft'])`
   partials. This is the sanctioned, tracked mechanism for brand theming; see
   `.altitude/BRANDS.md` for the full contract (what a brand set may contain,
   the reference-never-literal rule, the axis-ownership boundaries).
2. **This package's own fallback layer.** `libs/sl-web-components/styles/_brand.scss`
   — four Sass variables (`$sl-border-faint`, `$sl-grid-line`, `$sl-font-mono`,
   `$sl-text-lead`) and two mixins (`sl-kicker`, `sl-grid-texture`), each
   expanding to `var(--sl-*, <formula>)` where `<formula>` is a **literal
   duplication** of the same formula declared on `.sl-page` in
   `apps/southleft/src/styles/layout.css:124-136`. The duplication is
   deliberate and documented as temporary
   (`libs/sl-web-components/styles/_brand.scss:1-26`): a `:host` declaration
   would shadow the app's own `--sl-*` custom properties (set on an ancestor,
   `.sl-page`), so the fallback pattern lets the app's value win when present
   and still renders correctly with no app CSS loaded at all (the Storybook
   case). **The documented exit** is to promote these four values into real
   tier-2 brand tokens under `tokens-dtcg/tier-2/brand/southleft/`, at which point
   this file collapses to plain `var(--al-…)` references and the duplication
   disappears. Do not add a fifth ad hoc `--sl-*` fallback here without
   considering whether it belongs in layer 1 instead.

## Docs registration

`.altitude/ds-projects.json` `projects.southleft.brandLibrary`
(`.altitude/ds-projects.json:116-124`) is what puts these components on
`/docs/southleft` — declaring `workspace`, `root`, and `supersedes` is the
entire registration; `apps/docs/src/lib/registry.mjs` reads the layer's own
`custom-elements.json` the same way it reads the base library's
(`libraryRecords()`, `registry.mjs:194-`). Two libraries share one route
namespace (`/components/<slug>`, keyed by the component's directory name), so
a layer component that merely shares a name with a base one — rather than
declaring `supersedes` — throws a build-time error naming the fix
(`registry.mjs:325-355`).

## Changing an existing brand component vs. adding a new one

Adding a component (or changing one enough that docs/guidance/a11y coverage
must move) touches more than the `.ts`/`.scss`:

1. **`libs/sl-web-components/components/bundle.ts`** — hand-maintained,
   alphabetical by tag name. Add exactly one export line; never rewrite the
   file to contain only your own export
   (`libs/sl-web-components/components/bundle.ts:1-7`).
2. **`libs/sl-web-components/components/<name>/<name>.stories.ts`** — the docs
   registry infers tier/status/title from the story meta, the same as base
   components.
3. **Regenerate the CEM** — `build:custom-elements.json` (see the trap above).
4. **Guidance YAML** — `apps/docs/src/content/guidance/southleft/<name>.yaml`.
   `scripts/check-guidance.mjs` requires every one of eight sections when a
   component claims guidance: `purpose`, `when-to-use`, `when-not-to-use`,
   `dos`, `donts`, `accessibility`, `content`, `sources`
   (`scripts/check-guidance.mjs:75-84`). Run `pnpm run gate:guidance` after
   `pnpm --filter al-app-docs build`.
5. **a11y coverage** — this package has no Storybook of its own (retired
   2026-08-23), so its a11y numbers come from axing the **built docs site**,
   not from Storybook's axe-playwright runner:
   `pnpm --filter al-app-docs build && pnpm run a11y:report:docs`, which
   writes `.altitude/a11y/report-docs.json`
   (`scripts/build-a11y-docs-report.mjs:43,63`).
6. **Gates to run before opening a PR**:
   - `pnpm run gate:docs` — re-derives each scoped project's component
     allowlist and proves every registry entry resolves to a real page.
   - `pnpm run gate:guidance` — the eight-section check above, plus stale
     citations.
   - `pnpm run gate:token-usage` — fails on a **phantom** `--al-*` custom
     property (read but never emitted).
   - `pnpm run check:sl-scope` — keeps `apps/southleft`'s allowlisted
     component set honest against what the app's source actually imports
     (`scripts/check-sl-scope.mjs:1-26`; today this checks base `al-*` usage —
     it does not yet cover this package, since the app doesn't import it).
   - `pnpm run test:brands` — brand-distinctiveness assertions over the built
     token bundles (`.altitude/BRANDS.md` §8).

## What warns today, and what does not (yet)

- A **base component's TypeScript type or SCSS breaking** fails the
  `@southleft/sl-web-components` build in CI, because this package's build
  step is now chained after `@southleft/al-web-components`'s
  (`package.json:19`) and it inlines the base sources it imports by relative
  path.
- A **base component gaining a new slot or attribute does *not* warn this
  package.** `SLHeader`/`SLFooter` intentionally re-implement rather than
  compose the base markup, so nothing here re-checks that the override still
  covers everything the base component now offers. A conformance check for
  this is being added in a parallel spec; until it lands, treat any change to
  `al-header`'s or `al-footer`'s base slot/attribute surface as a signal to
  manually diff against `SLHeader`/`SLFooter`.

## See also

- `.altitude/BRANDS.md` — the token-side brand contract (what a brand token
  set may override, the reachability map, the two shipped brands).
- `.altitude/DS-PROJECTS.md` — the multi-project model this package's
  `brandLibrary` entry is one instance of.
- `.altitude/BUILD.md` — where this package's build fits in the overall
  Vite/Storybook build graph.
- `.altitude/WORKFLOWS.md` — routing for "I'm about to touch a brand
  component" plus every other repo workflow.
