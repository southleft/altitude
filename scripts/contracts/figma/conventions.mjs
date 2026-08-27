/**
 * conventions.mjs — LIBRARY-WIDE Figma-generation conventions (spec
 * 2026-08-26-modularize-generate-figma-mjs-into-per-component-contract-driven-generator).
 *
 * Everything here is a convention of the Altitude Figma library / this repo's
 * generation pipeline as a whole — the same for EVERY component. Anything a
 * single component might legitimately vary (icon size token, full-width
 * margin, label typography, sheet cell widths) does NOT belong here: it lives
 * in the per-component config (see component-config.mjs, loaded from
 * libs/al-web-components/components/<name>/figma.gen.json).
 *
 * Split out of scripts/contracts/generate-figma.mjs (T12–T32, spec
 * 2026-08-25-contract-backed-figma-parity-and-generation) — the institutional
 * comments moved here with their constants; do not strip them.
 */

/** Case/dash-insensitive key, mirrors emit-contracts.mjs's normKey — used to pair a Figma
 * variant option ("Secondary") or Title Case state ("Hover") with a conditionalBindings
 * key ("secondary" / "hover"); not exported from there, so re-derived here (same
 * dependency-free-helper convention emit-contracts documents for parity.mjs's privates). */
export const normKey = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Interaction-state axis order, the library's own convention (SKILL.md §3,
 * confirmed against the REAL al-button set's "State" VARIANT options). */
export const STATE_ORDER = ['Default', 'Hover', 'Active', 'Focus', 'Disabled'];

/**
 * T23: canonical order for boolean-turned-axis component properties, matching
 * the naming convention the task spelled out live ("State=Default,
 * Variant=Primary, Slot Before=False, Slot After=False, Is Full Width=True")
 * — State and the enum axis always come first (see buildOps), then these in
 * this fixed order when present. A future curated axis this repo doesn't know
 * about yet (generalized default) is appended after, sorted alphabetically,
 * so ordering stays deterministic without a hard-coded exhaustive list.
 */
export const BOOLEAN_AXIS_CANONICAL_ORDER = ['Slot Before', 'Slot After', 'Is Full Width'];

/**
 * T21: the "site" background token — CONFIRMED via token-map.mjs
 * (`--al-theme-color-body-background` -> `theme/color/body/background`) and
 * `libs/al-web-components/styles/core/base.scss:29` (`body { background: var(
 * --al-theme-color-body-background); }`), i.e. the literal CSS `<body>`
 * background, not a guess and not the same token T18's page-background
 * workaround used (`theme/color/background/default` — a general-purpose
 * surface token, plausible but not the one the app's own body rule reads).
 * Used for BOTH the presentation frame's fill (a real bound variable — unlike
 * PageNode, FrameNode.fills CAN bind variables) and the page-background
 * literal (kept from T18 as a belt-and-braces fallback for anyone viewing the
 * page without the frame in view; PageNode.backgrounds still cannot bind a
 * variable, so that one stays a resolved literal by API limitation).
 */
export const SITE_BG_FIGMA_VAR = 'theme/color/body/background';

/** T21: padding around the presentation frame — a real spacing token (not a
 * literal pixel guess), same "bind everything to a token" convention as the
 * rest of this generator. */
export const FRAME_PADDING_FIGMA_VAR = 'theme/space/xl';

/** T21: the variable COLLECTION whose mode drives whether bound `theme/*`
 * variables resolve Light or Dark — CONFIRMED live via
 * `figma.variables.getLocalVariableCollectionsAsync()` (exact name "Tier 2 |
 * Theme", modes Light/Dark, `defaultModeId` currently resolving to "Dark" —
 * matches SKILL.md's "library's default theme mode is DARK"). The
 * presentation frame gets this collection's OWN default mode explicitly set
 * via `setExplicitVariableModeForCollection` — "dep on defaults" per the
 * task: never hardcode Light or Dark, always follow whatever the collection's
 * `defaultModeId` currently says. */
export const THEME_MODE_COLLECTION_NAME = 'Tier 2 | Theme';

/** Library convention (SKILL.md §3): a 2px stroke focus ring. The Focus
 * state's frame stroke weight when the contract carries no outline-width
 * fact of its own (see build-set-code.mjs's Focus block, T30). */
export const FOCUS_RING_WEIGHT = 2;

// ── Phosphor icon resolution (library-wide — the icon SOURCE is a property
//    of the Figma file/library, not of any one component) ──────────────────

/**
 * T29 (WRONG-LIBRARY INCIDENT — read before touching this again): an earlier
 * version of the plugin-side resolver ALSO accepted a remote instance with NO
 * parent COMPONENT_SET at all ("a single FLAT component with no variant
 * grouping") on name-match alone. The ONE flat remote match the file actually
 * has for "CheckCircle" — an al-alert Playground prototype's icon override,
 * key 8362189ea7dca44f1ef7aa55495ec46f1f0f91f6 — is NOT Phosphor. The owner
 * identified it as belonging to a different, unrelated library ("CBDS UI kit
 * demo") that happens to also ship a component literally named "CheckCircle".
 * Name-matching a remote component is NOT sufficient to prove library
 * membership — the file has at least two different libraries with overlapping
 * icon names. The one PROVABLE, structural signal found that session: a
 * genuinely Phosphor-cached icon is ALWAYS the full Format x Weight
 * COMPONENT_SET shape; the CBDS collision has NO parent set at all. The
 * plugin code's isVerifiedPhosphorIconSet() enforces exactly this.
 *
 * PHOSPHOR_KEY_BY_NAME is deliberately empty. A name-keyed backup entry here
 * is exactly how the CBDS "CheckCircle" key got treated as trustworthy in the
 * first place (T28 bootstrap session read it straight off an already-resolved
 * .mainComponent with no library-membership check at all). Any future entry
 * MUST be a key for a component whose OWN parent is a COMPONENT_SET passing
 * isVerifiedPhosphorIconSet() — verified the same way a scan hit is, not
 * exempted from it for being hand-typed.
 */
export const PHOSPHOR_KEY_BY_NAME = {};
export const PHOSPHOR_FORMAT_OPTIONS = ['Outline', 'Stroke'];
export const PHOSPHOR_WEIGHT_OPTIONS = ['Thin', 'Light', 'Regular', 'Bold', 'Fill', 'Duotone'];

/**
 * T28: the Desktop Bridge enforces a hard execution-time ceiling per
 * figma_execute call (CONFIRMED LIVE: an unbounded scan across all ~58 pages
 * timed out at exactly 30000ms regardless of the timeout argument — that
 * ceiling is the plugin runtime's own, not ours to raise). A name with
 * genuinely no match anywhere would otherwise walk the ENTIRE document every
 * single generation run for nothing. Two mitigations, both honest (never
 * fabricate a match, never silently truncate without saying so):
 *   - scan the two pages EVERY Phosphor instance has ever actually been found
 *     on first (🛠 Icons: the owner's own bootstrap; 🛝 Playground: an
 *     existing al-alert prototype's icon override) — a scope decision
 *     grounded in live discovery, not a guess;
 *   - a hard node-visit BUDGET across the whole call (all pages combined), so
 *     an unresolved name degrades to a reported miss instead of a timeout.
 * Add a page name here if a future bootstrap lands somewhere else.
 */
export const PHOSPHOR_PRIORITY_PAGE_NAMES = ['🛠 Icons', '🛝 Playground'];
export const PHOSPHOR_SCAN_NODE_BUDGET = 2000;

/**
 * T29: some catalog placeholder names are fulfilled by a MORE SPECIFIC
 * Phosphor icon than the bare normalized name would match — the owner's own
 * bootstrap for "paper-plane" placed Phosphor's "PaperPlaneTilt" glyph (a
 * distinct, real Phosphor icon name — confirmed live, her own demo instance
 * on the "🛠 Icons" page), not a bare "PaperPlane". This is a hand-curated
 * EXACT alias, never a substring/fuzzy match — a looser match is exactly the
 * shape of rule that let the wrong-library CBDS "CheckCircle" collision
 * through in the first place (see PHOSPHOR_KEY_BY_NAME above). Extend this
 * map by hand only, per a confirmed live placement. Library-wide (a property
 * of the icon-catalog↔Phosphor naming relationship), NOT per-component —
 * every component whose contract names "paper-plane" benefits.
 */
export const PHOSPHOR_NAME_ALIASES = {
  paperplane: ['paperplane', 'paperplanetilt'],
};

/**
 * T29: the owner's DS "Icon" wrapper component — the thing every slot icon
 * must actually be an INSTANCE OF, never the raw Phosphor library component.
 * CONFIRMED LIVE: a single, plain COMPONENT (not a COMPONENT_SET) named
 * exactly "Icon", sitting directly on the "🛠 Icons" page, with ONE child: an
 * INSTANCE of a Phosphor glyph. Resolved BY NAME (see build-set-code.mjs's
 * findIconWrapperComponent), never a hard-coded node id — a node id is not
 * stable across the owner's own edits to her file.
 */
export const ICON_WRAPPER_COMPONENT_NAME = 'Icon';

/** The label/heading text color token for generated documentation surfaces —
 * a real content token (the same one al-button's own anatomy root binds for
 * its Default-state label), not a resolved literal, so labels actually read
 * on the frame's own explicit-mode fill instead of defaulting to Figma's
 * built-in black-text default (invisible against a dark surface — the bug
 * T18/T21 already fixed once for the live set's own label/icon paint). */
export const SHEET_LABEL_COLOR_FIGMA_VAR = 'theme/color/content/default';
