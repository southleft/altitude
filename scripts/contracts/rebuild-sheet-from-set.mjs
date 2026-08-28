#!/usr/bin/env node
/**
 * rebuild-sheet-from-set.mjs — rebuild a component's "<Name> — Prop Sheet" grid from
 * the LIVE Figma component set, rather than from the contract's derived ops.
 *
 *   node scripts/contracts/rebuild-sheet-from-set.mjs --sheet <nodeId> --set <nodeId> [--donor <sheetNodeId>]
 *   node scripts/contracts/rebuild-sheet-from-set.mjs --component al-list-item        (resolve both by name)
 *
 * WHY THIS EXISTS (2026-08-27, spec 2026-08-27-figma-contract-reconciliation-sweep)
 * ---------------------------------------------------------------------------------
 * `generate-figma.mjs --sheet` derives the grid from the CONTRACT (buildOps), so the
 * sheet can only ever show the states the contract knows about. That is the right
 * default — but it breaks in two directions that both showed up live:
 *
 *   1. The contract UNDER-states reality. A state only reaches the contract when it
 *      carries a measured `stateOverride` or an SCSS delta, and attribute-driven cases
 *      (Error/Disabled) are recorded as anatomy CASES, not interaction states. Eight
 *      components' generated sets were therefore missing states their hand-built
 *      reference sets had (al-list-item was missing Active/Disabled/Error entirely).
 *      Once those sets are repaired IN PLACE, `--sheet` would regress them.
 *   2. The contract OVER-states reality. A cartesian case-axis fan-out invents combos
 *      that were never measured — al-progress's `Shape=Bar x Size=Lg|Md|Xl` are not
 *      real (progress.ts:126 — `circleSize` only applies when `isCircle`), so the
 *      6 phantom variants were pruned from the set and `--sheet` then failed on
 *      `setProperties: Unable to find a variant with those property values`.
 *
 * Driving the grid off the live set makes the documentation agree with the artifact
 * it documents, in both directions. It is a REPAIR tool: use `generate-figma.mjs
 * --sheet` for a component whose contract and set already agree.
 *
 * Layout is cloned from a DONOR sheet rather than constructed, so fonts, colours,
 * strokes and the border-collapse convention (T31/T32) carry over untouched.
 *
 * Axis roles: columns = `State` when present (the library's interaction axis), else
 * the last axis; the first remaining axis groups rows; anything left fans out as rows.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { call, parsePayload, shimPortFromArgv } from '../lib/figma-shim.mjs';
import { argOf } from '../lib/argv.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const PORT = shimPortFromArgv();

const component = argOf('--component');
let sheetId = argOf('--sheet');
let setId = argOf('--set');
let donorId = argOf('--donor');

if (!component && (!sheetId || !setId)) {
  console.error('usage: rebuild-sheet-from-set.mjs (--component <al-tag> | --sheet <id> --set <id>) [--donor <sheetId>]');
  process.exit(1);
}

/** Resolve sheet + set by convention from the parity manifest's Figma set name. */
if (component && (!sheetId || !setId)) {
  const manifest = JSON.parse(
    readFileSync(join(REPO_ROOT, '.altitude', 'figma-sync', 'parity-manifest.json'), 'utf8'),
  );
  const entry = manifest.components?.[component];
  if (!entry?.figma?.name) {
    console.error(`[rebuild-sheet] ${component} has no Figma mapping in the parity manifest.`);
    process.exit(1);
  }
  const setName = entry.figma.name;
  const resolved = parsePayload(
    await call(
      'figma_execute',
      {
        code: `
await figma.loadAllPagesAsync();
const NAME = ${JSON.stringify(setName)};
let set = null, sheet = null;
for (const p of figma.root.children) {
  if (!p.name.startsWith('\\u{1F6E0}')) continue;
  for (const s of p.findAllWithCriteria({ types: ['COMPONENT_SET'] })) {
    // A page can carry a same-named hand-built REFERENCE set alongside the tracked
    // one; prefer the set inside the "— Generated" frame, which is what the sheet
    // documents. (Sets renamed "<Name> (reference)" no longer collide at all.)
    if (s.name !== NAME) continue;
    const inGenerated = s.parent && /— Generated$/.test(s.parent.name);
    if (!set || inGenerated) set = s;
  }
  const f = p.children.find((c) => /— Prop Sheet$/.test(c.name));
  if (f && set && !sheet) sheet = f;
}
return { setId: set && set.id, sheetId: sheet && sheet.id };
`,
        timeout: 60000,
      },
      { port: PORT },
    ),
  );
  setId = setId || resolved.setId;
  sheetId = sheetId || resolved.sheetId;
  if (!setId || !sheetId) {
    console.error(`[rebuild-sheet] could not resolve set/sheet for ${component} (set=${setId} sheet=${sheetId}).`);
    process.exit(1);
  }
}

// Any intact sheet works as the layout donor; the Chip sheet is the reference shape.
const CODE = `
async function loadFontsIn(node) {
  const seen = new Set();
  for (const t of node.findAll((n) => n.type === 'TEXT')) {
    const fns = t.fontName === figma.mixed ? t.getRangeAllFontNames(0, t.characters.length) : [t.fontName];
    for (const f of fns) { const k = f.family + '|' + f.style; if (!seen.has(k)) { seen.add(k); await figma.loadFontAsync(f); } }
  }
}
// Row/column labels a designer reads, not a raw Prop=Value dump (T31 convention).
function humanize(axis, value) {
  if (axis === 'Current')  return value === 'Yes' ? 'With current' : 'Default';
  if (axis === 'Selected') return value === 'Yes' ? 'Selected' : 'Default';
  if (axis === 'Checked')  return value === 'On' ? 'Checked' : 'Unchecked';
  if (axis === 'Label')    return value === 'Hidden' ? 'Label hidden' : 'Label shown';
  if (['Shape','Size','Kind','Role','Variant','Width'].indexOf(axis) !== -1) return value;
  return axis + ': ' + value;
}
await figma.loadAllPagesAsync();
const sheet = await figma.getNodeByIdAsync(${JSON.stringify(sheetId)});
const set   = await figma.getNodeByIdAsync(${JSON.stringify(setId)});
if (!sheet || !set) return { error: 'sheet or set not found' };
const donorSheet = ${donorId ? `await figma.getNodeByIdAsync(${JSON.stringify(donorId)})` : 'sheet'};
const donor = donorSheet.children.find((c) => c.name === 'Sheet Grid');
const grid  = sheet.children.find((c) => c.name === 'Sheet Grid');
if (!donor || !grid) return { error: 'no Sheet Grid on donor or target' };
if (donor.children.length < 2) return { error: 'donor Sheet Grid has no header row + group to clone' };

let page = sheet; while (page && page.type !== 'PAGE') page = page.parent;
await figma.setCurrentPageAsync(page);
await loadFontsIn(donor);

const dHead = donor.children[0], dGroup = donor.children[1];
const cornerT = dHead.children[0], colCellT = dHead.children[1];
const groupLabelRowT = dGroup.children[0], dataRowT = dGroup.children[1];
const rowLabelT = dataRowT.children[0], dataCellT = dataRowT.children[1];
const setText = (n, s) => { const t = n.findOne((x) => x.type === 'TEXT'); if (t) t.characters = s; };

const axes = Object.entries(set.componentPropertyDefinitions)
  .filter(([, d]) => d.type === 'VARIANT')
  .map(([k, d]) => ({ name: k, values: d.variantOptions }));
if (!axes.length) return { error: 'set has no VARIANT axes' };
const colAxis = axes.filter((a) => a.name === 'State')[0] || axes[axes.length - 1];
const rest = axes.filter((a) => a !== colAxis);
const groupAxis = rest[0] || null;
const rowAxes = rest.slice(1);
const combos = (as) => as.length === 0 ? [{}] : as[0].values.reduce((acc, v) => acc.concat(combos(as.slice(1)).map((r) => Object.assign({ [as[0].name]: v }, r))), []);
const findVariant = (props) => set.children.filter((c) =>
  Object.keys(props).every((k) => new RegExp('(^|, )' + k + '=' + props[k] + '(,|$)').test(c.name)))[0];

for (const c of grid.children.slice()) c.remove();

const head = dHead.clone();
for (const c of head.children.slice()) c.remove();
head.appendChild(cornerT.clone());
colAxis.values.forEach((v, i) => {
  const cc = colCellT.clone(); setText(cc, v);
  cc.strokeRightWeight = (i === colAxis.values.length - 1) ? 0 : 1;
  head.appendChild(cc);
});
grid.appendChild(head);

const gvs = groupAxis ? groupAxis.values : [null];
let built = 0, empty = 0;
gvs.forEach((gv, gi) => {
  const group = dGroup.clone();
  for (const c of group.children.slice()) c.remove();
  if (groupAxis) { const glr = groupLabelRowT.clone(); setText(glr, humanize(groupAxis.name, gv)); group.appendChild(glr); }
  const rcs = combos(rowAxes);
  rcs.forEach((rc, ri) => {
    const row = dataRowT.clone();
    for (const c of row.children.slice()) c.remove();
    const rl = rowLabelT.clone();
    setText(rl, rowAxes.length ? rowAxes.map((a) => humanize(a.name, rc[a.name])).join(', ') : 'Default');
    row.appendChild(rl);
    colAxis.values.forEach((cv, ci) => {
      const cell = dataCellT.clone();
      for (const k of cell.children.slice()) k.remove();
      const props = Object.assign({}, rc, { [colAxis.name]: cv });
      if (groupAxis) props[groupAxis.name] = gv;
      const variant = findVariant(props);
      // A genuinely absent combo leaves an EMPTY cell on purpose — the reference sets
      // are sparse (no "Menu Item Disabled + Role=Header"), and an empty cell is the
      // honest rendering of "this combination does not exist".
      if (variant) { cell.appendChild(variant.createInstance()); built++; } else empty++;
      cell.strokeRightWeight = (ci === colAxis.values.length - 1) ? 0 : 1;
      row.appendChild(cell);
    });
    row.strokeBottomWeight = (ri === rcs.length - 1) ? (gi === gvs.length - 1 ? 0 : 2) : 1;
    group.appendChild(row);
  });
  grid.appendChild(group);
});

// Fit every data cell to the widest instance so a wide component (Input, File Upload)
// does not bleed across the border-collapse grid lines.
let maxW = 0;
for (const i of grid.findAll((n) => n.type === 'INSTANCE')) maxW = Math.max(maxW, i.width);
const target = Math.max(200, Math.ceil((maxW + 56) / 10) * 10);
for (const r of grid.findAll((n) => n.name === 'Row')) {
  r.children.forEach((cell, i) => { if (i > 0) { try { cell.resize(target, cell.height); } catch (e) {} } });
}
return { columns: colAxis.name, columnValues: colAxis.values, groupAxis: groupAxis && groupAxis.name,
         rowAxes: rowAxes.map((a) => a.name), instances: built, emptyCells: empty, cellWidth: target };
`;

const result = parsePayload(await call('figma_execute', { code: CODE, timeout: 180000 }, { port: PORT }));
if (result.error) {
  console.error(`[rebuild-sheet] ${result.error}`);
  process.exit(1);
}
console.log(`[rebuild-sheet] ${component || sheetId}: ${JSON.stringify(result)}`);
