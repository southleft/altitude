/**
 * plugin-snippets.mjs — shared fragments of the code string figma_execute
 * runs inside Figma Desktop. Split out of generate-figma.mjs (spec
 * 2026-08-26-modularize-generate-figma-mjs…, R4): before the split, the
 * lean-set builder carried its OWN verbatim copies of the file guard,
 * variable helpers, and text-style linkage while sheet mode used these
 * factored snippets — two copies, drift waiting to happen. Both code
 * emitters (build-set-code.mjs, build-sheet-code.mjs) now compose from THIS
 * single source.
 *
 * Every snippet is a plain string of plugin-side JS — no Node-side state.
 * Sheet mode issues MULTIPLE figma_execute calls per run, each an isolated
 * plugin invocation with no shared JS state, so each call re-includes the
 * snippets it needs.
 */

/** File guard — every mutating call this generator ever sends opens with it.
 * Positive allow-list (not a decoy deny-list) so an unrecognised file is
 * refused the same way a known decoy is; the Node-side decoy check in the
 * CLI also runs BEFORE any code is ever sent. */
export function fileGuardSnippet(SC) {
  return String.raw`
    if (figma.fileKey !== ${JSON.stringify(SC.fileKey)}) {
      throw new Error(
        'REFUSING TO WRITE: expected file ' + ${JSON.stringify(SC.fileKey)} + ' (' + ${JSON.stringify(SC.fileName)} +
        ') but the Desktop Bridge is focused on "' + figma.root.name + '" (' + figma.fileKey + ').'
      );
    }
  `;
}

/** Best-effort text-style linkage (link-text-styles.mjs walks EVERY page in
 * the file, which would break the scratch-page-only guarantee — so this is
 * scoped to just the text nodes a run created). Defined as a function so
 * every caller links its own node list the same way. */
export function textStyleLinkSnippet() {
  return String.raw`
    async function linkTextStyles(nodes) {
      const styles = await figma.getLocalTextStylesAsync();
      const styleKey = (fam, sty, size) => fam + '|' + sty + '|' + Math.round(size);
      const byKey = new Map();
      for (const s of styles) {
        const k = styleKey(s.fontName.family, s.fontName.style, s.fontSize);
        if (!byKey.has(k)) byKey.set(k, s);
      }
      let linked = 0;
      for (const t of nodes) {
        const fn = t.fontName;
        if (!fn || fn === figma.mixed) continue;
        const st = byKey.get(styleKey(fn.family, fn.style, t.fontSize));
        if (st) { try { await t.setTextStyleIdAsync(st.id); linked++; } catch (e) { /* leave literal */ } }
      }
      return linked;
    }
  `;
}

/** Shared variable-resolution primitives (V/rawOf/boundSolid/bindNum) —
 * mirrors scripts/figma-atoms/build-page.mjs's conventions. `misses` is a
 * `Set` — the caller flattens it to an array at `return` time.
 *
 * KNOWN GAP (T32, confirmed live): bindNum's try/catch swallows a THROWN
 * setBoundVariable failure without recording it in `misses` — a padding bind
 * onto a childless frame silently did not stick and no missingVars entry
 * reported it. Callers that depend on a bind sticking should read the
 * node's boundVariables back (see the nested-icon-size check in
 * build-set-code.mjs). Left as-is here to keep the modularization
 * byte-conservative; fixing it means adding `misses.add(...)` in the catch
 * and re-verifying live that the extra reports are not noise. */
export function variableHelpersSnippet() {
  return String.raw`
    await figma.loadAllPagesAsync();
    const V = {};
    for (const v of await figma.variables.getLocalVariablesAsync()) V[v.name] = v;
    const misses = new Set();
    async function rawOf(v) {
      const c = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
      let val = v.valuesByMode[c.defaultModeId];
      let g = 0;
      while (val && val.type === 'VARIABLE_ALIAS' && g++ < 8) {
        const nv = await figma.variables.getVariableByIdAsync(val.id);
        const nc = await figma.variables.getVariableCollectionByIdAsync(nv.variableCollectionId);
        val = nv.valuesByMode[nc.defaultModeId];
      }
      return val;
    }
    async function boundSolid(name) {
      if (!name) return null;
      const vv = V[name];
      if (!vv) { misses.add(name); return null; }
      const val = await rawOf(vv);
      const color = val && val.r !== undefined ? { r: val.r, g: val.g, b: val.b } : { r: 0, g: 0, b: 0 };
      const paint = { type: 'SOLID', color };
      if (val && val.a !== undefined && val.a < 1) paint.opacity = val.a;
      return figma.variables.setBoundVariableForPaint(paint, 'color', vv);
    }
    function bindNum(node, field, name) {
      if (!name) return false;
      const vv = V[name];
      if (!vv) { misses.add(name); return false; }
      try { node.setBoundVariable(field, vv); return true; } catch (e) { return false; }
    }
  `;
}

/**
 * T32 (owner correction, CSS border-collapse rule): shared cell/row-frame
 * builder — used by BOTH the sheet setup call (header row) and every group
 * call (banner + data rows), so the "real table" construction rule lives in
 * exactly one place. Ordering follows the generator's established Sizing
 * Modes discipline (see the "Is Full Width" axis comment in
 * build-set-code.mjs's buildVariant, and T28's icon-instance comment): a
 * freshly created auto-layout frame starts HUG/HUG; `resize()` sets BOTH
 * axes to FIXED as a side effect, so the "restore the OTHER axis back to
 * hug" override must come immediately AFTER resize(), never before.
 *
 * Exactly three stroke sources exist anywhere in the sheet (see
 * `rowBottomWeight()`/`cellRightWeight()` in derive-sheet-plan.mjs for the
 * full rule this mirrors): the outer container (set directly on sheetGrid,
 * not here), each ROW's own bottom edge (`makeRow`), each CELL's own right
 * edge (`makeCell`) — never a cell's top/bottom/left or a row's
 * top/left/right. `itemSpacing: 0` on both is what makes adjacent frames'
 * single-edge strokes read as ONE continuous grid line rather than a
 * gap-then-a-line.
 *   - `width`: the cell's FIXED width (plan.table.rowLabelWidth for a
 *     label/banner cell, plan.table.cellWidth for a data-column cell) — this
 *     is what keeps every row's columns aligned into a real grid, since
 *     Figma auto-layout has no cross-row "equalize this column's width"
 *     feature of its own; every cell in the same column position must
 *     simply request the SAME fixed width.
 *   - `align`: 'CENTER' for a data cell (centers its one instance), 'MIN'
 *     for a label/banner cell (left-aligns its text, the ordinary table
 *     convention).
 *   - `rightWeight`/`bottomWeight`: 0 means invisible on that side —
 *     `strokeAlign: 'INSIDE'` throughout so a border never grows a cell/row
 *     beyond its own fixed width (an OUTSIDE/CENTER stroke would, breaking
 *     column alignment by the stroke weight on every bordered edge).
 */
export function cellFrameSnippet() {
  return String.raw`
    // T32 (owner polish — a zoomed screenshot showed label/header cells as
    // short, non-flush boxes): makeCell() no longer applies padding on the
    // OUTER bordered frame at all — that outer frame's ONLY job is width +
    // border + (for a label/header cell) filling the row's full height, so
    // its border always runs flush top-to-bottom with the row. Padding
    // instead lives on makeLabelInner() — a small HUG-sized wrapper around
    // just the TEXT — for any cell whose content is text (label, banner,
    // header). A data cell (holding a component instance) is UNCHANGED: no
    // inner wrapper, padding stays directly on the cell (the instance
    // already carries its own visual weight; there is no "short box"
    // problem there — see this function's own investigation notes below).
    //
    // Root cause, confirmed live (not merely a padding question): 1) a
    // freshly created, still-childless frame's own \`.height\` getter can
    // read Figma's createFrame() DEFAULT (100) rather than its true
    // post-layoutMode hug size — resize()'s old \`Math.max(cell.height, 1)\`
    // therefore locked some cells at a stale 100px instead of a real small
    // hug value, most visibly the header row's empty corner cell (its stale
    // 100 became the header ROW's own hug height once every header cell had
    // gone FILL, inflating every sibling along with it). Fixed by never
    // trusting \`.height\` here — a resize() height argument of a plain
    // literal \`1\` is always safe because \`counterAxisSizingMode\` is
    // restored to hug immediately after. 2) \`sheetGrid\`'s OWN padding bind
    // silently failed the SAME way — CONFIRMED live (\`boundVariables: {}\`
    // after the run, despite no reported \`missingVars\` entry, because
    // bindNum's try/catch swallows a THROWN setBoundVariable failure without
    // recording it — a real gap in that helper, see plugin-snippets.mjs) —
    // binding a padding variable onto sheetGrid before it had any children
    // did not stick; moved to after the header row is appended (see
    // build-sheet-code.mjs's setup call).
    function makeCell(width, align, rightWeight, paint, dashPattern) {
      const cell = figma.createFrame();
      cell.name = 'Cell';
      cell.layoutMode = 'HORIZONTAL';
      cell.primaryAxisAlignItems = align;
      cell.counterAxisAlignItems = 'CENTER';
      cell.fills = [];
      // resize() forces BOTH axes to FIXED — restore height to hug right
      // after, so only WIDTH stays fixed. A literal \`1\`, never \`.height\`
      // (see this function's own comment on why that read can be stale).
      cell.resize(width, 1);
      cell.counterAxisSizingMode = 'AUTO';
      cell.strokes = [paint];
      cell.dashPattern = dashPattern;
      cell.strokeAlign = 'INSIDE';
      cell.strokeTopWeight = 0;
      cell.strokeRightWeight = rightWeight;
      cell.strokeBottomWeight = 0;
      cell.strokeLeftWeight = 0;
      return cell;
    }
    // T32: the text-padding wrapper — HUG both axes, no border/fill of its
    // own, appended INSIDE a (border-owning, padding-free) makeCell(). This
    // is what keeps the label's own breathing room while letting the OUTER
    // cell's border run flush with the row when that outer cell is set to
    // FILL height by the caller (layoutSizingVertical, set post-append —
    // meaningless before a node is parented into an auto-layout frame, so
    // never attempted here).
    function makeLabelInner(paddingVar) {
      const inner = figma.createFrame();
      inner.name = 'Label';
      inner.layoutMode = 'HORIZONTAL';
      inner.primaryAxisSizingMode = 'AUTO';
      inner.counterAxisSizingMode = 'AUTO';
      inner.fills = [];
      bindNum(inner, 'paddingTop', paddingVar);
      bindNum(inner, 'paddingBottom', paddingVar);
      bindNum(inner, 'paddingLeft', paddingVar);
      bindNum(inner, 'paddingRight', paddingVar);
      return inner;
    }
    function makeDataCell(width, rightWeight, paint, dashPattern, cellPaddingVar) {
      const cell = makeCell(width, 'CENTER', rightWeight, paint, dashPattern);
      bindNum(cell, 'paddingTop', cellPaddingVar);
      bindNum(cell, 'paddingBottom', cellPaddingVar);
      bindNum(cell, 'paddingLeft', cellPaddingVar);
      bindNum(cell, 'paddingRight', cellPaddingVar);
      return cell;
    }
    function makeRow(bottomWeight, paint, dashPattern) {
      const row = figma.createFrame();
      row.name = 'Row';
      row.layoutMode = 'HORIZONTAL';
      row.primaryAxisSizingMode = 'AUTO';
      row.counterAxisSizingMode = 'AUTO';
      row.itemSpacing = 0;
      row.fills = [];
      row.strokes = [paint];
      row.dashPattern = dashPattern;
      row.strokeAlign = 'INSIDE';
      row.strokeTopWeight = 0;
      row.strokeRightWeight = 0;
      row.strokeBottomWeight = bottomWeight;
      row.strokeLeftWeight = 0;
      return row;
    }
  `;
}
