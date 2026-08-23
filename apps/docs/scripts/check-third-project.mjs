#!/usr/bin/env node
/**
 * THE GENERALISATION GATE — prove a THIRD design system costs a registry entry
 * and nothing else, before a real client depends on it.
 *
 * Two design systems is the number at which a "multi-project" engine can still
 * be two hard-coded cases wearing a loop. This gate runs a project that does
 * not exist — a throwaway fixture, built in memory, never written to
 * `.altitude/ds-projects.json` — through the SAME functions the real sites are
 * built from, and asserts it gets a complete, correctly scoped, correctly
 * branded site out.
 *
 * It checks four things, and the last is the one that actually protects the
 * property:
 *
 *   G1  a synthetic registry entry produces a full docs CONTEXT — scoped
 *       registry, site copy, href builder — with no code path taken for it.
 *   G2  its site is SCOPED to its own allowlist: the component list, the
 *       taxonomy, the lifecycle groups and every count are re-derived, not
 *       inherited from the whole library.
 *   G3  its machine artifacts (llms.txt, status.json) render, name the fixture,
 *       and never name another design system.
 *   G4  NO PROJECT ID IS TYPED IN THE APP'S SOURCE. This is the real test:
 *       G1–G3 could all pass while a `if (id === 'southleft')` sat in a
 *       template. Every project id in the live registry is grepped for, with
 *       comments stripped first, across every file that decides what the site
 *       renders. A hit is a per-brand branch, which is the thing this whole
 *       design exists to prevent.
 *
 * WHAT IT DOES NOT PROVE: that Astro writes the files to disk. That is
 * `check-docs-coverage.mjs` (route list vs. registry) and
 * `check-status-panels.mjs` (built output vs. engine), which run against a real
 * build of the real registry. This gate proves the DERIVATION generalises; those
 * two prove the derivation reaches the disk.
 *
 *   node apps/docs/scripts/check-third-project.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { docsProject, PROJECTS } from '../src/lib/projects.mjs';
import { contextFor } from '../src/lib/context.mjs';
import { COMPONENTS } from '../src/lib/registry.mjs';
import { llmsTxt, llmsTokens, llmsComponents, llmsA11y, llmsFull, statusJson } from '../src/lib/artifacts.mjs';
import { overviewMarkdown, componentsIndexMarkdown, foundationsMarkdown } from '../src/lib/markdown.mjs';

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url));
const failures = [];
const check = (id, condition, message) => {
  if (!condition) failures.push(`${id}: ${message}`);
};

/* ---------------------------------------------------------- the fixture */

/**
 * A throwaway client, shaped exactly like a real registry entry (see
 * `.altitude/ds-projects.schema.json`) and deliberately UNLIKE the two real
 * ones: a brand with no token override block, no logo asset, a name that does
 * not end in "Design System", and a scope of four components taken from the
 * live library so the fixture cannot go stale as the library changes.
 */
const scope = COMPONENTS.slice(0, 4).map((component) => component.tag);
const FIXTURE_ENTRY = {
  id: 'proofclient',
  name: 'Proof Client',
  brand: 'proofclient',
  figma: { fileKey: '0000000000000000000000', fileName: 'Proof Client UI', decoys: [] },
  paths: {
    figmaSyncDir: '.altitude/figma-sync/proofclient',
    parityManifest: '.altitude/figma-sync/proofclient/parity-manifest.json',
    opsDir: '.altitude/figma-sync/proofclient/ops',
    instanceMap: null,
  },
  library: { workspace: 'al-web-components', root: 'libs/al-web-components', tagPrefix: 'al-', components: scope },
  storybook: {
    configDir: 'libs/al-web-components/.storybook',
    port: 6099,
    brandTitle: 'Proof Client',
    productionBase: 'https://example.invalid/storybook/proofclient',
  },
  excluded: {},
};

/* ------------------------------------------------- G1 — a complete context */

let context;
try {
  context = contextFor(docsProject(FIXTURE_ENTRY, { isDefault: false }));
} catch (error) {
  console.error(`G1: the docs engine could not build a context for a third project: ${error.message}`);
  process.exit(1);
}

const { project, registry, site, href } = context;

check('G1', project.routePrefix === '/proofclient', `route prefix is "${project.routePrefix}", expected "/proofclient"`);
check('G1', href('/components') === '/docs/proofclient/components', `href built "${href('/components')}"`);
check('G1', site.fullName === FIXTURE_ENTRY.name, `site name is "${site.fullName}"`);
check('G1', site.name === FIXTURE_ENTRY.name, 'a name that does not end in "Design System" must survive unchanged');
check('G1', site.url.endsWith('/docs/proofclient'), `site url is "${site.url}"`);
check('G1', site.npmPackage.endsWith('/al-web-components'), `install line is "${site.npmPackage}"`);

/* --------------------------------------------------------- G2 — scoping */

check('G2', registry.count === scope.length, `scoped registry has ${registry.count} components, expected ${scope.length}`);
check('G2', registry.count < COMPONENTS.length, 'a scoped project must document fewer components than the library');
check(
  'G2',
  registry.components.every((component) => scope.includes(component.tag)),
  'the scoped registry contains a component outside the declared allowlist',
);
check(
  'G2',
  registry.tiers.reduce((n, tier) => n + tier.count, 0) === registry.count,
  'the taxonomy counts do not add up to the scoped component count',
);
check(
  'G2',
  registry.lifecycle.reduce((n, phase) => n + phase.count, 0) === registry.count,
  'the lifecycle counts do not add up to the scoped component count',
);
check('G2', registry.scope.unknown.length === 0, `unknown tags in the fixture scope: ${registry.scope.unknown.join(', ')}`);
check(
  'G2',
  registry.stats.totalProps < COMPONENTS.reduce((n, c) => n + c.props.length, 0),
  'the props total was inherited from the whole library rather than re-derived',
);

/* ------------------------------------------------------- G3 — artifacts */

/**
 * The artifacts must describe the FIXTURE and no other design system.
 *
 * "Contains the word altitude" is the wrong test — every site is served from
 * `altitude.pages.dev` and published by Southleft, and both of those are true
 * of the fixture too. What must not appear is another SYSTEM: its full name,
 * its route prefix, or one of its components that this one does not document.
 */
const otherIds = PROJECTS.map((p) => p.id);
const others = PROJECTS.filter((p) => p.id !== project.id);
const inScope = new Set(registry.components.map((component) => component.slug));
const outOfScope = COMPONENTS.filter((component) => !inScope.has(component.slug));

const artifacts = {
  'llms.txt': llmsTxt(context),
  'llms-tokens.txt': llmsTokens(context),
  'llms-components.txt': llmsComponents(context),
  'llms-a11y.txt': llmsA11y(context),
  'llms-full.txt': llmsFull(context),
  'status.json': JSON.stringify(statusJson(context)),
  'index.md': overviewMarkdown(context),
  'components.md': componentsIndexMarkdown(context),
  'foundations.md': foundationsMarkdown(context),
};

for (const [name, body] of Object.entries(artifacts)) {
  check('G3', body.length > 0, `${name} rendered empty`);
  check(
    'G3',
    body.includes(FIXTURE_ENTRY.name) || body.includes(FIXTURE_ENTRY.brand),
    `${name} never names the fixture`,
  );
  for (const other of others) {
    check('G3', !body.includes(other.name), `${name} names another design system: "${other.name}"`);
    // The default project's prefix is '' — its site IS the root, so "links into
    // it" is not something a URL can express and there is nothing to assert.
    if (other.routePrefix) {
      check(
        'G3',
        !body.includes(`${other.routePrefix}/`),
        `${name} links into another design system's site ("${other.routePrefix}/")`,
      );
    }
  }
  // A component the fixture does not document must not be listed in its map.
  // (`components.md` and `llms.txt` link by slug; status.json keys by tag.)
  const strays = outOfScope.filter((component) => body.includes(`/components/${component.slug})`));
  check('G3', strays.length === 0, `${name} lists components outside the fixture's scope: ${strays.map((c) => c.tag).join(', ')}`);
}

/* --------------------------------------- G4 — no project id in the source */

/**
 * Where the site's BEHAVIOUR is decided. `src/brand-marks/` is excluded because
 * its files are ASSETS named for their brand — that is the extension point, not
 * a branch — and `src/content/` because it is authored prose, where naming a
 * design system is the point.
 */
const SOURCE_DIRS = ['src/lib', 'src/pages', 'src/components', 'src/layouts', 'src/styles'];
const EXCLUDED_DIRS = new Set(['brand-marks', 'content']);
const CODE_EXTENSIONS = new Set(['.astro', '.mjs', '.js', '.ts', '.tsx', '.css']);

const sourceFiles = [];
const collect = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) collect(path.join(dir, entry.name));
    } else if (CODE_EXTENSIONS.has(path.extname(entry.name))) {
      sourceFiles.push(path.join(dir, entry.name));
    }
  }
};
for (const dir of SOURCE_DIRS) collect(path.join(APP_ROOT, dir));

/**
 * Comments come out FIRST — the same reason `scripts/check-sl-scope.mjs` strips
 * them before grepping for tags. This app's source explains at length WHY it is
 * multi-project, and those explanations name the two real systems; reading an
 * explanation as a branch is exactly the false positive that would make this
 * gate unusable and get it deleted.
 */
const stripComments = (source) =>
  source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const hits = [];
for (const file of sourceFiles) {
  const code = stripComments(fs.readFileSync(file, 'utf8'));
  for (const id of otherIds) {
    // A BARE word, not a fragment of a path. `.altitude/` is this repo's
    // config directory, `libs/altitude-mcp` is a package, `altitude.pages.dev`
    // is the one host every project deploys to, and `@southleft/...` is the
    // publisher's npm scope. None of them is a design-system branch, and all
    // of them collide with a project id by accident of naming. Excluding an id
    // glued to `.` `/` `@` `-` or a word character on either side leaves
    // exactly the shape that WOULD be a branch: a bare literal, as in
    // `=== 'southleft'`.
    const re = new RegExp(`(?<![\\w./@-])${id}(?![\\w./-])`, 'gi');
    let match;
    while ((match = re.exec(code))) {
      const line = code.slice(0, match.index).split('\n').length;
      hits.push(`${path.relative(APP_ROOT, file)}:${line} names "${match[0]}"`);
    }
  }
}
check(
  'G4',
  hits.length === 0,
  `a design-system id is typed in the app's source, so at least one brand is a special case:\n      ${hits.join('\n      ')}`,
);

/* ---------------------------------------------------------- the verdict */

console.log('Altitude docs — third-project generalisation');
console.log(`  live projects     : ${otherIds.join(', ')}`);
console.log(`  fixture           : ${project.id} (brand ${project.brand}, ${registry.count} components at ${project.routePrefix}/)`);
console.log(`  taxonomy          : ${registry.tiers.map((t) => `${t.label}=${t.count}`).join(' ')}`);
console.log(`  artifacts         : ${Object.keys(artifacts).join(', ')}`);
console.log(`  source files kept honest : ${sourceFiles.length} (${hits.length} project id(s) found)`);

if (failures.length) {
  console.error('\nFAIL');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`
OK — a third design system is a registry entry. What it costs:

  1. one object under "projects" in .altitude/ds-projects.json
     (id, name, brand, figma.*, paths.*, library.*, storybook.*, prompts.*)
  2. optionally, a brand token set — libs/al-web-components/tokens/tier-3/;
     without one the brand renders on the base bundle, which is what this
     fixture just did.
  3. optionally, src/brand-marks/<brand>.svg and <brand>.mark.svg;
     without them the sidebar renders the project's name as a wordmark.

  No file in apps/docs/src changes. The routes, the sidebar, the scoped
  component list, the Markdown twins, llms.txt and status.json are all derived
  from that one object.
`);
