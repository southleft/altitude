#!/usr/bin/env node
/**
 * Self-test for scripts/check-api-vocabulary.mjs — the public-API vocabulary gate.
 *
 * Plain node test, no framework — matches check-doc-anchors.test.mjs: spawn the
 * real CLI and assert on its exit code and output, because the CLI contract
 * (exit non-zero, name every violation) IS what CI depends on.
 *
 * Every case builds a THROWAWAY repo in os.tmpdir() and points the gate at it
 * with --root. Asserting against the real repo's counts would make these tests
 * fail every time someone fixes a prop, which is the opposite of a regression
 * test: what must not regress is the JUDGEMENT and the RATCHET, not today's
 * violation total. Two cases do run against the real repo, and both assert
 * only that it is self-consistent — not what the number is.
 *
 * Run: node scripts/__tests__/check-api-vocabulary.test.mjs
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const SCRIPT = join(ROOT, 'scripts/check-api-vocabulary.mjs');

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

/** A minimal vocabulary: one axis, one reserved name, `is`/`has` prefixes. */
function baseVocabulary(exceptions = {}) {
  return {
    version: 1,
    axes: {
      size: { means: 'one scale', values: ['sm', 'md', 'lg'] },
      status: { means: 'semantic state', values: ['info', 'success', 'warning', 'danger'] },
    },
    reserved: { variant: 'Name the axis instead.' },
    booleans: { prefixes: ['is', 'has'], bareAllowed: ['disabled'] },
    exceptions,
  };
}

/** `props` is [name, typeText][] — turned into one custom element in a CEM. */
function element(tag, className, props) {
  return {
    kind: 'javascript-module',
    path: `components/${tag.replace(/^al-/, '')}/${tag.replace(/^al-/, '')}.ts`,
    declarations: [
      {
        kind: 'class',
        name: className,
        tagName: tag,
        customElement: true,
        members: props.map(([name, text]) => ({
          kind: 'field',
          name,
          attribute: name,
          type: { text },
        })),
      },
    ],
  };
}

function makeRepo({ vocabulary, modules, baseline }) {
  const root = mkdtempSync(join(tmpdir(), 'api-vocab-'));
  TEMP_ROOTS.push(root);
  mkdirSync(join(root, '.altitude/baselines'), { recursive: true });
  mkdirSync(join(root, 'libs/al-web-components/components'), { recursive: true });
  writeFileSync(join(root, '.altitude/api-vocabulary.json'), JSON.stringify(vocabulary, null, 2));
  writeFileSync(
    join(root, 'libs/al-web-components/custom-elements.json'),
    JSON.stringify({ schemaVersion: '1.0.0', modules }, null, 2)
  );
  if (baseline) {
    writeFileSync(join(root, '.altitude/baselines/api-vocabulary.json'), JSON.stringify(baseline, null, 2));
  }
  return root;
}

function run(args, cwd = ROOT) {
  const r = spawnSync('node', [SCRIPT, ...args], { cwd, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

function readBaseline(root) {
  return JSON.parse(readFileSync(join(root, '.altitude/baselines/api-vocabulary.json'), 'utf8'));
}

console.log('check-api-vocabulary.test.mjs');

// 1. --help exits 0 and documents the ratchet flag.
{
  const { code, out } = run(['--help']);
  assert('--help exits 0 and documents --update', code === 0 && /--update/.test(out) && /Usage:/.test(out), out);
}

// 2. A NEW violation fails, and is named.
{
  const root = makeRepo({
    vocabulary: baseVocabulary(),
    modules: [element('al-thing', 'ALThing', [['variant', "'a' | 'b'"]])],
    baseline: { ceiling: {}, total: 0 },
  });
  const { code, out } = run(['--root', root]);
  assert('a new reserved-name violation fails', code === 1, out);
  assert('...and names the element and prop', /al-thing \.variant/.test(out), out);
  assert('...and labels the category', /reserved-name/.test(out), out);
}

// 3. The same violation, ledgered, passes.
{
  const root = makeRepo({
    vocabulary: baseVocabulary({ 'al-thing': { variant: 'legacy, renaming is breaking' } }),
    modules: [element('al-thing', 'ALThing', [['variant', "'a' | 'b'"]])],
    baseline: { ceiling: { 'reserved-name': 1 }, total: 1 },
  });
  const { code, out } = run(['--root', root]);
  assert('a ledgered violation at the pin passes', code === 0 && /exactly at the pin/.test(out), out);
}

// 4. Ratchet fails on an INCREASE in ledgered debt.
{
  const root = makeRepo({
    vocabulary: baseVocabulary({
      'al-thing': { variant: 'legacy' },
      'al-other': { variant: 'legacy' },
    }),
    modules: [
      element('al-thing', 'ALThing', [['variant', "'a'"]]),
      element('al-other', 'ALOther', [['variant', "'b'"]]),
    ],
    baseline: { ceiling: { 'reserved-name': 1 }, total: 1 },
  });
  const { code, out } = run(['--root', root]);
  assert('the ratchet fails when ledgered debt rises', code === 1 && /rose: 1 -> 2/.test(out), out);
}

// 5. Below the pin WITHOUT --update fails — the failure mode this gate exists
//    for. A ratchet that only notices increases never moves.
{
  const root = makeRepo({
    vocabulary: baseVocabulary({ 'al-thing': { variant: 'legacy' } }),
    modules: [element('al-thing', 'ALThing', [['variant', "'a'"]])],
    baseline: { ceiling: { 'reserved-name': 5 }, total: 5 },
  });
  const { code, out } = run(['--root', root]);
  assert('a count BELOW the pin fails without --update', code === 1 && /DROPPED: 5 -> 1/.test(out), out);
  assert('...and says how to tighten it', /--update/.test(out), out);
}

// 6. --update lowers the pin, and the same repo then passes.
{
  const root = makeRepo({
    vocabulary: baseVocabulary({ 'al-thing': { variant: 'legacy' } }),
    modules: [element('al-thing', 'ALThing', [['variant', "'a'"]])],
    baseline: { ceiling: { 'reserved-name': 5 }, total: 5 },
  });
  const first = run(['--root', root, '--update']);
  assert('--update exits 0', first.code === 0, first.out);
  assert('--update rewrites the pin to the measured count', readBaseline(root).total === 1, first.out);
  assert('--update records where it came from', /tightened from 5/.test(readBaseline(root).note), first.out);
  const second = run(['--root', root]);
  assert('...and the gate is green afterwards', second.code === 0, second.out);
}

// 7. --update refuses to launder a NEW violation into the baseline.
{
  const root = makeRepo({
    vocabulary: baseVocabulary(),
    modules: [element('al-thing', 'ALThing', [['variant', "'a'"]])],
    baseline: { ceiling: {}, total: 0 },
  });
  const { code, out } = run(['--root', root, '--update']);
  assert('--update refuses while new violations are unresolved', code === 1 && /refuses/.test(out), out);
  assert('...and leaves the pin untouched', readBaseline(root).total === 0, out);
}

// 8. A stale exception (debt that is already fixed) fails.
{
  const root = makeRepo({
    vocabulary: baseVocabulary({ 'al-thing': { variant: 'legacy' } }),
    modules: [element('al-thing', 'ALThing', [['size', "'sm' | 'lg'"]])],
    baseline: { ceiling: {}, total: 0 },
  });
  const { code, out } = run(['--root', root]);
  assert('a stale exception fails', code === 1 && /no longer match/.test(out), out);
  assert('...and names it', /al-thing \.variant/.test(out), out);
}

// 9. Axis VALUES are checked, not just axis names.
{
  const root = makeRepo({
    vocabulary: baseVocabulary(),
    modules: [element('al-thing', 'ALThing', [['size', "'sm' | 'small'"]])],
    baseline: { ceiling: {}, total: 0 },
  });
  const { code, out } = run(['--root', root]);
  assert('a value outside the axis set fails', code === 1 && /axis-values/.test(out), out);
  assert("...naming the offending value", /'small'/.test(out), out);
}

// 10. Boolean prefixes: `is*`/`has*` pass, a bare non-HTML name fails, a
//     standard HTML boolean attribute passes.
{
  const root = makeRepo({
    vocabulary: baseVocabulary(),
    modules: [
      element('al-thing', 'ALThing', [
        ['isOpen', 'boolean'],
        ['hasIcon', 'boolean'],
        ['disabled', 'boolean'],
        ['sticky', 'boolean'],
      ]),
    ],
    baseline: { ceiling: {}, total: 0 },
  });
  const { code, out } = run(['--root', root]);
  assert('a bare non-HTML boolean fails', code === 1 && /al-thing \.sticky/.test(out), out);
  assert('...while is*/has*/standard-HTML booleans do not', !/isOpen|hasIcon|\.disabled/.test(out), out);
}

// 11. `disabled` alongside a library-wide `isDisabled` is a spelling collision.
{
  const root = makeRepo({
    vocabulary: baseVocabulary(),
    modules: [
      element('al-thing', 'ALThing', [['disabled', 'boolean']]),
      element('al-other', 'ALOther', [['isDisabled', 'boolean']]),
    ],
    baseline: { ceiling: {}, total: 0 },
  });
  const { code, out } = run(['--root', root]);
  assert('two spellings of the same boolean collide', code === 1 && /spelling-collision/.test(out), out);
}

// 12. Free-form props carry no opinion — the gate is a vocabulary check, not a
//     naming police for every string prop.
{
  const root = makeRepo({
    vocabulary: baseVocabulary(),
    modules: [
      element('al-thing', 'ALThing', [
        ['label', 'string'],
        ['href', 'string'],
        ['fieldId', 'string'],
      ]),
    ],
    baseline: { ceiling: {}, total: 0 },
  });
  const { code, out } = run(['--root', root]);
  assert('free-form string props are not judged', code === 0, out);
}

// 13. Silence is the forbidden failure: an axis whose value set cannot be read
//     statically is SKIPPED BY NAME, never silently dropped.
{
  const root = makeRepo({
    vocabulary: baseVocabulary(),
    modules: [element('al-thing', 'ALThing', [['size', 'SizeToken']])],
    baseline: { ceiling: {}, total: 0 },
  });
  const { code, out } = run(['--root', root, '--json']);
  const json = JSON.parse(out.slice(out.indexOf('{')));
  assert('an unanalysable axis is not counted as a violation', code === 0, out);
  assert(
    '...and is named in the report',
    json.unanalysable.some((u) => u.tag === 'al-thing' && u.prop === 'size'),
    out
  );
}

// 14. An empty manifest cannot be measured, and says so rather than passing.
{
  const root = makeRepo({ vocabulary: baseVocabulary(), modules: [], baseline: { ceiling: {}, total: 0 } });
  const { code, out } = run(['--root', root]);
  assert('an unmeasurable manifest exits 2', code === 2 && /cannot measure/.test(out), out);
}

// 15. The real repo: green, and the census is reproducible.
{
  const gate = run([]);
  assert('the real repo is green at its pin', gate.code === 0, gate.out);
  const census = run(['--report']);
  assert(
    '--report prints the census (axes, reserved names, boolean families)',
    census.code === 0 &&
      /CANONICAL AXES/.test(census.out) &&
      /RESERVED NAMES IN USE/.test(census.out) &&
      /BOOLEAN FAMILIES/.test(census.out),
    census.out
  );
  assert('--report names `variant` as reserved and in use', /variant \(\d+\)/.test(census.out), census.out);
}

for (const root of TEMP_ROOTS) rmSync(root, { recursive: true, force: true });
console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
