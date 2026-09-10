# Altitude audit remediation — 8 September 2026

The owner authorized repairs after the fresh audit. This work preserves the pre-existing dirty working tree. Nothing has been committed, published, or pushed. REPORT.md records the original observation; this document records subsequent repairs.

## Completed repairs

- Corrected persistent Figma boolean-state mappings, variant descriptions, and generated example markup. Explicit curation handles compound Menu Item roles and slot-backed Dialog footers. Transient visual states are described separately from persistent props.
- Fixed the nonexistent Calendar, Avatar, and Card slot contracts; documented real slots on the affected components and removed Theme Switcher's phantom default slot. The CEM/render gate now reports zero nonexistent and zero undocumented slots. Regenerated CEM, schemas, contracts, reference docs, metadata payloads, Code Connect, and machine-readable facts.
- Added literal-union alias resolution to CEM generation so Table sort direction exposes its supported values. Added regression tests for alias resolution, metadata mappings, and component measurement plans.
- Repaired Button and Input authoring controls in place. Input exposes label, helper, value, and before/after icon controls. Corrected the nested Input used by Combobox.
- Retained and clearly archived the six identified duplicate or retired surfaces. Existing nodes and instances were not deleted.
- Added Card, Dialog, Drawer, Select, Popover, and Tooltip sets. Contract Pilot was the test area. After browser/Figma visual comparison, moved each candidate's presentation frame to its component page without regenerating it. These promoted sets must now be repaired in place.
- Corrected measurement/generation defects affecting slot text, icon glyphs, mixed padding, single-edge borders, overlay roots, drawer height, and tooltip arrows. Browser measurements cover light/dark and default/hover/focus/active/disabled states. Exported references support sampled visual checks, not universal pixel parity.
- Added ten Focus variants to existing Toggle Button and Breadcrumbs Item sets without replacing their variants. Added matching source focus treatments. Toggle Button supports Space/Enter activation, exposes role and pressed state, preserves slotted-input keyboard events, and supports an accessible label for icon-only controls. Corrected icon-only story examples.
- Documented all 406 local Figma variables and all 74 local styles. Added 19 motion variables from existing code tokens, retaining supported aliases and units. Preserved and documented Figma-only variables.
- Applied descriptions and documentation links to all 40 mapped sets and 465 variants. Their presentation frames contain visible documentation links. Added metadata to the six remaining standalone library/documentation helpers, including Icon. The live identity check confirms the original canonical component and variant IDs remain present.
- Restored Southleft Header/Footer base-slot compatibility and documented or wired their override surfaces. Header supports the base elevated property. Brand conformance and a rendered compatibility check pass.
- Repaired the cross-platform gate self-test, stale context/trap/canvas evidence, and the scoped-theming test's unsupported brand API. Fixed a sync routine that rewrote the manifest after refusing all operations. Corrected the usage validator's false positive on Lit element directives while retaining checks on adjacent invalid attributes.
- Added WCAG 2.2 AA rules to automated accessibility sweeps. Raised the coverage floor from its old seed and added behavior tests for repaired component paths.

## Evidence and verification

Stopped at the owner's request to wrap up after reaching the usage limit. Final completed checks: **424 unit tests pass**, coverage **47.70% statements/lines, 82.52% branches, 74.64% functions** (above the raised floors); documentation build passes; the fresh **500-story** accessibility sweep reports **zero structural violations, zero story errors, and 16 contrast findings**. The earlier broad build-tier verification recorded **71 passes, zero failures, one brand-conformance warning, and two clean-tree skips**, with VRT explicitly excluded. The brand warning was subsequently repaired and checked separately. The complete gate suite was **not rerun after the last keyboard/accessibility/validator edits**, so that earlier result is not a final release certification.

- `figma-after.json`: canonical identity preservation, descriptions, links, parent documentation text, and variable/style counts.
- `helper-metadata.json`: six standalone helpers repaired in place.
- The candidate, reference, focus, and brand compatibility PNGs: exported/rendered visual evidence inspected during the work, including light/dark core samples and keyboard focus controls.
- `unit-final.log`, `a11y-final.log`, and the final verification log record the latest test outcomes. Skipped gates must not be counted as passes.
- `usage-toggle-final.log` and `usage-popover-final.log`: modified story usages pass the shipped validator.

## Remaining maturity work and explicit limits

This repair pass does not establish complete state-of-the-art maturity or release readiness.

1. **Figma coverage remains partial.** Forty canonical sets are mapped; code ships 67 base components. The additions close the six core omissions identified in the audit, but other visible components still need canonical coverage. Some layout/behavior/icon contracts intentionally have no set. Existing Toggle Button dimensions and Dialog close-button typography also warrant a dedicated visual parity pass; preserving identities does not certify every old variant.
2. **Code Connect is generated, not published.** Forty HTML and forty React mappings are present. The generated skipped report names four property mappings and three option mappings that cannot be derived accurately from current contracts, plus intentional omissions and consumer-supplied slots. Publishing requires the Code Connect client and credentials. Generated source does not prove live Dev Mode availability.
3. **API vocabulary debt remains at 75 accepted findings.** Removing it requires compatible migrations, not silent breaking renames during a Figma repair.
4. **Accessibility conformance needs human evidence.** Contrast findings, predominantly disabled examples, require applicability review. Browser automation is not screen-reader testing. The manual screen-reader record store remains empty; no new human assistive-technology results or all-component RTL/zoom/forced-colors certification are claimed.
5. **Linux VRT remains a release requirement.** Windows output differed from Linux baselines. Those baselines were not replaced. Clean-tree CEM checks cannot be treated as passed while the owner's extensive work remains uncommitted.
6. **`al-theme-switcher`'s design-system option is inert.** Filed 2026-09-08 after the brand-axis migration, deliberately not fixed there. `setTheme('southleft')` writes `brand="southleft"` onto the nearest `<al-theme>` and nothing resolves: measured in the story fixture, `--al-color-primary-500` is `#2e5ce6` before and after, and `--al-theme-color-background-neutral-weak` stays `#131311`. Its light/dark options do work, because `mode` is still a live axis (`#131311` -> `#f1f0ea`). The four unit tests pass because they assert the ATTRIBUTE was written, not that a token moved — the same shape of defect as the phantom slots this pass repaired, and equally invisible behind a green suite. A switcher cannot change design system by attribute any more; that means owning a document-level stylesheet swap, or narrowing the component to the mode control it can actually deliver. Both are product decisions rather than migration work. Two inert leftovers ride along: `story-fixture/src/main.ts` still passes `brand=` on its wrapper, and `styles/tokens-config.v5.mjs` lines 567 and 788 describe nested `<al-theme brand>` in comments that compile into the shipped CSS.
7. **AI-readiness outcome claims remain unproven.** Accurate metadata, generated contracts, and repair tools improve the inputs. Existing unjudged agent evaluations do not demonstrate a measured improvement in successful product-building tasks.

Altitude has advanced engineering foundations. Its remaining distance from a leading design system is primarily complete design/code coverage, consistent authoring ergonomics, trustworthy release evidence, and demonstrated accessibility and consumer outcomes.
