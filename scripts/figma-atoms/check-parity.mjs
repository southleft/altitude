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
 *
 * IT IS A GATE NOW (T1, spec 2026-08-29-parity-judgement-gates-and-evals).
 * Until 2026-08-29 this script exited non-zero only when it could not READ an
 * ops file or reach the shim — a variant 40px off, or missing from Figma
 * entirely, printed a line and returned 0. It now:
 *   (a) exits 1 when any checked variant is outside tolerance or missing, and
 *   (b) writes a RECEIPT (scripts/lib/parity-receipt.mjs) naming what passed
 *       and against which source digests, which `mark-synced.mjs` requires
 *       before it will stamp a component as in-sync.
 * `--no-fail` restores the old print-and-exit-0 behaviour for exploratory
 * surveys. The receipt is written either way — the flag changes this process's
 * exit code, never what the receipt says happened.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scope, projectArg } from './project-scope.mjs';
import { call, parsePayload, shimPortFromArgv, assertTargetFile } from '../lib/figma-shim.mjs';
import { hasFlag, positionals } from '../lib/argv.mjs';
import { rosterIndex, sourceKeyFor, writeReceipt } from '../lib/parity-receipt.mjs';

const sc = scope(projectArg());
const PORT = shimPortFromArgv();
const TOL = 4; // px
const keys = positionals(process.argv, { valueFlags: ['--project', '--port', '--shim'] });

const MOLECULES = [
  'al-checkbox-group', 'al-radio-group',
  'al-breadcrumbs', 'al-menu', 'al-tabs', 'al-input', 'al-textarea',
  'al-input-stepper', 'al-range', 'al-empty-state', 'al-file-upload',
  'al-table', 'al-pagination', 'al-combobox'
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
  // The set is NOT a direct child of the page. generate-figma.mjs nests it
  // inside a "<Name> — Generated" frame alongside the prop sheet, so a
  // direct-children scan finds zero sets for EVERY component and reports the
  // whole library missing from Figma. Verified live 2026-08-29: direct 0 /
  // nested 1 for Badge, Button, Divider and Banner alike. Fail-closed, so
  // nothing false was ever stamped — but "missing" was a false reason, which
  // is the defect class this gate exists to remove.
  const sets = page.findAllWithCriteria({ types: ['COMPONENT_SET'] });
  // Prefer the set named for the component; fall back to a lone set. Two sets
  // sharing a name is this repo's own documented trap, so ambiguity is
  // reported, never guessed.
  const set = sets.find((n) => n.name === name) ?? (sets.length === 1 ? sets[0] : null);
  if (!set) { out[name] = null; continue; }
  out[name] = set.children.map((c) => ({ n: c.name, w: Math.round(c.width * 100) / 100, h: Math.round(c.height * 100) / 100 }));
}
return JSON.stringify(out);
`;

// POSITIVE target guard, BEFORE a single measurement is taken. The bridge
// reports every connected file and acts on the ACTIVE one, so "the shim
// answered" is not evidence the right document is open: on 2026-08-29 a
// client file was active while this tool was pointed at Altitude, and the
// decoy guard passed it because it was not on the known-bad list. A receipt
// minted against the wrong file is worse than no receipt - mark-synced would
// treat it as proof of parity with the target.
let target;
try {
  target = assertTargetFile(sc.project, await call('figma_get_status', {}, { port: PORT, fileName: sc.fileName }));
} catch (e) {
  console.error(String(e.message).slice(0, 500));
  process.exit(1);
}
if (!target.ok) {
  console.error(`REFUSING to check parity: ${target.reason}`);
  process.exit(1);
}
console.log(`[target] ${target.reason}`);

let live;
try {
  const payload = parsePayload(await call('figma_execute', { code, timeout: 180000 }, { port: PORT, fileName: sc.fileName }));
  if (payload && payload.success === false) throw new Error(String(payload.error ?? 'figma_execute reported success:false'));
  live = typeof payload === 'string' ? JSON.parse(payload) : payload;
} catch (e) {
  console.error(String(e.message).slice(0, 500));
  process.exit(1);
}

// The roster mark-synced.mjs and computeParity() use — read once, so the
// digests recorded here are the same ones the stamp gate will recompute.
const rosterByTag = rosterIndex(sc.project);

let totalOff = 0; let totalMissing = 0; let totalChecked = 0;
const results = {};
for (const key of targets) {
  const ops = opsByKey.get(key);
  const built = live[ops.name];
  // `sourceKey` is null for a key the roster does not know (an ops file for
  // something outside this project's component roster). The comparison below
  // still runs and still reports; what a null buys is that the receipt cannot
  // authorise a stamp for it — see receiptAuthorises() in parity-receipt.mjs.
  const sourceKey = sourceKeyFor(rosterByTag, key);
  const base = { figmaSetName: ops.name, sourceKey };
  if (!built) {
    console.log(`${ops.name.padEnd(18)} NO PAGE/SET IN FIGMA`);
    totalMissing++;
    results[key] = { ...base, ok: false, checked: 0, off: 0, missing: 1, unverifiable: 'no page or component set in Figma' };
    continue;
  }
  const byName = new Map(built.map((b) => [b.n, b]));
  const rows = ops.rows.filter((r) => r.state === 'Default' || r.differsFromDefault);
  const offs = []; const missing = [];
  let checkedHere = 0;
  for (const r of rows) {
    if (!r.expected) continue;
    totalChecked++; checkedHere++;
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
  results[key] = {
    ...base,
    ok: !offs.length && !missing.length && checkedHere > 0,
    checked: checkedHere,
    off: offs.length,
    missing: missing.length,
    // A set whose every row carries no `expected` box compares nothing at all.
    // Reporting that as OK is how a component with no measurements would have
    // sailed through the stamp gate; it is named instead.
    ...(checkedHere === 0 ? { unverifiable: 'no ops row carried an expected box — nothing was compared' } : {}),
  };
}
console.log(`\n[${sc.id}] checked ${totalChecked} variants | ${totalOff} outside ${TOL}px | ${totalMissing} missing`);

const receipt = writeReceipt(sc.project, { tolerancePx: TOL, components: results, observedFileKey: target.activeFileKey, observedFileName: target.activeFileName });
console.log(`[${sc.id}] receipt written: ${receipt}`);

const failed = totalOff > 0 || totalMissing > 0;
if (failed && hasFlag('--no-fail')) {
  console.log('[check-parity] --no-fail: reporting only. mark-synced.mjs will still refuse the failing components.');
  process.exit(0);
}
if (failed) {
  console.error(`\n[check-parity] FAIL — ${totalOff} variant(s) outside ${TOL}px, ${totalMissing} missing. Fix the set (or the measurement) and re-run; mark-synced.mjs will not stamp these.`);
  process.exit(1);
}
console.log('[check-parity] PASS');
