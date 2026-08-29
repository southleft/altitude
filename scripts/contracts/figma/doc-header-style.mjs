
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
 * `DOC_HEADER_DESCRIPTION_MAX`), with a trailing hyperlinked "View
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
export const DOC_HEADER_MIN_WIDTH_PX = 1220;

export const DOC_HEADER_MASTER_NAME = 'Documentation Header';
export const DOC_HEADER_MASTER_PAGE = 'Documentation';
export const DOC_HEADER_DESCRIPTION_MAX = 200;
export const DOC_HEADER_LINK_TEXT = 'View full documentation';

/**
 * DUMMY LINK — docs are not published per-component yet ("we need to publish
 * the docs first," the owner's own words). This is the FUTURE canonical URL
 * shape (matches the live docs site's own `/docs/components/<tag>` routing
 * convention, tag with its `al-` prefix dropped) — a placeholder to wire the
 * MECHANISM now, not a live link. Revisit once per-component doc pages
 * actually exist (see T20's own `.altitude/contracts/docs/<project>/<tag>.md`
 * generation, a candidate source for that eventual page).
 */
export const DOC_HEADER_DOCS_BASE_URL = 'https://altitude.pages.dev/docs/components/';

export function docHeaderDocsUrl(tag) {
  return `${DOC_HEADER_DOCS_BASE_URL}${String(tag).replace(/^al-/, '')}/`;
}

export function docHeaderDescription(rawDescription) {
  const s = String(rawDescription || '').trim();
  return s.length > DOC_HEADER_DESCRIPTION_MAX
    ? `${s.slice(0, DOC_HEADER_DESCRIPTION_MAX - 1).trimEnd()}…`
    : s;
}
