/**
 * sheet-style.mjs — PURE PRESENTATION constants for the `--sheet`
 * documentation artifact (T31/T32). Nothing in this module is a parity fact:
 * this is the "make it look nice" layer — table borders, cell pitch, doc
 * header wiring. Split out of generate-figma.mjs so the parity core
 * (derive-ops.mjs) and the documentation look are separate concerns (spec
 * 2026-08-26-modularize-generate-figma-mjs…).
 *
 * SHEET_ROW_LABEL_WIDTH_PX / SHEET_CELL_WIDTH_PX are the library-wide
 * DEFAULTS — a component whose natural width exceeds the default cell pitch
 * overrides them in its own figma.gen.json (component-config.mjs `sheet`
 * key) instead of anyone editing these by hand per component.
 */

/**
 * T31 (`--sheet`): fixed, generous pitch for the documentation sheet's grid
 * of INSTANCES — not a measured fact (unlike the live set's own per-variant
 * `comps.map((c) => c.width)` worst-case dance in the set builder, an
 * instance's true rendered width is not known until AFTER figma_execute
 * places it, and re-measuring 100 instances mid-build risks the ~30s
 * per-call ceiling the same way T21/T28's icon-visibility measurement dance
 * already did once for the live set). A sheet cell only ever needs to
 * comfortably fit the component's own worst case (label plus two icons) at
 * any State/Variant, so one fixed pitch reserved up front is both cheap and
 * correct; a component with a wider natural width overrides this via its own
 * figma.gen.json `sheet.cellWidth` — same class of judgment call as
 * `fullWidthExtraPx`.
 *
 * T32 (owner design direction, superseding the first `--sheet` cut's
 * positioned-vector-line approach entirely): "wrap each row/col in a frame
 * for each variation so we can make the purple lines actual borders like a
 * real table." The sheet is a genuine nested-auto-layout table — sheetGrid
 * (VERTICAL) > [header row, one group frame per enum-axis value (VERTICAL: a
 * banner row + one row-frame per boolean combo)] > row frames (HORIZONTAL) >
 * cell frames — never manually positioned x/y, never a `figma.createVector()`
 * line. Every cell is a FIXED-width frame with `itemSpacing: 0` between
 * siblings so adjacent borders touch and read as one continuous grid line,
 * per-side stroke weights drawing only the sides that would otherwise double
 * up with a neighbor's own border.
 */
export const SHEET_ROW_LABEL_WIDTH_PX = 220;
export const SHEET_CELL_WIDTH_PX = 200;

/** T32: internal cell padding — a real bindable auto-layout `padding*`
 * property now that every cell is a real frame (unlike the pre-T32 grid,
 * which had no such property to bind at all). One step down from the grid's
 * OWN padding (`theme/space/lg`, 24px, below) for a visible-but-not-
 * excessive gap between a cell's border and its own instance/label. */
export const SHEET_CELL_PADDING_FIGMA_VAR = 'theme/space/sm';

// (removed 2026-08-26, owner direction during the Badge walkthrough: "on
// sheetgrid frame (for all) remove the padding" — sheetGrid now has NO
// padding of its own; the T32-era SHEET_GRID_PADDING_FIGMA_VAR
// ('theme/space/lg') binding is gone. Breathing room around the grid comes
// from the sheet container's FRAME_PADDING_FIGMA_VAR only.)

/**
 * T32 (owner feedback): structural gridlines between State columns and
 * between enum-axis row groups, matching the Propstar reference sheet's own
 * look — as of T32, REAL frame borders (per-side stroke weights on cell
 * frames), not positioned vector lines. Color is the LITERAL hex Figma
 * itself uses for a selected component/component-set outline in its own UI
 * chrome (`#9747FF`) — DELIBERATELY a Figma-UI-convention literal, not a
 * `theme/*` design token: there is no "component outline purple" DS token to
 * bind (it names Figma's own canvas chrome color, not anything the library
 * ships to a browser), and these strokes live ONLY on frames inside the
 * generated documentation sheet in Figma — no CSS surface, no component
 * render, nothing this repo's no-literal-color lint/token conventions were
 * ever meant to police. Computed once here so every cell border in every
 * figma_execute call sheet mode issues uses the identical RGB triple.
 */
export const SHEET_SEPARATOR_COLOR_HEX = '#9747FF';
export const SHEET_SEPARATOR_COLOR_RGB = {
  r: parseInt(SHEET_SEPARATOR_COLOR_HEX.slice(1, 3), 16) / 255,
  g: parseInt(SHEET_SEPARATOR_COLOR_HEX.slice(3, 5), 16) / 255,
  b: parseInt(SHEET_SEPARATOR_COLOR_HEX.slice(5, 7), 16) / 255,
};

/** Figma's own component-outline stroke: 1px, dashed. `[4, 4]` approximates
 * that dash rhythm at documentation-sheet scale — judged on the live canvas,
 * not a value read off any API. */
export const SHEET_SEPARATOR_DASH_PATTERN = [4, 4];
export const SHEET_SEPARATOR_WEIGHT = 1;

/** T32: the border between two enum-axis groups draws at DOUBLE weight —
 * "can carry a heavier... border" per the owner's own design direction, so a
 * group boundary reads distinctly from an ordinary row-to-row boundary
 * within the same group. Judged on the live canvas, not a measured fact. */
export const SHEET_SEPARATOR_GROUP_WEIGHT = 2;

/**
 * T32 (owner feedback, live discovery): the sheet's container frame gets an
 * INSTANCE of the file's existing "Documentation Header" component
 * (`101:29248`, CONFIRMED live — never stored by id, only by name, resolved
 * live the same way findIconWrapperComponent/findPhosphorComponentByName
 * already resolve OTHER file-local masters).
 *
 * WHAT IT IS, confirmed live: a single COMPONENT (not a set — no
 * `componentPropertyDefinitions` at all, so its text can only be overridden
 * by editing child TEXT nodes directly, never `setProperties`), living on the
 * file's own `"Documentation"` page as the literal top child of that page's
 * one top-level `"Documentation"` frame (VERTICAL auto-layout: this header,
 * fixed 1440x336, THEN a `"Content"` frame below it). Its own children:
 * `Branding` (a large decorative logo Vector), `Header` > `Header` containing
 * `Heading` (IBM Plex Sans Bold 48, "Documentation") and `Sub Heading` (IBM
 * Plex Sans Bold 28, "Altitude Design System"), and `Description` > `Text`
 * (IBM Plex Sans Regular 18, a longer paragraph). No existing hyperlink on
 * any text run — the master has never carried a link before.
 *
 * NO ESTABLISHED REUSE CONVENTION EXISTS: this component has exactly ONE
 * placement in the whole file — the master itself, used directly (not as an
 * instance) as the file's own one-off "Documentation" page banner. Applying
 * it here is new territory, not a mirrored convention — the owner's own
 * framing ("it would like to it's own doc page ultimately") reads as a
 * documentation-artifact concern specifically, which is why it is wired to
 * the SHEET's container only, not the live/lean set's own "<name> —
 * Generated" frame (a working component-set frame, not a documentation
 * artifact).
 *
 * FIELD MAPPING (a judgment call — the master exposes three text layers, the
 * task named exactly two): `Heading` <- the component's own display NAME
 * (`contract.name`, e.g. "Button") as the per-component TITLE. `Description`
 * <- the contract's own `description` field, trimmed and capped (see
 * `SHEET_DOC_HEADER_DESCRIPTION_MAX`), with a trailing hyperlinked "View
 * full documentation" run appended (the master has no separate link element
 * to reuse — `setRangeHyperlink` on just that trailing text range is the
 * mechanism). `Sub Heading` is left UNCHANGED ("Altitude Design System") —
 * brand-level context stays true for every component page.
 */
/** The doc-header master is a FIXED 1440-wide component whose internal
 * layout collapses when squeezed far below that (Breadcrumbs Item's 620px
 * table rendered the Heading one character per line). The header instance is
 * never resized below this; a narrow table simply gets a header wider than
 * its grid (the sheet container hugs the wider child — left-aligned, clean). */
export const SHEET_DOC_HEADER_MIN_WIDTH_PX = 1220;

export const SHEET_DOC_HEADER_MASTER_NAME = 'Documentation Header';
export const SHEET_DOC_HEADER_MASTER_PAGE = 'Documentation';
export const SHEET_DOC_HEADER_DESCRIPTION_MAX = 200;
export const SHEET_DOC_HEADER_LINK_TEXT = 'View full documentation';

/**
 * DUMMY LINK — docs are not published per-component yet ("we need to publish
 * the docs first," the owner's own words). This is the FUTURE canonical URL
 * shape (matches the live docs site's own `/docs/components/<tag>` routing
 * convention, tag with its `al-` prefix dropped) — a placeholder to wire the
 * MECHANISM now, not a live link. Revisit once per-component doc pages
 * actually exist (see T20's own `.altitude/contracts/docs/<project>/<tag>.md`
 * generation, a candidate source for that eventual page).
 */
export const SHEET_DOC_HEADER_DOCS_BASE_URL = 'https://altitude.pages.dev/docs/components/';

export function docHeaderDocsUrl(tag) {
  return `${SHEET_DOC_HEADER_DOCS_BASE_URL}${String(tag).replace(/^al-/, '')}/`;
}

export function docHeaderDescription(rawDescription) {
  const s = String(rawDescription || '').trim();
  return s.length > SHEET_DOC_HEADER_DESCRIPTION_MAX
    ? `${s.slice(0, SHEET_DOC_HEADER_DESCRIPTION_MAX - 1).trimEnd()}…`
    : s;
}
