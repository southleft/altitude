#!/usr/bin/env node
/**
 * reorder-pages.mjs — put the molecule pages in the MOLECULES section.
 *
 *   node scripts/figma-atoms/reorder-pages.mjs [--dry]
 *
 * build-page.mjs inserts a new page BEFORE the `----- MOLECULES -----` divider, which is
 * correct for an atom and wrong for a molecule: it lands at the bottom of ATOMS. This
 * moves every molecule page to just AFTER that divider, in the listed order.
 *
 * `Banner` moves too. Its Storybook title is `Molecules/Banner` while its Figma page sat
 * under ATOMS; the code is the source of truth, so Figma follows the code.
 */
import { shimPortFromArgv } from '../lib/figma-shim.mjs';

const SHIM = shimPortFromArgv();
const DRY = process.argv.includes('--dry');

// Order shown in the Figma page list. Banner first — it is the pre-existing page.
const MOLECULE_PAGES = [
  'Banner',
  'Breadcrumbs', 'Button Group', 'Checkbox Group', 'Chip Group', 'Empty State',
  'File Upload', 'Input', 'Input Stepper', 'Menu', 'Pagination', 'Radio Group',
  'Combobox', 'Range', 'Table', 'Tabs', 'Textarea', 'Toggle Button Group',
];

const code = `
await figma.loadAllPagesAsync();
const want = ${JSON.stringify(MOLECULE_PAGES)};
const divider = figma.root.children.findIndex((p) => p.name.indexOf('MOLECULES') !== -1);
if (divider === -1) return JSON.stringify({ error: 'no MOLECULES divider' });

const moved = [];
const missing = [];
// Re-read the divider index each time: every insertChild renumbers the list.
for (const name of want) {
  const target = '\\u{1F6E0} ' + name;
  const page = figma.root.children.find((p) => p.name === target);
  if (!page) { missing.push(name); continue; }
  const dIdx = figma.root.children.findIndex((p) => p.name.indexOf('MOLECULES') !== -1);
  const at = dIdx + 1 + moved.length;
  const cur = figma.root.children.indexOf(page);
  if (cur === at) { moved.push(name); continue; }
  ${DRY ? '' : 'figma.root.insertChild(at > cur ? at - 1 : at, page);'}
  moved.push(name);
}
const order = figma.root.children.map((p) => p.name);
return JSON.stringify({ moved, missing, order });
`;

const res = await fetch(`http://127.0.0.1:${SHIM}/call`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'figma_execute', arguments: { code, timeout: 180000 } }),
});
const out = await res.json();
if (out.isError) { console.error(String(out.text).slice(0, 400)); process.exit(1); }
const inner = JSON.parse(out.text);
if (!inner.success) { console.error(String(inner.error).slice(0, 400)); process.exit(1); }
const r = JSON.parse(inner.result);
if (r.error) { console.error(r.error); process.exit(1); }
console.log(`moved: ${r.moved.length}${r.missing.length ? '  MISSING: ' + r.missing.join(', ') : ''}`);
const from = r.order.findIndex((n) => n.indexOf('MOLECULES') !== -1);
console.log('\npage order around the divider:');
for (const n of r.order.slice(Math.max(0, from - 2), from + 20)) console.log('  ' + n);
