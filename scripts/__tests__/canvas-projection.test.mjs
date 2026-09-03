#!/usr/bin/env node
/**
 * Self-test for scripts/figma-parity/build-canvas-projection.mjs and the
 * projection fallback in libs/altitude-mcp/src/lib/contract-diff.mjs.
 *
 * WHY THESE CASES. The projection exists so a machine that has never opened
 * Figma can still compute canvas disagreements — 259 of them locally, 0 in
 * CI before this. That buys nothing if the projection either (a) smuggles a
 * node id or a file key into a tracked file, or (b) quietly computes FEWER
 * disagreements than the live dumps it stands in for. Both are tested here,
 * and both are tested as FAILURES first: a leak must throw, and a changed
 * dump must fail `--check`.
 *
 * Fixture repos live in os.tmpdir() and the CLI is pointed at them with
 * ALTITUDE_REPO_ROOT (libs/altitude-mcp/src/lib/paths.mjs:119) — same shape
 * as check-cem-render.test.mjs and check-doc-anchors.test.mjs. The one
 * REAL-repo case (the 36-pair count parity) is guarded on the gitignored
 * dumps being present, so it pins the finding on a maintainer's machine and
 * announces itself as skipped in CI rather than passing vacuously.
 *
 * Run: node scripts/__tests__/canvas-projection.test.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { diffContracts, projectionToCanvasContract } from '../../libs/altitude-mcp/src/lib/contract-diff.mjs';
import { assertScrubbed, projectCanvasContract } from '../figma-parity/build-canvas-projection.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const SCRIPT = join(ROOT, 'scripts/figma-parity/build-canvas-projection.mjs');

let PASS = 0;
let FAIL = 0;
function assert(desc, cond, extra) {
  if (cond) {
    console.log(`  ok - ${desc}`);
    PASS++;
  } else {
    console.log(`  NOT OK - ${desc}`);
    if (extra) console.log(`      ${String(extra).split('\n').join('\n      ')}`);
    FAIL++;
  }
}

const TEMP_ROOTS = [];

/** A made-up 22-char Figma-key-shaped string. Never a real file. */
const FIXTURE_FILE_KEY = 'FiXtUrEkEyAAAA1234567b';
const FIXTURE_NODE_ID = '3538:36730';

/** A canvas dump exactly as extract-canvas.mjs writes one — ids, key, anatomy and all. */
function dump(over = {}) {
  return {
    $schema: '../canvas-contract.schema.json',
    component: 'al-button',
    figma: { name: 'Button', nodeId: FIXTURE_NODE_ID, fileKey: FIXTURE_FILE_KEY },
    variantAxes: [
      { name: 'State', values: ['Default', 'Hover'] },
      { name: 'Variant', values: ['Primary', 'Secondary'] },
    ],
    componentProperties: [
      { name: 'Ghost Property', type: 'BOOLEAN', values: null },
      { name: 'State', type: 'VARIANT', values: ['Default', 'Hover'] },
      { name: 'Variant', type: 'VARIANT', values: ['Primary', 'Secondary'] },
    ],
    states: ['hover'],
    textStyles: ['typography/body/md/regular'],
    tokens: ['theme/space/xs'],
    tokensOwn: ['theme/space/xs'],
    tokensNested: {},
    anatomySource: 'observed',
    anatomyCase: 'State=Default, Variant=Primary',
    anatomy: {
      name: 'State=Default, Variant=Primary',
      type: 'COMPONENT',
      textStyle: null,
      boundVariables: { itemSpacing: 'theme/space/xs' },
      width: 128,
      height: 40,
      children: [],
    },
    bindings: {
      code: null,
      figma: {
        fileKey: FIXTURE_FILE_KEY,
        componentSetName: 'Button',
        nodeId: FIXTURE_NODE_ID,
        url: `https://www.figma.com/design/${FIXTURE_FILE_KEY}/?node-id=3538-36730`,
      },
    },
    degradations: ['props[].bindings.code — canvas has no code attribute names.'],
    ...over,
  };
}

/**
 * A throwaway repo carrying a one-project registry and `dumps` (tag -> canvas
 * contract). Everything the CLI reads is under `root`.
 */
function makeRepo({ dumps: dumpMap, fileKey = FIXTURE_FILE_KEY } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'canvas-projection-'));
  TEMP_ROOTS.push(root);
  mkdirSync(join(root, '.altitude/figma-sync/canvas-contracts'), { recursive: true });
  writeFileSync(
    join(root, '.altitude/ds-projects.json'),
    JSON.stringify(
      {
        default: 'altitude',
        projects: {
          altitude: {
            id: 'altitude',
            name: 'Fixture DS',
            brand: 'altitude',
            figma: { fileKey, fileName: 'Fixture', urlBase: 'https://www.figma.com/design/{fileKey}/' },
            paths: {
              figmaSyncDir: '.altitude/figma-sync',
              parityManifest: '.altitude/figma-sync/parity-manifest.json',
              opsDir: '.altitude/figma-sync/ops',
            },
            library: { workspace: '@fixture/wc', root: 'libs/wc', tagPrefix: 'al-' },
          },
        },
      },
      null,
      2,
    ),
  );
  for (const [tag, contents] of Object.entries(dumpMap ?? {})) {
    writeFileSync(
      join(root, '.altitude/figma-sync/canvas-contracts', `${tag}.canvas.json`),
      JSON.stringify(contents, null, 2),
    );
  }
  return root;
}

function run(root, args = []) {
  // DS_PROJECT is DELETED, not blanked: `activeProjectId()` reads it with `??`,
  // so an empty string is a value and resolves to the project named "".
  const env = { ...process.env, ALTITUDE_REPO_ROOT: root };
  delete env.DS_PROJECT;
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8', env });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

const projectionPath = (root) => join(root, '.altitude/figma-sync/canvas-projection.json');
const readProjection = (root) => JSON.parse(readFileSync(projectionPath(root), 'utf8'));

console.log('canvas-projection.test.mjs');

// ── 1. THE LEAK. A node id or file key in a dump never reaches the projection.
console.log('\n1. Node ids, file keys, paths and geometry never reach the projection');
{
  const root = makeRepo({ dumps: { 'al-button': dump() } });
  const { code, out } = run(root);
  assert('the generator exits 0 on a healthy fixture', code === 0, out);

  const raw = readFileSync(projectionPath(root), 'utf8');
  assert('the raw file contains no `nodeId` key', !raw.includes('nodeId'), raw.slice(0, 400));
  assert('the raw file contains no `fileKey` key', !raw.includes('fileKey"'), raw.slice(0, 400));
  assert(`the raw file never contains the node id ${FIXTURE_NODE_ID}`, !raw.includes(FIXTURE_NODE_ID));
  assert('the raw file never contains the Figma file key', !raw.includes(FIXTURE_FILE_KEY));
  assert('the raw file contains no figma.com URL', !raw.includes('figma.com'));
  assert('the anatomy tree (and its pixel geometry) is not carried', !raw.includes('boundVariables') && !raw.includes('"height"'));

  const doc = readProjection(root);
  const entry = doc.components['al-button'];
  assert('the projected `figma` block is name-only', JSON.stringify(entry.figma) === '{"name":"Button"}');
  assert('variantAxes survive', entry.variantAxes.length === 2);
  assert('componentProperties survive', entry.componentProperties.length === 3);
  assert('states survive', JSON.stringify(entry.states) === '["hover"]');
  assert('textStyles survive (names only)', JSON.stringify(entry.textStyles) === '["typography/body/md/regular"]');
  assert('tokensOwn survives (bound variable NAMES)', JSON.stringify(entry.tokensOwn) === '["theme/space/xs"]');
  assert('degradations survive', entry.degradations.length === 1);

  // The file key is HASHED, so a repoint is detectable without publishing it.
  assert('the file key is recorded as a sha256, not as the key', /^sha256:[0-9a-f]{64}$/.test(doc.source.figmaFileKeyHash));
}

// ── 2. THE SCRUB IS AN ASSERTION, NOT A HOPE. Plant each class of leak.
console.log('\n2. assertScrubbed throws on every class of leak it claims to catch');
{
  const throws = (label, value) => {
    let threw = null;
    try {
      assertScrubbed(value, new Set([FIXTURE_FILE_KEY]));
    } catch (e) {
      threw = e;
    }
    assert(label, threw !== null, threw ? '' : `no throw for ${JSON.stringify(value)}`);
    return threw;
  };

  throws('a forbidden KEY (nodeId) throws', { a: { nodeId: 'x' } });
  throws('a forbidden KEY (fileKey) throws', { a: { fileKey: 'x' } });
  throws('a forbidden KEY (anatomy) throws', { anatomy: {} });
  throws('a node-id-SHAPED string value throws', { a: ['3538:36730'] });
  throws('the registered file key as a value throws', { a: FIXTURE_FILE_KEY });
  throws('a file-key-SHAPED string this repo has never seen throws', { a: 'aB3xY9zQ1mN4pR7sT2uV5w' });
  throws('an absolute Windows path throws', { a: 'D:\\Southleft\\altitude\\x.json' });
  throws('an absolute POSIX path throws', { a: '/Users/someone/x.json' });
  throws('a figma.com URL throws', { a: 'https://www.figma.com/design/abc/' });
  const num = throws('ANY number throws — the cheapest "no pixel geometry" assertion', { a: { b: [1, 2] } });
  assert('  ...and the message names the JSON path of the survivor', /\$\.a\.b\[0\]/.test(String(num?.message)), String(num?.message));

  let ok = true;
  try {
    assertScrubbed(projectCanvasContract(dump()), new Set([FIXTURE_FILE_KEY]));
  } catch (e) {
    ok = false;
    console.log(`      ${e.message}`);
  }
  assert('a real projected dump passes the scrub clean', ok);
}

// ── 3. --check is a regenerate-and-diff gate: a changed dump must FAIL it.
console.log('\n3. --check fails when a dump changes under the tracked projection');
{
  const root = makeRepo({ dumps: { 'al-button': dump() } });
  assert('generate exits 0', run(root).code === 0);
  const clean = run(root, ['--check']);
  assert('--check passes immediately after generating', clean.code === 0, clean.out);
  assert('  ...and says so out loud', /--check OK/.test(clean.out), clean.out);

  // One variant value disappears from Figma. This is exactly the drift the
  // projection would otherwise report as if it were still true.
  const drifted = dump();
  drifted.componentProperties[2].values = ['Primary'];
  drifted.variantAxes[1].values = ['Primary'];
  writeFileSync(
    join(root, '.altitude/figma-sync/canvas-contracts/al-button.canvas.json'),
    JSON.stringify(drifted, null, 2),
  );

  const stale = run(root, ['--check']);
  assert('--check FAILS after the dump changes', stale.code === 1, stale.out);
  assert('  ...and names the component whose facts moved', /~ al-button/.test(stale.out), stale.out);
  assert('  ...and tells you how to fix it', /build-canvas-projection\.mjs/.test(stale.out), stale.out);

  // A dump appearing/disappearing is drift too, not a silent no-op.
  const added = makeRepo({ dumps: { 'al-button': dump(), 'al-chip': dump({ component: 'al-chip' }) } });
  assert('generate exits 0 with two dumps', run(added).code === 0);
  rmSync(join(added, '.altitude/figma-sync/canvas-contracts/al-chip.canvas.json'));
  const removed = run(added, ['--check']);
  assert('--check FAILS when a dump the projection carries is gone', removed.code === 1, removed.out);
  assert('  ...naming it as projected-but-absent', /- al-chip/.test(removed.out), removed.out);
}

// ── 4. Staleness the gate can catch with NO dumps at all: a Figma repoint.
console.log('\n4. --check catches a Figma file REPOINT, dumps or no dumps');
{
  const root = makeRepo({ dumps: { 'al-button': dump() } });
  run(root);

  // The 2026-09-02 Southleft incident in miniature: one line of the registry
  // changes and every observation behind the projection is now an
  // observation of a retired file.
  const regPath = join(root, '.altitude/ds-projects.json');
  const reg = JSON.parse(readFileSync(regPath, 'utf8'));
  reg.projects.altitude.figma.fileKey = 'zZ9yX8wV7uT6sR5qP4oN3m';
  writeFileSync(regPath, JSON.stringify(reg, null, 2));

  const repointed = run(root, ['--check']);
  assert('--check FAILS after a repoint', repointed.code === 1, repointed.out);
  assert('  ...and names it a REPOINT, not a content diff', /REPOINT/.test(repointed.out), repointed.out);

  // ...and it catches it even with the dumps gone, which is the CI case.
  rmSync(join(root, '.altitude/figma-sync/canvas-contracts'), { recursive: true, force: true });
  const ciRepoint = run(root, ['--check']);
  assert('the repoint is still caught with zero dumps on disk (the CI case)', ciRepoint.code === 1, ciRepoint.out);
}

console.log('\n5. With no dumps and no repoint, --check SKIPS honestly rather than passing vacuously');
{
  const root = makeRepo({ dumps: { 'al-button': dump() } });
  run(root);
  rmSync(join(root, '.altitude/figma-sync/canvas-contracts'), { recursive: true, force: true });
  const { code, out } = run(root, ['--check']);
  assert('exit 0 — there is nothing to compare against', code === 0, out);
  assert('  ...but the output says SKIPPED, not OK', /SKIPPED/.test(out) && !/--check OK/.test(out), out);
  assert('  ...and names what it DID verify (no repoint)', /no repoint/i.test(out), out);
}

console.log('\n6. An empty projection is never written — that would read as "no facts"');
{
  const root = makeRepo({ dumps: {} });
  const { code, out } = run(root);
  assert('generating with zero dumps exits 1', code === 1, out);
  assert('  ...and refuses rather than emitting an empty components map', /Refusing to write an EMPTY projection/.test(out), out);
  assert('  ...and no file was written', !existsSync(projectionPath(root)));
}

// ── 7. THE POINT OF THE WHOLE THING: the projection must reproduce the diff.
console.log('\n7. The projection reproduces the live-dump diff exactly (fixture)');
{
  const root = makeRepo({ dumps: { 'al-button': dump() } });
  run(root);
  const doc = readProjection(root);
  // The REAL tracked al-button code contract — the projection has to hold up
  // against a genuine contract, not one shaped to agree with it.
  const codeContract = JSON.parse(readFileSync(join(ROOT, '.altitude/contracts/altitude/al-button.contract.json'), 'utf8'));
  const live = diffContracts({ codeContract, canvasContract: dump() });
  const projected = diffContracts({ codeContract, canvasProjection: doc });

  assert('the fixture produces disagreements at all (otherwise this proves nothing)', live.disagreements.length > 0, String(live.disagreements.length));
  assert(
    `the projected disagreement COUNT equals the live one (${live.disagreements.length})`,
    projected.disagreements.length === live.disagreements.length,
    `live ${live.disagreements.length} vs projected ${projected.disagreements.length}`,
  );
  assert(
    'the projected disagreement LIST is byte-identical to the live one',
    JSON.stringify(projected.disagreements) === JSON.stringify(live.disagreements),
  );
  assert(
    'the `compared` counters are identical too',
    JSON.stringify(projected.compared) === JSON.stringify(live.compared),
    `${JSON.stringify(live.compared)} vs ${JSON.stringify(projected.compared)}`,
  );

  // Passing the entry directly, rather than the whole document, must work too.
  const byEntry = diffContracts({ codeContract, canvasProjection: doc.components['al-button'] });
  assert('an already-selected projection ENTRY diffs the same', JSON.stringify(byEntry.disagreements) === JSON.stringify(live.disagreements));
}

// ── 8. Provenance is never guessed at and never rendered the same.
console.log('\n8. The source is reported honestly');
{
  const root = makeRepo({ dumps: { 'al-button': dump() } });
  run(root);
  const doc = readProjection(root);
  const codeContract = JSON.parse(readFileSync(join(ROOT, '.altitude/contracts/altitude/al-button.contract.json'), 'utf8'));

  const live = diffContracts({ codeContract, canvasContract: dump() });
  assert("a live dump reports source 'live-dump'", live.source === 'live-dump');
  assert('  ...and carries no projection stamp', live.sourceStamp === undefined);
  assert('  ...and adds no projection skip line', !live.skipped.some((s) => s.source === 'projection'));

  const projected = diffContracts({ codeContract, canvasProjection: doc });
  assert("the projection reports source 'projection'", projected.source === 'projection');
  assert('  ...and carries the staleness stamp', typeof projected.sourceStamp?.generatedAt === 'string' && typeof projected.sourceStamp?.figmaFileKeyHash === 'string');
  assert(
    '  ...and says in `skipped` that this was NOT a live comparison',
    projected.skipped.some((s) => s.source === 'projection' && /point-in-time/.test(s.reason)),
    JSON.stringify(projected.skipped.slice(0, 2)),
  );

  const none = diffContracts({ codeContract });
  assert("neither source reports 'none'", none.source === 'none' && none.disagreements.length === 0);

  const noCode = diffContracts({ canvasProjection: doc });
  assert("no code contract also reports 'none'", noCode.source === 'none');

  // A LIVE DUMP WINS. Passing both is not ambiguous.
  const both = diffContracts({ codeContract, canvasContract: dump(), canvasProjection: doc });
  assert('a live dump outranks the projection when both are given', both.source === 'live-dump');

  // A tag with no entry in the projection must degrade, never fabricate.
  const unknown = diffContracts({ codeContract: { ...codeContract, id: 'al-nope' }, canvasProjection: doc });
  assert('a tag absent from the projection degrades to `none`', unknown.source === 'none' && unknown.disagreements.length === 0);
}

// ── 9. projectionToCanvasContract keeps the shape the differ expects.
console.log('\n9. projectionToCanvasContract materializes a canvas-contract shape');
{
  const c = projectionToCanvasContract(projectCanvasContract(dump()));
  assert('anatomySource is carried verbatim (the token pass gates on it)', c.anatomySource === 'observed');
  assert('anatomy is absent by design', c.anatomy === undefined);
  assert('tokensOwn and tokensNested are both present', Array.isArray(c.tokensOwn) && typeof c.tokensNested === 'object');
  assert('a null entry materializes to null, not to a fake contract', projectionToCanvasContract(null) === null);

  const degraded = projectionToCanvasContract({ anatomySource: 'unavailable' });
  assert('a projection with nothing but anatomySource still yields empty arrays, never undefined', Array.isArray(degraded.componentProperties) && Array.isArray(degraded.states));
}

// ── 10. THE REAL LIBRARY. Guarded — the dumps are gitignored observations.
console.log('\n10. Real library: the projection reproduces the live totals');
{
  const dumpDir = join(ROOT, '.altitude/figma-sync/canvas-contracts');
  const projPath = join(ROOT, '.altitude/figma-sync/canvas-projection.json');
  const files = existsSync(dumpDir)
    ? readdirSync(dumpDir).filter((f) => f.endsWith('.canvas.json') && f.split('.').length === 3).sort()
    : [];

  if (!existsSync(projPath)) {
    console.log('  SKIP - no tracked projection at .altitude/figma-sync/canvas-projection.json');
  } else if (files.length === 0) {
    // The expected state on a clone and in CI. Say so; do not pass silently.
    console.log('  SKIP - no canvas dumps on disk (gitignored live observations).');
    console.log('         The count-parity assertion needs a machine that has run `contracts:canvas`.');
    const doc = JSON.parse(readFileSync(projPath, 'utf8'));
    assert('the tracked projection is still non-empty and stamped', Object.keys(doc.components ?? {}).length > 0 && typeof doc.source?.newestMtime === 'string');
    assert('the tracked projection carries no file key or node id', !JSON.stringify(doc).includes('fileKey"') && !/"\d{2,8}:\d{2,8}"/.test(JSON.stringify(doc.components)));
  } else {
    const doc = JSON.parse(readFileSync(projPath, 'utf8'));
    let pairs = 0;
    let liveTotal = 0;
    let projTotal = 0;
    const differing = [];
    for (const f of files) {
      const tag = f.replace(/\.canvas\.json$/, '');
      const codePath = join(ROOT, '.altitude/contracts/altitude', `${tag}.contract.json`);
      if (!existsSync(codePath)) continue;
      const codeContract = JSON.parse(readFileSync(codePath, 'utf8'));
      const canvasContract = JSON.parse(readFileSync(join(dumpDir, f), 'utf8'));
      const a = diffContracts({ codeContract, canvasContract });
      const b = diffContracts({ codeContract, canvasProjection: doc });
      pairs += 1;
      liveTotal += a.disagreements.length;
      projTotal += b.disagreements.length;
      if (JSON.stringify(a.disagreements) !== JSON.stringify(b.disagreements)) differing.push(tag);
    }
    console.log(`  (${pairs} pairs; live ${liveTotal} disagreements, projected ${projTotal})`);
    assert('every pair the live dumps compare, the projection compares too', pairs > 0);
    assert(`the projected total equals the live total (${liveTotal})`, projTotal === liveTotal, `live ${liveTotal} vs projected ${projTotal}`);
    assert('no component disagrees between the two sources', differing.length === 0, differing.join(', '));
  }
}

for (const root of TEMP_ROOTS) rmSync(root, { recursive: true, force: true });

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
