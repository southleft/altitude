/**
 * build-sheet-code.mjs — the `--sheet` documentation artifact's plugin-code
 * emitters (T31/T32, split out of generate-figma.mjs). This is the "make it
 * look nice" layer's EXECUTION side; the pure plan it renders comes from
 * derive-sheet-plan.mjs and the visual constants from sheet-style.mjs —
 * nothing here is a parity fact.
 *
 * Sheet mode issues MULTIPLE figma_execute calls per run (one setup call +
 * one per enum-axis group) — never a single all-~100-instances call — the
 * "batch across calls" the Desktop Bridge's hard ~30s per-call execution
 * ceiling requires for a fan-out this size (see sheet-style.mjs's pitch
 * constants). Each call is an isolated plugin invocation with no shared JS
 * state, so each re-includes the shared snippets it needs
 * (plugin-snippets.mjs).
 */
import {
  FRAME_PADDING_FIGMA_VAR,
  SHEET_LABEL_COLOR_FIGMA_VAR,
  SITE_BG_FIGMA_VAR,
  THEME_MODE_COLLECTION_NAME,
} from './conventions.mjs';
import { cellFrameSnippet, fileGuardSnippet, textStyleLinkSnippet, variableHelpersSnippet } from './plugin-snippets.mjs';

/**
 * T31 `--sheet` setup call — the FIRST of N figma_execute calls this mode
 * issues (see the CLI's sheet path). Idempotently (REPLACE, not append)
 * creates the sheet's own presentation frame next to the target set's
 * "<name> — Generated" frame, sizes it to the plan's precomputed total
 * footprint, and builds the State column header row. Never touches the
 * target set itself (read-only lookup by name) or any page other than
 * `--page`. Returns the ids the subsequent per-group calls need.
 */
export function buildSheetSetupPluginCode(plan, SC) {
  return String.raw`
    ${fileGuardSnippet(SC)}
    ${textStyleLinkSnippet()}
    ${variableHelpersSnippet()}
    ${cellFrameSnippet()}
    const PLAN = ${JSON.stringify(plan)};
    const FRAME_PADDING_FIGMA_VAR = ${JSON.stringify(FRAME_PADDING_FIGMA_VAR)};
    const SITE_BG_FIGMA_VAR = ${JSON.stringify(SITE_BG_FIGMA_VAR)};
    const THEME_MODE_COLLECTION_NAME = ${JSON.stringify(THEME_MODE_COLLECTION_NAME)};
    const SHEET_LABEL_COLOR_FIGMA_VAR = ${JSON.stringify(SHEET_LABEL_COLOR_FIGMA_VAR)};

    // SAFETY: this mode NEVER creates the page — it must already exist from a
    // prior (non-sheet) generation run, or from a real, hand-built set of
    // the same name. Mirrors the lean-set builder's own "never delete/
    // recreate the page" guarantee, one level stricter (this mode does not
    // even create it).
    const page = figma.root.children.find((p) => p.name === PLAN.page);
    if (!page) {
      throw new Error('Page "' + PLAN.page + '" not found. Run generate-figma.mjs without --sheet first to build the lean set this sheet documents.');
    }
    await page.loadAsync();
    await figma.setCurrentPageAsync(page);

    // Owner direction (walkthrough, 2026-08-26): the sheet documents the
    // GENERATED set — and on a component's own "🛠 " page the hand-built set
    // shares the same name, so a bare page-wide findOne would grab the wrong
    // one (document order puts the hand-built set first). Prefer the set
    // INSIDE our own "<name> — Generated" frame; fall back to the page-wide
    // lookup only when no generated frame exists (e.g. documenting a real,
    // hand-built set deliberately).
    const generatedFrameForTarget = page.findOne((n) => n.type === 'FRAME' && n.name === PLAN.targetComponentSetName + ' — Generated');
    const targetSet = (generatedFrameForTarget
      ? generatedFrameForTarget.findOne((n) => n.type === 'COMPONENT_SET' && n.name === PLAN.targetComponentSetName)
      : null)
      || page.findOne((n) => n.type === 'COMPONENT_SET' && n.name === PLAN.targetComponentSetName);
    if (!targetSet) {
      throw new Error('Component set "' + PLAN.targetComponentSetName + '" not found on page "' + PLAN.page + '". Run generate-figma.mjs without --sheet first.');
    }

    // Idempotent: a prior sheet frame of the SAME name is replaced wholesale,
    // never appended alongside a stale copy. Only this one frame is ever
    // touched — the target set and everything else on the page is untouched.
    const prior = page.findOne((n) => n.type === 'FRAME' && n.name === PLAN.sheetFrameName);
    if (prior) prior.remove();

    // Owner direction (Chip walkthrough, 2026-08-26): the page reads as ONE
    // artifact — the prop sheet. The masters frame ("<name> — Generated") is
    // HIDDEN once the sheet exists (visible=false at the end of this call):
    // instances keep rendering from hidden masters, and the set stays fully
    // editable via the layers panel. The sheet therefore takes the masters'
    // own position instead of sitting beside them. A lean re-run recreates
    // the masters frame visible again — re-running --sheet (which a lean
    // regen requires anyway, see build-set-code's clearing note) re-hides it.
    const generatedFrame = page.findOne((n) => n.type === 'FRAME' && n.name === PLAN.targetComponentSetName + ' — Generated');
    const originX = generatedFrame ? generatedFrame.x : targetSet.x + targetSet.width + 400;
    const originY = generatedFrame ? generatedFrame.y : targetSet.y;

    // T32 (owner design direction): sheetGrid is a REAL VERTICAL auto-layout
    // frame — [header row, one group frame per enum value] — itemSpacing 0
    // so adjacent frames' own borders touch and read as ONE continuous table
    // line, never a gap-then-a-line. NO padding of its own (owner direction,
    // Badge walkthrough 2026-08-26: "on sheetgrid frame (for all) remove the
    // padding") — the table's border hugs its rows; breathing room around
    // the grid comes from the sheet container's own padding, and inside a
    // cell from makeLabelInner()/makeDataCell().
    const sheetGrid = figma.createFrame();
    sheetGrid.name = 'Sheet Grid';
    sheetGrid.layoutMode = 'VERTICAL';
    sheetGrid.primaryAxisSizingMode = 'AUTO';
    sheetGrid.counterAxisSizingMode = 'AUTO';
    sheetGrid.itemSpacing = 0;
    sheetGrid.fills = [];
    // T32 (bug found while investigating the owner's padding polish ask):
    // binding a padding variable onto sheetGrid HERE — before it has any
    // children — CONFIRMED LIVE to silently not stick (boundVariables: {}
    // read back after a full run, despite no reported missingVars entry,
    // because bindNum's own try/catch swallows a thrown setBoundVariable
    // failure without recording it — a real gap in that helper, see
    // plugin-snippets.mjs). Moved to right after the header row is appended
    // below, once sheetGrid actually has content.
    // T32 (owner correction): the ONLY four-side stroke in the whole sheet —
    // every row/cell inside draws at most one edge each (see
    // cellFrameSnippet's own comment) — this single border is what closes
    // the table's outer top/left/right, and its bottom edge closes the
    // table's absolute last row (which deliberately draws no bottom of its
    // own, to avoid doubling this exact edge).
    { const sepPaintContainer = { type: 'SOLID', color: PLAN.table.separatorColor };
      sheetGrid.strokes = [sepPaintContainer];
      sheetGrid.dashPattern = PLAN.table.dashPattern;
      sheetGrid.strokeAlign = 'INSIDE';
      sheetGrid.strokeTopWeight = PLAN.table.separatorWeight;
      sheetGrid.strokeRightWeight = PLAN.table.separatorWeight;
      sheetGrid.strokeBottomWeight = PLAN.table.separatorWeight;
      sheetGrid.strokeLeftWeight = PLAN.table.separatorWeight; }

    // Regular weight — used for the header-row cell labels below AND (T32)
    // the doc header's Description text, which already ships this exact
    // font/style in the master.
    const fontName = { family: 'IBM Plex Sans', style: 'Regular' };
    try { await figma.loadFontAsync(fontName); } catch (e) { await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); fontName.family = 'Inter'; }

    // T32 (owner feedback): a VERTICAL stack — header ABOVE the grid, inside
    // the SAME padded container — mirrors the ONE real usage this master has
    // in the file (a VERTICAL "Documentation" frame: this header, then a
    // "Content" frame below it). Was HORIZONTAL (a single-child hug wrapper)
    // pre-T32; see sheet-style.mjs's SHEET_DOC_HEADER_MASTER_NAME comment
    // for the full discovery and the "no established per-component
    // convention" judgment call this rests on.
    const sheetFrame = figma.createFrame();
    sheetFrame.name = PLAN.sheetFrameName;
    page.appendChild(sheetFrame);
    sheetFrame.layoutMode = 'VERTICAL';
    sheetFrame.primaryAxisSizingMode = 'AUTO';
    sheetFrame.counterAxisSizingMode = 'AUTO';
    bindNum(sheetFrame, 'paddingTop', FRAME_PADDING_FIGMA_VAR);
    bindNum(sheetFrame, 'paddingBottom', FRAME_PADDING_FIGMA_VAR);
    bindNum(sheetFrame, 'paddingLeft', FRAME_PADDING_FIGMA_VAR);
    bindNum(sheetFrame, 'paddingRight', FRAME_PADDING_FIGMA_VAR);
    bindNum(sheetFrame, 'itemSpacing', FRAME_PADDING_FIGMA_VAR);
    { const p = await boundSolid(SITE_BG_FIGMA_VAR); if (p) sheetFrame.fills = [p]; }

    // T32: "Documentation Header" — resolved BY NAME on its own page, never
    // by the id confirmed live (101:29248) — same by-name-not-by-id
    // convention findIconWrapperComponent already uses for another
    // file-local master. A miss here degrades cleanly: no header is built,
    // the sheet still gets its grid, and the gap is reported in missingVars
    // rather than aborting the whole sheet.
    const docHeaderPage = figma.root.children.find((p) => p.name === PLAN.header.masterPageName);
    let docHeaderMaster = null;
    if (docHeaderPage) {
      await docHeaderPage.loadAsync();
      const hit = docHeaderPage.findOne((n) => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && n.name === PLAN.header.masterName);
      if (hit) docHeaderMaster = hit.type === 'COMPONENT_SET' ? (hit.defaultVariant || hit.children[0]) : hit;
    }
    if (!docHeaderPage) misses.add('doc-header-page-not-found:' + PLAN.header.masterPageName);
    else if (!docHeaderMaster) misses.add('doc-header-master-not-found:' + PLAN.header.masterName);

    const docHeaderTextNodes = [];
    let docHeaderInstance = null;
    if (docHeaderMaster) {
      docHeaderInstance = docHeaderMaster.createInstance();
      // Master root is FIXED/FIXED sizing (CONFIRMED live) — an ordinary
      // resize() is the correct, safe operation here (never the "resize()
      // undoes HUG sizing" trap documented elsewhere in this generator,
      // which is about converting an ALREADY-hug frame; this one never was
      // hug).
      try { docHeaderInstance.resize(PLAN.header.width, docHeaderInstance.height); }
      catch (e) { misses.add('doc-header-resize-failed'); }

      // Font-load-before-setText (SKILL.md trap): each edited run's EXACT
      // existing font must be loaded before its .characters is touched.
      const headingFont = { family: 'IBM Plex Sans', style: 'Bold' };
      try { await figma.loadFontAsync(headingFont); } catch (e) { await figma.loadFontAsync({ family: 'Inter', style: 'Bold' }); headingFont.family = 'Inter'; }

      // T32: Title <- the component's own display name (contract.name via
      // PLAN.header.title). Sub Heading is DELIBERATELY left untouched — see
      // sheet-style.mjs's "FIELD MAPPING" comment.
      const headingNode = docHeaderInstance.findOne((n) => n.type === 'TEXT' && n.name === 'Heading');
      if (headingNode) {
        headingNode.fontName = headingFont;
        headingNode.characters = PLAN.header.title;
        docHeaderTextNodes.push(headingNode);
      } else {
        misses.add('doc-header-heading-node-not-found');
      }

      // T32: Description <- the contract's own description, trimmed/capped
      // (sheet-style.mjs's docHeaderDescription()), with a trailing
      // HYPERLINKED run — the master has no separate link element, so the
      // Description text node's own trailing text range carries the link
      // (setRangeHyperlink), per the task's own "if its link is a text
      // node, use Figma's hyperlink property on the text range" guidance.
      const descFrame = docHeaderInstance.findOne((n) => n.type === 'FRAME' && n.name === 'Description');
      const descNode = descFrame ? descFrame.findOne((n) => n.type === 'TEXT') : docHeaderInstance.findOne((n) => n.type === 'TEXT' && n.name === 'Text');
      if (descNode) {
        descNode.fontName = fontName; // IBM Plex Sans Regular — already loaded above for the column labels.
        const desc = PLAN.header.description;
        const link = PLAN.header.linkText;
        const full = desc ? desc + '  ' + link : link;
        descNode.characters = full;
        docHeaderTextNodes.push(descNode);
        const linkStart = full.length - link.length;
        try { descNode.setRangeHyperlink(linkStart, full.length, { type: 'URL', value: PLAN.header.linkUrl }); }
        catch (e) { misses.add('doc-header-hyperlink-failed'); }
      } else {
        misses.add('doc-header-description-node-not-found');
      }

      sheetFrame.appendChild(docHeaderInstance); // appended BEFORE sheetGrid below -> renders ABOVE it in the vertical stack.
    }
    const docHeaderStylesLinked = docHeaderTextNodes.length ? await linkTextStyles(docHeaderTextNodes) : 0;

    sheetFrame.appendChild(sheetGrid);
    sheetFrame.x = originX;
    sheetFrame.y = originY;

    // "dep on defaults" — same convention as the live set's own presentation
    // frame (build-set-code.mjs): never hardcode Light or Dark.
    const themeModeCollection = (await figma.variables.getLocalVariableCollectionsAsync())
      .find((c) => c.name === THEME_MODE_COLLECTION_NAME);
    let appliedThemeMode = null;
    if (themeModeCollection) {
      try {
        sheetFrame.setExplicitVariableModeForCollection(themeModeCollection, themeModeCollection.defaultModeId);
        appliedThemeMode = themeModeCollection.modes.find((m) => m.modeId === themeModeCollection.defaultModeId)?.name ?? themeModeCollection.defaultModeId;
      } catch (e) { misses.add('explicit-variable-mode:' + THEME_MODE_COLLECTION_NAME); }
    } else {
      misses.add('variable-collection:' + THEME_MODE_COLLECTION_NAME);
    }

    // T31: label text color — bound to the SAME token every other run of
    // this generator resolves against the sheet frame's own explicit theme
    // mode, so a label reads correctly regardless of which mode is current
    // (never a resolved literal — see conventions.mjs's
    // SHEET_LABEL_COLOR_FIGMA_VAR comment).
    const labelPaint = await boundSolid(SHEET_LABEL_COLOR_FIGMA_VAR);

    // T32 (owner design direction): the header row — a REAL bordered table
    // row, built from makeRow()/makeCell() exactly like every group's own
    // rows (buildSheetGroupPluginCode), so the header aligns into the SAME
    // grid rather than being separately positioned text. Built here (setup
    // call) rather than a group call since it belongs to the WHOLE table,
    // not any one group.
    const sepPaint = { type: 'SOLID', color: PLAN.table.separatorColor };
    const headerRow = makeRow(PLAN.table.headerBottomWeight, sepPaint, PLAN.table.dashPattern);
    const columnHeaderTextNodes = [];
    for (const hc of PLAN.table.headerCells) {
      const width = hc.isLabelColumn ? PLAN.table.rowLabelWidth : PLAN.table.cellWidth;
      // T32 (owner polish): a header cell is a TEXT (or empty) cell — no
      // padding of its own, FILL height so its border runs flush with the
      // row; the label's own breathing room lives on makeLabelInner() below.
      const cell = makeCell(width, hc.isLabelColumn ? 'MIN' : 'CENTER', hc.rightWeight, sepPaint, PLAN.table.dashPattern);
      if (hc.label) {
        const inner = makeLabelInner(PLAN.table.cellPaddingFigmaVar);
        const t = figma.createText();
        t.fontName = fontName;
        t.characters = hc.label;
        t.fontSize = 12;
        if (labelPaint) t.fills = [labelPaint];
        inner.appendChild(t);
        cell.appendChild(inner);
        columnHeaderTextNodes.push(t);
      }
      headerRow.appendChild(cell);
      cell.layoutSizingVertical = 'FILL'; // only settable once parented into the row's auto-layout.
    }
    sheetGrid.appendChild(headerRow);
    const columnLabelStylesLinked = await linkTextStyles(columnHeaderTextNodes);

    // Consolidation (owner direction): hide the masters frame — the sheet is
    // now the page's one visible artifact. See the positioning comment above.
    if (generatedFrame) generatedFrame.visible = false;

    return JSON.stringify({
      pageId: page.id,
      sheetFrameId: sheetFrame.id,
      sheetGridId: sheetGrid.id,
      targetSetId: targetSet.id,
      appliedThemeMode,
      textStylesLinked: columnLabelStylesLinked + docHeaderStylesLinked,
      docHeaderBuilt: !!docHeaderInstance,
      docHeaderInstanceId: docHeaderInstance ? docHeaderInstance.id : null,
      headerCellsBuilt: PLAN.table.headerCells.length,
      missingVars: [...misses],
    });
  `;
}

/**
 * T31 `--sheet` per-group call — ONE of these per enum-axis row group
 * (5 for al-button: Bare/Danger/Primary/Secondary/Tertiary), issued
 * sequentially by the CLI's sheet path AFTER the setup call above. Builds
 * that group's own GROUP FRAME (T32: a real bordered table section — a
 * banner row + one row-frame per boolean combo, each row a label cell + one
 * data cell per State), each data cell's instance switched to its own
 * combination via `setProperties` against the TARGET set's real property
 * definitions — never a freshly-built component, never a runtime toggle —
 * then appends that whole group frame to sheetGrid. Splitting one call per
 * group (rather than one call for all ~100 instances) is the "batch across
 * calls" the Desktop Bridge's ~30s per-call ceiling requires for a fan-out
 * this size (see sheet-style.mjs's pitch constants' own comment).
 */
export function buildSheetGroupPluginCode(plan, groupIndex, ids, SC) {
  const group = plan.table.groups[groupIndex];
  return String.raw`
    ${fileGuardSnippet(SC)}
    ${textStyleLinkSnippet()}
    ${variableHelpersSnippet()}
    ${cellFrameSnippet()}
    const GROUP = ${JSON.stringify(group)};
    const TABLE = ${JSON.stringify({ rowLabelWidth: plan.table.rowLabelWidth, cellWidth: plan.table.cellWidth, cellPaddingFigmaVar: plan.table.cellPaddingFigmaVar, dashPattern: plan.table.dashPattern, separatorColor: plan.table.separatorColor })};
    const SHEET_LABEL_COLOR_FIGMA_VAR = ${JSON.stringify(SHEET_LABEL_COLOR_FIGMA_VAR)};

    // T28-style dynamic-page discipline: getNodeByIdAsync loads whatever page
    // a node belongs to, but new nodes THIS call creates still root onto
    // whatever page is currently ACTIVE — make the target page current again
    // explicitly, the same incident build-set-code.mjs's own comment
    // documents for icon resolution, rather than assume the setup call's
    // page-switch is still in effect several calls later.
    const page = await figma.getNodeByIdAsync(${JSON.stringify(ids.pageId)});
    if (!page) throw new Error('page ' + ${JSON.stringify(ids.pageId)} + ' no longer resolves — rerun --sheet from the setup call.');
    await figma.setCurrentPageAsync(page);

    const sheetGrid = await figma.getNodeByIdAsync(${JSON.stringify(ids.sheetGridId)});
    const targetSet = await figma.getNodeByIdAsync(${JSON.stringify(ids.targetSetId)});
    if (!sheetGrid || !targetSet) throw new Error('sheet grid or target set node id no longer resolves — rerun --sheet from the setup call.');

    const setDefs = targetSet.componentPropertyDefinitions || {};
    function applyFor(properties) {
      const apply = {};
      for (const key in setDefs) {
        const d = setDefs[key];
        const bare = key.split('#')[0];
        if (!(bare in properties)) continue;
        if (d.variantOptions) apply[key] = String(properties[bare]);
        else if (d.type === 'BOOLEAN') apply[key] = !!properties[bare];
      }
      return apply;
    }

    const fontName = { family: 'IBM Plex Sans', style: 'Regular' };
    try { await figma.loadFontAsync(fontName); } catch (e) { await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); fontName.family = 'Inter'; }
    const labelPaint = await boundSolid(SHEET_LABEL_COLOR_FIGMA_VAR);
    const sepPaint = { type: 'SOLID', color: TABLE.separatorColor };

    const setPropMisses = [];
    const labelNodes = [];
    let built = 0;
    const base = targetSet.defaultVariant || targetSet.children[0];

    // T32: the group frame — a VERTICAL auto-layout wrapper (HUG both axes,
    // itemSpacing 0) holding this group's own banner row + every one of its
    // data rows, appended to sheetGrid as ONE unit at the end of this call.
    const groupFrame = figma.createFrame();
    groupFrame.name = 'Group';
    groupFrame.layoutMode = 'VERTICAL';
    groupFrame.primaryAxisSizingMode = 'AUTO';
    groupFrame.counterAxisSizingMode = 'AUTO';
    groupFrame.itemSpacing = 0;
    groupFrame.fills = [];

    // Banner — its own ROW, one cell spanning the table's FULL width (label
    // column + every data column), carrying the humanized group value.
    // Single column -> no right edge of its own (see cellRightWeight's own
    // comment); its bottom follows the ordinary row rule, same as every
    // other row (T32 owner correction — no separate "group boundary" stroke
    // lives on the banner; that boundary is entirely the PRECEDING group's
    // own last data row, see derive-sheet-plan.mjs's rowBottomWeight
    // comment).
    // A group with no label (stateless component: the enum axis was consumed
    // as the sheet's COLUMNS, so there is exactly one unlabeled group —
    // Badge walkthrough) gets NO banner row at all: an empty full-width row
    // would read as a stray gap under the header, not a group heading.
    if (GROUP.banner.label) {
      const bannerRow = makeRow(GROUP.banner.bottomWeight, sepPaint, TABLE.dashPattern);
      // T32 (owner polish): no padding on the outer banner cell — FILL height
      // (trivial here, it is the row's only cell, but kept for consistency
      // with every other label-type cell) — breathing room lives on
      // makeLabelInner() instead.
      const bannerCell = makeCell(${JSON.stringify(plan.table.tableWidth)}, 'MIN', 0, sepPaint, TABLE.dashPattern);
      const inner = makeLabelInner(TABLE.cellPaddingFigmaVar);
      const heading = figma.createText();
      heading.fontName = fontName;
      heading.characters = GROUP.banner.label;
      heading.fontSize = 14;
      if (labelPaint) heading.fills = [labelPaint];
      inner.appendChild(heading);
      bannerCell.appendChild(inner);
      labelNodes.push(heading);
      bannerRow.appendChild(bannerCell);
      bannerCell.layoutSizingVertical = 'FILL';
      groupFrame.appendChild(bannerRow);
    }

    for (const row of GROUP.rows) {
      const dataRow = makeRow(row.bottomWeight, sepPaint, TABLE.dashPattern);
      // T32 (owner polish): row-label cell — no padding on the outer cell,
      // FILL height so its border runs flush top-to-bottom with the row
      // (the original complaint: a short/floating label box) — the label's
      // own breathing room moves to makeLabelInner().
      const labelCell = makeCell(TABLE.rowLabelWidth, 'MIN', row.labelCell.rightWeight, sepPaint, TABLE.dashPattern);
      if (row.labelCell.label) {
        const inner = makeLabelInner(TABLE.cellPaddingFigmaVar);
        const label = figma.createText();
        label.fontName = fontName;
        label.characters = row.labelCell.label;
        label.fontSize = 11;
        if (labelPaint) label.fills = [labelPaint];
        inner.appendChild(label);
        labelCell.appendChild(inner);
        labelNodes.push(label);
      }
      dataRow.appendChild(labelCell);
      labelCell.layoutSizingVertical = 'FILL'; // only settable once parented into the row's auto-layout.

      for (const cell of row.cells) {
        // Data cell — UNCHANGED: padding stays directly on the cell (the
        // instance itself already carries the row's visual weight, so
        // there is no "short box" problem here — HUG height keeps matching
        // the row exactly, same as before this polish pass).
        const dataCell = makeDataCell(TABLE.cellWidth, cell.rightWeight, sepPaint, TABLE.dashPattern, TABLE.cellPaddingFigmaVar);
        const inst = base.createInstance();
        dataCell.appendChild(inst);
        try { inst.setProperties(applyFor(cell.properties)); }
        catch (e) { setPropMisses.push('setProperties:' + JSON.stringify(cell.properties) + ':' + e.message); }
        dataRow.appendChild(dataCell);
        built++;
      }
      groupFrame.appendChild(dataRow);
    }

    sheetGrid.appendChild(groupFrame);
    const textStylesLinked = await linkTextStyles(labelNodes);

    return JSON.stringify({ group: GROUP.groupLabel, built, textStylesLinked, missingVars: [...misses, ...setPropMisses] });
  `;
}
