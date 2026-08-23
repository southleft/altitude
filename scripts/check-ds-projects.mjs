#!/usr/bin/env node
/**
 * check-ds-projects.mjs — validate `.altitude/ds-projects.json`.
 *
 * The registry is now load-bearing: it decides which Figma file each design
 * system is checked against, where its parity manifest lives, and what the
 * copy-paste AI prompts tell an agent to do. A typo here does not crash — it
 * silently points a whole design system at the wrong file. This gate turns that
 * class of mistake into a failed check.
 *
 * Asserts:
 *   R1  the registry parses and `default` names a real project
 *   R2  every project's `id` matches the key it is stored under
 *   R3  Figma file keys are unique across projects (two design systems sharing
 *       one file would make parity mutually contradictory)
 *   R4  no project lists its OWN file key as a decoy
 *   R5  parity manifest paths are unique, and each is inside its figmaSyncDir
 *   R6  Storybook ports (and mcpPorts) are unique across projects
 *   R7  `library.root` and `storybook.configDir` exist on disk
 *   R8  `paths.instanceMap`, when set, exists on disk
 *   R9  every `brand` has a tier-2 brand token set
 *   R10 an existing manifest's `project` field matches the project claiming it
 *
 * Usage: node scripts/check-ds-projects.mjs   (pnpm run check:ds-projects)
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

import { REPO_ROOT } from '../libs/altitude-mcp/src/lib/paths.mjs';
import { listProjectIds, resolveProject, loadRegistry } from '../libs/altitude-mcp/src/lib/ds-project.mjs';

const failures = [];
const fail = (rule, msg) => failures.push(`${rule}: ${msg}`);

let registry;
try {
  registry = loadRegistry();
} catch (err) {
  console.error(`R1: ${err.message}`);
  process.exit(1);
}

// R0 — the registry validates against its OWN schema.
//
// The schema existed and NOTHING CHECKED IT. That was found the hard way on
// 2026-08-23: retiring Southleft's Storybook added a `docs` block and moved
// `excludeTitlePrefixes` into `library`, both of which `definitions/project`
// rejected via `additionalProperties: false` — and every other rule here still
// passed, so the registry would have shipped violating its own contract. A
// schema nothing validates is a comment.
{
  const schemaPath = join(REPO_ROOT, '.altitude', 'ds-projects.schema.json');
  if (existsSync(schemaPath)) {
    try {
      const { default: Ajv } = await import('ajv');
      const validate = new Ajv({ strict: false }).compile(
        JSON.parse(readFileSync(schemaPath, 'utf8')),
      );
      if (!validate(registry)) {
        for (const e of validate.errors ?? []) {
          fail('R0', `${e.instancePath || '/'} ${e.message}${e.params?.additionalProperty ? ` ("${e.params.additionalProperty}")` : ''}`);
        }
      }
    } catch (err) {
      fail('R0', `could not validate against the schema: ${err.message}`);
    }
  } else {
    fail('R0', `schema not found at ${schemaPath}`);
  }
}

const ids = listProjectIds();
const projects = ids.map((id) => resolveProject(id));

// R2 — id matches its key
for (const id of ids) {
  if (registry.projects[id].id !== id) {
    fail('R2', `project stored under key "${id}" has id "${registry.projects[id].id}"`);
  }
}

// R3 — unique Figma file keys
const byFileKey = new Map();
for (const p of projects) {
  const seen = byFileKey.get(p.figma.fileKey);
  if (seen) fail('R3', `projects "${seen}" and "${p.id}" both target Figma file ${p.figma.fileKey}`);
  byFileKey.set(p.figma.fileKey, p.id);
}

// R4 — a project must not list its own file as a decoy
for (const p of projects) {
  for (const d of p.figma.decoys ?? []) {
    if (d.fileKey === p.figma.fileKey) {
      fail('R4', `project "${p.id}" lists its own file key ${d.fileKey} as a decoy — refresh would always refuse`);
    }
  }
}

// R5 — unique manifests, each inside its own figmaSyncDir
const byManifest = new Map();
for (const p of projects) {
  const seen = byManifest.get(p.resolved.parityManifest);
  if (seen) fail('R5', `projects "${seen}" and "${p.id}" share parity manifest ${p.paths.parityManifest}`);
  byManifest.set(p.resolved.parityManifest, p.id);

  const dir = resolve(dirname(p.resolved.parityManifest));
  const syncDir = resolve(p.resolved.figmaSyncDir);
  if (dir !== syncDir) {
    fail('R5', `project "${p.id}" manifest (${p.paths.parityManifest}) is not directly inside figmaSyncDir (${p.paths.figmaSyncDir})`);
  }
}

// R6 — unique ports
for (const field of ['port', 'mcpPort']) {
  const byPort = new Map();
  for (const p of projects) {
    const v = p.storybook?.[field];
    if (v == null) continue;
    const seen = byPort.get(v);
    if (seen) fail('R6', `projects "${seen}" and "${p.id}" both use storybook.${field} ${v}`);
    byPort.set(v, p.id);
  }
}

// R7/R8 — declared paths exist
for (const p of projects) {
  if (!existsSync(p.resolved.libraryRoot)) fail('R7', `project "${p.id}" library.root does not exist: ${p.library.root}`);
  // `storybook` is OPTIONAL (Southleft's was retired on 2026-08-23 in favour of
  // the docs site), so only assert the directory when the project declares one.
  if (p.resolved.storybookConfigDir && !existsSync(p.resolved.storybookConfigDir)) {
    fail('R7', `project "${p.id}" storybook.configDir does not exist: ${p.storybook.configDir}`);
  }
  // R11 — every project must publish its docs SOMEWHERE. With Storybook now
  // optional, a project with neither is undocumented, which is the failure this
  // retirement could otherwise introduce silently.
  if (!p.resolved.docsProductionBase && !p.storybook?.productionBase) {
    fail('R11', `project "${p.id}" declares neither docs.productionBase nor storybook.productionBase`);
  }
  if (p.resolved.instanceMap && !existsSync(p.resolved.instanceMap)) {
    fail('R8', `project "${p.id}" paths.instanceMap does not exist: ${p.paths.instanceMap}`);
  }
}

// R9 — brand has a tier-2 brand token set
for (const p of projects) {
  const brandDir = join(p.resolved.libraryRoot, 'styles', 'tokens-dtcg', 'tier-2', 'brand', p.brand);
  if (!existsSync(brandDir)) {
    fail('R9', `project "${p.id}" brand "${p.brand}" has no token set at styles/tokens-dtcg/tier-2/brand/${p.brand}`);
  }
}

// R10 — an existing manifest must not belong to a different project
for (const p of projects) {
  if (!existsSync(p.resolved.parityManifest)) continue;
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(p.resolved.parityManifest, 'utf8'));
  } catch (err) {
    fail('R10', `project "${p.id}" manifest is not valid JSON: ${err.message}`);
    continue;
  }
  if (manifest.project && manifest.project !== p.id) {
    fail('R10', `project "${p.id}" manifest claims project "${manifest.project}"`);
  }
  if (manifest.figmaFileId && manifest.figmaFileId !== p.figma.fileKey) {
    fail('R10', `project "${p.id}" manifest figmaFileId ${manifest.figmaFileId} != configured ${p.figma.fileKey}`);
  }
}

if (failures.length) {
  console.error(`ds-projects registry: ${failures.length} problem(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error(`\nRegistry: ${join(REPO_ROOT, '.altitude', 'ds-projects.json')}`);
  process.exit(1);
}

console.log(`ds-projects registry OK — ${projects.length} project(s): ${ids.join(', ')} (default: ${registry.default}).`);
