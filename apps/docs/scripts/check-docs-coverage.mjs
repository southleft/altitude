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
 * SINCE THE SITE WENT MULTI-PROJECT there is a second, different claim to
 * check. Each design system in `.altitude/ds-projects.json` documents either
 * the whole library or a declared subset (`library.components`), and a SCOPED
 * system can go wrong in ways the whole-library site cannot:
 *
 *   * an allowlisted tag the library does not declare — a typo, or a component
 *     that was removed, leaving the design system claiming to document
 *     something that does not exist;
 *   * a scope that produced no pages at all, which would ship an empty site
 *     rather than an error;
 *   * a route prefix that collides with a page this site already owns.
 *
 * And the scope must stay honest against the PRODUCT, not just against the
 * library — `scripts/check-sl-scope.mjs` at the repo root re-derives each
 * scoped system's allowlist from its own site's source. That gate is what makes
 * "adding a component to the site is what earns it a docs page" true, so it is
 * chained ahead of this one in `pnpm run gate:docs` rather than living only in
 * a workflow file.
 *
 *   node scripts/check-docs-coverage.mjs            # report + exit 1 on gaps
 *   node scripts/check-docs-coverage.mjs --strict   # also fail on inferences
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPONENTS, registryReport, STATS } from '../src/lib/registry.mjs';
import { CONTEXTS } from '../src/lib/context.mjs';

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url));
const ROUTE_FILE = path.join(APP_ROOT, 'src', 'pages', 'components', '[slug].astro');
const PROJECT_ROUTE_FILE = path.join(APP_ROOT, 'src', 'pages', '[project]', 'components', '[slug].astro');
const strict = process.argv.includes('--strict');

const failures = [];

if (!fs.existsSync(ROUTE_FILE)) {
  failures.push(`Missing the component detail route: ${ROUTE_FILE}`);
}
if (!fs.existsSync(PROJECT_ROUTE_FILE)) {
  failures.push(`Missing the per-project component detail route: ${PROJECT_ROUTE_FILE}`);
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

/* ------------------------------------------------- per design-system scope */

console.log('\nDesign systems (.altitude/ds-projects.json)');

const prefixes = new Map();
for (const { project, registry, site } of CONTEXTS) {
  const scope = registry.scope;
  const where = project.routePrefix === '' ? '/ (site root)' : `${project.routePrefix}/`;

  console.log(
    `  ${project.id.padEnd(12)}: ${String(registry.count).padStart(3)} pages at ${where.padEnd(14)} ` +
      `brand=${project.brand} scope=${scope.scoped ? `${scope.requested} declared` : 'whole library'}`,
  );

  if (registry.count === 0) {
    failures.push(
      `${project.id}: its declared scope matched no components, so its site would ship with no pages. ` +
        `Check projects.${project.id}.library.components in .altitude/ds-projects.json.`,
    );
  }

  if (scope.unknown.length) {
    failures.push(
      `${project.id}: allowlisted but not declared by the library: ${scope.unknown.join(', ')}. ` +
        `Either the tag is a typo or the component was removed; either way this design system ` +
        `claims to document something that does not exist.`,
    );
  }

  if (scope.glyphs.length) {
    console.log(
      `  ${''.padEnd(12)}  note: ${scope.glyphs.join(', ')} are generated icon glyphs, ` +
        `documented through al-icon rather than as components.`,
    );
  }

  const seen = prefixes.get(project.routePrefix);
  if (seen) {
    failures.push(`${project.id} and ${seen} both claim the route prefix "${project.routePrefix}".`);
  }
  prefixes.set(project.routePrefix, project.id);

  // The site's own URL must be reachable from its route prefix — cheap, and it
  // catches a base/prefix mismatch that would otherwise only show as 404s.
  if (!site.url.endsWith(project.routePrefix === '' ? '/docs' : project.routePrefix)) {
    failures.push(`${project.id}: site url "${site.url}" does not end in its route prefix.`);
  }
}

/* ------------------------------------ orphaned production surfaces (task 5) */

/**
 * A design system may ADVERTISE a deployed Storybook that nothing in this repo
 * builds. `storybook.productionBase` is consumed by
 * `libs/altitude-mcp/src/lib/stories.mjs` to build absolute doc links, so an
 * orphan is not cosmetic: every generated link into it 404s. Reported, never
 * failed — the registry is not this app's to fix, and a docs deploy must not
 * block on it — but never silent either.
 */
const rootPackage = JSON.parse(fs.readFileSync(path.join(APP_ROOT, '..', '..', 'package.json'), 'utf8'));
const builtStorybookPaths = Object.entries(rootPackage.scripts ?? {})
  .filter(([name]) => name.startsWith('build:storybook'))
  .map(([, command]) => /--output-dir\s+\S*?dist\/(\S+)/.exec(command)?.[1])
  .filter(Boolean);

const orphans = CONTEXTS.map(({ project }) => project)
  .filter((project) => project.storybookProductionBase)
  .filter((project) => {
    const suffix = project.storybookProductionBase.replace(/^https?:\/\/[^/]+\//, '');
    return !builtStorybookPaths.some((built) => built === suffix);
  });

if (orphans.length) {
  console.log('\nOrphaned production surfaces');
  for (const project of orphans) {
    console.log(
      `  ${project.id.padEnd(12)}: storybook.productionBase advertises ${project.storybookProductionBase}, ` +
        `which no build:storybook-* script in the workspace root emits ` +
        `(built: ${builtStorybookPaths.join(', ') || 'none'}). This docs site does not link to it.`,
    );
  }
}

if (failures.length) {
  console.error('\nFAIL');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('\nOK — every component in the manifest has a generated docs page, and every design system’s scope resolves.');
