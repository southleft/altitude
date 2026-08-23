#!/usr/bin/env node
/**
 * mark-synced.mjs — stamp components as "code and Figma confirmed matching".
 *
 * Run AFTER a verified sync (check-parity.mjs passing, or a deliberate human
 * confirmation). It sets lastSync.codeHash to the CURRENT source hash and
 * lastSync.figmaDigest to the last observed Figma digest (or the ops digest as
 * the code-derived stand-in when Figma has not been read), which turns the
 * component green in the Storybook sidebar.
 *
 * MULTI-PROJECT: the target design system comes from `--project <id>` /
 * `DS_PROJECT` / the registry default in `.altitude/ds-projects.json`, which
 * selects the manifest and ops dir this stamps into.
 *
 * Usage:
 *   node scripts/figma-parity/mark-synced.mjs al-button al-badge
 *   node scripts/figma-parity/mark-synced.mjs --all                    # every mapped component
 *   node scripts/figma-parity/mark-synced.mjs --project southleft al-button
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getComponent } from '../../libs/altitude-mcp/src/lib/cem.mjs';
import { resolveProject } from '../../libs/altitude-mcp/src/lib/ds-project.mjs';
import {
  readManifest,
  writeManifest,
  hashComponentSource,
  digestOf,
} from '../../libs/altitude-mcp/src/lib/parity.mjs';

const project = resolveProject();
const projectFlag = project.isDefault ? '' : ` --project ${project.id}`;

// Positional tags only: drop `--all`, `--project` and the id that follows it.
const raw = process.argv.slice(2);
const args = [];
for (let i = 0; i < raw.length; i += 1) {
  const a = raw[i];
  if (a === '--all') continue;
  if (a === '--project') { i += 1; continue; }
  if (a.startsWith('--project=')) continue;
  args.push(a);
}
const all = raw.includes('--all');

const manifest = readManifest(project);
if (!manifest) {
  console.error(`No parity manifest for "${project.id}". Run: node scripts/figma-parity/seed-manifest.mjs${projectFlag}`);
  process.exit(1);
}

const tags = all ? Object.keys(manifest.components) : args;
if (tags.length === 0) {
  console.error('Usage: node scripts/figma-parity/mark-synced.mjs [--project <id>] <tag...> | --all');
  process.exit(1);
}

function opsDigestFor(tag) {
  const p = join(project.resolved.opsDir, `${tag}.json`);
  if (!existsSync(p)) return null;
  return digestOf(JSON.parse(readFileSync(p, 'utf8')));
}

const now = new Date().toISOString();
let stamped = 0;
for (const tag of tags) {
  const entry = manifest.components[tag];
  if (!entry) {
    console.warn(`skip ${tag}: not in manifest (run seed-manifest.mjs)`);
    continue;
  }
  if (!entry.figma) {
    console.warn(`skip ${tag}: no Figma mapping in "${project.figma.fileName}" — map it first (instance-map.mjs / seed-manifest.mjs)`);
    continue;
  }
  const component = getComponent(tag);
  if (!component) {
    console.warn(`skip ${tag}: not in the CEM`);
    continue;
  }
  entry.lastSync = {
    date: now,
    codeHash: hashComponentSource(component.modulePath, project),
    figmaDigest: entry.figmaCurrentDigest ?? entry.lastSync?.figmaDigest ?? opsDigestFor(tag),
  };
  stamped += 1;
}

writeManifest(manifest, project);
console.log(`[${project.id}] Stamped ${stamped}/${tags.length} component(s) as synced at ${now}.`);
