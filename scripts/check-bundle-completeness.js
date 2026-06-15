#!/usr/bin/env node
/**
 * T2.2 drift gate — bundle.ts must re-export every ALElement-extending
 * component the build picks up. Asserted because `bundle.ts` is hand-
 * maintained but the Vite/webpack entry discovery is automatic; a new
 * component lands in dist as its own chunk but silently misses the
 * convenience import.
 *
 * Walks `libs/al-web-components/components/<name>/<name>.ts` looking for
 * `extends ALElement`, then asserts every match has a matching
 * `export * from './<name>/<name>';` in `bundle.ts`.
 *
 * Exit codes:
 *   0 — bundle.ts is complete
 *   1 — drift detected
 *   2 — internal error
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const COMPONENTS = path.join(REPO, 'libs/al-web-components/components');
const BUNDLE = path.join(REPO, 'libs/al-web-components/components/bundle.ts');

function discoverComponents() {
  const out = [];
  for (const name of fs.readdirSync(COMPONENTS)) {
    if (name.startsWith('.') || name === 'ALElement.ts' || name === 'bundle.ts') continue;
    const dir = path.join(COMPONENTS, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    const ts = path.join(dir, `${name}.ts`);
    try {
      const src = fs.readFileSync(ts, 'utf8');
      if (src.includes('extends ALElement')) out.push(name);
    } catch {}
  }
  return out.sort();
}

function main() {
  const components = discoverComponents();
  if (!fs.existsSync(BUNDLE)) {
    console.error('[bundle-completeness] FAIL — bundle.ts missing.');
    process.exit(1);
  }
  const bundleSrc = fs.readFileSync(BUNDLE, 'utf8');
  const missing = components.filter((name) => !bundleSrc.includes(`'./${name}/${name}'`));
  if (missing.length === 0) {
    console.log(`[bundle-completeness] PASS — bundle.ts re-exports all ${components.length} ALElement components.`);
    process.exit(0);
  }
  console.error(`[bundle-completeness] FAIL — bundle.ts is missing ${missing.length} component(s):`);
  for (const name of missing.slice(0, 20)) console.error(`  - export * from './${name}/${name}';`);
  console.error(`\nAdd the missing lines to libs/al-web-components/components/bundle.ts.`);
  process.exit(1);
}

main();
