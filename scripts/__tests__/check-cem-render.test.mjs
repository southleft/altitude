#!/usr/bin/env node
/**
 * Self-test for scripts/check-cem-render.mjs — the documented-vs-rendered gate.
 *
 * Plain node test, no framework — matches check-doc-anchors.test.mjs: spawn the
 * real CLI and assert on exit code and output, because that is the CI contract.
 *
 * Fixture repos live in os.tmpdir() so the assertions are about the ANALYSIS,
 * not about today's defect count. The one real-repo case pins the defect this
 * gate was written for — `al-card` documents `@slot action-right` and renders
 * no such slot — because that finding is the reason the gate exists, and a
 * change that stops detecting it is a regression in the gate, not a fix.
 *
 * Run: node scripts/__tests__/check-cem-render.test.mjs
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const SCRIPT = join(ROOT, 'scripts/check-cem-render.mjs');
const PKG = 'libs/al-web-components';

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

/**
 * `elements` is an array of
 *   { tag, className, file, source, slots?, cssParts?, superclass? }
 * turned into one fixture package: a custom-elements.json plus the .ts files.
 */
function makeRepo({ elements, baseline }) {
  const root = mkdtempSync(join(tmpdir(), 'cem-render-'));
  TEMP_ROOTS.push(root);
  mkdirSync(join(root, '.altitude/baselines'), { recursive: true });

  const modules = [];
  const written = new Set();
  for (const el of elements) {
    const full = join(root, PKG, el.file);
    mkdirSync(dirname(full), { recursive: true });
    if (!written.has(el.file)) {
      writeFileSync(full, el.source);
      written.add(el.file);
    }
    const decl = { kind: 'class', name: el.className };
    if (el.tag) {
      decl.tagName = el.tag;
      decl.customElement = true;
    }
    if (el.slots) decl.slots = el.slots.map((name) => ({ name, description: '' }));
    if (el.cssParts) decl.cssParts = el.cssParts.map((name) => ({ name, description: '' }));
    if (el.superclass) decl.superclass = el.superclass;
    modules.push({ kind: 'javascript-module', path: el.file, declarations: [decl] });
  }
  writeFileSync(
    join(root, PKG, 'custom-elements.json'),
    JSON.stringify({ schemaVersion: '1.0.0', modules }, null, 2)
  );
  if (baseline) {
    writeFileSync(join(root, '.altitude/baselines/cem-render.json'), JSON.stringify(baseline, null, 2));
  }
  return root;
}

function run(args, cwd = ROOT) {
  const r = spawnSync('node', [SCRIPT, ...args], { cwd, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

function readBaseline(root) {
  return JSON.parse(readFileSync(join(root, '.altitude/baselines/cem-render.json'), 'utf8'));
}

console.log('check-cem-render.test.mjs');

// 1. --help exits 0.
{
  const { code, out } = run(['--help']);
  assert('--help exits 0 and documents --update', code === 0 && /--update/.test(out) && /Usage:/.test(out), out);
}

// 2. THE REAL DEFECT. al-card documents `action-right` and never renders it;
//    the brand layer's sl-card does. This is the finding the gate was built
//    for, so it is pinned against the real tree.
{
  const { out } = run(['--json']);
  const json = JSON.parse(out.slice(out.indexOf('{')));
  const al = json.packages.find((p) => p.package === 'libs/al-web-components');
  assert(
    'the real al-card `action-right` slot is reported as documented-but-absent',
    al.errors.some((e) => e.tag === 'al-card' && e.kind === 'slot' && e.name === 'action-right'),
    JSON.stringify(al.errors)
  );
  const sl = json.packages.find((p) => p.package === 'libs/sl-web-components');
  assert(
    '...and sl-card, which really renders it, is NOT reported',
    sl && !sl.errors.some((e) => e.tag === 'sl-card' || (e.tag === 'al-card' && e.name === 'action-right')),
    JSON.stringify(sl && sl.errors)
  );
}

// 3. A documented slot that is really rendered is clean.
{
  const root = makeRepo({
    elements: [
      {
        tag: 'al-thing',
        className: 'ALThing',
        file: 'components/thing/thing.ts',
        slots: ['', 'header'],
        source: 'render() { return html`<div><slot name="header"></slot><slot></slot></div>`; }',
      },
    ],
    baseline: { ceiling: { [PKG]: 0 }, total: 0 },
  });
  const { code, out } = run(['--root', root, '--package', PKG]);
  assert('a documented slot that exists in the render passes', code === 0 && /0 absent/.test(out), out);
}

// 4. A documented slot with no matching `<slot>` fails and is named.
{
  const root = makeRepo({
    elements: [
      {
        tag: 'al-thing',
        className: 'ALThing',
        file: 'components/thing/thing.ts',
        slots: ['header', 'action-right'],
        source: 'render() { return html`<div><slot name="header"></slot></div>`; }',
      },
    ],
    baseline: { ceiling: { [PKG]: 0 }, total: 0 },
  });
  const { code, out } = run(['--root', root, '--package', PKG]);
  assert('a documented-but-absent slot fails', code === 1, out);
  assert('...and names the element, kind and slot', /al-thing\s+slot "action-right"/.test(out), out);
}

// 5. A rendered slot nobody documented is a WARNING, not a failure.
{
  const root = makeRepo({
    elements: [
      {
        tag: 'al-thing',
        className: 'ALThing',
        file: 'components/thing/thing.ts',
        slots: [],
        source: 'render() { return html`<slot name="footer"></slot>`; }',
      },
    ],
    baseline: { ceiling: { [PKG]: 0 }, total: 0 },
  });
  const { code, out } = run(['--root', root, '--package', PKG]);
  assert('an undocumented rendered slot warns but does not fail', code === 0 && /WARN/.test(out), out);
  assert('...and names it', /al-thing\s+slot "footer"/.test(out), out);
}

// 6. cssParts are checked in both directions too.
{
  const root = makeRepo({
    elements: [
      {
        tag: 'al-thing',
        className: 'ALThing',
        file: 'components/thing/thing.ts',
        cssParts: ['container', 'ghost'],
        source: 'render() { return html`<div part="container inner"></div>`; }',
      },
    ],
    baseline: { ceiling: { [PKG]: 0 }, total: 0 },
  });
  const { code, out } = run(['--root', root, '--package', PKG]);
  assert('a documented-but-absent csspart fails', code === 1 && /csspart "ghost"/.test(out), out);
  assert('...a space-separated part list is split', /csspart "inner"/.test(out) && !/csspart "container"/.test(out), out);
}

// 7. A DYNAMIC slot name is skipped BY NAME — never guessed, never silently
//    dropped. Silence is the only forbidden failure.
{
  const root = makeRepo({
    elements: [
      {
        tag: 'al-thing',
        className: 'ALThing',
        file: 'components/thing/thing.ts',
        slots: ['whatever'],
        source: 'render() { return html`<slot name=${this.slotName}></slot>`; }',
      },
    ],
    baseline: { ceiling: { [PKG]: 0 }, total: 0 },
  });
  const { code, out } = run(['--root', root, '--package', PKG]);
  assert('a dynamic slot name does not produce a false positive', code === 0, out);
  assert('...and the element is listed as a named skip', /SKIPPED/.test(out) && /al-thing/.test(out), out);
}

// 8. An event binding is NOT a dynamic name — the expression is in value
//    position, and treating it as unanalysable silently disabled three real
//    components during development.
{
  const root = makeRepo({
    elements: [
      {
        tag: 'al-thing',
        className: 'ALThing',
        file: 'components/thing/thing.ts',
        slots: ['gone'],
        source:
          'render() { return html`<slot name="icon" @slotchange=${(e: Event) => this.read(e)}></slot><slot @x=${this.y}></slot>`; }',
      },
    ],
    baseline: { ceiling: { [PKG]: 0 }, total: 0 },
  });
  const { code, out } = run(['--root', root, '--package', PKG]);
  assert('an arrow function in an event binding does not make a slot unanalysable', !/SKIPPED/.test(out), out);
  assert('...and the absent documented slot is still caught', code === 1 && /slot "gone"/.test(out), out);
  assert('...and the real `icon` and default slots are seen', /slot "icon"/.test(out) && /slot ""/.test(out), out);
}

// 9. Comments are stripped: a doc block that TALKS about `<slot>` is not a
//    render. sl-card's own description contains the literal text, and counting
//    it would let the sentence describing a defect appear to fix it.
{
  const root = makeRepo({
    elements: [
      {
        tag: 'al-thing',
        className: 'ALThing',
        file: 'components/thing/thing.ts',
        slots: [''],
        source: '/**\n * @slot - renders no matching `<slot>` element\n */\nrender() { return html`<div></div>`; }',
      },
    ],
    baseline: { ceiling: { [PKG]: 0 }, total: 0 },
  });
  const { code, out } = run(['--root', root, '--package', PKG]);
  assert('a `<slot>` inside a comment does not count as rendered', code === 1 && /slot ""/.test(out), out);
}

// 10. The superclass chain is followed: an element that inherits its render is
//     judged on the code that actually runs (every al-icon-* alias does this).
{
  const root = makeRepo({
    elements: [
      {
        className: 'ALBase',
        file: 'components/base/base.ts',
        source: 'render() { return html`<svg part="svg"></svg><slot></slot>`; }',
      },
      {
        tag: 'al-alias',
        className: 'ALAlias',
        file: 'components/alias/alias.ts',
        slots: [''],
        cssParts: ['svg'],
        superclass: { name: 'ALBase', module: '/components/base/base' },
        source: 'export class ALAlias extends ALBase { static el = "al-alias"; }',
      },
    ],
    baseline: { ceiling: { [PKG]: 0 }, total: 0 },
  });
  const { code, out } = run(['--root', root, '--package', PKG]);
  assert('a slot/part inherited from a superclass counts as present', code === 0 && /0 absent/.test(out), out);
}

// 11. Ratchet: an increase fails.
{
  const root = makeRepo({
    elements: [
      {
        tag: 'al-thing',
        className: 'ALThing',
        file: 'components/thing/thing.ts',
        slots: ['a', 'b'],
        source: 'render() { return html`<div></div>`; }',
      },
    ],
    baseline: { ceiling: { [PKG]: 1 }, total: 1 },
  });
  const { code, out } = run(['--root', root, '--package', PKG]);
  assert('the ratchet fails when absent slots increase', code === 1 && /increased/.test(out), out);
}

// 12. Ratchet: a DROP below the pin fails without --update, and --update
//     re-pins. A ratchet seeded once and never turned is the failure mode.
{
  const root = makeRepo({
    elements: [
      {
        tag: 'al-thing',
        className: 'ALThing',
        file: 'components/thing/thing.ts',
        slots: ['a'],
        source: 'render() { return html`<div></div>`; }',
      },
    ],
    baseline: { ceiling: { [PKG]: 4 }, total: 4 },
  });
  const first = run(['--root', root, '--package', PKG]);
  assert('a count BELOW the pin fails without --update', first.code === 1 && /DROPPED: 4 -> 1/.test(first.out), first.out);
  const upd = run(['--root', root, '--package', PKG, '--update']);
  assert('--update exits 0', upd.code === 0, upd.out);
  assert('--update rewrites the pin', readBaseline(root).total === 1, upd.out);
  const second = run(['--root', root, '--package', PKG]);
  assert('...and the gate is green afterwards', second.code === 0, second.out);
}

// 13. A manifest with no custom elements cannot be measured, and says so.
{
  const root = makeRepo({
    elements: [{ className: 'Helper', file: 'components/h/h.ts', source: 'export class Helper {}' }],
    baseline: { ceiling: {}, total: 0 },
  });
  const { code, out } = run(['--root', root, '--package', PKG]);
  assert('a manifest with no custom elements exits 2', code === 2 && /cannot measure/.test(out), out);
}

// 14. A manifest entry whose source file is gone is a NAMED skip, not a silent
//     pass and not a false positive.
{
  const root = makeRepo({
    elements: [
      {
        tag: 'al-thing',
        className: 'ALThing',
        file: 'components/thing/thing.ts',
        slots: ['header'],
        source: 'render() { return html`<slot name="header"></slot>`; }',
      },
    ],
    baseline: { ceiling: { [PKG]: 0 }, total: 0 },
  });
  rmSync(join(root, PKG, 'components/thing/thing.ts'));
  const { code, out } = run(['--root', root, '--package', PKG]);
  assert('a missing source file is a named skip, not a failure', code === 0 && /SKIPPED/.test(out), out);
  assert('...naming the element and the absent file', /al-thing/.test(out) && /thing\.ts/.test(out), out);
}

// 15. The real repo is green at its pin.
{
  const { code, out } = run([]);
  assert('the real repo is green at its pin', code === 0 && /exactly at the pin/.test(out), out);
}

for (const root of TEMP_ROOTS) rmSync(root, { recursive: true, force: true });
console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
