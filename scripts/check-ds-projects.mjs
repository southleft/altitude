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
    const v = p.storybook[field];
    if (v == null) continue;
    const seen = byPort.get(v);
    if (seen) fail('R6', `projects "${seen}" and "${p.id}" both use storybook.${field} ${v}`);
    byPort.set(v, p.id);
  }
}

// R7/R8 — declared paths exist
for (const p of projects) {
  if (!existsSync(p.resolved.libraryRoot)) fail('R7', `project "${p.id}" library.root does not exist: ${p.library.root}`);
  if (!existsSync(p.resolved.storybookConfigDir)) {
    fail('R7', `project "${p.id}" storybook.configDir does not exist: ${p.storybook.configDir}`);
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
