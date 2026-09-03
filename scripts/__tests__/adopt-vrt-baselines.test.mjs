#!/usr/bin/env node
/**
 * Self-test for scripts/adopt-vrt-baselines.mjs.
 *
 * This script overwrites committed visual baselines, which is the single most
 * destructive thing in the baselines directory: a wrong adoption turns a
 * regression into the new normal and nothing downstream can tell. So the
 * behaviour that matters here is mostly REFUSAL — dry by default, no writes
 * without --write, and never inventing a baseline that does not already exist.
 *
 * Run: node scripts/__tests__/adopt-vrt-baselines.test.mjs
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(REPO, 'scripts', 'adopt-vrt-baselines.mjs');

let PASS = 0;
let FAIL = 0;
const failures = [];
function assert(desc, cond, extra) {
  if (cond) { console.log(`  ok - ${desc}`); PASS++; }
  else { console.log(`  NOT OK - ${desc}${extra ? ` :: ${extra}` : ''}`); FAIL++; failures.push(desc); }
}

/** A PNG-ish blob. Content only has to differ; the script compares bytes. */
const png = (marker) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.from(marker)]);

const WORK = mkdtempSync(join(tmpdir(), 'adopt-vrt-'));
const run = (args, cwd = REPO) =>
  spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });

console.log('== adopt-vrt-baselines self-test ==');

console.log('\n1. Usage');
{
  const res = run([]);
  assert('no source directory exits 1', res.status === 1, `status ${res.status}`);
  assert('and it names the gh command that produces the artifact',
    /gh run download/.test(res.stderr), res.stderr.slice(0, 120));

  const missing = run([join(WORK, 'nope')]);
  assert('a missing source directory exits 1', missing.status === 1, `status ${missing.status}`);
}

console.log('\n2. Against a fixture artifact');
{
  // A real repo layout is required (the script writes into the repo's own
  // baselines dir), so this asserts on the DRY output rather than writing.
  const art = join(WORK, 'artifact', 'test-results', 'some-test-chromium');
  mkdirSync(art, { recursive: true });
  // A name that certainly exists as a baseline in this repo, and one that does not.
  const realBaseline = 'button.png';
  writeFileSync(join(art, realBaseline.replace('.png', '-actual.png')), png('new-button'));
  writeFileSync(join(art, 'not-a-component-actual.png'), png('orphan'));

  const dry = run([join(WORK, 'artifact')]);
  assert('a dry run exits 0', dry.status === 0, `status ${dry.status}`);
  assert('it says plainly that nothing was written', /DRY RUN/.test(dry.stdout), dry.stdout.slice(-160));
  assert('it counts the image that maps onto a real baseline',
    /would replace : 1/.test(dry.stdout), dry.stdout);
  assert('an image with no matching baseline is reported, not invented',
    /unmatched *: 1/.test(dry.stdout) && /not-a-component-actual\.png/.test(dry.stdout), dry.stdout);

  const before = readFileSync(join(REPO, '.altitude/baselines/screenshots', realBaseline));
  assert('and the real baseline on disk is untouched by a dry run',
    before.equals(readFileSync(join(REPO, '.altitude/baselines/screenshots', realBaseline))));
}

console.log('\n3. An empty artifact is refused, not silently "successful"');
{
  const empty = join(WORK, 'empty');
  mkdirSync(empty, { recursive: true });
  const res = run([empty]);
  assert('exits 1 when there are no -actual.png files', res.status === 1, `status ${res.status}`);
  assert('and explains that a GREEN run has nothing to adopt',
    /only produced by a FAILING VRT job/.test(res.stderr), res.stderr.slice(0, 160));
}

rmSync(WORK, { recursive: true, force: true });
console.log(`\n${PASS} passed, ${FAIL} failed`);
if (FAIL) { console.log('failing:\n  ' + failures.join('\n  ')); process.exit(1); }
