/**
 * build-set-code.mjs — build the code string figma_execute runs to generate
 * the LIVE, lean component set from an ops artifact (split out of
 * generate-figma.mjs; T12–T30 institutional comments preserved in place).
 *
 * Mirrors scripts/figma-atoms/build-page.mjs's guard/variable/font
 * conventions, but builds from OPS (coarse layout + resolved variable names)
 * instead of a measured pixel tree, and is HUG-only throughout — never calls
 * resize() on the components themselves, so the "resize() undoes sizing
 * modes" ordering trap (Sizing Modes ref) cannot fire.
 *
 * SAFETY (hard constraint, not a default): every mutating operation targets
 * ONLY the scratch page named by the ops artifact's `page`. The page is
 * created if absent, or REUSED with only its own children cleared if it
 * already exists from a prior run — never deleted, never rebuilt from
 * scratch as a new page object, and no other page is ever read-write
 * touched. The Node-side decoy-file guard (CLI) runs before anything else.
 *
 * COMPOSITION NOTE (the al-button pilot's known limit, unchanged by the
 * modularization): buildVariant renders `[Icon Before?, label, Icon After?]`
 * in a single auto-layout row from the anatomy ROOT's layout/tokens — the
 * anatomy tree's CHILDREN are not walked (al-button's nested text-only
 * wrapper spans carry no facts beyond the leaf's own, so they collapse into
 * one text node). A component whose anatomy is structurally richer than
 * icon–label–icon renders coarsely until a recipe/anatomy-walking layer is
 * added — that seam now lives HERE, in one module, instead of inside a
 * 2,800-line monolith.
 */
import {
  FOCUS_RING_WEIGHT,
  ICON_WRAPPER_COMPONENT_NAME,
  PHOSPHOR_FORMAT_OPTIONS,
  PHOSPHOR_KEY_BY_NAME,
  PHOSPHOR_NAME_ALIASES,
  PHOSPHOR_LOCAL_GROUP_NAME,
  PHOSPHOR_PRIORITY_PAGE_NAMES,
  PHOSPHOR_SCAN_NODE_BUDGET,
  PHOSPHOR_WEIGHT_OPTIONS,
  SITE_BG_FIGMA_VAR,
  FRAME_PADDING_FIGMA_VAR,
  THEME_MODE_COLLECTION_NAME,
} from './conventions.mjs';
import { DEFAULT_COMPONENT_CONFIG } from './component-config.mjs';
import { docHeaderSnippet, fileGuardSnippet, textStyleLinkSnippet, variableHelpersSnippet } from './plugin-snippets.mjs';

export function buildPluginCode(ops, SC, config = DEFAULT_COMPONENT_CONFIG) {
  return String.raw`
    // GUARD — refuse to write into any file but the one this project names.
    ${fileGuardSnippet(SC)}
    ${docHeaderSnippet()}
    const OPS = ${JSON.stringify(ops)};
    const PAGE_NAME = ${JSON.stringify(ops.page)};
    // Spec 2026-08-26-contract-coverage…: nested-component resolution facts.
    // NESTED_SETS lists {tag, setName} for every component annotated in this
    // anatomy; COMPONENT_PAGE_PREFIX is the project's per-component page
    // convention ("🛠 " + set name), where the REAL hand-built sets live.
    const NESTED_SETS = ${JSON.stringify(ops.nestedSets || [])};
    const COMPONENT_PAGE_PREFIX = ${JSON.stringify(SC.project.figma.componentPagePrefix ?? '')};
    // T19: the Figma variable slot icon instances bind width/height to — a
    // per-component judgment call (figma.gen.json iconSizeVar; see
    // component-config.mjs for al-button's live-confirmed reasoning).
    const ICON_SIZE_FIGMA_VAR = ${JSON.stringify(config.iconSizeVar)};
    const FULL_WIDTH_EXTRA_PX = ${JSON.stringify(config.fullWidthExtraPx)};
    const SITE_BG_FIGMA_VAR = ${JSON.stringify(SITE_BG_FIGMA_VAR)};
    const FRAME_PADDING_FIGMA_VAR = ${JSON.stringify(FRAME_PADDING_FIGMA_VAR)};
    const THEME_MODE_COLLECTION_NAME = ${JSON.stringify(THEME_MODE_COLLECTION_NAME)};
    ${variableHelpersSnippet()}
    ${textStyleLinkSnippet()}

    // T28: resolve an Icon Before/After INSTANCE_SWAP default BY NAME from
    // the PHOSPHOR Figma library — NEVER the old "🛠 Icons" flat-component
    // page (owner: "let's not use the icon component that was in the
    // figma... let's use the Phosphor library"). This function is
    // deliberately NOT a lookup against that page at all; there is no
    // fallback to it, silent or otherwise.
    //
    // CONFIRMED LIVE: the Figma plugin API has NO team-library component
    // enumeration — exhaustive introspection of figma.teamLibrary found
    // exactly two methods, getAvailableLibraryVariableCollectionsAsync and
    // getVariablesInLibraryCollectionAsync — both VARIABLES-only, nothing
    // for components. The bridge's REST-backed tools are unusable without a
    // FIGMA_ACCESS_TOKEN; without one they time out rather than resolving.
    // That leaves exactly two BY-NAME resolution paths a plugin can use:
    //   1. PHOSPHOR_KEY_BY_NAME - a hand-maintained name -> published
    //      component KEY registry (conventions.mjs — deliberately EMPTY; see
    //      the WRONG-LIBRARY INCIDENT comment there for why a hand-typed key
    //      gets no verification exemption).
    //   2. A bounded-depth scan across the priority pages for an EXISTING
    //      instance whose main component is REMOTE (from a library) and
    //      name-matches — the mainComponent reference resolves the real
    //      component with NO REST call, so this works the moment a human
    //      bootstraps one instance anywhere in the file.
    //
    // NAMING, CONFIRMED LIVE (bootstrap discovery): Phosphor components are
    // named in PascalCase with NO separators ("ApproximateEquals",
    // "CheckCircle") — NOT the kebab-case catalog names a contract's
    // figmaPlaceholder stores (T25 decision: the contract always speaks the
    // CODE-side/catalog name). A name match must therefore be NORMALIZED
    // (lowercase, non-alphanumeric stripped) on both sides, never an exact
    // string compare.
    //
    // SET STRUCTURE, CONFIRMED LIVE, REVISED (T29 mid-run correction): a
    // genuine Phosphor icon in THIS file is cached locally as a full
    // COMPONENT_SET with "Format" (exactly Outline/Stroke) x "Weight" (a
    // subset of Thin/Light/Regular/Bold/Fill/Duotone) variants. When the
    // matched node's real "icon identity" lives on that COMPONENT_SET parent
    // (main.parent.type === 'COMPONENT_SET'), the actual per-variant
    // component name is just "Format=X, Weight=Y" — useless for matching —
    // so the SET's own name is what a target compares against, and
    // (task: "prefer the regular weight") a Weight=Regular variant is
    // selected from that set (tie-broken toward Format=Stroke).
    //
    // WRONG-LIBRARY INCIDENT (T29): see conventions.mjs's
    // PHOSPHOR_KEY_BY_NAME comment — name-matching a remote component is NOT
    // sufficient to prove library membership (the file has at least two
    // libraries with overlapping icon names, e.g. a CBDS "CheckCircle").
    // isVerifiedPhosphorIconSet() below enforces the one provable structural
    // signal: COMPONENT_SET parent + the specific Format/Weight property
    // shape, or REFUSE the match, no exceptions, even on a perfect name.
    const PHOSPHOR_KEY_BY_NAME = ${JSON.stringify(PHOSPHOR_KEY_BY_NAME)};
    const PHOSPHOR_FORMAT_OPTIONS = ${JSON.stringify(PHOSPHOR_FORMAT_OPTIONS)};
    const PHOSPHOR_WEIGHT_OPTIONS = ${JSON.stringify(PHOSPHOR_WEIGHT_OPTIONS)};
    const normalizeIconName = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    /** T29: the ONLY provable-in-this-environment library-membership check —
     * see the WRONG-LIBRARY INCIDENT notes above for why name-matching
     * alone (the pre-T29 behavior) is not trustworthy. A candidate is
     * "verified Phosphor" only if its owning node is a COMPONENT_SET whose
     * OWN Format/Weight variant-property shape matches the one confirmed
     * Phosphor icon in this file (ApproximateEquals) — exact Format options,
     * Weight options a non-empty subset of the six known weights. Anything
     * else (no parent set, a parent set with a different property shape) is
     * UNVERIFIED and must be refused, never used on name-match alone. */
    function isVerifiedPhosphorIconSet(node) {
      if (!node || node.type !== 'COMPONENT_SET') return false;
      const defs = node.componentPropertyDefinitions || {};
      const format = defs.Format;
      const weight = defs.Weight;
      if (!format || format.type !== 'VARIANT' || !Array.isArray(format.variantOptions)) return false;
      if (!weight || weight.type !== 'VARIANT' || !Array.isArray(weight.variantOptions)) return false;
      const formatSet = new Set(format.variantOptions);
      if (formatSet.size !== PHOSPHOR_FORMAT_OPTIONS.length || !PHOSPHOR_FORMAT_OPTIONS.every((o) => formatSet.has(o))) return false;
      if (!weight.variantOptions.length || !weight.variantOptions.every((o) => PHOSPHOR_WEIGHT_OPTIONS.includes(o))) return false;
      return true;
    }
    function pickPreferredPhosphorVariant(iconOwner) {
      const regular = iconOwner.children.filter((c) => /weight\s*=\s*regular/i.test(c.name));
      if (!regular.length) return iconOwner.children[0] || iconOwner;
      return regular.find((c) => /format\s*=\s*stroke/i.test(c.name)) || regular[0];
    }
    // T28: the Desktop Bridge enforces a hard execution-time ceiling per
    // figma_execute call (CONFIRMED LIVE: an unbounded scan across all ~58
    // pages timed out at exactly 30000ms regardless of the timeout argument
    // this script requests — that ceiling is the plugin runtime's own, not
    // ours to raise). Priority pages + a hard node-visit BUDGET keep an
    // unresolved name degrading to a reported miss instead of a timeout —
    // see conventions.mjs's PHOSPHOR_PRIORITY_PAGE_NAMES comment.
    const PHOSPHOR_PRIORITY_PAGE_NAMES = ${JSON.stringify(PHOSPHOR_PRIORITY_PAGE_NAMES)};
    const PHOSPHOR_LOCAL_GROUP_NAME = ${JSON.stringify(PHOSPHOR_LOCAL_GROUP_NAME)};
    const PHOSPHOR_SCAN_NODE_BUDGET = ${JSON.stringify(PHOSPHOR_SCAN_NODE_BUDGET)};
    // T29: hand-curated EXACT aliases (never substring/fuzzy — a looser match
    // is exactly the shape of rule that let the wrong-library CBDS
    // "CheckCircle" collision through) — see conventions.mjs.
    const PHOSPHOR_NAME_ALIASES = ${JSON.stringify(PHOSPHOR_NAME_ALIASES)};
    function candidateNormalizedNames(name) {
      const norm = normalizeIconName(name);
      return PHOSPHOR_NAME_ALIASES[norm] || [norm];
    }
    async function findInstanceByRemoteMainName(node, targetNorms, depth, budget) {
      if (depth > 8 || budget.visited > PHOSPHOR_SCAN_NODE_BUDGET) return null;
      budget.visited++;
      if (node.type === 'INSTANCE') {
        try {
          const main = await node.getMainComponentAsync(); // sync .mainComponent THROWS under dynamic-page access (SKILL.md trap 27)
          // T29: a name match with NO parent COMPONENT_SET (main.parent ===
          // null, or a parent that isn't a COMPONENT_SET at all) is NEVER
          // accepted, full stop — see the WRONG-LIBRARY INCIDENT notes.
          // Only a parent SET whose OWN Format/Weight shape verifies as
          // Phosphor (isVerifiedPhosphorIconSet) is eligible; a same-named
          // component belonging to a different library is reported as a
          // rejected match, not silently used.
          if (main && main.remote && main.parent && main.parent.type === 'COMPONENT_SET') {
            const iconOwner = main.parent;
            if (targetNorms.includes(normalizeIconName(iconOwner.name))) {
              if (isVerifiedPhosphorIconSet(iconOwner)) return pickPreferredPhosphorVariant(iconOwner);
              misses.add('phosphor-name-match-unverified-library:' + targetNorms.join('|') + ':' + (iconOwner.key || iconOwner.id));
            }
          }
        } catch (e) { /* keep walking — one bad instance must not abort the whole scan */ }
      }
      if ('children' in node) {
        for (const child of node.children) {
          const hit = await findInstanceByRemoteMainName(child, targetNorms, depth + 1, budget);
          if (hit) return hit;
          if (budget.visited > PHOSPHOR_SCAN_NODE_BUDGET) return null;
        }
      }
      return null;
    }
    async function findPhosphorComponentByName(name) {
      // T28, CONFIRMED LIVE, in this exact order for a reason: the live
      // remote-instance SCAN below resolved "CheckCircle" in 5ms (18 nodes
      // visited) — but figma.importComponentByKeyAsync(key), tried FIRST in
      // an earlier version of this function, hung for the full ~30s
      // execution ceiling on its own, every time, even for that SAME
      // already-known-good key. It is presumably a network-backed call
      // (an actual "import," not a read of an already-materialized local
      // reference) and is not reliable in this environment. The scan is
      // now the PRIMARY path; PHOSPHOR_KEY_BY_NAME + importComponentByKeyAsync
      // is a documented last resort ONLY, for a name the scan cannot reach
      // at all (not on either priority page) — expect it to be slow or to
      // hang, and budget accordingly if it's ever actually needed.
      const targetNorms = candidateNormalizedNames(name);
      // Scanning beyond the two known-relevant pages is NOT viable within
      // the Desktop Bridge's hard ~30s execution ceiling — page.loadAsync()
      // on each of the remaining ~56 pages (unconditional, BEFORE the
      // per-node budget below ever gets a chance to matter) was by itself
      // enough to blow the whole call even though the per-node walk never
      // got close to its budget. Scoped to ONLY the pages a Phosphor
      // instance has ever actually been found on; a name not found there is
      // reported as a genuine miss, not a wider (unaffordable) search.
      // Widen PHOSPHOR_PRIORITY_PAGE_NAMES (conventions.mjs) once a future
      // bootstrap lands elsewhere.
      const priorityPages = figma.root.children.filter((p) => PHOSPHOR_PRIORITY_PAGE_NAMES.includes(p.name));
      const budget = { visited: 0 };
      for (const page of priorityPages) {
        await page.loadAsync();
        const hit = await findInstanceByRemoteMainName(page, targetNorms, 0, budget);
        if (hit) return hit;
        if (budget.visited > PHOSPHOR_SCAN_NODE_BUDGET) {
          misses.add('phosphor-scan-budget-exhausted:' + name);
          return null;
        }
      }
      // LOCALIZED PHOSPHOR (2026-08-31). The owner localized the Phosphor set
      // into this file, so the glyphs are no longer REMOTE INSTANCES for the
      // scan above to find - they are ~1500 plain local COMPONENTs sitting as
      // direct children of one named GROUP. Those carry no Format x Weight
      // axes, so isVerifiedPhosphorIconSet cannot vouch for them; the GROUP
      // NAME is the positive, allowlist-shaped guard instead (see
      // conventions.mjs PHOSPHOR_LOCAL_GROUP_NAME for why that is narrower
      // than matching any same-named local component).
      //
      // Direct children only - a flat pass over one group, no recursion, which
      // is what keeps this affordable against the Desktop Bridge execution
      // ceiling even at ~1500 children.
      for (const page of priorityPages) {
        const group = page.findChild((n) => n.type === 'GROUP' && n.name === PHOSPHOR_LOCAL_GROUP_NAME);
        if (!group) continue;
        for (const child of group.children) {
          if (child.type !== 'COMPONENT') continue;
          if (targetNorms.indexOf(normalizeIconName(child.name)) === -1) continue;
          return child;
        }
      }

      const key = PHOSPHOR_KEY_BY_NAME[name];
      if (key) {
        // T29: a hand-typed key gets NO exemption from library verification
        // — this exact path (an unverified key trusted because it was
        // "already known-good") is how the CBDS CheckCircle key was treated
        // as Phosphor in the first place. Verify the imported component's
        // OWN parent set the same way a scan hit is checked.
        try {
          const imported = await figma.importComponentByKeyAsync(key);
          const iconOwner = imported && imported.parent && imported.parent.type === 'COMPONENT_SET' ? imported.parent : null;
          if (iconOwner && isVerifiedPhosphorIconSet(iconOwner)) return pickPreferredPhosphorVariant(iconOwner);
          misses.add('phosphor-key-unverified-library:' + name + ':' + key);
        } catch (e) { misses.add('phosphor-key-import-failed:' + name); }
      }
      return null;
    }

    // T29: the owner's DS "Icon" wrapper component — the thing every slot
    // icon must actually be an INSTANCE OF, never the raw Phosphor library
    // component found above. CONFIRMED LIVE (T29 generation session): it is
    // a single, plain COMPONENT (not a COMPONENT_SET — no variants, no
    // componentPropertyDefinitions of its own) named exactly "Icon", sitting
    // directly on the "🛠 Icons" page, with ONE child: an INSTANCE of a
    // Phosphor glyph (whatever the owner's bootstrap last placed — scratch/
    // bootstrap content, not meaningful, since every generated instance
    // immediately swaps it). The component the owner described as "the set,
    // 3504:396" is actually that NESTED Phosphor glyph's own cached
    // Format×Weight variant set — a different node one level deeper, not a
    // set the wrapper itself belongs to; the wrapper (3509:4324) sits alone
    // at PAGE level with variantProperties: null. Handled generically below
    // in case the wrapper ever DOES become a proper variant set later (an
    // owner edit outside this script's control): a COMPONENT_SET hit
    // resolves to its own defaultVariant.
    //
    // Resolved BY NAME, same scan scope as the Phosphor glyph lookup
    // (PHOSPHOR_PRIORITY_PAGE_NAMES) — never a hard-coded node id, since a
    // node id is not stable across the owner's own edits to her file. Uses
    // Figma's native (synchronous-predicate) findOne rather than the
    // manual budgeted walk findPhosphorComponentByName needs — no async
    // per-node check is required here (no "is this instance's main REMOTE"
    // test), so the plugin API's own recursive search is cheaper and
    // sufficient.
    const ICON_WRAPPER_COMPONENT_NAME = ${JSON.stringify(ICON_WRAPPER_COMPONENT_NAME)};
    async function findIconWrapperComponent() {
      for (const page of figma.root.children) {
        if (!PHOSPHOR_PRIORITY_PAGE_NAMES.includes(page.name)) continue;
        await page.loadAsync();
        const hit = page.findOne((n) => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && n.name === ICON_WRAPPER_COMPONENT_NAME);
        if (!hit) continue;
        if (hit.type === 'COMPONENT_SET') return hit.defaultVariant || hit.children[0] || null;
        return hit;
      }
      return null;
    }

    // T19: recursively rebind every fill/stroke under an icon instance to the
    // SAME resolved paint used for this row's label text — confirmed against
    // the real set live (the icon's inner vector fill and the label's text
    // fill are always the identical bound variable, every Variant/State row)
    // and matches the Icon Recoloring reference's "extract the color from a
    // sibling text node" convention. Recurses into children so a
    // multi-path/grouped icon is never left partially recolored.
    //
    // T28, CONFIRMED LIVE: recoloring the TOP-LEVEL instance's OWN fill (not
    // just its descendants) was harmless for the old local icon components
    // (their instance root's own fills was already empty) but actively
    // WRONG for a Phosphor "CheckCircle"-style icon, whose instance root
    // carries a real, non-empty fill of its own alongside the inner
    // Vector's — overwriting BOTH to the identical paint destroys the
    // negative-space contrast a checkmark-in-circle glyph depends on (the
    // checkmark "hole" becomes indistinguishable from its own backing),
    // rendering as one uniform-colored block. recolorIconChildren below
    // recolors every DESCENDANT but leaves the instance's own top-level
    // fill/stroke untouched — verified live against an isolated,
    // successfully-rendering checkmark-in-circle export.
    //
    // T29: pitfall 4 above is true at EVERY instance boundary, not just the
    // outermost one — the DS "Icon" wrapper instance's own root fill is
    // skipped (unchanged, this loop never touches root itself), but its
    // nested Phosphor glyph instance is now ONE level further down the tree,
    // and that instance's OWN top-level fill must be skipped too for exactly
    // the same negative-space reason. A child that is itself an INSTANCE is
    // therefore recursed into via recolorIconChildren again (skip-this-root,
    // recolor-below), never recolorIconTree (recolor-everything-including-
    // this-root) — CONFIRMED against the wrapper's own structure: wrapper
    // root fills is [] (empty, harmless either way today), but the nested
    // glyph instance is exactly the boundary pitfall 4 was written about,
    // and a future glyph swapped in (e.g. a filled checkmark-in-circle)
    // would corrupt at THIS boundary if it were recolored like an ordinary
    // descendant.
    function recolorIconChildren(root, paint) {
      if (!paint || !('children' in root)) return;
      for (const child of root.children) {
        if (child.type === 'INSTANCE') recolorIconChildren(child, paint);
        else recolorIconTree(child, paint);
      }
    }
    function recolorIconTree(node, paint) {
      if (!paint) return;
      if (Array.isArray(node.fills) && node.fills.length) { try { node.fills = [paint]; } catch (e) { /* mixed/locked node */ } }
      if (Array.isArray(node.strokes) && node.strokes.length) { try { node.strokes = [paint]; } catch (e) { /* mixed/locked node */ } }
      if ('children' in node) for (const child of node.children) recolorIconTree(child, paint);
    }

    /**
     * CSS 'display' -> the axis this node's children ACTUALLY stack on.
     *
     * 'layout.direction' is only meaningful when 'display' is flex or
     * inline-flex. getComputedStyle returns flex-direction's INITIAL value
     * ('row') on every non-flex element, so the measured facts carry a
     * meaningless direction of 'row' on 432 of the 433 non-flex anatomy
     * nodes across the contract set. Reading it unconditionally is what
     * forced HORIZONTAL auto-layout onto block-level containers — the defect
     * recorded as trap 24 in the altitude-figma-sync skill, where al-tabs'
     * tablist and its panel were laid SIDE BY SIDE at 557x40 against a real
     * 291x79.
     *
     * The faithful translation of a block container is VERTICAL, not
     * HORIZONTAL and not NONE: block-level boxes stack their children DOWN.
     * NONE would be worse than either — nothing in this builder assigns x/y
     * to a walked anatomy child, so a NONE frame piles every child at 0,0
     * and keeps createFrame's 100x100 default. Always return an axis.
     *
     * 'grid' maps to HORIZONTAL+WRAP (see layoutWrapsFor): a multi-column
     * grid flows its items across and then wraps, which is the closest thing
     * Figma auto-layout has. Only 3 nodes in the set are grid today.
     */
    var BLOCK_LEVEL_DISPLAYS = ['block', 'flow-root', 'list-item', 'table', 'table-row-group', 'table-header-group', 'table-footer-group', 'table-cell', 'table-caption'];
    var INLINE_LEVEL_DISPLAYS = ['inline', 'inline-block', 'table-row'];
    function layoutAxisFor(layout) {
      var d = layout && layout.display;
      if (!d) return 'VERTICAL';
      if (d === 'flex' || d === 'inline-flex') return layout.direction === 'column' ? 'VERTICAL' : 'HORIZONTAL';
      if (d === 'grid') return 'HORIZONTAL';
      if (INLINE_LEVEL_DISPLAYS.indexOf(d) !== -1) return 'HORIZONTAL';
      if (BLOCK_LEVEL_DISPLAYS.indexOf(d) !== -1) return 'VERTICAL';
      // Anything unrecognised ('contents', 'ruby-*', a future value): block
      // flow is the safe default — an unknown container is far more often a
      // stack than a row, and every axis beats NONE (see above).
      return 'VERTICAL';
    }
    /** Does this node wrap? flex-wrap as measured, plus grid (which always
     *  wraps by definition). Figma only honours layoutWrap on HORIZONTAL. */
    function layoutWrapsFor(layout) {
      if (!layout) return false;
      if (layout.display === 'grid') return true;
      return layout.wrap === 'wrap' || layout.wrap === 'wrap-reverse';
    }

    // Fonts — a contract typically has no font-size/family token (they are
    // inherited, not custom-property-bound, so anatomy never captured one);
    // IBM Plex Sans is the library's own base default (SKILL.md "Known
    // state"); the label's STYLE/SIZE are per-component (figma.gen.json
    // label.fontStyle / label.fontSize).
    const FAMILY = 'IBM Plex Sans';
    const LABEL_FONT_STYLE = ${JSON.stringify(config.label.fontStyle)};
    const LABEL_FONT_SIZE = ${JSON.stringify(config.label.fontSize)};
    // Per-component literal text curation (figma.gen.json textContent:
    // class token -> the literal string the component's own template renders
    // there — e.g. breadcrumbs' separator '/' — verifiable against source,
    // never guessed). Anatomy carries no text content by schema; capturing
    // leaf text in the measurement pass is the eventual generic fix.
    const TEXT_CONTENT = ${JSON.stringify(config.textContent || {})};
    // Per-component glyph curation (figma.gen.json glyphs): CSS-mask-drawn
    // marks copied VERBATIM from the component's own stylesheet (the
    // checkbox check/dash are data-URI SVG masks in checkbox.scss:59-64/188)
    // — rendered as direct vectors colored by the same token the ::before
    // layer binds. Matched by class token + this variant's case-axis values.
    const GLYPHS = ${JSON.stringify(config.glyphs || [])};
    // Nested-icon glyphs (figma.gen.json nestedIconGlyphs): which Phosphor
    // glyph a nested al-icon INSTANCE swaps to, keyed by component tag —
    // source-verifiable (chip.ts imports ALIconClose -> 'x'). Resolved by
    // the same verified-Phosphor scan as slot icons.
    const NESTED_ICON_GLYPHS = ${JSON.stringify(config.nestedIconGlyphs || {})};
    // Nested-instance PROPERTIES (figma.gen.json nestedProps): which properties
    // a placed nested instance is switched to, keyed by component tag. Without
    // it every nested instance renders its set's DEFAULT variant — al-banner's
    // dismiss control came out as a labelled "Button" instead of a bare icon
    // button. Object form applies to every occurrence; ordered array form
    // applies per occurrence in document order (input-stepper's [-][+]).
    const NESTED_PROPS = ${JSON.stringify(config.nestedProps || {})};
    // Full-bleed root width — see the ROOT_WIDTH block in buildVariant.
    const ROOT_WIDTH = ${JSON.stringify(config.rootWidth === undefined ? null : config.rootWidth)};
    let rootFixedWidth = 0;
    /** Resolve a FRIENDLY property name ("Text", "Slot Before", "Variant") to
     * the instance's real key. Figma suffixes non-variant properties with the
     * defining node id ("Text#3538:3669"), and those ids change every time the
     * target set is regenerated — so curation names the property and we look
     * up the suffixed key live. Variant properties carry no suffix. */
    function resolveNestedPropKey(inst, friendly) {
      let keys = [];
      try { keys = Object.keys(inst.componentProperties || {}); } catch (e) { return null; }
      if (keys.indexOf(friendly) !== -1) return friendly;
      for (const k of keys) if (k.split('#')[0] === friendly) return k;
      return null;
    }
    /** A node's own font-weight VARIABLE binding -> the Figma font style.
     * Owner correction (Breadcrumbs walkthrough): text weight is the NODE's
     * fact — badge binds typography/font-weight/bold, breadcrumbs' label is
     * body-lg REGULAR — so walk-path text defaults to Regular unless the
     * node (or the component's own figma.gen.json label.fontStyle, for the
     * pilot recipe) says otherwise. */
    function styleFromWeightVar(name) {
      if (!name) return null;
      const m = String(name).toLowerCase();
      if (m.endsWith('/bold')) return 'Bold';
      if (m.endsWith('/semi-bold') || m.endsWith('/semibold')) return 'SemiBold';
      if (m.endsWith('/medium')) return 'Medium';
      if (m.endsWith('/regular')) return 'Regular';
      return null;
    }
    // PAGE-lane literal-style helpers (hero round 4, learnings note
    // 2026-08-28). cssSolid parses a COMPUTED rgb()/rgba() string into a
    // solid paint (null for transparent — never a black fallback);
    // weightStyleFromCss maps a computed font-weight to a style name for
    // font(), which already degrades through NEAR/pickStyle.
    // REVERSE VARIABLE LOOKUP (owner catch, round 10: "a lot of our
    // components are not using our variables/tokens" — literal colors were
    // baked where a theme variable holds the SAME value). Color variables
    // are indexed by their resolved value in each collection's default mode;
    // cssSolid binds the matching variable instead of baking the hex. A
    // literal with NO matching variable stays literal and is REPORTED
    // (page-lane runs only) as color-unbound — surfacing exactly what the
    // owner caught by eye.
    const COLOR_VAR_BY_RGBA = new Map();
    const rgbaKey = function (c) {
      return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255), Math.round((c.a === undefined ? 1 : c.a) * 100)].join(',');
    };
    try {
      const collById = new Map();
      for (const coll of await figma.variables.getLocalVariableCollectionsAsync()) collById.set(coll.id, coll);
      for (const vv of await figma.variables.getLocalVariablesAsync('COLOR')) {
        const coll = collById.get(vv.variableCollectionId);
        if (!coll) continue;
        let val = vv.valuesByMode[coll.defaultModeId];
        if (val && val.type === 'VARIABLE_ALIAS') continue; // target is indexed directly
        if (val && typeof val === 'object' && 'r' in val) {
          const k = rgbaKey(val);
          if (!COLOR_VAR_BY_RGBA.has(k)) COLOR_VAR_BY_RGBA.set(k, vv);
        }
      }
    } catch (e) { /* variables API unavailable — literals stay literal */ }
    function bindColorVar(p, cssForReport) {
      const k = rgbaKey({ r: p.color.r, g: p.color.g, b: p.color.b, a: p.opacity });
      const vv = COLOR_VAR_BY_RGBA.get(k);
      if (vv) {
        try { return figma.variables.setBoundVariableForPaint(p, 'color', vv); }
        catch (e) { /* keep literal */ }
      } else if (OPS.anatomySource === 'measured-page') {
        misses.add('color-unbound:' + cssForReport);
      }
      return p;
    }
    function cssSolid(css) {
      // color(srgb r g b / a) — how Chromium serializes wide-gamut-authored
      // colors (the grid texture's line color arrives this way).
      const cm2 = /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/.exec(String(css || ''));
      if (cm2) {
        const a2 = cm2[4] !== undefined ? parseFloat(cm2[4]) : 1;
        if (a2 === 0) return null;
        return bindColorVar({ type: 'SOLID', color: { r: parseFloat(cm2[1]), g: parseFloat(cm2[2]), b: parseFloat(cm2[3]) }, opacity: a2 }, String(css));
      }
      const m2 = /rgba?\(([^)]+)\)/.exec(String(css || ''));
      if (!m2) return null;
      const parts = m2[1].split(',').map(function (s) { return parseFloat(s); });
      if (parts.length < 3 || parts.some(function (n) { return isNaN(n); })) return null;
      const a = parts.length > 3 ? parts[3] : 1;
      if (a === 0) return null;
      return bindColorVar({ type: 'SOLID', color: { r: parts[0] / 255, g: parts[1] / 255, b: parts[2] / 255 }, opacity: a }, String(css));
    }
    function weightStyleFromCss(fw) {
      const n = parseInt(fw, 10);
      if (isNaN(n)) return String(fw).toLowerCase() === 'bold' ? 'Bold' : null;
      if (n >= 700) return 'Bold';
      if (n >= 600) return 'SemiBold';
      if (n >= 500) return 'Medium';
      if (n <= 300) return 'Light';
      return null;
    }
    const FAMILY_STYLES = {};
    for (const fnt of await figma.listAvailableFontsAsync()) {
      (FAMILY_STYLES[fnt.fontName.family] = FAMILY_STYLES[fnt.fontName.family] || []).push(fnt.fontName.style);
    }
    const NEAR = { Bold: ['Bold', 'SemiBold', 'Medium', 'Regular'], Regular: ['Regular', 'Book', 'Medium'] };
    function pickStyle(style) {
      const have = FAMILY_STYLES[FAMILY] || [];
      if (have.indexOf(style) !== -1) return style;
      const chain = NEAR[style] || [style, 'Regular'];
      return chain.filter((s) => have.indexOf(s) !== -1)[0] || have[0] || 'Regular';
    }
    const loadedFonts = new Set();
    async function font(style) {
      const real = pickStyle(style);
      const k = FAMILY + '/' + real;
      if (!loadedFonts.has(k)) {
        try { await figma.loadFontAsync({ family: FAMILY, style: real }); }
        catch (e) { await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); loadedFonts.add('Inter/Regular'); return { family: 'Inter', style: 'Regular' }; }
        loadedFonts.add(k);
      }
      return { family: FAMILY, style: real };
    }
    // PAGE-lane per-node font family (round 6): the measured family wins
    // when the environment has it; every miss degrades through font() to
    // the library FAMILY, never to a hard failure.
    async function fontFam(family, style) {
      if (!family || family === FAMILY) return font(style);
      const styles = FAMILY_STYLES[family];
      if (!styles) return font(style);
      const real = styles.includes(style) ? style
        : ((NEAR[style] || [style, 'Regular']).find(function (s) { return styles.includes(s); }) || (styles.includes('Regular') ? 'Regular' : styles[0]));
      const k2 = family + '/' + real;
      if (loadedFonts.has(k2)) return { family: family, style: real };
      // NEGATIVE CACHE (2026-08-29): a failed/timed-out load MUST be
      // remembered — without it every mono-heavy text paid the full 3s race
      // again, and the work/tools sections deterministically blew the 30s
      // bridge ceiling on font waits alone.
      if (typeof FAILED_FONTS === 'undefined') { globalThis.FAILED_FONTS = new Set(); }
      if (FAILED_FONTS.has(k2)) return font(style);
      // BOUNDED load (round 6): loadFontAsync can HANG indefinitely for
      // some family/style pairs (same async-hang class as
      // importComponentByKeyAsync — the chips' rewrap font load ate the
      // whole 30s bridge ceiling). Race a 3s timeout; a timeout falls back
      // to the library family and is NAMED in misses, never silent.
      try {
        const ok = await Promise.race([
          figma.loadFontAsync({ family: family, style: real }).then(function () { return true; }),
          new Promise(function (res) { setTimeout(function () { res(false); }, 3000); }),
        ]);
        if (!ok) { misses.add('font-load-timeout:' + family + '/' + real); FAILED_FONTS.add(k2); return font(style); }
        loadedFonts.add(k2);
        return { family: family, style: real };
      } catch (e) { FAILED_FONTS.add(k2); return font(style); }
    }

    // PAGE — scoped strictly to PAGE_NAME. Reuse if present; otherwise
    // create it. Never delete/recreate the page object, never touch any
    // other page. Spec 2026-08-26-contract-coverage…: clearing is now
    // NAME-SCOPED to THIS component's own artifacts (the set, its
    // "— Generated" presentation frame, its "— Prop Sheet" documentation
    // frame) instead of wiping every child — the page-wipe behavior was
    // correct while exactly one component ever generated, but a multi-
    // component sweep must not delete sibling components' generated sets
    // (and nested-instance resolution may need them as fallbacks for a
    // sub-component with no real set of its own).
    let page = figma.root.children.find((p) => p.name === PAGE_NAME);
    const reusedPage = !!page;
    if (!page) {
      page = figma.createPage();
      page.name = PAGE_NAME;
    } else {
      await page.loadAsync();
      // Owner direction (walkthrough, 2026-08-26): generated sets may land
      // on the component's OWN "🛠 " page, NEXT TO the hand-built set — she
      // deletes the old one herself as each is approved. So clearing removes
      // ONLY the artifacts this generator names with its own suffixes; a
      // bare COMPONENT_SET named componentSetName is NEVER removed — on a
      // real page that IS the hand-built set (the generated set always lives
      // inside its "— Generated" frame, so removing the two suffixed frames
      // fully covers our own reruns).
      // Never delete what this run does not rebuild. Since 2026-08-29 this
      // run rebuilds the WHOLE page artifact — header and set together in the
      // one "— Generated" frame — so there is no second pass to re-run and no
      // "— Prop Sheet" to preserve. Anything the owner expanded by hand with
      // Propstar lives under its own name and is deliberately untouched.
      const OWN_ARTIFACT_NAMES = new Set([
        OPS.componentSetName + ' — Generated',
        // The retired prop sheet. A regen used to leave it alone because it
        // carried the only header on the page — deleting it stranded the
        // page bare (owner report, Chip walkthrough). The header now lives
        // in the "— Generated" frame above the set, so the sheet is a pure
        // orphan and a regen sweeps it. This is the ONLY thing that clears
        // it; a page nobody regenerates keeps its old sheet until someone
        // does.
        OPS.componentSetName + ' — Prop Sheet',
      ]);
      for (const c of [...page.children]) if (OWN_ARTIFACT_NAMES.has(c.name)) c.remove();
    }
    await figma.setCurrentPageAsync(page);

    // Resolve every Icon Before/After INSTANCE_SWAP's default component ONCE
    // (same placeholder for every variant/state row — nothing per-row here),
    // keyed by the layer name both the boolean's 'visible' reference and the
    // instance-swap's 'mainComponent' reference target after combineAsVariants.
    // T28: this MUST run after the page above is created/reused and made
    // current — CONFIRMED LIVE: resolving/instantiating icons before the
    // page switch left new nodes rooted on whatever page was active when the
    // script started, invalidated once that source page was unloaded again
    // (documentAccess: dynamic-page — SKILL.md trap 1).
    //
    // T28, ALSO CONFIRMED LIVE (a second, separate problem — not just
    // speed): calling .clone() on a per-icon "template" instance and reusing
    // that clone per variant (the original plan, to avoid ~100
    // createInstance() calls against a REMOTE component after that alone
    // was measured hard-timing-out the whole call) silently CORRUPTS the
    // cloned vector's fill geometry — it renders as a solid filled
    // rectangle, not the icon's real shape, even though .vectorPaths still
    // reads back a normal-looking path string. A fresh createInstance()
    // straight off the resolved remote main component, exported in
    // isolation, renders correctly; its .clone() does not. Root cause not
    // fully diagnosed (an instance-override materialization quirk under
    // this dynamic-page bridge, most likely) — the fix that IS verified: go
    // back to createInstance() per occurrence, but only where an icon is
    // actually shown — cheap enough in practice to stay under the ~30s
    // ceiling, and correct.
    const iconSwapProps = OPS.componentProperties.filter((p) => p.type === 'INSTANCE_SWAP');
    // iconComponentsByLayer holds the resolved PHOSPHOR GLYPH per layer (used
    // to gate whether a side gets built at all, and as the swapComponent
    // target below) — unchanged in shape from before T29.
    const iconComponentsByLayer = {};
    for (const p of iconSwapProps) {
      const comp = await findPhosphorComponentByName(p.default);
      if (comp) iconComponentsByLayer[p.layerName] = comp;
      else misses.add('phosphor-component-not-found:' + p.default);
    }
    // T29: the DS "Icon" wrapper master — resolved ONCE, shared by every
    // side/row, same "must run after the page switch" ordering constraint as
    // the Phosphor lookup above (findIconWrapperComponent also touches
    // page.loadAsync() on the priority pages). A miss here means NO icon
    // instances are built for ANY side this run — never fall back to
    // instantiating the raw Phosphor component directly (that is exactly the
    // bug T29 fixes), so an unresolved wrapper degrades the same clean-skip
    // way an unresolved glyph name already does.
    const ICON_WRAPPER_MASTER = iconSwapProps.length ? await findIconWrapperComponent() : null;
    if (iconSwapProps.length && !ICON_WRAPPER_MASTER) misses.add('icon-wrapper-component-not-found:' + ICON_WRAPPER_COMPONENT_NAME);

    // Spec 2026-08-26-contract-coverage…: resolve every nested component's
    // COMPONENT_SET by NAME (never node id — molecule sets re-mint ids on
    // every rebuild, altitude-figma-sync trap 32), once, up front:
    //   1. the component's own REAL page (COMPONENT_PAGE_PREFIX + set name —
    //      the file's one-component-per-page convention), then
    //   2. the scratch page itself (a set a previous generate-figma run
    //      built — page clearing is name-scoped now, so sibling generated
    //      sets survive between runs).
    // A tag that resolves nowhere is reported as a miss and its anatomy
    // subtree falls back to coarse frames in buildVariant — honest degrade,
    // never a fabricated placeholder. al-layout never resolves by design
    // (arrangement primitive, no set of its own) — its flex facts ARE its
    // rendering, via the same frame fallback.
    // Resolve each distinct nested-icon glyph once (same discipline and
    // budget as slot icons).
    const nestedGlyphByName = {};
    // Glyphs come from two curation keys: nestedIconGlyphs (a nested al-icon's
    // own glyph) and nestedProps' "$glyphs" (glyphs living inside a nested
    // NON-icon instance's icon slots — al-banner's dismiss al-button wraps an
    // x). Both resolve through the same verified-Phosphor scan, once each.
    const glyphsFromNestedProps = [];
    for (const spec of Object.values(NESTED_PROPS)) {
      for (const one of (Array.isArray(spec) ? spec : [spec])) {
        for (const g of ((one && one.$glyphs) || [])) glyphsFromNestedProps.push(g);
      }
    }
    for (const gname of [...new Set([...Object.values(NESTED_ICON_GLYPHS).flat(), ...glyphsFromNestedProps])]) {
      const comp = await findPhosphorComponentByName(gname);
      if (comp) nestedGlyphByName[gname] = comp;
      else misses.add('phosphor-component-not-found:' + gname);
    }

    const nestedSetByTag = {};
    // SHALLOW set lookup (2026-08-29): sets live at depth <= 2 — directly on
    // a page, or inside a presentation frame. A deep findOne walked EVERY
    // node of the scratch page — nine fat organisms after the site sweep —
    // once per unresolved tag, and setup alone blew the bridge's 30s
    // ceiling (the build-budget guard never even fired: the walk hadn't
    // started).
    function shallowFindSet(root2, name2) {
      for (const c1 of root2.children) {
        if (c1.type === 'COMPONENT_SET' && c1.name === name2) return c1;
        if ('children' in c1) {
          for (const c2 of c1.children) {
            if (c2.type === 'COMPONENT_SET' && c2.name === name2) return c2;
          }
        }
      }
      return null;
    }
    for (const entry of NESTED_SETS) {
      let found = null;
      // al-icon has no COMPONENT_SET anywhere — the owner's DS "Icon" is a
      // lone COMPONENT on the "🛠 Icons" page (see findIconWrapperComponent's
      // own live-confirmed notes). A nested al-icon in a molecule's anatomy
      // is exactly an instance of that wrapper, so resolve it the same way
      // the slot-icon path already does.
      if (entry.tag === 'al-icon') {
        found = await findIconWrapperComponent();
      } else {
        const realPage = figma.root.children.find((p) => p.name === COMPONENT_PAGE_PREFIX + entry.setName);
        if (realPage) {
          await realPage.loadAsync();
          found = shallowFindSet(realPage, entry.setName);
        }
        if (!found) found = shallowFindSet(page, entry.setName);
      }
      if (found) nestedSetByTag[entry.tag] = found;
      else misses.add('nested-set-not-found:' + entry.tag + ':' + entry.setName);
    }

    // T18/T21: the library's default theme mode is DARK (main.css bakes dark
    // into root — SKILL.md), and the content colors this generator binds
    // (e.g. content-primary-weak) are authored to read on a dark surface. A
    // page left on Figma's default WHITE background is why the T12 pilot's
    // light text read as invisible — mirror the real file's page convention
    // here (kept as a belt-and-braces fallback now that the presentation
    // frame below carries the REAL bound fill — see SITE_BG_FIGMA_VAR).
    // NOTE: PageNode.backgrounds throws "cannot be bound to variables" — this
    // is the one paint in this whole generator that is a resolved LITERAL,
    // not a bound variable (a Figma API limitation on Page, not a choice).
    {
      const bgVarName = SITE_BG_FIGMA_VAR;
      const vv = V[bgVarName];
      if (vv) {
        try {
          const val = await rawOf(vv);
          if (val && val.r !== undefined) page.backgrounds = [{ type: 'SOLID', color: { r: val.r, g: val.g, b: val.b } }];
          else misses.add('page-background:' + bgVarName);
        } catch (e) { misses.add('page-background:' + bgVarName); }
      } else {
        misses.add('page-background:' + bgVarName);
      }
    }

    const root = OPS.root;
    const rootTokens = (root && root.tokens) || {};
    // Case axes (spec 2026-08-26-contract-coverage…): each fanned variant
    // carries a rootIndex into OPS.caseRoots — its OWN measured case tree
    // (structure included: a separator child that only exists when
    // Separator=Yes). -1 / absent -> the base tree.
    const CASE_ROOTS = OPS.caseRoots || null;
    function rootForVariant(v) {
      return CASE_ROOTS && typeof v.rootIndex === 'number' && v.rootIndex >= 0 && CASE_ROOTS[v.rootIndex]
        ? CASE_ROOTS[v.rootIndex].root
        : root;
    }
    const textNodes = [];
    // DEFERRED IMAGE FILLS (2026-08-29 — the work section's card rebuilds +
    // three embedded rasters pushed the single build call over the Desktop
    // Bridge's hard ~30s ceiling, deterministically): a node whose imgB64
    // was stripped to imgRef by the caller is TAGGED here and filled by
    // follow-up calls, one image each. Same reduce-work-per-call playbook
    // as the sheet's batching.
    const IMAGE_TARGETS = [];
    const BUILD_T0 = Date.now();

    function overrideFor(state, path, cssProp) {
      const st = OPS.stateOverrides[state.toLowerCase()];
      if (!st) return null;
      const at = st[path];
      return at ? at[cssProp] || null : null;
    }

    // T23: boolean axes this component actually declares (kind 'slot' or
    // 'fullWidth' — State/enum axes are handled separately, unchanged).
    // Looked up by kind/side rather than re-parsing variant NAMES, so
    // buildVariant reads axis membership the same deterministic way
    // buildOps() wrote it.
    const slotAxisBefore = OPS.axes.find((a) => a.kind === 'slot' && a.side === 'before');
    const slotAxisAfter = OPS.axes.find((a) => a.kind === 'slot' && a.side === 'after');
    const fullWidthAxis = OPS.axes.find((a) => a.kind === 'fullWidth');

    // Spec 2026-08-26-contract-coverage…: a COMPOSITE component is one whose
    // anatomy carries nested-component annotations anywhere below the root.
    // Composites build by WALKING the anatomy: nested components become
    // INSTANCES of their own sets (outermost annotation wins — the annotated
    // subtree is that component's internals and is never descended into);
    // everything else becomes a coarse auto-layout frame carrying the node's
    // own flex facts and token binds. The icon–label–icon recipe (the
    // T12–T30 pilot path) still builds every NON-composite exactly as
    // before.
    function hasNested(n) {
      if (!n) return false;
      for (const c of n.children || []) if (c.component || hasNested(c)) return true;
      return false;
    }
    const IS_COMPOSITE = hasNested(root) || (CASE_ROOTS || []).some((c) => hasNested(c.root));
    // Anatomy-WALK build (spec 2026-08-26-contract-coverage…, Breadcrumbs
    // Item walkthrough): composites AND case-axis components build by
    // walking their (per-variant) anatomy tree — for case axes the STRUCTURE
    // is the difference (a separator child that only exists when
    // Separator=Yes; a label whose own color shifts when Current=Yes), so
    // root-level token painting cannot express them. Everything else keeps
    // the pilot icon–label–icon recipe unchanged.
    const HAS_CASE_AXES = OPS.axes.some((a) => a.kind === 'case');
    const USE_ANATOMY_WALK = IS_COMPOSITE || HAS_CASE_AXES;

    /** Shared child-frame construction for the composite walk: flex facts +
     * token binds only — no pixel geometry exists in a contract, so HUG both
     * axes throughout (a childless token-bearing node renders as its padding
     * box — coarse by design, per the ops degradation note). */
    async function buildAnatomyChildren(node, parent, state, path, inheritedColor, axisValues, caseRootColor, iconCursor, propsCursor) {
      const kids = node.children || [];
      // Variant-aware color inheritance (Chip walkthrough): a node whose own
      // color binding merely EQUALS the case root's (i.e. it inherited it in
      // CSS) follows the ROW's variant-layered color instead — a Danger
      // chip's label is danger-colored even though the base case tree was
      // measured on the default variant. A node with a genuinely DIFFERENT
      // own color keeps it.
      const rawNodeColor = (node.tokens || {})['color'] || null;
      const nodeColor = (rawNodeColor && rawNodeColor !== caseRootColor ? rawNodeColor : null) || inheritedColor || null;
      // Focus-ring HOIST (Checkbox walkthrough): the measured :focus outline
      // sits on the NATIVE INPUT — a paintless node the walk skips, which
      // overlays the visible box in the browser (position:absolute siblings
      // have no auto-layout equivalent). A skipped sibling's outline-* is
      // carried to the NEXT rendered glyph in the same parent and drawn as a
      // ring wrapper: padding bound to outline-offset, stroke to
      // outline-color — all the same tokens the CSS binds.
      let pendingOutline = null;
      for (let ci = 0; ci < kids.length; ci++) {
        const child = kids[ci];
        const childPath = (path || '0') + '.' + ci;
        // Per-path measured state overrides (anatomy.stateOverrides diffs
        // every node path against Default) — the walk applies them so a
        // Hover/Active column actually differs where the CSS says it does.
        const stateKey = state ? String(state).toLowerCase() : null;
        const overrides = (stateKey && stateKey !== 'default' && OPS.stateOverrides && OPS.stateOverrides[stateKey] && OPS.stateOverrides[stateKey][childPath]) || null;
        const t = { ...(child.tokens || {}), ...(overrides || {}) };
        // Visually-hidden subtree (sr-only pattern): a measured box of ~1px
        // clips its full-size content — present for screen readers, not for
        // the canvas. The whole subtree is skipped (Checkbox's Label=Hidden
        // case renders NO label, exactly like the app).
        if (child.box && child.box.w <= 2 && child.box.h <= 2) continue;
        // BUILD BUDGET (diagnostic, 2026-08-29): fail LOUDLY with the
        // current path before the bridge's silent 30s kill — the error
        // message tells us where the time went.
        if (Date.now() - BUILD_T0 > 20000) throw new Error('build-budget-exceeded at ' + childPath + ' (' + (child.cls || child.tag || child.component || '?') + ')');
        if (OPS.dbgPath && childPath.indexOf(OPS.dbgPath) === 0) misses.add('dbg:' + childPath + ':' + (child.cls || child.tag || '?').slice(0, 20)); // TEMP walk trace
        // RASTER-PREFERRED (footer round 3): an annotated subtree whose
        // truth is a RASTER (the logo's svg wordmark) resolved to a set
        // whose only face is a Text property — the instance rendered the
        // master's literal "Logo". When the set has no multi-option VARIANT
        // to switch to, the raster IS the better face: degrade to the frame
        // path (the svg renders as an image fill), with a named miss.
        let preferRaster = false;
        if (child.component && nestedSetByTag[child.component]) {
          const set0 = nestedSetByTag[child.component];
          const hasRaster = (function fR(n) { if (n.imgB64) return true; for (const c0 of (n.children || [])) { if (fR(c0)) return true; } return false; })(child);
          if (hasRaster && set0.type === 'COMPONENT_SET') {
            const defs0 = set0.componentPropertyDefinitions || {};
            const multi = Object.keys(defs0).some(function (k0) { const d0 = defs0[k0]; return d0.type === 'VARIANT' && (d0.variantOptions || []).length > 1; });
            if (!multi) { preferRaster = true; misses.add('nested-raster-preferred:' + child.component); }
          }
          // FACE-DIVERGENCE probe (T24 card-collapse): the measured card
          // subtree is COMPLETE (image, excerpt, tags, footer) but the
          // resolved set's face is a title chip — the instance replaced the
          // whole truth. When the master's natural height is under half the
          // measured box AND the subtree is structurally rich (2+ children),
          // the frame rebuild is the honest face. Atoms are safe: buttons/
          // chips fail the height gate, heading/text-block have one child.
          if (!preferRaster && !OPS.noDiverge && child.box && child.box.h >= 60 && (child.children || []).length >= 2) {
            const base0 = set0.type === 'COMPONENT' ? set0 : (set0.defaultVariant || set0.children[0]);
            if (base0 && base0.height < child.box.h * 0.5) {
              preferRaster = true;
              misses.add('nested-set-face-divergence:' + child.component + ':' + Math.round(base0.height) + 'vs' + Math.round(child.box.h));
            }
          }
        }
        if (!preferRaster && child.component && nestedSetByTag[child.component]) {
          // The nested component's own set, as a real INSTANCE — default
          // variant (per-state/per-variant nested switching is a refinement
          // the ops schema does not yet carry; see the degradation note).
          const set = nestedSetByTag[child.component];
          // A COMPONENT_SET instantiates via its default variant; a lone
          // COMPONENT (the DS "Icon" wrapper) instantiates directly.
          const base = set.type === 'COMPONENT' ? set : (set.defaultVariant || set.children[0]);
          const inst = base.createInstance();
          inst.name = child.component;
          parent.appendChild(inst);
          // FACT-DERIVED instance properties (2026-08-28, sl stress test T7).
          // Two measured facts the walk already carries pick the right face
          // for a nested instance instead of its set's default variant:
          //   1. VARIANT-FROM-MODIFIER - the node's class list records the
          //      nested component's own BEM modifiers (al-c-heading--display-lg)
          //      and state classes (al-is-bold); each one whose Title Case is a
          //      legal option of one of the set's VARIANT axes switches that
          //      axis. Without this the hero's headline rendered as the 36px
          //      Default instead of the 110px Display Lg the anatomy names.
          //   2. TEXT-FROM-ANATOMY - the subtree's measured copy fills the
          //      instance's TEXT property; the placeholder default only stands
          //      when measurement captured no text.
          // Applied BEFORE curation (NESTED_PROPS below), so explicit curation
          // still wins on any key both speak to.
          if (set.type === 'COMPONENT_SET') {
            const derived = {};
            const defs = set.componentPropertyDefinitions || {};
            const toTitle = (s) => s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            const mods = String(child.cls || '').split(/\s+/)
              .map((c) => { const m = c.match(/^al-c-[a-z0-9-]+--([a-z0-9-]+)$/) || c.match(/^al-is-([a-z0-9-]+)$/) || c.match(/^sl-c-[a-z0-9-]+--([a-z0-9-]+)$/); return m ? m[1] : null; })
              .filter(Boolean);
            for (const mod of mods) {
              const want = toTitle(mod);
              for (const pname of Object.keys(defs)) {
                const def = defs[pname];
                if (def && def.type === 'VARIANT' && (def.variantOptions || []).includes(want)) { derived[pname.split('#')[0]] = want; break; }
              }
            }
            const firstText = (function findText(n) {
              if (n.text) return n.text;
              for (const c of (n.children || [])) { const t = findText(c); if (t) return t; }
              return null;
            })(child);
            if (firstText) {
              const textDef = Object.keys(defs).find((k) => defs[k] && defs[k].type === 'TEXT');
              if (textDef) derived[textDef.split('#')[0]] = firstText;
            }
            const appliedDerived = {};
            for (const friendly of Object.keys(derived)) {
              const key = resolveNestedPropKey(inst, friendly);
              if (key) appliedDerived[key] = derived[friendly];
            }
            if (Object.keys(appliedDerived).length) {
              try { inst.setProperties(appliedDerived); }
              catch (e) { misses.add('derived-prop-set-failed:' + child.component + ':' + e.message); }
            }
          }
          // Switch the instance to its curated properties BEFORE anything else
          // touches it: setProperties on a variant property swaps the backing
          // component, which discards direct child edits made beforehand (and
          // would undo the icon swap/recolor below).
          const propSpec = NESTED_PROPS[child.component];
          if (propSpec !== undefined) {
            let wanted = propSpec;
            if (Array.isArray(propSpec)) {
              // Positional: entry N applies to the Nth occurrence of this tag
              // in document order within the variant. A group's Error case
              // renders TWO al-field-notes (helper, then error), so [Default,
              // Error] colours them correctly with no condition needed.
              const pcur = propsCursor || {};
              const pi = pcur[child.component] || 0;
              wanted = propSpec[Math.min(pi, propSpec.length - 1)];
              pcur[child.component] = pi + 1;
            }
            // Variant-conditional curation. A nested instance often has to
            // follow the OWNER's axis: a Disabled group's checkboxes must read
            // Disabled, an Error group's radios must read Error. Two hooks,
            // both matched against this variant's own axis values:
            //   "$when"      gates the whole entry (no match -> nothing applied)
            //   "$overrides" merges extra props on top of the base ones, first
            //                match onward, so the common props stay written once
            const matches = (cond) => {
              const av = axisValues || {};
              for (const k of Object.keys(cond || {})) {
                if (String(av[k]) !== String(cond[k])) return false;
              }
              return true;
            };
            if (wanted && wanted.$when && !matches(wanted.$when)) wanted = null;
            if (wanted && Array.isArray(wanted.$overrides)) {
              const merged = { ...wanted };
              delete merged.$overrides;
              for (const ov of wanted.$overrides) {
                if (!ov || (ov.$when && !matches(ov.$when))) continue;
                for (const k of Object.keys(ov)) if (k !== '$when') merged[k] = ov[k];
              }
              wanted = merged;
            }
            const applied = {};
            for (const friendly of Object.keys(wanted || {})) {
              if (friendly === '$glyphs' || friendly === '$when' || friendly === '$overrides') continue; // not properties
              const key = resolveNestedPropKey(inst, friendly);
              // A curated property the target set does not expose is a real
              // disagreement between curation and the live set (a renamed axis,
              // a regenerated dependency) — reported, never silently dropped.
              if (key) applied[key] = wanted[friendly];
              else misses.add('nested-prop-not-found:' + child.component + ':' + friendly);
            }
            if (Object.keys(applied).length) {
              try { inst.setProperties(applied); }
              catch (e) { misses.add('nested-prop-set-failed:' + child.component + ':' + e.message); }
            }
            // $glyphs: the icons that live INSIDE this nested instance's own
            // icon slots. The library's convention (T29) is that an icon is the
            // DS "Icon" WRAPPER instance with a Phosphor glyph instance inside
            // it, so the swap target is the wrapper's inner instance — reached
            // through the nested instance's override tree, in document order.
            // Runs AFTER setProperties, which would otherwise discard it.
            const wantGlyphs = (wanted && wanted.$glyphs) || null;
            if (wantGlyphs && wantGlyphs.length) {
              const wrappers = [];
              (function collectWrappers(n) {
                if (!('children' in n)) return;
                for (const c of n.children) {
                  if (c.type === 'INSTANCE' && c.visible && c.children && c.children.some((g) => g.type === 'INSTANCE')) wrappers.push(c);
                  collectWrappers(c);
                }
              })(inst);
              for (let gi = 0; gi < wantGlyphs.length; gi += 1) {
                const gname = wantGlyphs[gi];
                const wrapper = wrappers[gi];
                if (!wrapper) { misses.add('nested-prop-glyph-slot-missing:' + child.component + ':' + gname); continue; }
                if (!nestedGlyphByName[gname]) continue; // already reported by the resolve pass
                const inner = wrapper.children.find((g) => g.type === 'INSTANCE');
                if (!inner) { misses.add('nested-prop-glyph-slot-missing:' + child.component + ':' + gname); continue; }
                try { inner.swapComponent(nestedGlyphByName[gname]); }
                catch (e) { misses.add('nested-prop-glyph-swap-failed:' + child.component + ':' + gname); }
              }
            }
          }
          // FILL for a nested INSTANCE whose measured facts say it fills
          // (spec 2026-08-28-layout-fill-and-grow-facts): the same rules the
          // coarse-frame path applies — flex-grow fills the parent's MAIN
          // axis; cross-axis stretch (parent align-items, overridable by the
          // child's own align-self, block-level gate for non-flex parents)
          // fills the cross axis, only into a DEFINITE parent size. A nested
          // al-input that fills its form row in the browser now fills it on
          // canvas too. Everything else keeps its natural instance size —
          // instances must never stretch by accident, and the icon branch
          // below still forces FIXED onto measured icon boxes AFTER this.
          if (child.layout) {
            const pAlignI = node && node.layout ? node.layout.align : null;
            const effI = child.layout.alignSelf || pAlignI;
            const stretchesI = !effI || effI === 'normal' || effI === 'stretch';
            const parentIsFlexI = !!(node && node.layout && (node.layout.display === 'flex' || node.layout.display === 'inline-flex'));
            const childBlockLevelI = !child.layout.display || /^(block|flex|grid|table|list-item|flow-root)$/.test(child.layout.display);
            if (child.layout.grow) {
              try {
                if (parent.layoutMode === 'HORIZONTAL') inst.layoutSizingHorizontal = 'FILL';
                else if (parent.layoutMode === 'VERTICAL') inst.layoutSizingVertical = 'FILL';
              } catch (e) { /* parent is not an auto-layout frame */ }
            }
            // SPANS-PARENT gate (owner nit, 2026-08-29: "buttons have hug
            // width on the button atoms — keep that on anything we
            // generate"): an instance only FILLs when its MEASURED box
            // actually spans the parent — a button whose measured width is
            // its hug width stays hug, a text block that filled the column
            // in the browser still fills.
            const spansW = child.box && node && node.box ? child.box.w >= node.box.w * 0.95 : false;
            const spansH = child.box && node && node.box ? child.box.h >= node.box.h * 0.95 : false;
            if (stretchesI && spansW && (parentIsFlexI || childBlockLevelI) && parent.layoutMode === 'VERTICAL') {
              try {
                const ps = parent.layoutSizingHorizontal;
                if (ps === 'FIXED' || ps === 'FILL') inst.layoutSizingHorizontal = 'FILL';
              } catch (e) { /* parent is not an auto-layout frame */ }
            }
            if (stretchesI && spansH && parentIsFlexI && parent.layoutMode === 'HORIZONTAL') {
              try {
                const ps = parent.layoutSizingVertical;
                if (ps === 'FIXED' || ps === 'FILL') inst.layoutSizingVertical = 'FILL';
              } catch (e) { /* parent is not an auto-layout frame */ }
            }
          }
          // REWRAP an overflowing text-bearing nested instance (spec
          // 2026-08-28-layout-fill-and-grow-facts; hero acceptance test). A
          // TEXT property override re-renders at the master's own
          // text-auto-resize (usually WIDTH_AND_HEIGHT), so long copy makes
          // the instance run wide instead of wrapping the way the browser
          // did (the hero headline measured 1160x220 wrapped; the instance
          // rendered 1311px on one line and clipped). Verified live: an
          // instance's inner TEXT nodes ARE writable once their fonts are
          // loaded. Fires ONLY when the instance genuinely overflows its own
          // measured box — an atom whose natural size already matches its
          // measurement is untouched. Runs AFTER setProperties (text is
          // already overridden) and BEFORE the icon branch (icons carry no
          // TEXT, so they never enter here).
          // UNCONDITIONAL conform (round 8): the mismatch trigger was
          // fragile — ancestor sizing rules (the grid-child width) could
          // make FILL succeed before this check, so the width matched and
          // the wrap policy never ran (the lead collapsed to one clipped
          // 1742px line). Conforming to the measured box and applying the
          // wrap policy is idempotent truth, not a repair — run it for
          // every text-bearing instance with a measured box.
          if (child.box && child.box.w >= 1) {
            const instTexts = [];
            (function walkT(n) {
              if (n.type === 'TEXT') instTexts.push(n);
              if ('children' in n) for (const c of n.children) walkT(c);
            })(inst);
            if (instTexts.length) {
              try {
                // The MEASURED inner text node is the wrap authority (round
                // 7 — owner: "the heading is supposed to break at Built"):
                // the site constrains the heading text to 764px inside a
                // 1264px container, so conforming the text to the INSTANCE
                // width broke one word late. Its measured HEIGHT also tells
                // us the line count — a single-line label (button, chip)
                // must never wrap at all.
                const innerMeas = (function fT(n) {
                  if (n.text && n.box) return n;
                  for (const c of (n.children || [])) { const r = fT(c); if (r) return r; }
                  return null;
                })(child);
                for (const tnode of instTexts) {
                  const fnts = tnode.getRangeAllFontNames(0, tnode.characters.length);
                  for (const fnt of fnts) await figma.loadFontAsync(fnt);
                  // Page-lane measured type metrics beat the variant's own
                  // (see fsPx note in the text-leaf branch). Family/weight
                  // too (round 6): a chip's mono label, a heading's page
                  // family — fontFam degrades to the master's family on any
                  // miss.
                  if (child.ffCss || child.fwCss) {
                    try { tnode.fontName = await fontFam(child.ffCss, weightStyleFromCss(child.fwCss) || 'Regular'); }
                    catch (e2) { /* keep master font */ }
                  }
                  if (child.fsPx) tnode.fontSize = child.fsPx;
                  if (child.lhPx) tnode.lineHeight = { unit: 'PIXELS', value: child.lhPx };
                  // Adjusted instance texts join the end-of-run text-style
                  // link pass (owner catch, round 10: the heading carried
                  // literal 48px metrics with NO style binding — instance
                  // inner texts never entered textNodes). Exact
                  // family/style/size matching protects against binding a
                  // style whose size the page clamps away.
                  textNodes.push(tnode);
                  const oneLine = innerMeas && innerMeas.box.h <= (child.fsPx ? child.fsPx * 1.9 : 40);
                  if (oneLine) {
                    // Single line in the browser -> never wrap here.
                    tnode.textAutoResize = 'WIDTH_AND_HEIGHT';
                  } else {
                    // Multi-line: HEIGHT + FILL; the WRAP WIDTH is imposed
                    // by resizing the INSTANCE below — an instance's inner
                    // text node cannot be resized directly (silently locked,
                    // same restriction class as nested-instance geometry;
                    // the direct-resize attempt left the headline at the
                    // master's 420px, centered).
                    tnode.textAutoResize = 'HEIGHT';
                    try { tnode.layoutSizingHorizontal = 'FILL'; } catch (e) { /* not an auto-layout child */ }
                  }
                }
                // Conform the instance to the measured TEXT width for
                // multi-line content (round 7 — the site breaks the heading
                // at 764px inside a 1264px container; conforming to the
                // container broke one word late), else the node's own box.
                const oneLineInst = innerMeas && innerMeas.box.h <= (child.fsPx ? child.fsPx * 1.9 : 40);
                const wantInstW = (!oneLineInst && innerMeas && innerMeas.box.w >= 8)
                  ? Math.min(innerMeas.box.w, child.box.w)
                  : child.box.w;
                inst.resize(wantInstW, inst.height);
              } catch (e) { misses.add('nested-text-rewrap-failed:' + child.component + ':' + e.message); }
            }
          }
          // INSTANCE STYLE DIVERGENCE (page lane; user-reported on chips —
          // learnings note 2026-08-28 #5): a page may restyle a component
          // instance (.sl-token-chip over al-chip), which the stock set
          // cannot show. Measured literal styles override the instance's own
          // face: root fill/stroke/radii, and text color recolored on TEXT
          // descendants only — never a nested instance's own root paint (the
          // Phosphor negative-space rule, generalized). Fields exist only on
          // snippet pseudo-contracts, so library composites are untouched.
          if (child.bgCss || child.bcCss || child.fcCss || child.radPx) {
            try {
              if (child.bgCss) { const lp = cssSolid(child.bgCss); if (lp) inst.fills = [lp]; }
              if (child.bcCss && child.bwPx > 0) {
                const sp = cssSolid(child.bcCss);
                if (sp) { inst.strokes = [sp]; inst.strokeAlign = 'INSIDE'; inst.strokeWeight = child.bwPx; }
              }
              if (child.radPx) {
                inst.topLeftRadius = child.radPx[0]; inst.topRightRadius = child.radPx[1];
                inst.bottomRightRadius = child.radPx[2]; inst.bottomLeftRadius = child.radPx[3];
              }
              if (child.fcCss) {
                const fp = cssSolid(child.fcCss);
                if (fp) {
                  (function recolorTexts(n) {
                    for (const c of (n.children || [])) {
                      if (c.type === 'TEXT') { try { c.fills = [fp]; } catch (e2) { /* locked/uneditable */ } }
                      if (c.type !== 'INSTANCE' && 'children' in c) recolorTexts(c);
                    }
                  })(inst);
                }
              }
            } catch (e) { misses.add('instance-style-override-failed:' + child.component); }
          }
          // Nested-icon glyph (chip's ALIconClose -> Phosphor 'x'): swap the
          // wrapper's nested instance, size to the MEASURED box, recolor to
          // the inherited (variant-aware) content color — same swap/recolor
          // conventions as slot icons (T29 instance boundaries respected).
          // Ordered array form ({"al-icon": ["minus","plus"]}): icons are
          // consumed in document order per variant (input-stepper's [-][+]),
          // matching the template's own order. String form applies to every
          // occurrence.
          const glyphSpec = NESTED_ICON_GLYPHS[child.component];
          let glyphName = glyphSpec;
          if (Array.isArray(glyphSpec)) {
            const cur = iconCursor || {};
            const i = cur[child.component] || 0;
            glyphName = glyphSpec[Math.min(i, glyphSpec.length - 1)];
            cur[child.component] = i + 1;
          }
          // SIZE / SWAP / RECOLOR ARE THREE INDEPENDENT STEPS (fixed 2026-08-27).
          // They used to share one "if (glyphName && nestedGlyphByName[glyphName])"
          // guard, so an UNRESOLVED Phosphor glyph skipped the recolor too — the
          // wrapper instance was still placed, keeping the cached glyph its owner
          // last bootstrapped (PaperPlaneTilt) AND a hardcoded white fill. That
          // presented as "al-chip's dismiss icon is the wrong COLOR" when the real
          // cause was a missing icon two steps upstream, and it made every variant's
          // icon ignore the row's content-color delta. Being declared in
          // NESTED_ICON_GLYPHS is what marks this child as an icon; whether its glyph
          // resolved is a separate question, and must not gate the other two steps.
          if (glyphSpec !== undefined) {
            if (child.box && child.box.w >= 1) {
              try { inst.layoutSizingHorizontal = 'FIXED'; inst.layoutSizingVertical = 'FIXED'; } catch (e) { /* not an auto-layout child */ }
              try { inst.resize(child.box.w, child.box.h); } catch (e) { /* keep natural size */ }
            }
            if (glyphName && nestedGlyphByName[glyphName]) {
              let nestedIconInst = null;
              try { nestedIconInst = inst.children.find((c) => c.type === 'INSTANCE'); } catch (e) { nestedIconInst = null; }
              if (nestedIconInst) {
                try { nestedIconInst.swapComponent(nestedGlyphByName[glyphName]); } catch (e) { misses.add('nested-icon-swap-failed:' + child.component); }
              }
            } else if (glyphName) {
              // Named but unresolvable — a new glyph needs a human to bootstrap one
              // in-file instance first (T28/trap 8). Reported, never silently ignored.
              misses.add('nested-icon-glyph-unresolved:' + child.component + ':' + glyphName);
            }
            // Recolor regardless: an icon inherits "currentColor" in the browser, so
            // it must follow this row's resolved content color even when the glyph
            // itself could not be swapped.
            const ip = await boundSolid(nodeColor);
            if (ip) recolorIconChildren(inst, ip);
          }
          continue;
        }
        // TEXT-BEARING LEAF: a childless node carrying its OWN color token
        // reads as a text wrapper (breadcrumbs' inner label link, a legend, a
        // field-note line). It renders as a real TEXT node — colored by its
        // own (state-overridden) color binding, wired to the set's Text
        // property by the post-combine loop (findOwnNode takes the first).
        // Anatomy carries no literal copy (schema), so the characters are
        // the component's display-name placeholder — capture of real leaf
        // text (e.g. the '/' separator glyph) is a named measurement-pass
        // gap, not fabricated here.
        // Curated literal-text leaf (TEXT_CONTENT): the class names a node
        // whose template renders a known literal (the '/' separator). Its
        // color falls back to the nearest ancestor's color binding — the
        // same inheritance the CSS actually uses (the separator div inherits
        // the li's color) — and it lives in its own container, so sibling
        // hover/pill styling never touches it.
        const literal = !child.component && child.cls
          ? String(child.cls).split(/\s+/).map((cl) => TEXT_CONTENT[cl]).find(Boolean)
          : null;
        if (literal) {
          const tn = figma.createText();
          // NAMED 'Literal: …' so the post-combine Text-property wiring can
          // SKIP it — wiring the set's Text property onto a literal glyph
          // replaces the '/' with the property's default (found live: the
          // separator rendered "Breadcrumbs Item" because BFS reached this
          // direct child before the deeper label text).
          tn.name = 'Literal: ' + literal;
          tn.fontName = await font(styleFromWeightVar(t['font-weight']) || 'Regular');
          tn.characters = literal;
          tn.fontSize = LABEL_FONT_SIZE;
          parent.appendChild(tn);
          const ownColorL = t['color'] && t['color'] !== caseRootColor ? t['color'] : null;
          // Fallback face: with NO measured color anywhere up the chain the
          // text kept createText's literal black, which is invisible on a
          // dark sheet and never re-resolves with the theme mode. Content
          // text is content/default by definition (2026-08-28, sl T7).
          const paint = await boundSolid(ownColorL || nodeColor || 'theme/color/content/default');
          if (paint) tn.fills = [paint];
          textNodes.push(tn);
          continue;
        }
        // Text-bearing leaf: MEASURED copy first (anatomy.text — the real
        // rendered string: 'Checkbox label', '/'), else a color-carrying
        // leaf falls back to the Text property default. Color: the node's
        // own binding, else inherited (the CSS cascade the anatomy actually
        // had).
        /**
         * A FORM CONTROL IS A BOX, NOT A TEXT NODE.
         *
         * isTextLeaf treats "childless + carries a color token" as text, which
         * is right for a legend or a field-note line. An input / textarea /
         * select satisfies exactly that test - childless, and it carries color
         * for the value it would display - but it is a SURFACE: border,
         * background, radius, measured box. Classified as text it rendered as a
         * TEXT node carrying the set's Text-property default, so al-input's
         * generated set showed a stray duplicate "Label" where the field should
         * be and no field box at all (measured 2026-08-31: the container came
         * out 35x18 against a measured 227x48).
         *
         * Excluding these tags lets the node fall through to the childless-leaf
         * branch below, which already draws the right thing - a frame at the
         * measured box with the background/border/radius bindings.
         *
         * Keyed on the anatomy's own tag, not on the presence of box facts: a
         * genuine text wrapper can legitimately carry a background tint, so
         * "has a background" would misfire on it, while the tag cannot.
         *
         * NOTE: no backticks in comments here - trap 3.
         */
        const isFormControl = ['input', 'textarea', 'select'].indexOf(String(child.tag)) !== -1;
        const isTextLeaf = !isFormControl && !(child.children || []).length && !child.component && (child.text || t['color']);
        if (isTextLeaf) {
          const tn = figma.createText();
          // PAGE-lane texts are ALL literal — a section is not a
          // parameterized component, and the Text-property wiring stamps its
          // default over whichever 'Label' it picks (it took the footer's
          // quote, then the cite, in successive rounds). Literal: names are
          // never wired (trap 7's convention).
          tn.name = 'Label';
          // Weight: token first, then the page-lane measured font-weight
          // literal (the lead rendered Bold when the site says 400 — hero
          // round 4). Family: the measured per-node family (round 6 — the
          // site mixes Plex Sans/Mono; the masters' single display family
          // was wrong for kicker, lead, chips and terminal alike).
          tn.fontName = await fontFam(child.ffCss, styleFromWeightVar(t['font-weight']) || weightStyleFromCss(child.fwCss) || 'Regular');
          const textProp = OPS.componentProperties.find((p) => p.name === 'Text');
          tn.characters = child.text || (textProp && textProp.default) || 'Label';
          if (OPS.anatomySource === 'measured-page') tn.name = 'Literal: ' + String(tn.characters).slice(0, 24);
          tn.fontSize = LABEL_FONT_SIZE;
          // PAGE-lane literal type metrics (hero learnings note 2026-08-28):
          // generate-snippet attaches the measured USED font-size/line-height
          // as fsPx/lhPx — a page legally overrides component type with
          // clamp()/local CSS, so the measured value outranks the label
          // default (and the token, which reports the authored var, not the
          // clamped used size). Absent on library contracts: no-op there.
          if (child.fsPx) tn.fontSize = child.fsPx;
          if (child.lhPx) tn.lineHeight = { unit: 'PIXELS', value: child.lhPx };
          // PADDING WRAPPER (round 8 — the terminal body's 20/24 padding):
          // a text leaf emitted as bare TEXT loses its padding box. Real
          // measured padding gets a transparent auto-layout wrapper that
          // carries the padding (and the leaf's own bg tint), and the FILL
          // treatment moves to the wrapper.
          const leafPad = (child.padPx && child.padPx.some(function (p) { return p > 1; }) ? child.padPx : null)
            // Recovered margins ride the same wrapper (round 9): trailing
            // padding on a transparent hug box spaces siblings exactly like
            // the margin did (the kicker's margin-bottom: 20).
            || (child.mbPx || child.mrPx ? [0, 0, 0, 0] : null);
          let holder = parent;
          if (leafPad) {
            const wrapF = figma.createFrame();
            wrapF.name = child.cls ? String(child.cls).split(/\s+/)[0] : child.tag;
            parent.appendChild(wrapF);
            wrapF.fills = [];
            wrapF.layoutMode = 'VERTICAL';
            wrapF.primaryAxisSizingMode = 'AUTO';
            wrapF.counterAxisSizingMode = 'AUTO';
            wrapF.paddingTop = leafPad[0]; wrapF.paddingRight = leafPad[1] + (child.mrPx || 0);
            wrapF.paddingBottom = leafPad[2] + (child.mbPx || 0); wrapF.paddingLeft = leafPad[3];
            if (child.bgCss) { const bp = cssSolid(child.bgCss); if (bp) wrapF.fills = [bp]; }
            try {
              const psw = parent.layoutSizingHorizontal;
              if (parent.layoutMode === 'VERTICAL' && (psw === 'FIXED' || psw === 'FILL')) wrapF.layoutSizingHorizontal = 'FILL';
            } catch (e) { /* not an auto-layout child */ }
            holder = wrapF;
          }
          holder.appendChild(tn);
          // Inside a parent with a DEFINITE width, a text leaf must WRAP to
          // that width rather than dictate it. Left auto-sizing, a sentence
          // renders as one very long line and overflows every ancestor - the
          // banner's message did exactly that at 581px inside a 528px row.
          try {
            const ps = holder.layoutSizingHorizontal;
            if (ps === 'FIXED' || ps === 'FILL' || (holder !== parent && holder.layoutMode === 'VERTICAL' && holder.layoutSizingHorizontal === 'FILL')) {
              tn.textAutoResize = 'HEIGHT';
              tn.layoutSizingHorizontal = 'FILL';
            }
          } catch (e) { /* not an auto-layout child */ }
          const ownColor = t['color'] && t['color'] !== caseRootColor ? t['color'] : null;
          // Token first; then the page-lane measured color literal; the
          // theme content/default fallback only when neither exists.
          const paint = await boundSolid(ownColor || nodeColor || (child.fcCss ? null : 'theme/color/content/default'));
          if (paint) tn.fills = [paint];
          else if (child.fcCss) { const lp = cssSolid(child.fcCss); if (lp) tn.fills = [lp]; }
          // COLORED RUNS (round 7 — the terminal's green ticks / red
          // prompt): per-range fills measured by the preformatted-block
          // branch, applied over the base fill. Out-of-range runs are
          // skipped, never a throw.
          if (child.runs && child.runs.length) {
            for (const run of child.runs) {
              const rp = cssSolid(run.color);
              // measure-lib emits {start, end, color} — NOT offset/length
              // (round 8: the offset/length reader matched nothing, so no
              // run color ever applied and the terminal body stayed
              // single-color).
              const rs = run.start;
              const re2 = run.end;
              if (rp && typeof rs === 'number' && typeof re2 === 'number' && re2 > rs && rs >= 0 && re2 <= tn.characters.length) {
                try { tn.setRangeFills(rs, re2, [rp]); } catch (e3) { /* range straddles style boundary */ }
              }
            }
          }
          // MARGIN-AUTO child (round 7 — the terminal title at the bar's far
          // end): expressed as an absolute child at its measured offset.
          if (child.absPos) {
            try { tn.layoutPositioning = 'ABSOLUTE'; tn.x = child.absPos.x; tn.y = child.absPos.y; }
            catch (e4) { misses.add('snippet-abs-pos-failed:Label'); }
          }
          bindNum(tn, 'opacity', t['opacity']);
          textNodes.push(tn);
          continue;
        }
        // Childless GLYPH leaf (Checkbox walkthrough): its size is a
        // measured code fact (anatomy.box — Sass size() literals never
        // surface as tokens), its visibility is its paint. No paint (a
        // native input under a custom control, radius-only) or a 0×0 box
        // (a resting ripple) -> nothing to draw, skipped entirely.
        if (!(child.children || []).length && !child.component) {
          // Browsers split the border shorthand — a measured case can carry
          // border-top-color with no plain border-color (Checkbox's Off box).
          const glyphBorderColor = t['border-color'] || t['border-top-color'];
          const glyphBorderWidth = t['border-width'] || t['border-top-width'];
          // Page-lane literal paints count here too (hero round 4): a
          // rasterised texture/murmur overlay or a literal-styled surface is
          // a childless leaf with EMPTY tokens — the token-only hasPaint
          // check silently skipped (continue) both hero background layers
          // (found by walk-trace instrumentation; nothing downstream ever
          // saw them). NOTE: no backticks in comments here — trap 3.
          const hasPaint = t['background-color'] || glyphBorderColor
            || child.imgB64 || child.imgRef || child.gridTex || child.bgCss || (child.bcCss && child.bwPx > 0);
          const bw = child.box ? child.box.w : 0;
          const bh = child.box ? child.box.h : 0;
          if (!hasPaint || bw < 1 || bh < 1) {
            if (t['outline-color']) pendingOutline = { color: t['outline-color'], width: t['outline-width'], offset: t['outline-offset'] };
            /**
             * NAME THE SKIP. A 0x0 box or an unpainted native control under a
             * custom one is a legitimate nothing-to-draw, but a leaf that IS
             * meant to be visible and happens to carry no paint vanishes here
             * without a trace - which is how al-input-stepper's value segment
             * came out missing (v2 moved the border and surface up to __body,
             * leaving the inner input transparent, and an input has no DOM text
             * to fall back to). Silence is the one failure mode that costs a
             * debugging round; a named miss costs nothing.
             */
            if (bw >= 1 && bh >= 1) misses.add('leaf-no-paint:' + (child.cls ? String(child.cls).split(/\s+/)[0] : child.tag));
            continue;
          }
          const g = figma.createFrame();
          g.name = child.cls ? String(child.cls).split(/\s+/)[0] : child.tag;
          parent.appendChild(g);
          g.fills = [];
          g.resize(bw, bh);
          // ABSOLUTE OVERLAY (texture/murmur — same rule as the container
          // branch): measured offset, document order preserves z-order.
          if (child.absPos) {
            try { g.layoutPositioning = 'ABSOLUTE'; g.x = child.absPos.x; g.y = child.absPos.y; }
            catch (e) { misses.add('snippet-abs-pos-failed:' + g.name); }
          }
          { const p2 = await boundSolid(t['background-color']); if (p2) g.fills = [p2]; }
          if (!t['background-color'] && child.bgCss) { const lp = cssSolid(child.bgCss); if (lp) g.fills = [lp]; }
          // NATIVE GRID TEXTURE (round 6, owner principle: CSS-described
          // paint becomes VECTORS, raster is last resort): hairline
          // rectangles at the parsed pitch — crisp at any zoom,
          // recolorable, and structurally immune to the raster-contamination
          // class. Wins over imgB64 (generate-snippet already withholds the
          // raster when gridTex parsed).
          if (child.gridTex) {
            const gt = child.gridTex;
            const lineP = cssSolid(gt.color);
            if (lineP) {
              if (gt.vertical && gt.pitchX >= 4) {
                for (let gx = 0; gx <= bw; gx += gt.pitchX) {
                  const r = figma.createRectangle();
                  r.name = 'grid-v';
                  r.resize(1, Math.max(bh, 1));
                  r.fills = [lineP];
                  g.appendChild(r);
                  r.x = gx; r.y = 0;
                }
              }
              if (gt.horizontal && gt.pitchY >= 4) {
                for (let gy = 0; gy <= bh; gy += gt.pitchY) {
                  const r = figma.createRectangle();
                  r.name = 'grid-h';
                  r.resize(Math.max(bw, 1), 1);
                  r.fills = [lineP];
                  g.appendChild(r);
                  r.x = 0; r.y = gy;
                }
              }
            }
          } else if (child.imgRef) {
            IMAGE_TARGETS.push({ id: g.id, path: childPath });
          } else if (child.imgB64) {
            try {
              const img = figma.createImage(figma.base64Decode(child.imgB64));
              g.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: img.hash }];
            } catch (e) { misses.add('snippet-image-fill-failed:' + g.name); }
          }
          const radiusVar2 = t['border-radius'] || t['border-top-left-radius'];
          if (radiusVar2) for (const fld of ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius']) bindNum(g, fld, radiusVar2);
          else if (child.radPx) {
            g.topLeftRadius = child.radPx[0]; g.topRightRadius = child.radPx[1];
            g.bottomRightRadius = child.radPx[2]; g.bottomLeftRadius = child.radPx[3];
          }
          if (glyphBorderColor) {
            const sp = await boundSolid(glyphBorderColor);
            if (sp) { g.strokes = [sp]; g.strokeAlign = 'INSIDE'; g.strokeWeight = 2; bindNum(g, 'strokeWeight', glyphBorderWidth); }
          } else if (child.bcCss && child.bwPx > 0) {
            const sp2 = cssSolid(child.bcCss);
            if (sp2) {
              g.strokes = [sp2];
              g.strokeAlign = 'INSIDE';
              if (child.bw4) {
                try {
                  g.strokeTopWeight = child.bw4[0]; g.strokeRightWeight = child.bw4[1];
                  g.strokeBottomWeight = child.bw4[2]; g.strokeLeftWeight = child.bw4[3];
                } catch (e) { g.strokeWeight = child.bwPx; }
              } else g.strokeWeight = child.bwPx;
            }
          }
          bindNum(g, 'opacity', t['opacity']);
          // Curated glyph vector (check / indeterminate dash — copied from
          // the component's own stylesheet masks, colored by the token the
          // CSS ::before layer binds).
          const clsTokens = child.cls ? String(child.cls).split(/\s+/) : [];
          const glyph = GLYPHS.find((gl) => clsTokens.includes(gl.class)
            && Object.entries(gl.when || {}).every(([ax, val]) => (axisValues || {})[ax] === val));
          if (glyph && glyph.svg) {
            // glyph.boxColor: the CSS ::before layer covers the whole box in
            // its own color, with the mark as a mask cutout showing the box
            // bg through — so the VISIBLE square is the ::before color and
            // the mark is the underlying bg. Mirrored exactly: box fill
            // rebinds to boxColor, the vector takes the underlying color.
            if (glyph.boxColor) { const bp = await boundSolid(glyph.boxColor); if (bp) g.fills = [bp]; }
            try {
              const sv = figma.createNodeFromSvg(glyph.svg);
              g.appendChild(sv);
              sv.x = 0; sv.y = 0;
              // createNodeFromSvg's wrapper frame carries its own fill —
              // cleared BEFORE recoloring, or the recolor paints the whole
              // wrapper and buries the mark (found live: a solid square over
              // the box instead of a check).
              sv.fills = [];
              const gp = await boundSolid(glyph.color);
              if (gp) recolorIconTree(sv, gp);
            } catch (e) { misses.add('glyph-svg-failed:' + glyph.class); }
          }
          // Hoisted focus ring: wrap the glyph in an offset, stroked frame.
          if (pendingOutline) {
            const ring = figma.createFrame();
            ring.name = 'Focus Ring';
            ring.layoutMode = 'HORIZONTAL';
            ring.primaryAxisSizingMode = 'AUTO';
            ring.counterAxisSizingMode = 'AUTO';
            ring.fills = [];
            parent.appendChild(ring);
            bindNum(ring, 'paddingTop', pendingOutline.offset);
            bindNum(ring, 'paddingBottom', pendingOutline.offset);
            bindNum(ring, 'paddingLeft', pendingOutline.offset);
            bindNum(ring, 'paddingRight', pendingOutline.offset);
            const rp = await boundSolid(pendingOutline.color);
            if (rp) { ring.strokes = [rp]; ring.strokeAlign = 'INSIDE'; ring.strokeWeight = 2; bindNum(ring, 'strokeWeight', pendingOutline.width); }
            ring.appendChild(g);
            pendingOutline = null;
          }
          continue;
        }
        const hasContent = (child.children || []).length || Object.keys(t).length || child.component
          // Page-lane literal paints count as content: a raster overlay
          // (texture/murmur) or a literal-styled surface has no token yet
          // absolutely must build (hero round 4).
          || child.imgB64 || child.imgRef || child.bgCss || child.bcCss;
        if (!hasContent) continue; // bare structural leaf (ripple spans etc.) — nothing canvas-expressible to build
        const f = figma.createFrame();
        // An annotated child whose set did not resolve renders as a coarse
        // frame NAMED for the missing component, so the gap is visible on
        // canvas as well as in missingVars.
        f.name = child.component ? child.component + ' (set unresolved)' : (child.cls ? String(child.cls).split(/\s+/)[0] : child.tag);
        parent.appendChild(f);
        f.fills = [];
        // ABSOLUTE OVERLAY (page lane; hero round 4): the hero's texture and
        // murmur layers are position:absolute stacked BEHIND the content.
        // Auto layout would stack them as flow siblings; layoutPositioning
        // ABSOLUTE keeps them as overlays at their measured offset, sized to
        // their measured box (resize's both-axes-FIXED side effect is exactly
        // right for an overlay). Document order preserves z-order.
        if (child.absPos && child.box) {
          try {
            f.layoutPositioning = 'ABSOLUTE';
            f.x = child.absPos.x;
            f.y = child.absPos.y;
            f.resize(Math.max(child.box.w, 1), Math.max(child.box.h, 1));
          } catch (e) { misses.add('snippet-abs-pos-failed:' + f.name); }
        }
        const isFlex = !!(child.layout && (child.layout.display === 'flex' || child.layout.display === 'inline-flex'));
        // Axis comes from 'display', NOT from 'direction' — see layoutAxisFor.
        // Reading 'direction' unconditionally forced HORIZONTAL onto every
        // block-level container (193 block + 62 list-item + 65 table-cell +
        // the table groups = 327 of the 433 non-flex nodes, across 53 of the
        // 103 contracts), which is trap 24's al-tabs defect reproduced on
        // every composite's INNER frames rather than on its root.
        f.layoutMode = layoutAxisFor(child.layout);
        // Figma honours layoutWrap on HORIZONTAL auto-layout only, so the
        // gate is on the RESOLVED axis. The try/catch is belt-and-braces for
        // older plugin API versions — not verified to throw, just not worth
        // failing a whole generation run over.
        if (f.layoutMode === 'HORIZONTAL' && layoutWrapsFor(child.layout)) {
          try { f.layoutWrap = 'WRAP'; } catch (e) { /* older plugin API */ }
        }
        // INLINE FLOW (footer round 5): a block box whose children are all
        // inline-level flows HORIZONTALLY, roughly text-axis centered.
        if (child.inlineFlow) { f.layoutMode = 'HORIZONTAL'; f.counterAxisAlignItems = 'CENTER'; }
        // align-items/justify-content are real facts for GRID too (round 8
        // — the hero's two-column grid uses align-items flex-end, which is
        // what bottom-aligns the terminal aside). No backticks here: trap 3.
        if (isFlex || child.layout.display === 'grid') {
          f.counterAxisAlignItems = child.layout.align === 'center' ? 'CENTER' : child.layout.align === 'flex-end' ? 'MAX' : 'MIN';
          f.primaryAxisAlignItems = child.layout.justify === 'center' ? 'CENTER' : child.layout.justify === 'flex-end' ? 'MAX' : child.layout.justify === 'space-between' ? 'SPACE_BETWEEN' : 'MIN';
        }
        f.primaryAxisSizingMode = 'AUTO';
        f.counterAxisSizingMode = 'AUTO';
        // WRAP CONTAINER WIDTH (round 7 — owner: "the multiple chip
        // container should have a max width bc it wraps the 3rd one"): a
        // wrapping row that HUGS its width can never actually wrap — its
        // measured box IS the wrap width. Fixed width, height keeps
        // hugging so rows can grow.
        if (f.layoutMode === 'HORIZONTAL' && layoutWrapsFor(child.layout) && child.box && child.box.w >= 8) {
          try {
            f.resize(child.box.w, Math.max(f.height, 1));
            f.primaryAxisSizingMode = 'FIXED';
            f.counterAxisSizingMode = 'AUTO';
          } catch (e) { /* keep hug */ }
        }
        // FILL, from the node's OWN measured flex-grow. This is a real
        // contract fact now (measure-lib records flex-grow when non-zero), not
        // a width heuristic: a growing child fills its parent's MAIN axis,
        // exactly as the browser lays it out. It is the fix for the
        // hug-everywhere defect - a filling message used to render at its
        // max-content width and overflow its own container.
        if (child.layout && child.layout.grow) {
          try {
            if (parent.layoutMode === 'HORIZONTAL') f.layoutSizingHorizontal = 'FILL';
            else if (parent.layoutMode === 'VERTICAL') f.layoutSizingVertical = 'FILL';
          } catch (e) { /* parent is not an auto-layout frame */ }
        }
        // CROSS-AXIS STRETCH. In CSS a block-level child fills its
        // container's inline size, and so does a flex child under the default
        // 'align-items: stretch'. Figma has no block model, so without this a
        // 600px-wide bar renders its content bunched at the left. Gated on the
        // parent having a DEFINITE size on that axis - stretching inside a
        // hugging parent is circular, and hug stays the right default for the
        // cards and chips that make up most of the library.
        {
          // Three refinements (spec 2026-08-28-layout-fill-and-grow-facts):
          //   1. The child's own align-self override wins over the parent's
          //      align-items — a child that opts out of stretch must not FILL.
          //   2. Block-level gate: in a BLOCK (non-flex) vertical parent only
          //      block-level children fill the inline size; an inline-flex
          //      chip in a card must keep hugging. Flex items are blockified,
          //      so a flex parent stretches regardless of the child's display.
          //   3. HORIZONTAL flex rows stretch their children's HEIGHT under
          //      the default align-items (the equal-height-row case) — same
          //      definite-parent-size circularity rule as the vertical case.
          const pAlign = node && node.layout ? node.layout.align : null;
          const selfAlign = child.layout ? child.layout.alignSelf : null;
          const eff = selfAlign || pAlign;
          const stretches = !eff || eff === 'normal' || eff === 'stretch';
          const parentIsFlex = !!(node && node.layout && (node.layout.display === 'flex' || node.layout.display === 'inline-flex'));
          const childDisplay = child.layout ? child.layout.display : null;
          const childBlockLevel = !childDisplay || /^(block|flex|grid|table|list-item|flow-root)$/.test(childDisplay);
          if (stretches && (parentIsFlex || childBlockLevel) && parent.layoutMode === 'VERTICAL') {
            try {
              const ps = parent.layoutSizingHorizontal;
              if (ps === 'FIXED' || ps === 'FILL') f.layoutSizingHorizontal = 'FILL';
            } catch (e) { /* parent is not an auto-layout frame */ }
          }
          if (stretches && parentIsFlex && parent.layoutMode === 'HORIZONTAL') {
            try {
              const ps = parent.layoutSizingVertical;
              if (ps === 'FIXED' || ps === 'FILL') f.layoutSizingVertical = 'FILL';
            } catch (e) { /* parent is not an auto-layout frame */ }
          }
        }
        { const p = await boundSolid(t['background-color']); if (p) f.fills = [p]; }
        // PAGE-lane literal fills (token always wins): measured used
        // background color, and a rasterised replaced element (canvas /
        // bgImage lattice) as an IMAGE fill — this is what brings the hero's
        // grid texture and murmur glyph field back.
        if (!t['background-color'] && child.bgCss) { const lp = cssSolid(child.bgCss); if (lp) f.fills = [lp]; }
        if (child.imgRef) {
          IMAGE_TARGETS.push({ id: f.id, path: childPath });
        } else if (child.imgB64) {
          try {
            const img = figma.createImage(figma.base64Decode(child.imgB64));
            f.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: img.hash }];
          } catch (e) { misses.add('snippet-image-fill-failed:' + f.name); }
        }
        bindNum(f, 'itemSpacing', t['column-gap'] || t['gap']);
        bindNum(f, 'paddingTop', t['padding-top'] || t['padding']);
        bindNum(f, 'paddingBottom', t['padding-bottom'] || t['padding']);
        bindNum(f, 'paddingLeft', t['padding-left'] || t['padding']);
        bindNum(f, 'paddingRight', t['padding-right'] || t['padding']);
        // PAGE-lane literal spacing fallbacks (padPx=[t,r,b,l], gapPx —
        // attached by generate-snippet; hero learnings note 2026-08-28):
        // measured used paddings/gaps for spacing authored with no token.
        // A token binding above always wins, per side.
        if (child.padPx) {
          if (!t['padding-top'] && !t['padding'] && child.padPx[0] > 0) f.paddingTop = child.padPx[0];
          if (!t['padding-bottom'] && !t['padding'] && child.padPx[2] > 0) f.paddingBottom = child.padPx[2];
          if (!t['padding-left'] && !t['padding'] && child.padPx[3] > 0) f.paddingLeft = child.padPx[3];
          if (!t['padding-right'] && !t['padding'] && child.padPx[1] > 0) f.paddingRight = child.padPx[1];
        }
        if (child.gapPx && !t['column-gap'] && !t['gap']) f.itemSpacing = child.gapPx;
        // Recovered trailing margins (round 9): extra space AFTER this box,
        // expressed as its own trailing padding (transparent hug frame —
        // visually identical to the margin it recovers).
        if (child.mbPx) f.paddingBottom = (f.paddingBottom || 0) + child.mbPx;
        if (child.mrPx) f.paddingRight = (f.paddingRight || 0) + child.mrPx;
        // WRAP ROW GAP (round 8 - the chip rows touched): CSS gap sets
        // BOTH axes; Figma's cross-axis wrap spacing is its own property.
        if (f.layoutMode === 'HORIZONTAL' && layoutWrapsFor(child.layout)) {
          try { f.counterAxisSpacing = f.itemSpacing; } catch (e) { /* wrap unsupported */ }
        }
        // GRID CHILDREN own their measured TRACK width (round 8 — the
        // terminal aside hugged away its right-column width): grid tracks
        // are definite by layout; the child's measured box IS its slot.
        if (node && node.layout && node.layout.display === 'grid' && child.box && child.box.w >= 8) {
          try {
            // EXACT TRACK WIDTH (owner, 2026-08-29: "should be 3 for some,
            // 2 for others"): uniform grids split the container exactly —
            // measured-width rounding drift made 3-across wrap to 2+1.
            // Height always HUGS via the sizing-mode pattern (a measured-
            // height resize clipped card content — owner: "height cut offs
            // on cards instead of 100% or hug").
            let wTrack = child.box.w;
            if (node.gridCols > 1 && node.box && node.box.w > 8) {
              const padH = node.padPx ? (node.padPx[1] + node.padPx[3]) : 0;
              const gapG = typeof parent.itemSpacing === 'number' ? parent.itemSpacing : 0;
              const track = ((node.box.w - padH) - (node.gridCols - 1) * gapG) / node.gridCols;
              if (track > 8) wTrack = Math.floor(track * 10) / 10;
            }
            f.resize(wTrack, Math.max(f.height, 1));
            if (f.layoutMode === 'VERTICAL') { f.counterAxisSizingMode = 'FIXED'; f.primaryAxisSizingMode = 'AUTO'; }
            else if (f.layoutMode === 'HORIZONTAL') { f.primaryAxisSizingMode = 'FIXED'; f.counterAxisSizingMode = 'AUTO'; }
          } catch (e) { /* keep hug */ }
        }
        // GRID GUTTER CENTERING — v1 of the grid-track gap (fill-facts spec
        // T10; hero learnings note 2026-08-28). grid→HORIZONTAL carries no
        // track sizes, so a constrained layout's fluid outer gutters vanish
        // and content sits 88px left of truth. With exactly ONE buildable
        // child and measured boxes on both, the gutters are recoverable as
        // literal symmetric padding. Token-bound padding (bindNum above)
        // wins; sub-pixel gutters are noise, not padding.
        if (child.layout && child.layout.display === 'grid' && !t['padding-left'] && !t['padding'] && child.box && child.box.w > 1) {
          const gridKids = (child.children || []).filter((k) => k.box && !(k.box.w <= 2 && k.box.h <= 2));
          if (gridKids.length === 1 && gridKids[0].box.w < child.box.w) {
            const gpad = Math.round((child.box.w - gridKids[0].box.w) / 2);
            if (gpad > 1) { f.paddingLeft = gpad; f.paddingRight = gpad; }
          }
        }
        const radiusVar = t['border-radius'] || t['border-top-left-radius'];
        if (radiusVar) for (const fld of ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius']) bindNum(f, fld, radiusVar);
        else if (child.radPx) {
          // Page-lane literal radii [tl,tr,br,bl] when no token matched.
          f.topLeftRadius = child.radPx[0]; f.topRightRadius = child.radPx[1];
          f.bottomRightRadius = child.radPx[2]; f.bottomLeftRadius = child.radPx[3];
        }
        if (t['border-color']) {
          const strokePaint = await boundSolid(t['border-color']);
          if (strokePaint) {
            f.strokes = [strokePaint];
            f.strokeAlign = 'INSIDE';
            bindNum(f, 'strokeWeight', t['border-width']);
          }
        } else if (child.bcCss && child.bwPx > 0) {
          // Page-lane literal border (the terminal card's chrome). PER-SIDE
          // weights when measured (footer round 3): a divider is border-top
          // only — a single strokeWeight boxed the quote and legal rows.
          const sp = cssSolid(child.bcCss);
          if (sp) {
            f.strokes = [sp];
            f.strokeAlign = 'INSIDE';
            if (child.bw4) {
              try {
                f.strokeTopWeight = child.bw4[0]; f.strokeRightWeight = child.bw4[1];
                f.strokeBottomWeight = child.bw4[2]; f.strokeLeftWeight = child.bw4[3];
              } catch (e) { f.strokeWeight = child.bwPx; }
            } else f.strokeWeight = child.bwPx;
          }
        }
        bindNum(f, 'opacity', t['opacity']);
        // MIXED CONTENT (footer round 3): a frame node carries its OWN text
        // beside element children (blockquote copy + cite; chip dot +
        // label). Emit that text as a real TEXT child — a leading tiny
        // glyph (a chip's <=12px dot) stays first, otherwise the text leads.
        const mixedText = child.text && (child.children || []).length ? child.text : null;
        const emitOwnText = async () => {
          if (!mixedText) return;
          const tn2 = figma.createText();
          // Literal:-prefixed names are NEVER wired to the Text component
          // property (trap 7's own convention) — named 'Label', this node
          // got wired and the property default stamped the footer's
          // description over the MLK quote.
          tn2.name = 'Literal: ' + String(mixedText).slice(0, 24);
          tn2.fontName = await fontFam(child.ffCss, styleFromWeightVar(t['font-weight']) || weightStyleFromCss(child.fwCss) || 'Regular');
          tn2.characters = mixedText;
          tn2.fontSize = LABEL_FONT_SIZE;
          if (child.fsPx) tn2.fontSize = child.fsPx;
          if (child.lhPx) tn2.lineHeight = { unit: 'PIXELS', value: child.lhPx };
          f.appendChild(tn2);
          try {
            const psm = f.layoutSizingHorizontal;
            if (f.layoutMode === 'VERTICAL' && (psm === 'FIXED' || psm === 'FILL')) { tn2.textAutoResize = 'HEIGHT'; tn2.layoutSizingHorizontal = 'FILL'; }
          } catch (e) { /* not sizable */ }
          const p3 = await boundSolid(t['color'] || null);
          if (p3) tn2.fills = [p3];
          else if (child.fcCss) { const lp3 = cssSolid(child.fcCss); if (lp3) tn2.fills = [lp3]; }
          textNodes.push(tn2);
        };
        const firstKid = (child.children || [])[0];
        const tinyFirstKid = firstKid && firstKid.box && firstKid.box.w <= 12 && firstKid.box.h <= 12;
        // A leading dash/em-dash means the text CONTINUES its sibling
        // ("<span>Jessi Hall</span> — Producer") — emit it after (T24: the
        // testimonial attribution rendered role-then-name).
        const textTrails = tinyFirstKid || /^[\s–—-]/.test(String(mixedText || ''));
        if (!textTrails) await emitOwnText();
        await buildAnatomyChildren(child, f, state, childPath, nodeColor, axisValues, caseRootColor, iconCursor, propsCursor);
        if (textTrails) await emitOwnText();
        // A container whose children ALL got skipped (paintless inputs,
        // CSS-drawn thumbs, 0-box ripples) is really a glyph: a childless
        // hug frame keeps Figma's 100x100 createFrame default (the Toggle
        // track rendered as a giant square). Size it to its MEASURED box —
        // resize() sets both axes FIXED, which is exactly right here.
        if (!f.children.length) {
          if (child.box && child.box.w >= 1 && child.box.h >= 1) f.resize(child.box.w, child.box.h);
          else f.remove();
        }
      }
    }

    async function buildVariant(state, variant, axisValues, tokens, variantName, vroot) {
      const comp = figma.createComponent();
      comp.name = variantName;
      page.appendChild(comp); // combineAsVariants requires siblings already on the target page
      comp.fills = [];

      // vroot: this variant's OWN anatomy tree (its measured case when case
      // axes fanned out; the shared base otherwise). Its tokens are the
      // structural fallbacks below — the resolved per-row tokens map
      // already layered this case's root tokens in buildOps.
      const vrootTokens = (vroot && vroot.tokens) || {};
      const isFlex = !!(vroot && vroot.layout && (vroot.layout.display === 'flex' || vroot.layout.display === 'inline-flex'));
      // The ROOT takes its axis from 'display' too — same rule as the child
      // frames, and for the same reason (see layoutAxisFor).
      //
      // This used to be gated on isFlex, so a NON-flex root got no auto-layout
      // at all. Trap 24 in the altitude-figma-sync skill records that gate as
      // the fix for al-tabs rendering its tablist and panel side by side, and
      // justifies it as "non-flex roots keep their measured absolute
      // geometry". They do not: NOTHING in this builder assigns x/y to a
      // walked anatomy child, and resize() is never called on a component. So
      // a non-flex root kept createComponent's untouched 100x100 default while
      // its content ran outside its own bounds.
      //
      // Measured live on al-table (root 'display: block') before this change:
      //   COMPONENT "State=Default, …"  layoutMode NONE  100x100
      //     └─ FRAME "al-c-table__scroll"  x0 y0  243x100   <- 143px outside
      // and the run reported maxVariantWidth/Height 100 — the number the
      // presentation frame and prop sheet lay themselves out against.
      //
      // HORIZONTAL was the wrong axis for a block root; the answer is the
      // RIGHT axis, not no axis. VERTICAL also happens to be what trap 24
      // actually wanted for al-tabs (tablist ABOVE panel, matching its real
      // 291x79), so this subsumes that fix rather than reverting it.
      comp.layoutMode = layoutAxisFor(vroot && vroot.layout);
      if (comp.layoutMode === 'HORIZONTAL' && layoutWrapsFor(vroot && vroot.layout)) {
        try { comp.layoutWrap = 'WRAP'; } catch (e) { /* older plugin API */ }
      }
      // Alignment is the ONE thing that stays flex-only: 'align'/'justify' are
      // flexbox properties, and on a non-flex node they carry their initial
      // values ('normal'), which say nothing about how the box lays out.
      if (isFlex) {
        comp.counterAxisAlignItems = vroot.layout.align === 'center' ? 'CENTER' : vroot.layout.align === 'flex-end' ? 'MAX' : 'MIN';
        comp.primaryAxisAlignItems = vroot.layout.justify === 'center' ? 'CENTER' : vroot.layout.justify === 'flex-end' ? 'MAX' : vroot.layout.justify === 'space-between' ? 'SPACE_BETWEEN' : 'MIN';
      }
      // HUG both axes — no pixel geometry exists to target a FIXED size
      // against, and resize() is never called (Sizing Modes ref trap). These
      // must be set for EVERY root, not just flex ones: hug is what replaces
      // createComponent's 100x100 default with the content's real size, and a
      // non-flex root is exactly the case that was stuck at 100x100.
      comp.primaryAxisSizingMode = 'AUTO';
      comp.counterAxisSizingMode = 'AUTO';
      // ROOT_WIDTH (figma.gen.json rootWidth): a FULL-BLEED component has a
      // width its content does not imply. al-banner is 'inline-size: 100%' - a
      // page-level bar - so hugging produced a ~729px stub whose width was
      // just "however long the message happened to be", and whose two variants
      // came out different widths. Hug is right for a card or a chip; it is
      // wrong for a bar, and no contract fact distinguishes them (the known
      // hug-vs-fill blind spot), so this is curation.
      //
      // true -> use the measured root box width; a number -> that width.
      // Applied AFTER the hug assignment above so it wins, and the primary
      // axis is put back to AUTO because resize() sets BOTH axes FIXED.
      if (ROOT_WIDTH) {
        const wantW = ROOT_WIDTH === true ? (vroot && vroot.box && vroot.box.w) : Number(ROOT_WIDTH);
        if (wantW && wantW >= 1) {
          rootFixedWidth = wantW;
          try {
            comp.resize(wantW, Math.max(comp.height, 1));
            // Vertical root: width is the COUNTER axis, height the primary.
            // Horizontal root: the reverse. Keep the height axis hugging so
            // the bar still grows with its content.
            if (comp.layoutMode === 'VERTICAL') { comp.counterAxisSizingMode = 'FIXED'; comp.primaryAxisSizingMode = 'AUTO'; }
            else { comp.primaryAxisSizingMode = 'FIXED'; comp.counterAxisSizingMode = 'AUTO'; }
          } catch (e) { misses.add('root-width-failed:' + variantName); }
        }
      }
      // Padding and gap are box-model facts, not flex facts — a block
      // container has padding too, and bindNum is a no-op when the token is
      // absent, so binding unconditionally cannot invent one.
      bindNum(comp, 'itemSpacing', tokens['column-gap'] || tokens['gap'] || vrootTokens['column-gap'] || vrootTokens['gap']);
      bindNum(comp, 'paddingTop', tokens['padding-top'] || tokens['padding'] || vrootTokens['padding-top'] || vrootTokens['padding']);
      bindNum(comp, 'paddingBottom', tokens['padding-bottom'] || tokens['padding'] || vrootTokens['padding-bottom'] || vrootTokens['padding']);
      bindNum(comp, 'paddingLeft', tokens['padding-left'] || tokens['padding'] || vrootTokens['padding-left'] || vrootTokens['padding']);
      bindNum(comp, 'paddingRight', tokens['padding-right'] || tokens['padding'] || vrootTokens['padding-right'] || vrootTokens['padding']);
      // PAGE-lane literal spacing fallbacks on the ROOT (padPx/gapPx — same
      // rule as the child-frame site; a token binding above always wins).
      // The hero's own 128px clamp() top padding lives here.
      if (vroot && vroot.padPx) {
        const noPad = (side) => !tokens[side] && !tokens['padding'] && !vrootTokens[side] && !vrootTokens['padding'];
        if (noPad('padding-top') && vroot.padPx[0] > 0) comp.paddingTop = vroot.padPx[0];
        if (noPad('padding-bottom') && vroot.padPx[2] > 0) comp.paddingBottom = vroot.padPx[2];
        if (noPad('padding-left') && vroot.padPx[3] > 0) comp.paddingLeft = vroot.padPx[3];
        if (noPad('padding-right') && vroot.padPx[1] > 0) comp.paddingRight = vroot.padPx[1];
      }
      if (vroot && vroot.gapPx && !tokens['column-gap'] && !tokens['gap'] && !vrootTokens['column-gap'] && !vrootTokens['gap']) comp.itemSpacing = vroot.gapPx;

      // T18: tokens is this ROW's resolved facts — anatomy root overridden by
      // conditionalBindings.variant[<variant>] then a state delta (compound
      // variant+state, else the generic conditionalBindings.state) — see
      // buildOps(). Falls back to rootTokens only for facts conditionalBindings
      // never carries (border-radius, gap, padding — shared, not variant/state-conditional).
      { const p = await boundSolid(tokens['background-color']); if (p) comp.fills = [p]; }
      const radiusVar = tokens['border-radius'] || tokens['border-top-left-radius'] || vrootTokens['border-radius'] || vrootTokens['border-top-left-radius'];
      if (radiusVar) {
        for (const f of ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius']) bindNum(comp, f, radiusVar);
      }
      if (tokens['border-color']) {
        const strokePaint = await boundSolid(tokens['border-color']);
        if (strokePaint) {
          comp.strokes = [strokePaint];
          comp.strokeAlign = 'INSIDE';
          bindNum(comp, 'strokeWeight', tokens['border-width']);
        }
      }

      if (USE_ANATOMY_WALK) {
        // Walk path (composites + case-axis components): nested components
        // as instances, text-bearing leaves as TEXT (own color token,
        // per-path state overrides), the rest as coarse frames. The
        // icon/label recipe below is the NON-walk pilot path and is skipped
        // entirely.
        await buildAnatomyChildren(vroot, comp, state, '0', tokens['color'] || ((vroot && vroot.tokens) ? vroot.tokens['color'] : null) || null, axisValues, (vroot && vroot.tokens) ? (vroot.tokens["color"] || null) : null, {}, {});
      } else {
      // T19: this row's content-color paint, resolved ONCE and shared by the
      // label text AND both slot icons — confirmed live against the real set
      // (icon fill and label fill are always the SAME bound variable, every
      // Variant/State row; see component-config.mjs's iconSizeVar notes for
      // the one place this deliberately does NOT follow a per-variant
      // contract fact).
      // content/default fallback, same as the walk path's text branches: a
      // row with NO measured color token otherwise leaves the label at
      // createText's literal black, which never re-resolves with theme mode
      // (2026-08-28, sl T7 — text-block's lead was invisible on dark sheets).
      const contentPaint = await boundSolid(tokens['color'] || 'theme/color/content/default');

      // Icon Before (leading) — appended FIRST so it sits before the label in
      // the auto-layout's row order. T23: visibility is STATIC per this
      // specific variant when Slot Before is a curated AXIS (this variant's
      // own axisValues['Slot Before'] — a separately-built component per
      // True/False, never a runtime toggle); falls back to the T19 default
      // (hidden, wired via a shared BOOLEAN property's visible reference
      // after combineAsVariants) when Slot Before stayed a property.
      // Icon Before/After itself is ALWAYS a component property either way
      // (component properties can only be added to the COMPONENT_SET, not a
      // lone variant — SKILL.md §3), wired below after combineAsVariants.
      const beforeGlyphComp = iconComponentsByLayer['Icon Before'];
      if (beforeGlyphComp && ICON_WRAPPER_MASTER) {
        const showBefore = slotAxisBefore ? axisValues[slotAxisBefore.name] === 'True' : false;
        // T28: only createInstance() when this row actually shows it (axis
        // mode) — property mode still needs one hidden instance per variant
        // for the shared boolean's visible reference to toggle.
        if (showBefore || !slotAxisBefore) {
          // T29: instantiate the DS "Icon" WRAPPER, never the raw Phosphor
          // glyph component directly — the wrapper has no INSTANCE_SWAP
          // property of its own (confirmed live: it is a lone COMPONENT, not
          // a COMPONENT_SET), so the glyph is swapped onto its nested
          // instance below instead.
          const inst = ICON_WRAPPER_MASTER.createInstance();
          inst.name = 'Icon Before';
          comp.appendChild(inst);
          inst.visible = showBefore;
          // T28: FIXED sizing explicitly, BEFORE binding width/height — an
          // auto-layout child's sizing mode can default to something that
          // fights a bound-variable resize otherwise (Sizing Modes ref).
          try { inst.layoutSizingHorizontal = 'FIXED'; inst.layoutSizingVertical = 'FIXED'; } catch (e) { /* not an auto-layout child */ }
          bindNum(inst, 'width', ICON_SIZE_FIGMA_VAR);
          bindNum(inst, 'height', ICON_SIZE_FIGMA_VAR);
          // T29: swap the resolved Phosphor glyph INTO the wrapper's own
          // nested instance (never onto inst itself, which stays the
          // wrapper). CONFIRMED LIVE (T29): a nested instance-within-an-
          // instance's OWN width/height is NOT independently resizable
          // through this plugin API — setBoundVariable, resize(), AND
          // resizeWithoutConstraints() all return without throwing but
          // silently leave the geometry unchanged (reproduced even before
          // any swap, on the master's own untouched default child) — a
          // platform restriction on nested-instance-child geometry writes,
          // not a bug in this script. The attempt is kept (harmless, and
          // correct if a future Figma API version lifts the restriction);
          // the honest outcome is reported below instead of assuming
          // success. The WRAPPER's own size (bound above) is unaffected and
          // correct either way.
          const nested = inst.children.find((c) => c.type === 'INSTANCE');
          if (nested) {
            try {
              nested.swapComponent(beforeGlyphComp);
              try { nested.layoutSizingHorizontal = 'FIXED'; nested.layoutSizingVertical = 'FIXED'; } catch (e) { /* not an auto-layout child */ }
              bindNum(nested, 'width', ICON_SIZE_FIGMA_VAR);
              bindNum(nested, 'height', ICON_SIZE_FIGMA_VAR);
              const sizeVar = V[ICON_SIZE_FIGMA_VAR];
              const boundOk = sizeVar && nested.boundVariables && nested.boundVariables.width && nested.boundVariables.width.id === sizeVar.id;
              if (!boundOk) misses.add('icon-wrapper-nested-size-not-bindable:Icon Before');
            } catch (e) { misses.add('icon-wrapper-swap-failed:Icon Before'); }
          } else {
            misses.add('icon-wrapper-has-no-nested-instance:Icon Before');
          }
          recolorIconChildren(inst, contentPaint);
        }
      }

      // Label — anatomy's nested text-only wrapper spans (al-c-button__text x2)
      // carry no tokens/layout facts beyond the leaf's own, so they collapse
      // into one text node appended directly to the component.
      const fontName = await font(styleFromWeightVar(tokens['font-weight']) || LABEL_FONT_STYLE);
      const t = figma.createText();
      t.fontName = fontName;
      const textProp = OPS.componentProperties.find((p) => p.name === 'Text');
      t.characters = (textProp && textProp.default) || 'Label';
      t.fontSize = LABEL_FONT_SIZE;
      comp.appendChild(t);
      textNodes.push(t);

      if (contentPaint) t.fills = [contentPaint];

      // Icon After (trailing) — appended LAST, same wiring as Icon Before.
      const afterGlyphComp = iconComponentsByLayer['Icon After'];
      if (afterGlyphComp && ICON_WRAPPER_MASTER) {
        const showAfter = slotAxisAfter ? axisValues[slotAxisAfter.name] === 'True' : false;
        if (showAfter || !slotAxisAfter) {
          // T29: same wrapper-instance + nested-swap convention as Icon
          // Before above.
          const inst = ICON_WRAPPER_MASTER.createInstance();
          inst.name = 'Icon After';
          comp.appendChild(inst);
          inst.visible = showAfter;
          try { inst.layoutSizingHorizontal = 'FIXED'; inst.layoutSizingVertical = 'FIXED'; } catch (e) { /* not an auto-layout child */ }
          bindNum(inst, 'width', ICON_SIZE_FIGMA_VAR);
          bindNum(inst, 'height', ICON_SIZE_FIGMA_VAR);
          // T29: see the matching comment on Icon Before above — nested-
          // instance-within-an-instance resize is CONFIRMED not writable
          // through this plugin API; attempted anyway, reported honestly.
          const nested = inst.children.find((c) => c.type === 'INSTANCE');
          if (nested) {
            try {
              nested.swapComponent(afterGlyphComp);
              try { nested.layoutSizingHorizontal = 'FIXED'; nested.layoutSizingVertical = 'FIXED'; } catch (e) { /* not an auto-layout child */ }
              bindNum(nested, 'width', ICON_SIZE_FIGMA_VAR);
              bindNum(nested, 'height', ICON_SIZE_FIGMA_VAR);
              const sizeVar = V[ICON_SIZE_FIGMA_VAR];
              const boundOk = sizeVar && nested.boundVariables && nested.boundVariables.width && nested.boundVariables.width.id === sizeVar.id;
              if (!boundOk) misses.add('icon-wrapper-nested-size-not-bindable:Icon After');
            } catch (e) { misses.add('icon-wrapper-swap-failed:Icon After'); }
          } else {
            misses.add('icon-wrapper-has-no-nested-instance:Icon After');
          }
          recolorIconChildren(inst, contentPaint);
        }
      }
      } // end non-composite (icon–label–icon) path

      // T23: full-width axis — resize WIDTH to FIXED, then immediately
      // restore HEIGHT to hug (Sizing Modes ref: resize() sets BOTH axes to
      // FIXED, so the hug override must come AFTER, never before). Runs
      // AFTER icons/label are in place so comp.width here is this
      // variant's own true natural width (including whichever icons this
      // exact variant shows) — never a shared/default measurement. A fixed
      // MARGIN over natural width, not an absolute target — see
      // component-config.mjs's fullWidthExtraPx notes for why no measured
      // pixel fact exists to size this from.
      if (fullWidthAxis && axisValues[fullWidthAxis.name] === 'True' && comp.layoutMode !== 'NONE') {
        const target = comp.width + FULL_WIDTH_EXTRA_PX;
        comp.resize(target, comp.height);
        comp.primaryAxisSizingMode = 'FIXED';
        comp.counterAxisSizingMode = 'AUTO';
      }

      if (state === 'Disabled') {
        // conditionalBindings.state.disabled (SCSS &:disabled { opacity: ... }) first;
        // the measured-anatomy override is a fallback for a contract with no such fact.
        const opacityVar = tokens['opacity'] || overrideFor('disabled', '0', 'opacity');
        if (opacityVar) bindNum(comp, 'opacity', opacityVar);
      }

      if (state === 'Focus') {
        // T30 (owner correction, mid-session — the T12-era abs-positioned
        // rectangle was "the wrong way to do a focus"): Focus renders as an
        // OUTSIDE stroke on the component FRAME ITSELF — CONFIRMED LIVE
        // against the real Button set (node 4271:9562): Primary+Focus AND
        // Tertiary+Focus both carry the IDENTICAL single frame-level stroke
        // (strokeWeight 2, strokeAlign OUTSIDE), UNCONDITIONALLY REPLACING
        // whatever border-color stroke that variant's own row applied above
        // (Tertiary carries its own border — the real set shows no dual/
        // concentric ring, no combining: Focus simply overwrites the frame's
        // one strokes array. Setting comp.strokes here after the
        // border-color block above is exactly that override, no
        // special-casing per variant needed. Bound to the T30-seeded
        // theme/color/focus-ring variable (contract
        // conditionalBindings.state.focus['outline-color']) — the real set's
        // own frame stroke happens to bind a differently-scoped "Tier 2 |
        // Brand" border-primary-default variable instead of a dedicated
        // focus-ring token, but this generator has always resolved
        // theme/color/focus-ring here (see the contract), and T30 is what
        // makes that name finally resolvable in Figma.
        //
        // This replaces the T12-era absolutely-positioned "Focus Outline"
        // RECTANGLE entirely, along with its width+8/height+8 ring-geometry
        // tracking math (T22) — a frame stroke follows the frame's own true
        // bounds automatically (slots-on rows, full-width rows, anything),
        // so there is nothing left to track; that code path is dead and has
        // been deleted, not just superseded.
        const focusColor = overrideFor('focus', '0', 'outline-color');
        const focusWidth = overrideFor('focus', '0', 'outline-width');
        if (focusColor) {
          const p = await boundSolid(focusColor);
          if (p) {
            comp.strokes = [p];
            comp.strokeAlign = 'OUTSIDE';
            comp.strokeWeight = ${JSON.stringify(FOCUS_RING_WEIGHT)};
            if (focusWidth) bindNum(comp, 'strokeWeight', focusWidth);
          }
        }
      }
      return comp;
    }

    const comps = [];
    for (const v of OPS.variants) comps.push(await buildVariant(v.state, v.variant, v.axisValues || {}, v.tokens || {}, v.name, rootForVariant(v)));

    // T21/T23/T28: pitch must reserve room for the WIDEST a variant can
    // ever render. Axis-mode slots/full-width already bake each variant's
    // TRUE final geometry in during buildVariant (a separately-built
    // component per combination — nothing to toggle), so comp.width/height
    // are ALREADY correct there — measuring them directly is enough and
    // (T28, CONFIRMED LIVE) matters for real: with actual Phosphor
    // instances present on ~half the comps, the force-visible/measure/
    // restore dance below (needed only for a slot that stayed a shared
    // BOOLEAN property, independently toggleable per variant COMPONENT by a
    // reviewer — see the T19/T21 reports) was enough EXTRA layout-reflow
    // work across up to 100 comps to blow the Desktop Bridge's hard ~30s
    // per-call execution ceiling once icon resolution started succeeding.
    // Skipped entirely when every slot is axis-mode — there is no runtime
    // toggle left to protect against, so it is provably dead work, not just
    // slow work.
    const hasPropertyModeSlot = OPS.componentProperties.some((p) => p.type === 'BOOLEAN' && p.layerName);
    let maxW;
    let maxH;
    if (hasPropertyModeSlot) {
      const iconLayerNamesForMeasurement = ['Icon Before', 'Icon After'];
      const builtVisibility = comps.map((comp) => {
        const vis = {};
        for (const child of comp.children) {
          if (child.type === 'INSTANCE' && iconLayerNamesForMeasurement.includes(child.name)) vis[child.name] = child.visible;
        }
        return vis;
      });
      for (const comp of comps) {
        for (const child of comp.children) {
          if (child.type === 'INSTANCE' && iconLayerNamesForMeasurement.includes(child.name)) child.visible = true;
        }
      }
      maxW = Math.max(...comps.map((c) => c.width), 60);
      maxH = Math.max(...comps.map((c) => c.height), 24);
      for (let i = 0; i < comps.length; i++) {
        const vis = builtVisibility[i];
        for (const child of comps[i].children) {
          if (child.name in vis) child.visible = vis[child.name];
        }
      }
    } else {
      maxW = Math.max(...comps.map((c) => c.width), 60);
      maxH = Math.max(...comps.map((c) => c.height), 24);
    }

    // T23: grid layout generalizes beyond State x Variant — COLUMNS = State
    // (matches "State columns x stacked ... row groups" from the task),
    // ROWS = the cartesian product of every OTHER axis (the enum axis, then
    // curated boolean axes in OPS.axes order), so this scales to any number
    // of fanned-out axes for any component. Sizes are hug/content-driven —
    // pitch computed from the components AFTER building, same pattern as
    // build-page.mjs.
    // The INTERACTION-state axis, whose value lives on v.state. A CASE axis can
    // also legitimately be called "State" (Checkbox Group / Radio Group model
    // Error and Disabled as attribute-driven cases, not pseudo-classes), and
    // its value lives in v.axisValues instead — so match on the axis having no
    // 'kind' as well as on the name, and compare by IDENTITY below. Matching on
    // the name alone made valueForAxis return an undefined v.state for those
    // components, which collapsed every column onto x=0 and stacked all three
    // State variants on top of each other.
    const stateAxisDef = OPS.axes.find((a) => a.name === 'State' && !a.kind);
    const colAxisDef = stateAxisDef || OPS.axes[0] || null;
    const rowAxisDefs = OPS.axes.filter((a) => a !== colAxisDef);
    const cols = colAxisDef ? colAxisDef.values : [null];

    function valueForAxis(v, axisDef) {
      if (!axisDef) return null;
      if (axisDef === stateAxisDef) return v.state;
      if (!axisDef.kind) return v.variant; // the enum (Variant-like) axis — the only non-State axis without a boolean 'kind'
      return (v.axisValues || {})[axisDef.name];
    }
    function cartesianRows(list) {
      return list.reduce((acc, axis) => acc.flatMap((combo) => axis.values.map((val) => [...combo, val])), [[]]);
    }
    const rowCombos = cartesianRows(rowAxisDefs);
    const rowKeyOrder = rowCombos.map((combo) => combo.map((val, idx) => rowAxisDefs[idx].name + '=' + val).join('|'));
    function rowKeyFor(v) {
      return rowAxisDefs.map((a) => a.name + '=' + valueForAxis(v, a)).join('|');
    }

    const pitchX = Math.ceil((maxW + 40) / 2) * 2;
    const pitchY = Math.ceil((maxH + 40) / 2) * 2;
    for (let i = 0; i < OPS.variants.length; i++) {
      const v = OPS.variants[i];
      const comp = comps[i];
      const gx = colAxisDef ? cols.indexOf(valueForAxis(v, colAxisDef)) : 0;
      const gy = rowKeyOrder.indexOf(rowKeyFor(v));
      comp.x = 40 + Math.max(gx, 0) * pitchX;
      comp.y = 40 + Math.max(gy, 0) * pitchY;
    }

    const set = figma.combineAsVariants(comps, page);
    set.name = OPS.componentSetName;
    set.x = 0; set.y = 0;

    // T21: combineAsVariants sizes the resulting COMPONENT_SET (layoutMode
    // NONE — a static bounding box, not a HUG frame) from its children's
    // geometry AT THIS MOMENT. The force-visible/restore measurement above
    // can leave a property-mode icon narrower again by the time combine
    // runs (restored to ITS true, possibly-hidden state) even though the
    // PITCH already reserved the wider worst case — so the set, and the
    // presentation frame hugging it below, must be explicitly sized to the
    // full reserved grid footprint, or the last row/column clips against
    // that frame's edge instead of showing its reserved padding. Never
    // shrinks below what combineAsVariants already measured — only grows.
    {
      const footprintW = 40 + Math.max(cols.length - 1, 0) * pitchX + maxW;
      const footprintH = 40 + Math.max(rowKeyOrder.length - 1, 0) * pitchY + maxH;
      if (footprintW > set.width || footprintH > set.height) {
        try { set.resize(Math.max(set.width, footprintW), Math.max(set.height, footprintH)); }
        catch (e) { misses.add('set-resize-for-icon-worst-case'); }
      }
    }

    // T21: presentation FRAME — real padding (bound to a spacing token, not
    // a literal), fill bound to the site's own background token (unlike
    // PageNode, FrameNode.fills CAN bind a variable — this is the real
    // presentation surface now; the page-background literal above stays a
    // secondary fallback). HUG auto-layout with ONE child (the set) is a
    // padding box, nothing more — no manual size math needed, and no
    // resize() is ever called (Sizing Modes ref trap stays avoided).
    const presentationFrame = figma.createFrame();
    presentationFrame.name = OPS.componentSetName + ' — Generated';
    page.appendChild(presentationFrame);
    // VERTICAL since 2026-08-29 (owner direction): the doc header sits ABOVE
    // the set in the SAME frame, and that is the whole page — the separate
    // "— Prop Sheet" frame, its variant break-out grid and its dashed
    // separators are retired. Variants are expanded by hand with Propstar
    // when a page wants them, so nothing generated depends on that layout.
    presentationFrame.layoutMode = 'VERTICAL';
    presentationFrame.primaryAxisSizingMode = 'AUTO';
    presentationFrame.counterAxisSizingMode = 'AUTO';
    bindNum(presentationFrame, 'itemSpacing', FRAME_PADDING_FIGMA_VAR);
    bindNum(presentationFrame, 'paddingTop', FRAME_PADDING_FIGMA_VAR);
    bindNum(presentationFrame, 'paddingBottom', FRAME_PADDING_FIGMA_VAR);
    bindNum(presentationFrame, 'paddingLeft', FRAME_PADDING_FIGMA_VAR);
    bindNum(presentationFrame, 'paddingRight', FRAME_PADDING_FIGMA_VAR);
    { const p = await boundSolid(SITE_BG_FIGMA_VAR); if (p) presentationFrame.fills = [p]; }
    // Header FIRST so it renders above the set in the vertical stack. It
    // degrades to nothing (a NAMED miss) if the master is absent — the set
    // still generates, because the set is the artifact that matters.
    const docHeaderTextNodes = [];
    const bodyFont = { family: 'IBM Plex Sans', style: 'Regular' };
    try { await figma.loadFontAsync(bodyFont); }
    catch (e) { await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); bodyFont.family = 'Inter'; }
    const headerPlan = OPS.header ? Object.assign({}, OPS.header, {
      width: Math.max(set.width, OPS.header.minWidth || 0),
    }) : null;
    const docHeaderInstance = await buildDocHeader(headerPlan, misses, bodyFont, docHeaderTextNodes);
    if (docHeaderInstance) presentationFrame.appendChild(docHeaderInstance);
    if (docHeaderTextNodes.length) { try { await linkTextStyles(docHeaderTextNodes); } catch (e) { misses.add('doc-header-text-style-link-failed'); } }

    presentationFrame.appendChild(set); // auto-layout repositions set itself; the manual x/y above is moot post-reparent
    presentationFrame.x = 0; presentationFrame.y = 0;

    // T21: "dep on defaults" — never hardcode Light or Dark; read whichever
    // mode the collection's OWN defaultModeId currently names and set THAT
    // explicitly on the frame, so bound theme variables under it always
    // resolve consistently regardless of the file's own current appearance.
    const themeModeCollection = (await figma.variables.getLocalVariableCollectionsAsync())
      .find((c) => c.name === THEME_MODE_COLLECTION_NAME);
    let appliedThemeMode = null;
    if (themeModeCollection) {
      try {
        presentationFrame.setExplicitVariableModeForCollection(themeModeCollection, themeModeCollection.defaultModeId);
        appliedThemeMode = themeModeCollection.modes.find((m) => m.modeId === themeModeCollection.defaultModeId)?.name ?? themeModeCollection.defaultModeId;
      } catch (e) { misses.add('explicit-variable-mode:' + THEME_MODE_COLLECTION_NAME); }
    } else {
      misses.add('variable-collection:' + THEME_MODE_COLLECTION_NAME);
    }

    // Spec 2026-08-26-contract-coverage… (found live on the composite
    // pilot): property wiring must search a variant's OWN tree only — never
    // descend INTO a nested component INSTANCE. variant.findOne(n => n.type
    // === 'TEXT') happily returns a text node inside a nested Checkbox
    // instance, and setting componentPropertyReferences on a node that
    // belongs to another component's instance THROWS, killing the whole
    // property. Instances themselves are still candidates (icon layers ARE
    // direct-child instances); their INTERIORS are not.
    function findOwnNode(rootNode, pred) {
      const stack = [...(rootNode.children || [])];
      while (stack.length) {
        const n = stack.shift();
        if (pred(n)) return n;
        if (n.type !== 'INSTANCE' && 'children' in n) stack.push(...n.children);
      }
      return null;
    }

    const addedProps = [];
    for (const prop of OPS.componentProperties) {
      try {
        if (prop.type === 'TEXT') {
          const propRef = set.addComponentProperty(prop.name, 'TEXT', prop.default || '');
          for (const variant of set.children) {
            // Never wire the Text property onto a curated literal glyph (the
            // breadcrumbs '/'): the property's default would overwrite it.
            const tn = findOwnNode(variant, (n) => n.type === 'TEXT' && !String(n.name).startsWith('Literal: '));
            if (tn) tn.componentPropertyReferences = { characters: propRef };
          }
          addedProps.push(prop.name);
        } else if (prop.type === 'BOOLEAN') {
          const propRef = set.addComponentProperty(prop.name, 'BOOLEAN', !!prop.default);
          if (prop.layerName) {
            for (const variant of set.children) {
              const layer = findOwnNode(variant, (n) => n.type === 'INSTANCE' && n.name === prop.layerName);
              if (layer) layer.componentPropertyReferences = { ...(layer.componentPropertyReferences || {}), visible: propRef };
            }
          }
          addedProps.push(prop.name);
        } else if (prop.type === 'INSTANCE_SWAP') {
          // T19: wire AFTER combineAsVariants, same as TEXT/BOOLEAN above —
          // addComponentProperty only accepts the COMPONENT_SET (SKILL.md
          // §3). T29: the property's own mainComponent default/target is
          // now the DS "Icon" WRAPPER (ICON_WRAPPER_MASTER) — every "Icon
          // Before"/"Icon After" layer this run built IS an instance of that
          // wrapper (see buildVariant) — never the raw Phosphor glyph
          // component that used to be wired here directly. The glyph
          // (iconComponentsByLayer, keyed by name, never stored as an id in
          // OPS) still gates whether this side was built at all this run —
          // a glyph miss means no icon instance exists for that layer name,
          // so there is nothing for this property to reference either; a
          // wrapper miss means NOTHING is wired for ANY side, same
          // honest-degrade convention bindNum/boundSolid already use.
          const glyphComp = iconComponentsByLayer[prop.layerName];
          if (!glyphComp) { misses.add('component-property:' + prop.name + ' (icon "' + prop.default + '" not found)'); continue; }
          if (!ICON_WRAPPER_MASTER) { misses.add('component-property:' + prop.name + ' (Icon wrapper component not found)'); continue; }
          // Mirrors the REAL Button set's own INSTANCE_SWAP shape (node
          // 4271:9562, read live): preferredValues is a one-entry
          // [{ type: 'COMPONENT', key }] array naming the component a
          // designer SHOULD swap to (there, a Phosphor library key; here,
          // the wrapper's own key, since the wrapper — not a raw glyph — is
          // the correct thing to swap to at this position).
          // addComponentProperty's 4th (preferredValues) argument is
          // undocumented in this environment's plugin API surface — attempt
          // it, fall back to the 3-arg form and report the gap rather than
          // failing the whole property.
          let propRef;
          try {
            propRef = set.addComponentProperty(prop.name, 'INSTANCE_SWAP', ICON_WRAPPER_MASTER.id, [{ type: 'COMPONENT', key: ICON_WRAPPER_MASTER.key }]);
          } catch (e) {
            propRef = set.addComponentProperty(prop.name, 'INSTANCE_SWAP', ICON_WRAPPER_MASTER.id);
            misses.add('instance-swap-preferred-values-unsupported:' + prop.name);
          }
          for (const variant of set.children) {
            const layer = findOwnNode(variant, (n) => n.type === 'INSTANCE' && n.name === prop.layerName);
            if (layer) layer.componentPropertyReferences = { ...(layer.componentPropertyReferences || {}), mainComponent: propRef };
          }
          addedProps.push(prop.name);
        }
      } catch (e) { misses.add('component-property:' + prop.name); }
    }

    // Best-effort text-style linkage — scoped to just the text nodes THIS
    // run created (see plugin-snippets.mjs's linkTextStyles).
    const linked = await linkTextStyles(textNodes);
    // Page-lane runs REPORT every text node that ends the run with no style
    // binding (owner catch, round 10): what the eye caught on the heading
    // becomes a named miss on every run.
    if (OPS.anatomySource === 'measured-page') {
      for (const t2 of textNodes) {
        try {
          if (!t2.textStyleId && t2.fontName !== figma.mixed) {
            misses.add('text-style-unlinked:' + t2.fontName.family + '/' + t2.fontName.style + '/' + Math.round(t2.fontSize));
          }
        } catch (e) { /* mixed-font node */ }
      }
    }

    return JSON.stringify({
      imageTargets: IMAGE_TARGETS,
      page: page.name,
      reusedPage,
      set: set.id,
      componentSetName: set.name,
      variants: set.children.length,
      componentProperties: addedProps,
      iconWrapperComponent: ICON_WRAPPER_MASTER ? { id: ICON_WRAPPER_MASTER.id, key: ICON_WRAPPER_MASTER.key, name: ICON_WRAPPER_MASTER.name } : null,
      composite: IS_COMPOSITE,
      nestedSets: NESTED_SETS.map((e) => ({ tag: e.tag, setName: e.setName, resolved: !!nestedSetByTag[e.tag] })),
      missingVars: [...misses],
      textStylesLinked: linked,
      textNodesTotal: textNodes.length,
      presentationFrame: presentationFrame.id,
      presentationFrameFill: SITE_BG_FIGMA_VAR,
      presentationFramePadding: FRAME_PADDING_FIGMA_VAR,
      explicitThemeModeCollection: THEME_MODE_COLLECTION_NAME,
      explicitThemeMode: appliedThemeMode,
      maxVariantWidth: maxW,
      maxVariantHeight: maxH,
      gridColumns: cols.length,
      gridRows: rowKeyOrder.length,
    });
  `;
}
