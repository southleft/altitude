#!/usr/bin/env node
/**
 * check-parity.mjs — built Figma variant sizes vs the measured browser sizes.
 *
 *   node scripts/figma-atoms/check-parity.mjs [key ...]
 *
 * The ops files carry each row's `expected` box straight from the real rendered
 * component, so this compares Figma against the browser rather than against itself.
 * Auto-layout resizes, so an exact match is not the bar — anything over TOL is worth
 * a look, and a variant MISSING from Figma is always a real failure.
 */
import { readFileSync, readdirSync } from 'node:fs';

const TOL = 4; // px
const keys = process.argv.slice(2).filter((a) => !a.startsWith('--'));

const MOLECULES = [
  'al-checkbox-group', 'al-radio-group',
  'al-breadcrumbs', 'al-menu', 'al-tabs', 'al-input', 'al-textarea',
  'al-input-stepper', 'al-range', 'al-empty-state', 'al-file-upload',
  'al-table', 'al-pagination', 'al-toggle-button-group', 'al-combobox'
];
const targets = keys.length ? keys : MOLECULES;

const code = `
await figma.loadAllPagesAsync();
const want = ${JSON.stringify(targets.map((k) => JSON.parse(readFileSync('.altitude/figma-sync/ops/' + k + '.json', 'utf8')).name))};
const out = {};
for (const name of want) {
  const page = figma.root.children.find((p) => p.name === '\\u{1F6E0} ' + name);
  if (!page) { out[name] = null; continue; }
  await page.loadAsync();
  const set = page.children.find((n) => n.type === 'COMPONENT_SET');
  if (!set) { out[name] = null; continue; }
  out[name] = set.children.map((c) => ({ n: c.name, w: Math.round(c.width * 100) / 100, h: Math.round(c.height * 100) / 100 }));
}
return JSON.stringify(out);
`;

const res = await fetch('http://localhost:9401/call', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'figma_execute', arguments: { code, timeout: 180000 } }),
});
const out = await res.json();
if (out.isError) { console.error(String(out.text).slice(0, 300)); process.exit(1); }
const inner = JSON.parse(out.text);
if (!inner.success) { console.error(String(inner.error).slice(0, 300)); process.exit(1); }
const live = JSON.parse(inner.result);

let totalOff = 0; let totalMissing = 0; let totalChecked = 0;
for (const key of targets) {
  const ops = JSON.parse(readFileSync(`.altitude/figma-sync/ops/${key}.json`, 'utf8'));
  const built = live[ops.name];
  if (!built) { console.log(`${ops.name.padEnd(18)} NO PAGE/SET IN FIGMA`); totalMissing++; continue; }
  const byName = new Map(built.map((b) => [b.n, b]));
  const rows = ops.rows.filter((r) => r.state === 'Default' || r.differsFromDefault);
  const offs = []; const missing = [];
  for (const r of rows) {
    if (!r.expected) continue;
    totalChecked++;
    const b = byName.get(r.variant);
    if (!b) { missing.push(r.variant); totalMissing++; continue; }
    const dw = Math.abs(b.w - r.expected.w); const dh = Math.abs(b.h - r.expected.h);
    if (dw > TOL || dh > TOL) {
      offs.push(`${r.variant}: figma ${b.w}x${b.h} vs browser ${r.expected.w}x${r.expected.h}`);
      totalOff++;
    }
  }
  const status = !offs.length && !missing.length ? 'OK' : `${offs.length} off, ${missing.length} missing`;
  console.log(`${ops.name.padEnd(18)} variants=${String(rows.length).padStart(3)}  ${status}`);
  for (const m of missing.slice(0, 3)) console.log(`    MISSING  ${m}`);
  for (const o of offs.slice(0, 3)) console.log(`    OFF      ${o}`);
  if (offs.length > 3) console.log(`    ... ${offs.length - 3} more off`);
}
console.log(`\nchecked ${totalChecked} variants | ${totalOff} outside ${TOL}px | ${totalMissing} missing`);
