#!/usr/bin/env node
/**
 * T2.2 acceptance — public-export parity between the webpack and Vite library
 * builds. The plan demands: "an API-extractor/AST diff shows **zero public
 * export removals** vs the P0 dist".
 *
 * Simpler implementation: for each `.js` under both `dist/components/**` and
 * `dist-vite/components/**`, parse the file with a regex sniff for top-level
 * `export {…}`/`export const`/`export class`/`export function`/`export default`
 * statements, collect the exported names, and assert the Vite set is a
 * superset of the webpack set (additions are OK; removals fail).
 *
 * Also fails if a component-file relpath in webpack has no counterpart in
 * dist-vite — that's an entry-point regression.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const WP = path.join(REPO, 'libs/al-web-components/dist');
const VT = path.join(REPO, 'libs/al-web-components/dist-vite');

function walk(dir, exts) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      for (const c of walk(p, exts)) out.push(path.join(name, c));
    } else if (exts.some((e) => name.endsWith(e))) {
      out.push(name);
    }
  }
  return out;
}

function exportsOf(file) {
  const src = fs.readFileSync(file, 'utf8');
  const names = new Set();
  // export { Foo, Bar as Baz } from '…';
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const piece of m[1].split(',')) {
      const word = piece.trim().split(/\s+as\s+/).pop();
      const w = word?.trim().replace(/^['"]|['"]$/g, '');
      if (w && /^[A-Za-z_$][\w$]*$/.test(w)) names.add(w);
    }
  }
  // export const Foo = …
  for (const m of src.matchAll(/export\s+(?:const|let|var|class|function|abstract|async\s+function)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[1]);
  }
  // export default …
  if (/export\s+default\b/.test(src)) names.add('default');
  return names;
}

function main() {
  if (!fs.existsSync(WP) || !fs.existsSync(VT)) {
    console.error('[export-parity] missing dist. webpack ->', fs.existsSync(WP), 'vite ->', fs.existsSync(VT));
    process.exit(2);
  }
  const wpFiles = new Set(walk(path.join(WP, 'components'), ['.js']).filter((f) => !f.includes('.LICENSE.')));
  const vtFiles = new Set(walk(path.join(VT, 'components'), ['.js']));

  const onlyInWp = [...wpFiles].filter((f) => !vtFiles.has(f));
  const onlyInVt = [...vtFiles].filter((f) => !wpFiles.has(f));

  let failures = 0;

  if (onlyInWp.length > 0) {
    console.error(`[export-parity] FAIL — ${onlyInWp.length} file(s) present in webpack but missing from Vite:`);
    for (const f of onlyInWp.slice(0, 10)) console.error(`  - ${f}`);
    failures += onlyInWp.length;
  }
  if (onlyInVt.length > 0) {
    console.log(`[export-parity] note — ${onlyInVt.length} new file(s) in Vite (additions allowed):`);
    for (const f of onlyInVt.slice(0, 10)) console.log(`  + ${f}`);
  }

  // Per-file export-set comparison.
  let exportMissing = 0;
  for (const rel of wpFiles) {
    if (!vtFiles.has(rel)) continue;
    const wpSet = exportsOf(path.join(WP, 'components', rel));
    const vtSet = exportsOf(path.join(VT, 'components', rel));
    const missing = [...wpSet].filter((n) => !vtSet.has(n));
    if (missing.length) {
      console.error(`[export-parity] FAIL — ${rel}: missing exports ${missing.join(', ')}`);
      exportMissing += missing.length;
      failures += missing.length;
    }
  }

  if (failures === 0) {
    console.log(`[export-parity] PASS — ${wpFiles.size} files compared, zero public-export removals.`);
    process.exit(0);
  }
  process.exit(1);
}

main();
