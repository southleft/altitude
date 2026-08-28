/**
 * component-config.mjs — PER-COMPONENT Figma-generation config (spec
 * 2026-08-26-modularize-generate-figma-mjs…, R3).
 *
 * The contract (.altitude/contracts/<project>/<tag>.contract.json) carries the
 * component's measured/derived FACTS (props, slots, states, anatomy, token
 * bindings). This module carries the component's generation JUDGMENT CALLS —
 * the values generate-figma.mjs used to hard-code at module level during the
 * al-button pilot (T12–T32) — merged over library-wide defaults, so extending
 * generation to a new component means (at most) dropping a small JSON file
 * next to that component's source, never editing shared generator code.
 *
 * LOCATION: `libs/al-web-components/components/<name>/figma.gen.json`, where
 * `<name>` is the tag with its `al-` prefix dropped (al-button -> button/).
 * The file is OPTIONAL — a component without one generates with DEFAULTS.
 * al-button ships one as the worked exemplar (its values happen to equal the
 * defaults today; the file is where they change if they ever should).
 *
 * DETERMINISM: loading is pure fs-read + merge — no timestamps, no
 * environment. buildOps()/buildSheetPlan() take the RESOLVED config as an
 * argument, so `--check-determinism`'s "same inputs -> same bytes" claim now
 * covers "same contract + same config".
 *
 * Recognized keys (everything else is ignored, so a config file can carry a
 * `$comment`):
 *   enumProp        — name of the code prop that becomes the set's enum
 *                     VARIANT axis. Default: prefer a prop literally named
 *                     "variant" with `bindings.figma.kind === "VARIANT"`,
 *                     else the SOLE VARIANT-kind prop the contract declares
 *                     (al-range's `behavior`, al-input's `label`). Set this
 *                     explicitly only when a contract declares MORE than one
 *                     VARIANT-kind prop and the default pick is wrong.
 *   fullWidthProp   — name of the boolean layout prop rendered as "natural
 *                     hug width plus fullWidthExtraPx" (default "fullWidth").
 *   fullWidthExtraPx— T23: "Is Full Width" has no measured pixel fact to
 *                     render from at all — no real Figma set exposes it as an
 *                     axis to inspect live (VERIFIED against the REAL Button
 *                     set, node 4271:9562). Rendered as "natural hug width
 *                     plus a fixed visible margin" rather than a fixed
 *                     absolute pixel target, so it is ALWAYS demonstrably
 *                     wider than its same-row False sibling regardless of
 *                     that variant's own label/icon content length — a
 *                     documented judgment call, not a contract fact.
 *   iconSizeVar     — T19: the Figma variable slot-icon instances bind
 *                     width/height to. For al-button, CONFIRMED live against
 *                     the real set (every variant's icon instance resolves
 *                     `theme/icon/md`); the contract's own
 *                     `--al-icon-height/width -> theme/icon/lg` pair was
 *                     confirmed to apply to a DIFFERENT rendering context
 *                     (icon-only buttons), not the slotted before/after icon
 *                     the real set actually shows. A fixed default, not a
 *                     per-variant lookup — documented judgment call.
 *   label           — { fontStyle, fontSize } for the generated label text
 *                     node. The al-button contract has no font-size/family
 *                     token (they are inherited, not custom-property-bound,
 *                     so anatomy never captured one); IBM Plex Sans 14
 *                     Bold-ish is the library's own base default (SKILL.md
 *                     "Known state"). Family stays library-wide in the set
 *                     builder; style/size are per-component.
 *   sheet           — { cellWidth, rowLabelWidth } pixel pitch overrides for
 *                     the `--sheet` documentation table (see sheet-style.mjs
 *                     for why these are fixed up-front, not measured).
 *   textContent     — { "<class token>": "<literal>" }: literal text the
 *                     component's own template renders inside a node with
 *                     that class (breadcrumbs' separator div renders '/').
 *                     Hand-curated but source-verifiable — quote the template
 *                     line in the file's $comment. Interim until the
 *                     measurement pass captures leaf text generically.
 *   anatomyCase     — read by emit-contracts.mjs (NOT this loader): the exact
 *                     measured case string to sample the contract's anatomy
 *                     from (e.g. al-badge's "Variant=default,Shape=label" —
 *                     alphabetical-first sampled the dot form). Takes effect
 *                     on the next contracts --refresh, not at generation time.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SHEET_CELL_WIDTH_PX, SHEET_ROW_LABEL_WIDTH_PX } from './sheet-style.mjs';

export const DEFAULT_COMPONENT_CONFIG = Object.freeze({
  enumProp: null, // null -> auto-detect (see resolveEnumProp in derive-ops.mjs)
  // caseAxes: hand-curated case-dimension -> prop pairings for dimensions the
  // auto-mapper can't pair by name (see derive-ops.mjs's case-axes block;
  // Badge: [{ dimension: "Shape", prop: "isDot", property: "Type",
  // valueMap: { label: "Default", dot: "Dot" } }]). null -> auto-map only.
  caseAxes: null,
  textContent: null, // class token -> literal text (see header comment)
  // glyphs: CSS-mask-drawn marks copied verbatim from the component's own
  // stylesheet, matched by class + case-axis values, colored by the token
  // the CSS layer binds (checkbox check/dash). [{class, when, svg, color}]
  glyphs: null,
  // nestedIconGlyphs: { "<component tag>": "<phosphor name>" } - which glyph
  // a nested al-icon instance swaps to (chip's ALIconClose import -> 'x').
  nestedIconGlyphs: null,
  // nestedProps: { "<component tag>": { "<friendly property name>": value } }
  // - which PROPERTIES a nested non-icon instance is switched to after it is
  // placed. Without this every nested instance renders its set's DEFAULT
  // variant, which is why al-banner's dismiss control (code: <al-button
  // variant="bare" hideText label="Dismiss"> wrapping an x icon) came out as a
  // labelled "Button". The measured anatomy records the nested component's own
  // BEM classes, but mapping those to another set's variant-axis spellings is
  // a judgment call per component pair, not a derivable fact - so it lives
  // here (layer 2) rather than in the generator (layer 3).
  //
  // Property names are the FRIENDLY ones ("Variant", "Text", "Slot Before");
  // the builder resolves each to the instance's real "<name>#<id>" key at
  // generation time, because those ids differ per set and per regeneration.
  //
  // Ordered array form - { "al-button": [{...}, {...}] } - applies per
  // occurrence in document order within a variant (input-stepper's [-][+]
  // pair), exactly like nestedIconGlyphs. The object form applies to every
  // occurrence.
  nestedProps: null,
  // rootWidth: a FULL-BLEED component's width, which its content does not
  // imply. true -> use the measured root box width; a number -> that width.
  // al-banner is the standing case: inline-size:100%, so hugging sized it by
  // whatever the message happened to be. Also switches on FILL-through for
  // children that measured as wide as the space they sit in. Leave null for
  // anything that genuinely hugs (cards, chips, buttons).
  rootWidth: null,
  fullWidthProp: 'fullWidth',
  fullWidthExtraPx: 160,
  iconSizeVar: 'theme/icon/md',
  label: Object.freeze({ fontStyle: 'Bold', fontSize: 14 }),
  sheet: Object.freeze({ cellWidth: SHEET_CELL_WIDTH_PX, rowLabelWidth: SHEET_ROW_LABEL_WIDTH_PX }),
});

/** al-button -> button; al-breadcrumbs-item -> breadcrumbs-item. Components
 * without their own directory (e.g. the al-icon-* contract entries, which all
 * live under components/icon/) simply resolve to no config file -> defaults. */
export function componentDirFor(tag) {
  return String(tag).replace(/^al-/, '');
}

export function componentConfigPath(repoRoot, tag) {
  return join(repoRoot, 'libs', 'al-web-components', 'components', componentDirFor(tag), 'figma.gen.json');
}

/**
 * Load `<component dir>/figma.gen.json` if present and merge it over
 * DEFAULT_COMPONENT_CONFIG (one level deep for the `label`/`sheet` objects —
 * a partial override keeps the other keys' defaults). Returns
 * { config, path, fileExists } so the CLI can report where config came from.
 */
export function loadComponentConfig(repoRoot, tag) {
  const path = componentConfigPath(repoRoot, tag);
  const fileExists = existsSync(path);
  let overrides = {};
  if (fileExists) {
    overrides = JSON.parse(readFileSync(path, 'utf8'));
  }
  const config = {
    ...DEFAULT_COMPONENT_CONFIG,
    ...pick(overrides, ['enumProp', 'fullWidthProp', 'fullWidthExtraPx', 'iconSizeVar', 'caseAxes', 'textContent', 'glyphs', 'nestedIconGlyphs', 'nestedProps', 'rootWidth']),
    label: { ...DEFAULT_COMPONENT_CONFIG.label, ...(overrides.label || {}) },
    sheet: { ...DEFAULT_COMPONENT_CONFIG.sheet, ...(overrides.sheet || {}) },
  };
  return { config, path, fileExists };
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}
