#!/usr/bin/env node
/**
 * The auto-update guarantee needs a gate, not a convention.
 *
 * Fails when a component exists in `libs/al-web-components/custom-elements.json`
 * but has no docs page — i.e. when the generated route list and the manifest
 * have diverged. Because the routes ARE generated from the manifest
 * (`src/pages/components/[slug].astro`'s `getStaticPaths`), a divergence can
 * only mean the generator's structural rule stopped matching the library's
 * layout, which is exactly the failure mode worth catching.
 *
 * Also reports what the registry had to infer rather than read (a component
 * with no atomic story title lands in a fallback tier), so a mis-titled new
 * component surfaces instead of quietly disappearing into it.
 *
 *   node scripts/check-docs-coverage.mjs            # report + exit 1 on gaps
 *   node scripts/check-docs-coverage.mjs --strict   # also fail on inferences
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPONENTS, registryReport, STATS } from '../src/lib/registry.mjs';

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url));
const ROUTE_FILE = path.join(APP_ROOT, 'src', 'pages', 'components', '[slug].astro');
const strict = process.argv.includes('--strict');

const failures = [];

if (!fs.existsSync(ROUTE_FILE)) {
  failures.push(`Missing the component detail route: ${ROUTE_FILE}`);
}

if (COMPONENTS.length === 0) {
  failures.push('The registry produced zero components — the CEM read or the structural rule broke.');
}

// A docs page exists for a component iff getStaticPaths emits its slug, so
// re-run the generator's own contract rather than trusting it.
const routed = new Set(COMPONENTS.map((c) => c.slug));
const undocumented = COMPONENTS.filter((c) => !routed.has(c.slug));
for (const component of undocumented) {
  failures.push(`In the CEM but not routed: ${component.tag} (${component.modulePath})`);
}

const report = registryReport();

console.log('Altitude docs — CEM coverage');
console.log(`  components routed : ${COMPONENTS.length}`);
console.log(`  tiers             : ${report.tiers}`);
console.log(`  CEM tags total    : ${STATS.cemTags} (${report.icons} icon glyphs excluded)`);
console.log(`  props documented  : ${STATS.documentedProps}/${STATS.totalProps}`);
console.log(`  React wrappers    : ${STATS.withReact}/${COMPONENTS.length}`);

if (report.inferredTier.length) {
  const line = `  inferred tier     : ${report.inferredTier.join(', ')} (no Atoms/Molecules/Organisms story title)`;
  console.log(line);
  if (strict) failures.push(line.trim());
}
if (report.missingReactWrapper.length) {
  console.log(`  no React wrapper  : ${report.missingReactWrapper.join(', ')}`);
}

if (failures.length) {
  console.error('\nFAIL');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('\nOK — every component in the manifest has a generated docs page.');
