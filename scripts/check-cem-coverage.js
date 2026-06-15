#!/usr/bin/env node
/**
 * T3.1 acceptance — CEM coverage gate.
 *
 * Walks `.altitude/migration.json` for the canonical component list and
 * asserts the freshly-built `custom-elements.json` has a class declaration
 * for every component. Per the plan:
 *   "custom-elements.json has entries for 100% of manifest-listed
 *    components, each with tag, class, module, attrs, props, events, slots,
 *    CSS parts, CSS vars; CI fails if coverage < 100%."
 *
 * Today we enforce the *structural* requirement (every migration-tracked
 * component has at least one class declaration in the manifest). The
 * additional `slots/events/parts/cssProperties` enrichment depends on JSDoc
 * tag updates in component sources (T3.2 / T3.3 will codemod the prose
 * markup); a follow-up PR will tighten this gate accordingly.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const MANIFEST = path.join(REPO, '.altitude/migration.json');
const CEM = path.join(REPO, 'libs/al-web-components/custom-elements.json');

function pascal(name) {
  return name.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('');
}

function main() {
  if (!fs.existsSync(MANIFEST) || !fs.existsSync(CEM)) {
    console.error('[cem-coverage] missing input.');
    process.exit(2);
  }
  const migration = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const cem = JSON.parse(fs.readFileSync(CEM, 'utf8'));

  const classes = new Map();
  for (const mod of cem.modules || []) {
    for (const d of mod.declarations || []) {
      if (d.kind === 'class') classes.set(d.name, { mod: mod.path, d });
    }
  }

  const missing = [];
  for (const name of Object.keys(migration.components)) {
    const expectedClass = `AL${pascal(name)}`;
    if (!classes.has(expectedClass)) missing.push({ name, expectedClass });
  }

  if (missing.length === 0) {
    const total = Object.keys(migration.components).length;
    console.log(`[cem-coverage] PASS — ${total}/${total} migration-tracked components have a class declaration (CEM also includes ${classes.size - total} non-migration entries: spike artifacts, helpers).`);
    process.exit(0);
  }
  console.error(`[cem-coverage] FAIL — ${missing.length} component(s) missing from custom-elements.json:`);
  for (const m of missing.slice(0, 10)) console.error(`  - ${m.name} (expected class ${m.expectedClass})`);
  process.exit(1);
}

main();
