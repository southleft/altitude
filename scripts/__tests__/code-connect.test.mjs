#!/usr/bin/env node
/**
 * Self-test for scripts/contracts/build-code-connect.mjs — the contract ->
 * Figma Code Connect generator.
 *
 * Plain node, no framework, no dependencies — matches check-doc-anchors.test.mjs
 * and check-figma-drift.test.mjs: spawn the real CLI and assert on its exit code
 * and its output, because the CLI contract (write the right files, exit non-zero
 * on drift, REFUSE for southleft) is what CI depends on.
 *
 * Every case builds a THROWAWAY repo in os.tmpdir() and points the generator at
 * it with `--root`. Asserting against the real `.altitude/contracts/` would make
 * these tests fail every time the owner edits a contract, which is the opposite
 * of a regression test: what must not regress is the MAPPING MODEL, not today's
 * coverage count.
 *
 * Run: node scripts/__tests__/code-connect.test.mjs
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const SCRIPT = join(ROOT, 'scripts/contracts/build-code-connect.mjs');

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

// ── fixtures ────────────────────────────────────────────────────────────

/** A prop the generator should map to a Figma variant axis. */
const variantProp = (name, attribute, extra, figma) => ({
  name,
  description: `the ${name} prop`,
  bindings: { code: { attribute }, figma },
  ...extra,
});

/**
 * `al-widget` — the covered component. Deliberately carries one of EVERY shape
 * the mapping model has to handle, so a regression in any single rule reds a
 * named assertion rather than a coverage count.
 */
const WIDGET = {
  id: 'al-widget',
  name: 'Widget',
  version: '1.0.0',
  status: 'source',
  description: 'Component: al-widget',
  props: [
    // enum -> options, with a "Default" option meaning "attribute omitted"
    variantProp('size', 'size', { type: 'enum', rawType: "'sm' | 'lg'", values: ['lg', 'sm'] }, {
      kind: 'VARIANT',
      property: 'Size',
      options: ['Default', 'Lg', 'Sm'],
    }),
    // boolean matched by NAME STEM against a multi-value axis
    variantProp('isDisabled', 'isDisabled', { type: 'boolean', rawType: 'boolean' }, {
      kind: 'VARIANT',
      property: 'State',
      options: ['Default', 'Disabled', 'Hover'],
    }),
    // boolean matched by the Yes/No rule (no option shares the prop's name)
    variantProp('isCurrent', 'isCurrent', { type: 'boolean', rawType: 'boolean' }, {
      kind: 'VARIANT',
      property: 'Current',
      options: ['No', 'Yes'],
    }),
    // single string literal + a two-option axis: the other option is the unset half
    variantProp('orientation', 'orientation', { type: 'string', rawType: "'vertical'" }, {
      kind: 'VARIANT',
      property: 'Orientation',
      options: ['Horizontal', 'Vertical'],
    }),
    // bound to an axis, but nothing about it is derivable -> named, not guessed
    variantProp('sortDirection', 'sortDirection', { type: 'string', rawType: 'ALSortDirection' }, {
      kind: 'VARIANT',
      property: 'Sort',
      options: ['Ascending', 'None'],
    }),
    // must NEVER reach the output
    variantProp('secretHandle', 'secretHandle', { type: 'string', rawType: 'string' }, { omit: true }),
  ],
  events: [],
  slots: [
    { name: '', description: 'the widget label' },
    { name: 'before', description: 'leading content', figmaPlaceholder: 'check-circle' },
    { name: 'after', description: 'trailing content' },
  ],
  bindings: {
    code: {
      importPath: '@southleft/al-web-components/components/widget/widget.ts',
      tagName: 'al-widget',
      workspace: '@southleft/al-web-components',
    },
    figma: {
      fileKey: 'FIXTUREKEY',
      componentSetName: 'Widget',
      nodeId: '1234:5678',
      url: 'https://www.figma.com/design/FIXTUREKEY/?node-id=1234-5678',
    },
  },
};

/** `al-ghost` — a real component with NO pinned Figma node. */
const GHOST = {
  id: 'al-ghost',
  name: 'Ghost',
  version: '1.0.0',
  status: 'source',
  description: 'Component: al-ghost',
  props: [
    variantProp('variant', 'variant', { type: 'enum', rawType: "'bare'", values: ['bare'] }, {
      kind: 'VARIANT',
      property: 'Variant',
      options: ['Bare', 'Default'],
    }),
  ],
  events: [],
  slots: [{ name: '', description: 'content' }],
  bindings: {
    code: {
      importPath: '@southleft/al-web-components/components/ghost/ghost.ts',
      tagName: 'al-ghost',
      workspace: '@southleft/al-web-components',
    },
    // The shape a contract has before `parity:seed` pins a node: a Figma block
    // with a set NAME but no id. It must be skipped BY NAME, never emitted.
    figma: { fileKey: 'FIXTUREKEY', componentSetName: 'Ghost', nodeId: null, url: null },
  },
};

/** The plop-shaped React wrapper the generator parses for `al-widget`. */
const WIDGET_WRAPPER = `import * as React from 'react';
import { createComponent } from '@lit/react';
import { ALWidget as ALWidgetWC } from '@southleft/al-web-components/components/widget';

export const ALWidget = createComponent({
  react: React,
  tagName: 'al-widget',
  elementClass: ALWidgetWC,
  events: { onWidgetChange: 'onWidgetChange' },
});
`;

function makeRepo({ contracts = { 'al-widget': WIDGET, 'al-ghost': GHOST }, wrappers = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'code-connect-'));
  TEMP_ROOTS.push(root);
  const write = (rel, content) => {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  };
  for (const [tag, contract] of Object.entries(contracts)) {
    write(`.altitude/contracts/altitude/${tag}.contract.json`, `${JSON.stringify(contract, null, 2)}\n`);
  }
  if (wrappers) write('libs/al-react/src/components/Widget/Widget.tsx', WIDGET_WRAPPER);
  return root;
}

function run(root, extra = []) {
  const res = spawnSync(process.execPath, [SCRIPT, '--root', root, ...extra], { encoding: 'utf8' });
  return { ...res, out: `${res.stdout ?? ''}${res.stderr ?? ''}` };
}

const outDir = (root) => join(root, '.altitude/code-connect/altitude');
const outFiles = (root) => (existsSync(outDir(root)) ? readdirSync(outDir(root)).sort() : []);
const read = (root, name) => readFileSync(join(outDir(root), name), 'utf8');

// ── cases ───────────────────────────────────────────────────────────────

console.log('== build-code-connect.mjs self-test ==');

console.log('\n1. A contract with a pinned nodeId produces both surfaces');
{
  const root = makeRepo();
  const res = run(root);
  assert('exits 0', res.status === 0);
  assert('emits the web-component file', outFiles(root).includes('al-widget.html.figma.ts'));
  assert('emits the React file (a wrapper ships for it)', outFiles(root).includes('al-widget.react.figma.tsx'));

  const html = read(root, 'al-widget.html.figma.ts');
  assert('the html file imports the html parser entrypoint', html.includes("from '@figma/code-connect/html'"));
  assert('  ...and connects the contract\'s own Figma url', html.includes("figma.connect('https://www.figma.com/design/FIXTUREKEY/?node-id=1234-5678'"));
  assert('  ...naming the real custom element', html.includes('<al-widget'));

  const react = read(root, 'al-widget.react.figma.tsx');
  assert('the React file imports the wrapper it parsed out of libs/al-react', react.includes("import { ALWidget } from '@southleft/al-react';"));
  assert('  ...and passes the component as the first connect argument', react.includes('figma.connect(ALWidget, '));

  assert('both carry a do-not-hand-edit provenance header naming the contract', [html, react].every((f) => f.includes('DO NOT HAND-EDIT') && f.includes('al-widget.contract.json')));
  assert('neither carries a timestamp (which would red --check on every run)', ![html, react].some((f) => /\d{4}-\d{2}-\d{2}T|generated at/i.test(f)));
  assert('every file ends with exactly one trailing newline', [html, react].every((f) => f.endsWith('\n') && !f.endsWith('\n\n')));
}

console.log('\n2. A component with no pinned nodeId is NAMED, and emits nothing');
{
  const root = makeRepo();
  const res = run(root);
  assert('no file is emitted for it', !outFiles(root).some((f) => f.startsWith('al-ghost')));
  assert('the console names it as a skip', res.out.includes('al-ghost'));
  assert('  ...with the reason (no pinned Figma nodeId)', /no pinned Figma nodeId/.test(res.out));

  const skipped = JSON.parse(read(root, 'skipped.json'));
  assert('the skip report names it', skipped.componentsWithoutFigmaNodeId.includes('al-ghost'));
  assert('  ...and counts it', skipped.counts.componentsSkipped === 1 && skipped.counts.componentsCovered === 1);
  assert('the skip report carries no timestamp either', !/\d{4}-\d{2}-\d{2}T/.test(read(root, 'skipped.json')));
}

console.log('\n3. An `omit`ted prop never reaches the output');
{
  const root = makeRepo();
  run(root);
  const html = read(root, 'al-widget.html.figma.ts');
  const react = read(root, 'al-widget.react.figma.tsx');
  assert('the omitted prop is absent from the html props map and example', !/secretHandle:\s*figma\.enum/.test(html) && !html.includes('${props.secretHandle}'));
  assert('  ...and from the React file', !/secretHandle=\{/.test(react));
  assert('  ...but IS named in the header, so it is not a silent drop', html.includes('secretHandle'));

  const skipped = JSON.parse(read(root, 'skipped.json'));
  assert('  ...and named in skipped.json with its reason', skipped.propsOmittedByContract.some((row) => row.tag === 'al-widget' && row.prop === 'secretHandle' && /omit/.test(row.reason)));
}

console.log('\n4. The variant -> attribute mapping is right, rule by rule');
{
  const root = makeRepo();
  run(root);
  const html = read(root, 'al-widget.html.figma.ts');

  assert('enum: each Figma option maps to the code value the contract states', /size: figma\.enum\('Size', \{\s*Lg: 'lg',\s*Sm: 'sm',\s*\}\)/.test(html));
  assert('enum: the "Default" option is NOT mapped — it means the attribute is absent', !/Default: /.test(html));
  assert('boolean: the option matching the prop name stem maps to true', /isDisabled: figma\.enum\('State', \{\s*Disabled: true,\s*\}\)/.test(html));
  assert('boolean: an unrelated option on that axis is not claimed', !/Hover:/.test(html));
  assert('boolean: a Yes/No axis maps Yes -> true', /isCurrent: figma\.enum\('Current', \{\s*Yes: true,\s*\}\)/.test(html));
  assert('single string literal: the matching option carries the literal', /orientation: figma\.enum\('Orientation', \{\s*Vertical: 'vertical',\s*\}\)/.test(html));
  assert('the code ATTRIBUTE (not the prop name) is what the html example writes', html.includes('isDisabled="${props.isDisabled}"'));

  const skipped = JSON.parse(read(root, 'skipped.json'));
  assert('an axis with no enumerable code values is reported, not guessed', skipped.propsUnmapped.some((row) => row.prop === 'sortDirection' && /enumerates no code values/.test(row.detail)));
  assert('  ...so it reaches neither the props map nor the example', !/sortDirection: figma\.enum/.test(html) && !html.includes('${props.sortDirection}'));
  assert('  ...while the header still names it, so it is not a silent drop', /could not map: sortDirection/.test(html));
  assert('"Default" is recorded as meaning attribute-omitted, not lost', skipped.optionsMeaningAttributeOmitted.some((row) => row.prop === 'size' && row.option === 'Default'));
  assert('the unset half of a two-option axis is recorded the same way', skipped.optionsMeaningAttributeOmitted.some((row) => row.prop === 'orientation' && row.option === 'Horizontal'));
}

console.log('\n5. Slots reach the example, and placeholders are declared as such');
{
  const root = makeRepo();
  run(root);
  const html = read(root, 'al-widget.html.figma.ts');
  assert('the default slot renders the component name as its content', html.includes('\n      Widget\n'));
  assert('a `before` slot renders BEFORE the default content', html.indexOf('slot="before"') < html.indexOf('\n      Widget\n'));
  assert('an `after` slot renders AFTER it', html.indexOf('slot="after"') > html.indexOf('\n      Widget\n'));

  const skipped = JSON.parse(read(root, 'skipped.json'));
  const before = skipped.slotsRenderedAsPlaceholders.find((row) => row.slot === 'before');
  assert('each named slot is recorded as a placeholder', Boolean(before) && skipped.slotsRenderedAsPlaceholders.some((row) => row.slot === 'after'));
  assert('  ...carrying the contract\'s figmaPlaceholder verbatim', before.figmaPlaceholder === 'check-circle');
  assert('  ...and saying that it is a Figma-side name, not a code tag', /not a code tag/.test(before.reason));
  assert('no icon element is invented from the placeholder name', !html.includes('al-icon-check-circle'));
}

console.log('\n6. --check fails when a generated file is hand-edited');
{
  const root = makeRepo();
  run(root);
  assert('a fresh tree passes --check', run(root, ['--check']).status === 0);

  writeFileSync(join(outDir(root), 'al-widget.html.figma.ts'), '// someone edited me\n', 'utf8');
  const drifted = run(root, ['--check']);
  assert('exits non-zero after a hand-edit', drifted.status === 1);
  assert('  ...naming the file that drifted', /DRIFTED\s+altitude\/al-widget\.html\.figma\.ts/.test(drifted.out));
  assert('  ...and saying to re-run the generator rather than hand-edit', /re-run .*build-code-connect\.mjs/.test(drifted.out));

  rmSync(join(outDir(root), 'al-widget.react.figma.tsx'));
  assert('a MISSING file is drift too', /MISSING\s+altitude\/al-widget\.react\.figma\.tsx/.test(run(root, ['--check']).out));

  const clean = makeRepo();
  run(clean);
  writeFileSync(join(outDir(clean), 'al-leftover.html.figma.ts'), '// stale\n', 'utf8');
  const orphan = run(clean, ['--check']);
  assert('a file with no contract behind it is reported as an ORPHAN', orphan.status === 1 && /ORPHAN\s+altitude\/al-leftover\.html\.figma\.ts/.test(orphan.out));
}

console.log('\n7. southleft is REFUSED, with the repoint reason');
{
  const root = makeRepo();
  const res = run(root, ['--project', 'southleft']);
  assert('exits 2 rather than emitting anything', res.status === 2);
  assert('nothing is written', !existsSync(join(root, '.altitude/code-connect/southleft')));
  assert('the refusal names the 2026-09-02 repoint', /2026-09-02/.test(res.out));
  assert('  ...and says the pinned ids address a retired file', /retired file/i.test(res.out));

  const other = run(root, ['--project', 'acme']);
  assert('an unknown project is refused too, generically', other.status === 2 && /no rule is recorded/.test(other.out));
}

console.log('\n8. Output is byte-identical across two runs');
{
  const root = makeRepo();
  run(root);
  const first = Object.fromEntries(outFiles(root).map((name) => [name, read(root, name)]));
  run(root);
  const second = Object.fromEntries(outFiles(root).map((name) => [name, read(root, name)]));
  assert('the same files are emitted', JSON.stringify(Object.keys(first)) === JSON.stringify(Object.keys(second)));
  assert('every one is byte-identical', Object.keys(first).every((name) => first[name] === second[name]));
}

console.log('\n9. A component with no React wrapper still gets its web-component file');
{
  const root = makeRepo({ wrappers: false });
  run(root);
  assert('the html file is still emitted', outFiles(root).includes('al-widget.html.figma.ts'));
  assert('no React file is invented', !outFiles(root).includes('al-widget.react.figma.tsx'));
  const skipped = JSON.parse(read(root, 'skipped.json'));
  assert('the missing wrapper is NAMED', skipped.componentsWithoutReactWrapper.includes('al-widget'));
}

console.log('\n10. The publish configs are emitted and are themselves generated');
{
  const root = makeRepo();
  run(root);
  const html = JSON.parse(read(root, 'figma.config.html.json'));
  const react = JSON.parse(read(root, 'figma.config.react.json'));
  assert('one config per parser, because Code Connect allows one parser each', html.codeConnect.parser === 'html' && react.codeConnect.parser === 'react');
  assert('each includes only its own surface', html.codeConnect.include[0].endsWith('*.html.figma.ts') && react.codeConnect.include[0].endsWith('*.react.figma.tsx'));
  assert('both say they are generated and that the package is not installed here', [html, react].every((c) => /do not hand-edit/i.test(c.$comment) && /not installed/.test(c.$comment)));
}

// ── teardown ────────────────────────────────────────────────────────────

for (const root of TEMP_ROOTS) {
  try {
    rmSync(root, { recursive: true, force: true });
  } catch {
    /* a temp dir that will not delete is not a test failure */
  }
}

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
