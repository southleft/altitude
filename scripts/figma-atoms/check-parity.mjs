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

// TWO LANES, and they own different facts. Until 2026-08-29 this script took
// BOTH from the measured lane, which is why it validated today's canvas
// against a variant matrix last built 2026-08-21 and reported every component
// missing from Figma.
//
//   generated-ops/<tag>.ops.json  (contracts lane, derive-ops.mjs)
//       WHICH VARIANTS MUST EXIST. This is what generate-figma.mjs actually
//       built on canvas, so it is the only honest source for the matrix.
//
//   ops/<tag>.json                (figma-atoms lane, build-component-ops.mjs)
//       HOW BIG each variant should be — `expected {w,h}` measured from the
//       real browser. Nothing else carries measured geometry, so it stays.
//
// The two lanes name variants differently (the measured lane fans out
// State x case axes; the contract lane names only the axes the component
// declares). A variant with no geometry under its own name is reported as
// `geometry-unmeasured` — NAMED and counted, never silently passed.
const generatedOpsFor = (key) => {
  const p = join(sc.dirs.sync, 'generated-ops', `${key}.ops.json`);
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`[check-parity] Cannot read generated ops for "${key}" (${p}): ${e.message}`);
    console.error(`Generate it first: node scripts/contracts/generate-figma.mjs --component ${key} --ops-only`);
    process.exit(1);
  }
};

/** Measured geometry, keyed by the variant name the measured lane used. Absent
 * for a component nobody has measured since the matrix changed — that is a
 * reported gap, not a failure, and never a pass. */
const measuredBoxes = (key) => {
  const p = join(sc.dirs.ops, `${key}.json`);
  const out = new Map();
  try {
    const m = JSON.parse(readFileSync(p, 'utf8'));
    for (const r of m.rows ?? []) if (r.expected && r.variant) out.set(r.variant, r.expected);
  } catch { /* no measured lane for this component — reported per variant below */ }
  return out;
};
const opsByKey = new Map(targets.map((k) => [k, generatedOpsFor(k)]));
const boxesByKey = new Map(targets.map((k) => [k, measuredBoxes(k)]));

const code = `
await figma.loadAllPagesAsync();
const want = ${JSON.stringify([...opsByKey.values()].map((o) => o.componentSetName))};
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
  // AMBIGUITY IS REPORTED, NEVER GUESSED. Array.find returns the first match, and
  // on 2026-08-29 that silently picked the hand-built reference set on the
  // Text Passage page over the generated one — producing a confident, wrong
  // "1 missing, 2 extra". Two sets sharing a name is this repo's own trap 10;
  // the honest answer is to refuse and say so.
  const named = sets.filter((n) => n.name === name);
  if (named.length > 1) { out[name] = { __ambiguous: named.length }; continue; }
  const set = named[0] ?? (sets.length === 1 ? sets[0] : null);
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
  const setName = ops.componentSetName;
  if (!setName) {
    // A malformed or foreign ops file (the retired --sheet mode wrote
    // `<tag>.sheet.ops.json` with a different shape) must not crash the run
    // or, worse, be skipped silently.
    console.error(`[check-parity] ${key}: ops file has no componentSetName — not a component ops artifact. Skipping, and NOT counting it as verified.`);
    results[key] = { figmaSetName: null, sourceKey: sourceKeyFor(rosterByTag, key), ok: false, checked: 0, off: 0, missing: 0, unverifiable: 'ops file has no componentSetName' };
    continue;
  }
  const boxes = boxesByKey.get(key);
  const built = live[setName];
  if (built && built.__ambiguous) {
    console.log(`${setName.padEnd(18)} AMBIGUOUS — ${built.__ambiguous} sets named "${setName}" on its page`);
    totalMissing++;
    results[key] = { figmaSetName: setName, sourceKey: sourceKeyFor(rosterByTag, key), ok: false, checked: 0, off: 0, missing: 0, unverifiable: `${built.__ambiguous} component sets share the name "${setName}" on its page — rename the reference one "${setName} (reference)" so resolution is unambiguous` };
    continue;
  }
  // `sourceKey` is null for a key the roster does not know (an ops file for
  // something outside this project's component roster). The comparison below
  // still runs and still reports; what a null buys is that the receipt cannot
  // authorise a stamp for it — see receiptAuthorises() in parity-receipt.mjs.
  const sourceKey = sourceKeyFor(rosterByTag, key);
  const base = { figmaSetName: setName, sourceKey };
  if (!built) {
    console.log(`${setName.padEnd(18)} NO PAGE/SET IN FIGMA`);
    totalMissing++;
    results[key] = { ...base, ok: false, checked: 0, off: 0, missing: 1, unverifiable: 'no page or component set in Figma' };
    continue;
  }
  const byName = new Map(built.map((b) => [b.n, b]));
  // The matrix the generator actually built, not the measured lane's fan-out.
  const wantVariants = (ops.variants ?? []).map((v) => v.name);
  const offs = []; const missing = []; const unmeasured = [];
  let checkedHere = 0;
  for (const name of wantVariants) {
    const b = byName.get(name);
    if (!b) { missing.push(name); totalMissing++; continue; }
    const expected = boxes.get(name);
    if (!expected) { unmeasured.push(name); continue; }
    totalChecked++; checkedHere++;
    const dw = Math.abs(b.w - expected.w); const dh = Math.abs(b.h - expected.h);
    if (dw > TOL || dh > TOL) {
      offs.push(`${name}: figma ${b.w}x${b.h} vs browser ${expected.w}x${expected.h}`);
      totalOff++;
    }
  }
  // Drift the other way: a variant on canvas the contract does not declare.
  // Reported and counted, deliberately NOT a failure yet — this is a brand-new
  // dimension and the repo's own eleven-false-positive lesson says to measure a
  // rule before gating on it.
  const wanted = new Set(wantVariants);
  const extra = built.map((b) => b.n).filter((n) => !wanted.has(n));
  const status = !offs.length && !missing.length ? 'OK' : `${offs.length} off, ${missing.length} missing`;
  console.log(`${setName.padEnd(18)} variants=${String(wantVariants.length).padStart(3)}  ${status}${unmeasured.length ? `  (${unmeasured.length} unmeasured)` : ''}${extra.length ? `  (${extra.length} extra on canvas)` : ''}`);
  for (const m of missing.slice(0, 3)) console.log(`    MISSING  ${m}`);
  for (const o of offs.slice(0, 3)) console.log(`    OFF      ${o}`);
  if (offs.length > 3) console.log(`    ... ${offs.length - 3} more off`);
  for (const e of extra.slice(0, 3)) console.log(`    EXTRA    ${e} (on canvas, not in the contract)`);
  results[key] = {
    ...base,
    // Existence parity is now a real, checkable fact on its own: every variant
    // the contract declares was found on canvas. Geometry is checked wherever
    // the measured lane can supply a box under that same name.
    ok: !offs.length && !missing.length && wantVariants.length > 0,
    checked: checkedHere,
    off: offs.length,
    missing: missing.length,
    variantsDeclared: wantVariants.length,
    unmeasured: unmeasured.length,
    extra: extra.length,
    // Named, never silent: a set where NOTHING had a measured box has had its
    // existence verified but not its size, and the receipt says so.
    ...(wantVariants.length === 0 ? { unverifiable: 'the contract declares no variants — nothing to compare' } : {}),
    ...(checkedHere === 0 && wantVariants.length > 0
      ? { geometryUnverified: `no measured box matched any of the ${wantVariants.length} declared variant name(s) — the measured lane is keyed to a different matrix; re-run the measurement pass` }
      : {}),
  };
}
const totalUnmeasured = Object.values(results).reduce((n, r) => n + (r.unmeasured ?? 0), 0);
const totalExtra = Object.values(results).reduce((n, r) => n + (r.extra ?? 0), 0);
console.log(`\n[${sc.id}] checked ${totalChecked} variants | ${totalOff} outside ${TOL}px | ${totalMissing} missing | ${totalUnmeasured} unmeasured | ${totalExtra} extra on canvas`);
if (totalUnmeasured) {
  console.log(`[${sc.id}] ${totalUnmeasured} variant(s) had NO measured box under their own name, so their SIZE is unverified.`);
  console.log('          Existence parity still ran and is reported; mark-synced will REFUSE these until a measurement');
  console.log('          pass is re-keyed to the contract variant matrix (ops/ is keyed to the 2026-08-21 fan-out).');
}

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
