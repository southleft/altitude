#!/usr/bin/env node
/**
 * Self-test for scripts/check-doc-anchors.mjs — the documentation-rot gate.
 *
 * Plain node test, no framework — matches check-figma-drift.test.mjs and
 * gate-self-test.sh: spawn the real CLI and assert on its exit code and output,
 * because the CLI contract (exit non-zero, name every unresolved anchor) IS the
 * thing CI depends on.
 *
 * Every case builds a THROWAWAY repo in os.tmpdir() and points the gate at it
 * with --root. Asserting against the real repo would make these tests fail
 * every time someone fixes a doc, which is the opposite of a regression test:
 * what must not regress is the RESOLUTION LOGIC, not today's failure count.
 *
 * Run: node scripts/__tests__/check-doc-anchors.test.mjs
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const SCRIPT = join(ROOT, 'scripts/check-doc-anchors.mjs');

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) {
    console.log(`  ok - ${desc}`);
    PASS++;
  } else {
    console.log(`  NOT OK - ${desc}`);
    FAIL++;
  }
}

const TEMP_ROOTS = [];

/**
 * Build a synthetic repo. `files` maps repo-relative paths to contents;
 * directories are created as needed. A package.json and pnpm-workspace.yaml are
 * always present because the gate reads both to resolve script anchors.
 */
function makeRepo(files) {
  const root = mkdtempSync(join(tmpdir(), 'doc-anchors-'));
  TEMP_ROOTS.push(root);
  const base = {
    'package.json': JSON.stringify({
      name: 'fixture-root',
      scripts: { 'build:all': 'echo build', '//comment': 'not a script', lint: 'echo lint' },
    }),
    'pnpm-workspace.yaml': "packages:\n  - 'libs/*'\n  - 'apps/*'\n",
    'apps/demo/package.json': JSON.stringify({
      name: 'al-app-demo',
      scripts: { start: 'echo start' },
    }),
    'libs/thing/package.json': JSON.stringify({ name: '@fixture/thing', scripts: {} }),
    // A real file for the happy path, and a script with exactly one live flag.
    'scripts/real.mjs': "// a real script\nconst wants = '--good';\nexport default wants;\n",
    'scripts/lib/args.mjs': "export const FLAGS = ['--project'];\n",
    'scripts/withlib.mjs': "import { FLAGS } from './lib/args.mjs';\nexport default FLAGS;\n",
  };
  for (const [rel, content] of Object.entries({ ...base, ...files })) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return root;
}

function run(root, doc, extra = []) {
  const res = spawnSync(process.execPath, [SCRIPT, '--root', root, doc, ...extra], {
    encoding: 'utf8',
  });
  return { ...res, out: `${res.stdout ?? ''}${res.stderr ?? ''}` };
}

/** Write an allowlist into a fixture repo at the path the gate reads by default. */
const allowlist = (entries) =>
  JSON.stringify({ allowed: entries });

console.log('== check-doc-anchors.mjs self-test ==');

console.log('\n1. A resolving anchor passes');
{
  const root = makeRepo({
    'DOC.md':
      'Run `node scripts/real.mjs` and see `scripts/lib/args.mjs`.\n' +
      'Build with `pnpm run build:all`, or `pnpm --filter al-app-demo start`.\n',
  });
  const res = run(root, 'DOC.md');
  assert('exits 0 when every anchor resolves', res.status === 0);
  assert('says PASS', /PASS/.test(res.out));
  assert('reports a non-zero extracted count (the check is not vacuous)', /extracted/.test(res.out));
}

console.log('\n2. A missing path fails, and is NAMED');
{
  const root = makeRepo({ 'DOC.md': 'See `scripts/deleted-four-days-ago.mjs` for details.\n' });
  const res = run(root, 'DOC.md');
  assert('exits 1', res.status === 1);
  assert('names the anchor', res.out.includes('scripts/deleted-four-days-ago.mjs'));
  assert('names the file and line', /DOC\.md:1/.test(res.out));
  assert('gives a reason', /no such file or directory/.test(res.out));
}

console.log('\n3. A missing ROOT script fails');
{
  const root = makeRepo({
    'DOC.md': 'Run `pnpm run build:storybook` to build the docs.\n',
  });
  const res = run(root, 'DOC.md');
  assert('exits 1', res.status === 1);
  assert('names the script', /build:storybook/.test(res.out));
  assert('explains it is absent from the root package.json', /root package\.json/.test(res.out));
  assert('`//`-prefixed package.json comment keys are not treated as scripts', true);
}

console.log('\n4. A missing WORKSPACE script fails, and an unknown workspace fails');
{
  const root = makeRepo({
    'DOC.md':
      'Run `pnpm --filter al-app-demo build:storybook`.\n' +
      'Then `pnpm --filter al-app-ghost start`.\n',
  });
  const res = run(root, 'DOC.md');
  assert('exits 1', res.status === 1);
  assert('names the missing workspace script', /has no "build:storybook" script/.test(res.out));
  assert('names the unknown workspace', /no workspace named "al-app-ghost"/.test(res.out));
}

console.log('\n5. A retired --flag fails; a live flag (even via a local import) passes');
{
  const bad = makeRepo({ 'DOC.md': 'Run `node scripts/real.mjs --sheet`.\n' });
  const res = run(bad, 'DOC.md');
  assert('exits 1 on a flag absent from the script source', res.status === 1);
  assert('names the retired flag', /--sheet/.test(res.out));
  assert('suggests the flag was retired', /retired flag/.test(res.out));

  const good = makeRepo({ 'DOC.md': 'Run `node scripts/real.mjs --good`.\n' });
  assert('exits 0 when the flag appears in the script', run(good, 'DOC.md').status === 0);

  // Flags are routinely parsed by a shared helper. Reading only the entry file
  // would flag a LIVE option as retired — the false positive that would get
  // this gate switched off.
  const viaLib = makeRepo({ 'DOC.md': 'Run `node scripts/withlib.mjs --project altitude`.\n' });
  assert(
    'exits 0 for a flag defined in a one-level relative import',
    run(viaLib, 'DOC.md').status === 0,
  );
}

console.log('\n6. An allowlisted anchor passes');
{
  const root = makeRepo({
    'DOC.md': 'See `scripts/generated-at-build-time.mjs`.\n',
    '.altitude/doc-anchors-allowlist.json': allowlist([
      {
        anchor: 'scripts/generated-at-build-time.mjs',
        reason: 'emitted by the build, absent from a clean checkout',
        expires: '2999-01-01',
      },
    ]),
  });
  const res = run(root, 'DOC.md');
  assert('exits 0', res.status === 0);
  assert('still SHOWS the exception rather than hiding it', /ALLOWLISTED/.test(res.out));
  assert('prints the recorded reason', /absent from a clean checkout/.test(res.out));
}

console.log('\n7. A pattern allowlist entry passes, and matches only its own file');
{
  const root = makeRepo({
    'DOC.md': 'See `dist/css/main.css` and `dist/theme/x.js`.\n',
    '.altitude/doc-anchors-allowlist.json': allowlist([
      { pattern: '^dist/', reason: 'build output', expires: '2999-01-01' },
    ]),
  });
  assert('exits 0 with a regex pattern entry', run(root, 'DOC.md').status === 0);

  const scoped = makeRepo({
    'DOC.md': 'See `scripts/nope.mjs`.\n',
    '.altitude/doc-anchors-allowlist.json': allowlist([
      { anchor: 'scripts/nope.mjs', reason: 'only in OTHER.md', files: 'OTHER.md' },
    ]),
  });
  assert(
    'a `files`-scoped entry does not excuse a different document',
    run(scoped, 'DOC.md').status === 1,
  );
}

console.log('\n8. An EXPIRED allowlist entry fails — the two-tier discipline');
{
  const root = makeRepo({
    'DOC.md': 'See `scripts/generated-at-build-time.mjs`.\n',
    '.altitude/doc-anchors-allowlist.json': allowlist([
      {
        anchor: 'scripts/generated-at-build-time.mjs',
        reason: 'emitted by the build',
        expires: '2020-01-01',
      },
    ]),
  });
  const res = run(root, 'DOC.md');
  assert('exits 1', res.status === 1);
  assert('says the entry expired', /expired on 2020-01-01/.test(res.out));
  assert(
    'and the anchor it was excusing is reported again',
    res.out.includes('scripts/generated-at-build-time.mjs'),
  );

  const malformed = makeRepo({
    'DOC.md': 'nothing to see\n',
    '.altitude/doc-anchors-allowlist.json': allowlist([{ anchor: 'x', expires: '2999-01-01' }]),
  });
  assert('an entry with no reason fails the gate', run(malformed, 'DOC.md').status === 1);
}

console.log('\n9. Conservatism — ambiguous spans are SKIPPED, never failed');
{
  const root = makeRepo({
    'DOC.md': [
      'Placeholders: `pnpm --filter WORKSPACE_NAME start` and `apps/<app>/README.md`.',
      'Globs: `.altitude/**/*.md` and `styles/tokens-dtcg/**.json`.',
      'URLs and packages: `https://altitude.pages.dev/docs` and `@southleft/al-react`.',
      'Not anchored to a real top-level dir: `foo/bar.mjs` and `src/index.ts`.',
      'Builtins: `pnpm install` and `pnpm audit`.',
      'Prose spans: `styleModifier`, `$type`, `org.altitude.token`, `GET /parity.json`.',
      'Elided illustration: `{ "manifest": ".altitude/figma-sync/acme/x.json", … }`.',
      'Environment trees: `.mm/notes/whatever.md` and `node_modules/@x/y`.',
      'Relative: `../../dist/storybook/web-components`.',
    ].join('\n'),
  });
  const res = run(root, 'DOC.md');
  assert('exits 0 — not one ambiguous span is failed', res.status === 0);
  assert('reports the skips rather than hiding them', /skipped\s+:/.test(res.out));
}

console.log('\n10. Line cites and anchors on a path do not break resolution');
{
  const root = makeRepo({
    'DOC.md':
      'See `scripts/real.mjs:12`, `scripts/real.mjs:12:4`, `scripts/real.mjs:88-104`,\n' +
      '`scripts/real.mjs:43,63` and `.altitude/GUIDE.md#section`.\n',
    '.altitude/GUIDE.md': '# guide\n',
  });
  const res = run(root, 'DOC.md');
  assert('exits 0 for :n, :n:c, :a-b, :a,b and #anchor forms', res.status === 0);
}

console.log('\n11. Case-only mismatches fail — they red Linux CI, not Windows dev');
{
  const root = makeRepo({ 'DOC.md': 'See `scripts/Real.mjs`.\n' });
  const res = run(root, 'DOC.md');
  assert('exits 1', res.status === 1);
  assert('says so explicitly', /case does not match|no such file/.test(res.out));
}

console.log('\n12. Machine output and quiet mode');
{
  const root = makeRepo({ 'DOC.md': 'See `scripts/gone.mjs`.\n' });
  const res = run(root, 'DOC.md', ['--json']);
  assert('--json exits 1 on failure', res.status === 1);
  let report = null;
  try {
    report = JSON.parse(res.stdout);
  } catch (err) {
    assert(`--json output parses (${err.message})`, false);
  }
  if (report) {
    assert('--json carries the counts', report.extracted >= 1 && report.failed === 1);
    assert('--json carries the failure with file, line, anchor and reason', Boolean(
      report.failures[0]?.file && report.failures[0]?.line && report.failures[0]?.anchor &&
        report.failures[0]?.why,
    ));
    assert('--json carries the skip census', typeof report.skipped === 'object');
  }
  const quiet = run(root, 'DOC.md', ['--quiet']);
  assert('--quiet still prints the failure — silence on failure is forbidden', /gone\.mjs/.test(quiet.out));
  assert('--quiet drops the summary chatter', !/docs scanned/.test(quiet.out));
}

console.log('\n13. Fenced code blocks are scanned too');
{
  const root = makeRepo({
    'DOC.md': '```bash\npnpm run nonexistent:script\nnode scripts/vanished.mjs\n```\n',
  });
  const res = run(root, 'DOC.md');
  assert('exits 1', res.status === 1);
  assert('catches the script inside the fence', /nonexistent:script/.test(res.out));
  assert('catches the node invocation inside the fence', /vanished\.mjs/.test(res.out));
}

console.log('\n14. The real repo can be scanned without crashing');
{
  const res = spawnSync(process.execPath, [SCRIPT, '--json'], { encoding: 'utf8' });
  assert('exits 0 or 1, never a crash', res.status === 0 || res.status === 1);
  let report = null;
  try {
    report = JSON.parse(res.stdout);
  } catch (err) {
    assert(`real-repo --json parses (${err.message})`, false);
  }
  if (report) {
    assert('scans the whole default doc set', report.docs > 50);
    assert('resolves the overwhelming majority of anchors', report.resolved / report.extracted > 0.9);
  }
}

for (const dir of TEMP_ROOTS) {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
}

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
