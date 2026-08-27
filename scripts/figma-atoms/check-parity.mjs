#!/usr/bin/env node
/**
 * check-parity.mjs — built Figma variant sizes vs the measured browser sizes.
 *
 *   node scripts/figma-atoms/check-parity.mjs [key ...] [--project <id>] [--port <n>]
 *
 * The ops files carry each row's `expected` box straight from the real rendered
 * component, so this compares Figma against the browser rather than against itself.
 * Auto-layout resizes, so an exact match is not the bar — anything over TOL is worth
 * a look, and a variant MISSING from Figma is always a real failure.
 *
 * MULTI-PROJECT (2026-08-27, spec parity-system-audit-remediation R1b): ops files
 * are read from the ACTIVE project's ops dir (`--project <id>` / DS_PROJECT /
 * registry default), absolute — not the old cwd-relative Altitude literal. The
 * old positional parse also kept `--project`'s VALUE as a component key, so the
 * exact command parity.mjs's aiPrompt hands out used to die on
 * `ops/southleft.json` ENOENT.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scope, projectArg } from './project-scope.mjs';
import { call, parsePayload, shimPortFromArgv } from '../lib/figma-shim.mjs';
import { positionals } from '../lib/argv.mjs';

const sc = scope(projectArg());
const PORT = shimPortFromArgv();
const TOL = 4; // px
const keys = positionals(process.argv, { valueFlags: ['--project', '--port', '--shim'] });

const MOLECULES = [
  'al-checkbox-group', 'al-radio-group',
  'al-breadcrumbs', 'al-menu', 'al-tabs', 'al-input', 'al-textarea',
  'al-input-stepper', 'al-range', 'al-empty-state', 'al-file-upload',
  'al-table', 'al-pagination', 'al-toggle-button-group', 'al-combobox'
];
const targets = keys.length ? keys : MOLECULES;

const opsFor = (key) => {
  const p = join(sc.dirs.ops, `${key}.json`);
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`[check-parity] Cannot read ops file for "${key}" (${p}): ${e.message}`);
    console.error(`Is "${key}" a component tag with generated ops for project "${sc.id}"?`);
    process.exit(1);
  }
};
const opsByKey = new Map(targets.map((k) => [k, opsFor(k)]));

const code = `
await figma.loadAllPagesAsync();
const want = ${JSON.stringify([...opsByKey.values()].map((o) => o.name))};
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

let live;
try {
  const payload = parsePayload(await call('figma_execute', { code, timeout: 180000 }, { port: PORT, fileName: sc.fileName }));
  if (payload && payload.success === false) throw new Error(String(payload.error ?? 'figma_execute reported success:false'));
  live = typeof payload === 'string' ? JSON.parse(payload) : payload;
} catch (e) {
  console.error(String(e.message).slice(0, 500));
  process.exit(1);
}

let totalOff = 0; let totalMissing = 0; let totalChecked = 0;
for (const key of targets) {
  const ops = opsByKey.get(key);
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
console.log(`\n[${sc.id}] checked ${totalChecked} variants | ${totalOff} outside ${TOL}px | ${totalMissing} missing`);
