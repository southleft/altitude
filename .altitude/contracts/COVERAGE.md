# Contract ↔ Figma coverage (real components, per page)

Spec: `.mm/specs/2026-08-26-contract-coverage-for-all-real-altitude-figma-components-with-nested-component-composition`
Snapshot: 2026-08-26, live against "Altitude Design System" (y83n4o9LOGs74oAoguFcGS), pages inventoried via the Desktop Bridge.
Regenerate the generated-set column by re-running the sweep (see § How to regenerate).

## Headline numbers

- **37 real component sets** live in the file (one per "🛠 " page), **36 mapped** to code components in the parity manifest.
- **68 non-icon code components** tracked; **35 generated live this session** onto the "Contract Pilot" scratch page (33 sweep + al-button + al-checkbox-group pilots), **zero failures**.
- **15 generated sets are composites** that NEST real-set INSTANCES (Checkbox, Field Note, Button, Link, Menu Item, Tab, Badge, Radio, Toggle Button, Pagination Item, Input, the DS Icon wrapper…) — the "molecules nest existing components" constraint, working end to end.
- **17 components blocked on measured anatomy** (spec-light.json has no entry — run the measurement pass, then `contracts --refresh`): the notable ones are al-search, al-select, al-dialog, al-popover, al-drawer, al-card, al-header, al-footer, al-stepper, al-date-picker, al-date-time-picker.

## How nesting works (the caveat this spec exists for)

1. `composition` in every contract — derived from the component's OWN source (template tags + sibling imports) by `emit-contracts.mjs`; `--refresh` keeps it current.
2. Anatomy nodes carry `component: "al-<name>"` when their class list bears another component's `al-c-<name>` block class (measured anatomy flattens shadow DOM, so nested components are recoverable from BEM blocks).
3. `derive-ops.mjs` maps each annotated tag to its Figma set NAME (sibling contract's `bindings.figma.componentSetName`, else Title Case) — never a node id.
4. `build-set-code.mjs` resolves each set by name (the component's own "🛠 " page first, then the scratch page for generated fallbacks; the DS "Icon" lone COMPONENT resolves via the wrapper path) and places a real INSTANCE — outermost annotation wins, the subtree is never rebuilt. Unresolved tags degrade to coarse auto-layout frames that recurse (al-layout does this BY DESIGN — arrangement primitive, no set of its own), reported per miss.

## Coverage table

Column key — **Real set**: parity-manifest mapping; **Anatomy**: measured = generation-ready; **Nests (code)**: the contract's `composition.renders`; **Generated (this session)**: live result on the scratch page, ✓/✗ = nested set resolved/missed.

| Component | Real set | Anatomy | Nests (code) | Generated (this session) |
|---|---|---|---|---|
| al-accordion-panel | — | measured | al-icon | ready (no real set) |
| al-accordion | — | — | al-accordion-panel | BLOCKED: no measured anatomy |
| al-alert | — | measured | al-button, al-icon | ready (no real set) |
| al-avatar | — | measured | al-badge, al-icon-* | ready (no real set) |
| al-badge | Badge | measured | — | 25 variants |
| al-banner | Banner | measured | al-alert, al-button, al-icon, al-link, al-toast | composite, 20 variants [al-icon✓] |
| al-breadcrumbs-item | Breadcrumbs Item | measured | — | 5 variants |
| al-breadcrumbs | Breadcrumbs | measured | al-breadcrumbs-item, al-button, al-icon, al-menu, al-menu-item, al-popover | composite, 5 variants [al-breadcrumbs-item✓] |
| al-button | Button | measured | al-icon-dots-vertical | 25 variants |
| al-calendar | — | measured | al-button, al-date-picker, al-date-time-picker, al-icon | ready (no real set) |
| al-card | — | — | al-avatar | BLOCKED: no measured anatomy |
| al-checkbox-group | Checkbox Group | measured | al-checkbox, al-field-note, al-layout | composite, 5 variants [al-checkbox✓ al-field-note✓ al-layout✗] |
| al-checkbox | Checkbox | measured | al-field-note | 5 variants |
| al-chip | Chip | measured | al-icon | 30 variants |
| al-combobox | Combobox | measured | al-button, al-dropdown-panel, al-field-note, al-icon, al-input, al-list, al-list-item | composite, 10 variants [al-field-note✓ al-icon✓ al-input✓] |
| al-command-palette | Command Palette | — | al-focus-trap, al-icon | BLOCKED: no measured anatomy |
| al-date-picker | — | — | al-calendar, al-field-note, al-icon, al-input | BLOCKED: no measured anatomy |
| al-date-time-picker | — | — | al-button, al-calendar, al-field-note, al-icon, al-input, al-layout, al-time-selector-list | BLOCKED: no measured anatomy |
| al-dialog | — | — | al-button, al-focus-trap, al-heading, al-icon | BLOCKED: no measured anatomy |
| al-divider | Divider | measured | — | 5 variants |
| al-drawer | — | — | al-button, al-focus-trap, al-icon | BLOCKED: no measured anatomy |
| al-dropdown-panel | — | measured | — | ready (no real set) |
| al-empty-state | Empty State | measured | — | composite, 5 variants [al-button✓ al-icon✓] |
| al-field-note | Field Note | measured | — | 5 variants |
| al-file-upload | File Upload | measured | al-button, al-field-note, al-icon, al-progress | composite, 10 variants [al-button✓ al-field-note✓ al-icon✓] |
| al-focus-trap | — | — | — | BLOCKED: no measured anatomy |
| al-footer | — | — | al-divider, al-layout, al-logo | BLOCKED: no measured anatomy |
| al-header | — | — | al-layout, al-logo, al-menu | BLOCKED: no measured anatomy |
| al-heading | Heading | measured | — | 35 variants |
| al-icon | — | — | — | BLOCKED: no measured anatomy |
| al-input-stepper | Input Stepper | measured | al-button, al-field-note, al-icon | composite, 10 variants [al-button✓ al-field-note✓ al-icon✓] |
| al-input | Input | measured | al-field-note | composite, 10 variants [al-field-note✓] |
| al-layout | — | measured | — | ready (no real set) |
| al-link | Link | measured | — | 5 variants |
| al-list-item | List Item | measured | al-dropdown-panel, al-icon, al-link, al-list | 10 variants |
| al-list | — | measured | al-list-item | ready (no real set) |
| al-logo | — | measured | — | ready (no real set) |
| al-menu-item | Menu Item | measured | al-button, al-icon, al-link, al-menu | composite, 5 variants [al-link✓] |
| al-menu | Menu | measured | al-link, al-list, al-menu-item | composite, 10 variants [al-link✓ al-menu-item✓] |
| al-pagination-item | Pagination Item | measured | — | 5 variants |
| al-pagination | Pagination | measured | al-button, al-icon, al-list, al-list-item, al-pagination-item, al-popover, al-select | composite, 10 variants [al-button✓ al-focus-trap✗ al-icon✓ al-input✓ al-pagination-item✓ al-popover✗ al-select✗] |
| al-popover | — | — | al-button, al-focus-trap, al-heading, al-icon | BLOCKED: no measured anatomy |
| al-progress | — | measured | — | ready (no real set) |
| al-radio-group | Radio Group | measured | al-field-note, al-layout, al-radio | composite, 5 variants [al-field-note✓ al-layout✗ al-radio✓] |
| al-radio | Radio | measured | al-field-note | 5 variants |
| al-range | Range | measured | al-field-note | composite, 10 variants [al-field-note✓] |
| al-search | — | — | al-button, al-dropdown-panel, al-field-note, al-icon, al-input, al-list, al-list-item | BLOCKED: no measured anatomy |
| al-select | — | — | al-checkbox, al-combobox, al-dropdown-panel, al-field-note, al-icon, al-input, al-list-item, al-search | BLOCKED: no measured anatomy |
| al-skeleton | Skeleton | measured | — | 5 variants |
| al-spinner | — | measured | — | ready (no real set) |
| al-stat | — | measured | al-icon, al-layout | ready (no real set) |
| al-stepper-item | — | measured | al-icon | ready (no real set) |
| al-stepper | — | — | al-stepper-item | BLOCKED: no measured anatomy |
| al-tab-panel | Tab Panel | measured | — | 5 variants |
| al-tab | Tab | measured | al-tab-panel, al-tabs | 5 variants |
| al-table | Table | measured | al-checkbox, al-icon, al-theme | 5 variants |
| al-tabs | Tabs | measured | al-button, al-icon, al-tab, al-tab-panel | composite, 10 variants [al-badge✓ al-tab✓ al-tab-panel✓] |
| al-testimonial | — | measured | al-avatar | ready (no real set) |
| al-text-block | Text Block | measured | — | 5 variants |
| al-textarea | Textarea | measured | al-field-note | composite, 10 variants [al-field-note✓] |
| al-theme-switcher | — | — | — | BLOCKED: no measured anatomy |
| al-theme | — | — | — | BLOCKED: no measured anatomy |
| al-time-selector-list | — | measured | — | ready (no real set) |
| al-toast | — | measured | al-button, al-icon, al-progress | ready (no real set) |
| al-toggle-button-group | Toggle Button Group | measured | al-layout, al-toggle-button | composite, 10 variants [al-layout✗ al-toggle-button✓] |
| al-toggle-button | Toggle Button | measured | al-menu, al-popover | 10 variants |
| al-toggle | Toggle | measured | — | 5 variants |
| al-tooltip | — | measured | al-button | ready (no real set) |
## Mismatches & design-side orphans

- **`al-text-block` → manifest says "Text Block", the live set is named "Text Passage"** — a rename on one side; the manifest (and this contract's `bindings.figma.componentSetName`) needs re-pointing, or the set renaming back. Until then the generated set and the real set carry different names (which also means nested resolution for a hypothetical al-text-block nesting would miss).
- **`al-command-palette`** — manifest maps "Command Palette" but no such set was found live on any "🛠 " page.
- **"Button (Icon)"** (🛠 Button) — design-side only; code expresses this as `al-button` with `hideText` + a `before` icon. No code component will ever pair with it by name.
- **"Button Group" and "Chip Group"** (own pages) — their code components were deliberately REMOVED (arrangement belongs to `<al-layout>`, see AGENTS.md); these sets are design-side legacy. Decision needed: retire them in Figma or keep as design conveniences, but they will never pair to code.
- **"Input" mapping carries `nodeId: null`** in the manifest while a real set exists (3442:25595) — a digest refresh (`scripts/figma-parity/refresh-figma-digests.mjs`) would repopulate ids/digests.

## Known coarseness in generated composites (v1, by design)

- Nested instances render their set's **default variant** — per-State/per-Variant switching of nested instances (the real sets do this by hand) is not yet in the ops schema.
- Anatomy carries **no text content**, so text-bearing anatomy leaves (e.g. a checkbox-group legend) render as frames, not TEXT (the real set has a legend TEXT node).
- Components that render **all conditional branches at once** in measured anatomy (al-tabs' every tab-panel, al-banner's alert+toast pair) generate overlapping/stacked content — anatomy cannot see `display:none`. These need either measured-case curation or per-component figma.gen.json refinement.
- `al-layout` inside composites falls back to a flex frame (correct — it has no set), reported as `nested-set-not-found` each run; treat that specific miss as expected noise.

## How to regenerate

```bash
node scripts/figma-atoms/mcp-shim.mjs                                  # keep running
node scripts/contracts/generate-figma.mjs --component <tag>            # one component -> scratch page
# scratch-page clearing is NAME-SCOPED per component (spec 2026-08-26): sibling generated sets survive.
```
