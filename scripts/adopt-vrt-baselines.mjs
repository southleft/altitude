#!/usr/bin/env node
/**
 * Adopt the VRT screenshots CI rendered, as the new committed baselines.
 *
 * WHY THIS EXISTS. `.altitude/baselines/screenshots/` holds ONE set of 72 PNGs
 * with no platform suffix, and 9 of them are text-heavy enough to rasterise
 * differently on Windows than on the Linux CI runner (see
 * `tests/components.vrt.spec.ts`). So `pnpm run baselines:vrt` on a developer
 * machine is not a recapture, it is a corruption: it fixes the component you
 * changed and quietly poisons those 9, which then fail on every future CI run
 * for reasons unrelated to whoever hits them next.
 *
 * The rule everyone knows is "baselines must be captured on CI". Until now
 * there was no path for doing that, so the rule and the ability disagreed.
 *
 * THE PATH. The `baselines-vrt` job already uploads `test-results/` on failure,
 * and Playwright writes a `<name>-actual.png` there for every mismatch — those
 * are Linux-rendered images of the CURRENT code. Download that artifact and
 * point this script at it; it maps each `-actual.png` back onto the baseline it
 * belongs to and overwrites only those.
 *
 *   gh run download <run-id> --name playwright-report --dir /tmp/vrt
 *   node scripts/adopt-vrt-baselines.mjs /tmp/vrt
 *   node scripts/adopt-vrt-baselines.mjs /tmp/vrt --write
 *
 * Dry by default, because overwriting a visual baseline is how a regression
 * becomes the new normal. Read the diff images first — this script cannot tell
 * an intended restyle from a bug, and it does not pretend to.
 *
 * Exit codes: 0 ok · 1 nothing adopted / bad input · 2 could not read the tree.
 */

import { existsSync, readdirSync, statSync, copyFileSync, readFileSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINES = join(REPO, '.altitude', 'baselines', 'screenshots');

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const source = args.find((a) => !a.startsWith('--'));

if (!source) {
  console.error('usage: node scripts/adopt-vrt-baselines.mjs <downloaded-artifact-dir> [--write]');
  console.error('       gh run download <run-id> --name playwright-report --dir <dir>');
  process.exit(1);
}
const SRC = resolve(source);
if (!existsSync(SRC)) {
  console.error(`adopt-vrt: no such directory: ${SRC}`);
  process.exit(1);
}
if (!existsSync(BASELINES)) {
  console.error(`adopt-vrt: no baselines at ${BASELINES}`);
  process.exit(2);
}

/** Every *-actual.png under the artifact, at any depth. */
function findActuals(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) findActuals(p, acc);
    else if (/-actual\.png$/.test(entry)) acc.push(p);
  }
  return acc;
}

const actuals = findActuals(SRC);
if (actuals.length === 0) {
  console.error(`adopt-vrt: no *-actual.png under ${SRC}.`);
  console.error('That artifact is only produced by a FAILING VRT job — a green run has nothing to adopt.');
  process.exit(1);
}

const known = new Set(readdirSync(BASELINES).filter((f) => f.endsWith('.png')));
const adopted = [];
const unmatched = [];
const identical = [];

for (const src of actuals) {
  const target = basename(src).replace(/-actual\.png$/, '.png');
  if (!known.has(target)) { unmatched.push({ src, target }); continue; }
  const dest = join(BASELINES, target);
  if (readFileSync(src).equals(readFileSync(dest))) { identical.push(target); continue; }
  if (WRITE) copyFileSync(src, dest);
  adopted.push(target);
}

console.log(`adopt-vrt: ${actuals.length} rendered image(s) in the artifact`);
console.log(`  would replace : ${adopted.length}`);
console.log(`  already equal : ${identical.length}`);
console.log(`  unmatched     : ${unmatched.length}`);
for (const u of unmatched) {
  console.log(`      ${basename(u.src)} -> no baseline named ${u.target}`);
}
if (adopted.length) {
  console.log('\n  ' + adopted.sort().join('\n  '));
}

if (!WRITE) {
  console.log('\nDRY RUN — nothing written. Re-run with --write once you have looked at the diffs.');
  process.exit(0);
}

console.log(`\nadopt-vrt: wrote ${adopted.length} baseline(s) from CI-rendered images.`);
console.log('Commit them WITH the change that moved them, so the diff explains itself.');
process.exit(adopted.length ? 0 : 1);
