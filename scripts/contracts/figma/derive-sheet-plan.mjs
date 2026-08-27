/**
 * derive-sheet-plan.mjs — `--sheet` mode's pure derivation (T31/T32, split
 * out of generate-figma.mjs): contract -> a deterministic TABLE plan for a
 * Propstar-equivalent documentation frame — no ids, no measured/live facts.
 *
 * REPURPOSES buildOps()'s T23 fan-out machinery rather than re-deriving a
 * second cartesian product: `buildOps(contract, { forceAllBooleanAxes: true
 * })` fans out EVERY non-omitted boolean (regardless of the contract's own
 * curation, which as of T31 no longer marks anything axis-mode for the LIVE
 * set) into the same `ops.variants` cartesian list T23 originally built
 * components from. This module only RE-GROUPS that list for rendering as
 * INSTANCES of the already-built (property-mode) set — it does not fan
 * anything out itself, and builds nothing (no components, no page access).
 *
 * Grouping (documented judgment call — the owner's Propstar screenshot was a
 * reference image, not machine-readable input to this generator, so this is
 * "a clean deterministic grouping," not an attempted pixel-for-pixel
 * replica):
 *   - COLUMNS = State — matches the live set's own primary grid axis
 *     (build-set-code.mjs's `colAxisDef`), so the sheet reads in the same
 *     direction as the set it documents.
 *   - ROW GROUPS, outermost to innermost = the enum (Variant) axis, then
 *     every other boolean axis in BOOLEAN_AXIS_CANONICAL_ORDER — the SAME
 *     left-to-right order `booleanAxisDefs` already sorts into for
 *     OPS.axes/variant naming, so this sheet's grouping direction matches
 *     both the ops artifact's own axis order and the live grid's row axis
 *     order. One heading per enum value (the outermost, most visually
 *     distinct group); a single concatenated row label for every combination
 *     of the remaining boolean axes — a real nested visual frame per boolean
 *     axis was considered and rejected: a flat label list generalizes to any
 *     number of future boolean axes without a frame-per-axis explosion.
 *
 * Layout is computed here too, not in the plugin code — FIXED pitch values
 * (config.sheet.*, defaults in sheet-style.mjs), never measured; see
 * sheet-style.mjs for why (the live set's per-variant "measure after
 * building" dance is exactly the kind of extra per-call work this sheet's
 * ~100-instance batch cannot afford under the Desktop Bridge's ~30s
 * per-call execution ceiling).
 */
import { buildOps, classifyAxes } from './derive-ops.mjs';
import { DEFAULT_COMPONENT_CONFIG } from './component-config.mjs';
import {
  SHEET_CELL_PADDING_FIGMA_VAR,
  SHEET_SEPARATOR_COLOR_HEX,
  SHEET_SEPARATOR_COLOR_RGB,
  SHEET_SEPARATOR_DASH_PATTERN,
  SHEET_SEPARATOR_GROUP_WEIGHT,
  SHEET_SEPARATOR_WEIGHT,
  docHeaderDescription,
  docHeaderDocsUrl,
  SHEET_DOC_HEADER_LINK_TEXT,
  SHEET_DOC_HEADER_MIN_WIDTH_PX,
  SHEET_DOC_HEADER_MASTER_NAME,
  SHEET_DOC_HEADER_MASTER_PAGE,
} from './sheet-style.mjs';

/**
 * T32 (owner feedback): "Slot Before=False, Slot After=False" reads as raw
 * property-name debug output, not documentation. Pure string derivation, no
 * ids, contract-derived so it generalizes to any component's boolean axes —
 * not al-button-specific.
 *
 *   - AXIS VALUE labels (column headers, group headings) drop the
 *     "Axis=" prefix entirely: the column/group already names the axis by
 *     position (a "State" column header of plain "Hover", a Variant group
 *     heading of plain "Primary") — see humanizeAxisValue() below.
 *   - BOOLEAN-COMBINATION row labels describe ONLY what's ON, never every
 *     axis at every value — see humanizeBooleanCombo() below.
 */
export function humanizeAxisValue(value) {
  return value;
}

/** The noun a slot's boolean earns in a row label: "Icon" when that slot
 * carries a `figmaPlaceholder` (T19/T25's icon-instance convention — the
 * slot is understood to hold an icon), "Content" otherwise (a slotted
 * boolean with no icon convention documented for it). Slot NAME is already
 * "before"/"after" (contract.slots[].name), so "Icon <slot name>" reads as
 * "Icon before" with no further transformation needed. */
function slotNounFor(contract, slotName) {
  const slot = (contract.slots || []).find((s) => s.name === slotName);
  return slot && slot.figmaPlaceholder ? 'Icon' : 'Content';
}

/** "Is Full Width" -> "full width" (drop a leading "Is ", lowercase the
 * rest) for a generic, non-slot boolean's "With <...>" row-label term. */
function spacedPropName(figmaPropertyName) {
  return figmaPropertyName.replace(/^Is\s+/, '').toLowerCase();
}

/**
 * `boolAxes` is buildOps()'s own `booleanAxisDefs` (each carrying
 * `{ name, kind, side }` — `kind: 'slot'` + `side: 'before'|'after'` for a
 * slot boolean, `kind: 'fullWidth'` for a generic layout boolean), `combo`
 * is one boolAxes-name -> 'True'|'False' combination (buildSheetPlan's own
 * `cartesianObjects` output). Returns "Default" when nothing in the combo is
 * on; otherwise ONE humanized term per axis that IS on, slot terms grouped
 * by noun (same noun, multiple sides -> pluralized "Icons before + after";
 * different nouns -> one singular term per side, e.g. "Icon before +
 * Content after"), non-slot terms appended as "With <prop name>", all
 * joined with " + ".
 */
export function humanizeBooleanCombo(contract, boolAxes, combo) {
  // A CASE axis (kind 'case' — measured case dimensions like Current/
  // Separator/Type, spec 2026-08-26-contract-coverage…) is "on" whenever its
  // value differs from the axis default; a boolean axis is on at 'True'.
  const onAxes = boolAxes.filter((a) => (a.kind === 'case' ? combo[a.name] !== a.default : combo[a.name] === 'True'));
  if (!onAxes.length) return 'Default';

  const slotTerms = onAxes.filter((a) => a.kind === 'slot');
  const otherTerms = onAxes.filter((a) => a.kind !== 'slot');

  const parts = [];
  if (slotTerms.length) {
    // Group ON slot sides by their noun, preserving boolAxes' own left-to-
    // right (BOOLEAN_AXIS_CANONICAL_ORDER) order within each noun group.
    const sidesByNoun = new Map();
    for (const a of slotTerms) {
      const noun = slotNounFor(contract, a.side);
      if (!sidesByNoun.has(noun)) sidesByNoun.set(noun, []);
      sidesByNoun.get(noun).push(a.side);
    }
    if (sidesByNoun.size === 1) {
      const [[noun, sides]] = [...sidesByNoun.entries()];
      parts.push(sides.length > 1 ? `${noun}s ${sides.join(' + ')}` : `${noun} ${sides[0]}`);
    } else {
      // Different nouns on the same row: one singular term per side, in
      // slotTerms' own order, joined below alongside everything else.
      for (const a of slotTerms) parts.push(`${slotNounFor(contract, a.side)} ${a.side}`);
    }
  }
  for (const a of otherTerms) {
    // Case-axis terms: a Yes/True value reads as "With <axis>"; any other
    // non-default value (Type=Dot) reads as the value itself — the axis is
    // implied by the row's position under its own labeled sheet.
    if (a.kind === 'case' && !['Yes', 'True'].includes(combo[a.name])) parts.push(humanizeAxisValue(combo[a.name]));
    else parts.push(`With ${spacedPropName(a.name)}`);
  }

  return parts.join(' + ');
}

/**
 * T32 (owner correction — the first cut's per-cell 4-side "collapsed
 * borders" scheme rendered as separate floating boxes with doubled/offset
 * dashes at shared edges, not one grid; her own words: "maybe only stroke on
 * main container, rows - bottom (except for last), columns - right (except
 * for last)"). CSS `border-collapse`-style, exactly three stroke sources,
 * never more:
 *   - the outer container (sheetGrid) draws a full four-side border once —
 *     see build-sheet-code.mjs's setup call.
 *   - EVERY row (header, banner, or data — border-collapse does not
 *     distinguish them) draws its OWN bottom edge ONLY, never top/left/
 *     right (the container's own edges already close those, and every
 *     row's TOP boundary is simply the row above it own bottom).
 *   - EVERY cell (label or data) draws its OWN right edge ONLY, never top/
 *     bottom/left, for the exact same reason along the horizontal axis.
 * The ABSOLUTE last row in the whole table draws NO bottom (the container's
 * own bottom edge closes it — drawing both would double that one edge); the
 * LAST cell in a row draws NO right (the container's own right edge closes
 * it). An enum-group boundary is simply that group's OWN last row's bottom
 * weight upgraded to `SHEET_SEPARATOR_GROUP_WEIGHT` — "heavier... border"
 * per the owner's own design direction — never a second frame or a
 * banner-side stroke; there is exactly one line at that seam, at a heavier
 * weight, same as every other row boundary is exactly one line at the
 * ordinary weight.
 */
export function rowBottomWeight({ isLastRowOverall, isLastRowOfGroup, isLastGroup }) {
  if (isLastRowOverall) return 0;
  if (isLastRowOfGroup && !isLastGroup) return SHEET_SEPARATOR_GROUP_WEIGHT;
  return SHEET_SEPARATOR_WEIGHT;
}
export function cellRightWeight(isLastColumn) {
  return isLastColumn ? 0 : SHEET_SEPARATOR_WEIGHT;
}

/**
 * T32: contract -> a deterministic TABLE plan (no ids, no positions — every
 * frame's size/border/order is derived structurally, then built via real
 * nested auto-layout, not measured or manually placed). See the module
 * header for the grouping judgment call; only the RENDERING mechanism (real
 * bordered table frames, not positioned vector lines + free-floating
 * text/instances) changed under T32's owner design direction.
 */
export function buildSheetPlan(contract, { projectId = 'altitude', pageName = 'Contract Pilot', config = DEFAULT_COMPONENT_CONFIG, nestedSetNames = {} } = {}) {
  const forcedOps = buildOps(contract, { projectId, pageName, forceAllBooleanAxes: true, config, nestedSetNames });
  const { stateAxis, enumAxis: variantAxis, boolAxes } = classifyAxes(forcedOps.axes);

  // Columns axis (spec 2026-08-26-contract-coverage…, Badge walkthrough
  // finding): a component with no delta-backed states has NO State axis in
  // its ops — the ENUM axis becomes the sheet's columns instead (Badge:
  // Variant columns) and the per-enum group banners disappear (the enum is
  // consumed by the columns). A component with neither axis still gets one
  // "Default" pseudo-column so the table shape holds.
  const columnsAxis = stateAxis || variantAxis || { name: 'State', values: ['Default'], default: 'Default' };
  const groupAxis = stateAxis ? variantAxis : null;
  /** ops variant -> its value on `axis` (boolean axes via axisValues; the
   * enum axis via .variant; State — real or pseudo — via .state). */
  function axisValueOf(vv, axis) {
    if (axis.kind) return (vv.axisValues || {})[axis.name];
    return axis === variantAxis ? vv.variant : vv.state;
  }

  const rowLabelWidth = config.sheet.rowLabelWidth;
  const cellWidth = config.sheet.cellWidth;

  function cartesianObjects(list) {
    return list.reduce((acc, axis) => acc.flatMap((combo) => axis.values.map((v) => ({ ...combo, [axis.name]: v }))), [{}]);
  }
  const subCombos = boolAxes.length ? cartesianObjects(boolAxes) : [{}];
  const variantValues = groupAxis ? groupAxis.values : [null];
  const lastGroupIndex = variantValues.length - 1;

  // Header row: one label-column spacer cell (empty — the row-label column
  // has nothing to say in the header) + one cell per State value. Its OWN
  // bottom is ordinary weight (it is never the table's last row); the last
  // State column's cell draws no right (the container's own edge closes it).
  const headerCells = [
    { label: '', isLabelColumn: true, rightWeight: cellRightWeight(false) },
    ...columnsAxis.values.map((state, ci) => ({
      label: humanizeAxisValue(state),
      isLabelColumn: false,
      rightWeight: cellRightWeight(ci === columnsAxis.values.length - 1),
    })),
  ];
  const headerBottomWeight = rowBottomWeight({ isLastRowOverall: false, isLastRowOfGroup: false, isLastGroup: false });

  const groups = variantValues.map((variant, gi) => {
    const isLastGroup = gi === lastGroupIndex;
    const rows = subCombos.map((combo, ri) => {
      const isLastRowOfGroup = ri === subCombos.length - 1;
      const isLastRowOverall = isLastGroup && isLastRowOfGroup;
      const bottomWeight = rowBottomWeight({ isLastRowOverall, isLastRowOfGroup, isLastGroup });
      const labelCell = {
        label: boolAxes.length ? humanizeBooleanCombo(contract, boolAxes, combo) : 'Default',
        isLabelColumn: true,
        rightWeight: cellRightWeight(false),
      };
      const dataCells = columnsAxis.values.map((state, ci) => {
        const properties = { [columnsAxis.name]: state };
        if (variant) properties[groupAxis.name] = variant;
        // Case axes carry their option STRING (a real variant option on the
        // target set, e.g. Current=Yes); boolean axes carry true/false.
        for (const a of boolAxes) properties[a.name] = a.kind === 'case' ? combo[a.name] : combo[a.name] === 'True';
        const matched = forcedOps.variants.find((vv) => axisValueOf(vv, columnsAxis) === state
          && (!groupAxis || vv.variant === variant)
          && boolAxes.every((a) => (vv.axisValues || {})[a.name] === combo[a.name]));
        return {
          state,
          properties,
          sourceVariantName: matched ? matched.name : null,
          rightWeight: cellRightWeight(ci === columnsAxis.values.length - 1),
        };
      });
      return { labelCell, cells: dataCells, bottomWeight };
    });
    return {
      groupLabel: variant ? humanizeAxisValue(variant) : null,
      // Banner is one wide cell (its own row) spanning the table's FULL
      // width — a single column, so it draws NO right (there is nothing
      // beside it to divide from; the container's own right edge closes
      // it). Its bottom follows the SAME row rule as every other row (it is
      // never the group's LAST row, since at least one data row always
      // follows it) — no separate "group boundary" concept lives here
      // anymore; that boundary is entirely the PRECEDING group's own last
      // data row (see rowBottomWeight's own comment).
      banner: { label: variant ? humanizeAxisValue(variant) : null, bottomWeight: rowBottomWeight({ isLastRowOverall: false, isLastRowOfGroup: false, isLastGroup: false }) },
      rows,
    };
  });

  const totalInstances = groups.reduce((n, g) => n + g.rows.reduce((m, r) => m + r.cells.length, 0), 0);
  const tableWidth = rowLabelWidth + columnsAxis.values.length * cellWidth;

  return {
    schemaVersion: 1,
    generator: 'scripts/contracts/generate-figma.mjs --sheet',
    project: projectId,
    contract: { id: contract.id, name: contract.name, version: contract.version },
    page: pageName,
    targetComponentSetName: contract.name,
    sheetFrameName: `${contract.name} — Prop Sheet`,
    columns: { name: columnsAxis.name, values: columnsAxis.values },
    rowAxisOrder: [groupAxis ? groupAxis.name : null, ...boolAxes.map((a) => a.name)].filter(Boolean),
    // T32: resolved BY NAME live in the plugin code (never an id here) —
    // see SHEET_DOC_HEADER_MASTER_NAME's own comment (sheet-style.mjs) for
    // what this is and why it has no established reuse convention to mirror.
    header: {
      masterName: SHEET_DOC_HEADER_MASTER_NAME,
      masterPageName: SHEET_DOC_HEADER_MASTER_PAGE,
      title: contract.name || contract.id,
      description: docHeaderDescription(contract.description),
      linkText: SHEET_DOC_HEADER_LINK_TEXT,
      linkUrl: docHeaderDocsUrl(contract.id),
      width: Math.max(tableWidth, SHEET_DOC_HEADER_MIN_WIDTH_PX),
    },
    table: {
      rowLabelWidth,
      cellWidth,
      tableWidth,
      cellPaddingFigmaVar: SHEET_CELL_PADDING_FIGMA_VAR,
      separatorColor: SHEET_SEPARATOR_COLOR_RGB,
      separatorColorHex: SHEET_SEPARATOR_COLOR_HEX,
      dashPattern: SHEET_SEPARATOR_DASH_PATTERN,
      separatorWeight: SHEET_SEPARATOR_WEIGHT,
      headerCells,
      headerBottomWeight,
      groups,
    },
    totalInstances,
    degradations: forcedOps.degradations,
  };
}
