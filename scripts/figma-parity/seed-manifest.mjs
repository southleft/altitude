#!/usr/bin/env node
/**
 * seed-manifest.mjs — create/merge a design-system project's parity manifest.
 *
 * MULTI-PROJECT. The target project comes from `--project <id>` / `DS_PROJECT`
 * / the registry default in `.altitude/ds-projects.json`; its manifest path,
 * ops dir, instance map and exclusions all come from that record. There is no
 * hardcoded Altitude path left in this script.
 *
 * Seeds one entry per CEM component, joining three sources of truth:
 *   * the project's instance map (`paths.instanceMap`) — pinned Figma node ids
 *     (atoms) and by-name molecule mappings, plus MISSING_IN_FIGMA. Node ids are
 *     FILE-SCOPED, so a project with no map of its own (`instanceMap: null`)
 *     seeds every component unmapped rather than borrowing another file's ids.
 *   * `<opsDir>/index.json` — the intended Figma set name per component key (the
 *     ops pipeline is what built the Figma pages, so a key present here and NOT
 *     in MISSING_IN_FIGMA is assumed built in Figma).
 *   * the live component source — hashed as the lastSync code baseline.
 *
 * The seed stamps `lastSync` at run time, i.e. it asserts "code and Figma match
 * right now" for every mapped component. Run it right after a verified sync
 * (e.g. the 2026-08-21 atoms/molecules build). For anything else, seed then
 * immediately mark the known-drifted tags via the manifest or a refresh run.
 *
 * Usage:
 *   node scripts/figma-parity/seed-manifest.mjs                        # default project; create/merge NEW components
 *   node scripts/figma-parity/seed-manifest.mjs --force                # rebuild every entry (loses lastSync history)
 *   node scripts/figma-parity/seed-manifest.mjs --project southleft    # seed another design system
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { loadComponents } from '../../libs/altitude-mcp/src/lib/cem.mjs';
import { resolveProject } from '../../libs/altitude-mcp/src/lib/ds-project.mjs';
import { readManifest, writeManifest, hashComponentSource, digestOf } from '../../libs/altitude-mcp/src/lib/parity.mjs';

const force = process.argv.includes('--force');
const project = resolveProject();

/**
 * Pinned Figma mappings for THIS project's file, or empty when the project has
 * no instance map yet. Loaded dynamically because the path is config, not a
 * static import — and because a project may legitimately have none.
 */
let INSTANCE_MAP = {};
let MISSING_IN_FIGMA = new Set();
if (project.resolved.instanceMap) {
  if (!existsSync(project.resolved.instanceMap)) {
    console.error(
      `[${project.id}] instanceMap "${project.paths.instanceMap}" not found at ${project.resolved.instanceMap}.`,
    );
    process.exit(1);
  }
  const mod = await import(pathToFileURL(project.resolved.instanceMap).href);
  INSTANCE_MAP = mod.INSTANCE_MAP ?? {};
  MISSING_IN_FIGMA = mod.MISSING_IN_FIGMA ?? new Set();
}

/** Components that deliberately have NO Figma representation, per project config. */
const EXCLUDED = project.excluded ?? {};

// <opsDir>/index.json — intended Figma set name per key.
const opsIndexPath = join(project.resolved.opsDir, 'index.json');
const opsNames = new Map();
if (existsSync(opsIndexPath)) {
  const idx = JSON.parse(readFileSync(opsIndexPath, 'utf8'));
  for (const c of idx.components ?? []) opsNames.set(c.key, c.name);
}

function opsDigestFor(tag) {
  const p = join(project.resolved.opsDir, `${tag}.json`);
  if (!existsSync(p)) return null;
  return digestOf(JSON.parse(readFileSync(p, 'utf8')));
}

const existing = force ? null : readManifest(project);
const manifest = existing ?? {
  $comment:
    'Figma <-> code parity manifest. Seeded by scripts/figma-parity/seed-manifest.mjs; ' +
    'lastSync stamped by scripts/figma-parity/mark-synced.mjs; figmaCurrentDigest updated by ' +
    'scripts/figma-parity/refresh-figma-digests.mjs. Read by libs/altitude-mcp/src/lib/parity.mjs. ' +
    'Which design system this belongs to is recorded in `project` below and declared in .altitude/ds-projects.json.',
  project: project.id,
  figmaFileId: project.figma.fileKey,
  figmaFileName: project.figma.fileName,
  created: new Date().toISOString(),
  figmaLastRefreshed: null,
  components: {},
  // Figma component sets with no code component (populated by the refresh
  // script; the five Playground prototypes are prototypes, not library sets,
  // and are deliberately not listed).
  figmaOnly: [],
};

// An existing manifest predating multi-project has no `project` key — stamp it
// rather than silently seeding one project's data into another's file.
if (manifest.project && manifest.project !== project.id) {
  console.error(
    `Refusing to seed: ${project.resolved.parityManifest} belongs to project "${manifest.project}", not "${project.id}".`,
  );
  process.exit(1);
}
manifest.project = project.id;
manifest.figmaFileId = project.figma.fileKey;
manifest.figmaFileName = project.figma.fileName;

const now = new Date().toISOString();
let added = 0;
let skipped = 0;

// Scope: a project may declare `library.components` — the subset of the shared
// library that IS this design system (see .altitude/ds-projects.json). Seed only
// those, so the manifest is a build list rather than the whole 105-component
// catalog. No allowlist means the project is the whole library.
const allowlist = project.library.components?.length ? new Set(project.library.components) : null;
const inScope = allowlist ? loadComponents().filter((c) => allowlist.has(c.tag)) : loadComponents();

// Drop entries that fell OUT of scope since the last seed, so narrowing the
// allowlist actually shrinks the manifest instead of leaving orphans behind.
let pruned = 0;
if (allowlist) {
  for (const tag of Object.keys(manifest.components)) {
    if (!allowlist.has(tag)) {
      delete manifest.components[tag];
      pruned += 1;
    }
  }
}

for (const c of inScope) {
  if (manifest.components[c.tag] && !force) {
    skipped += 1;
    continue;
  }

  const codeHash = hashComponentSource(c.modulePath, project);
  const mapEntry = INSTANCE_MAP[c.tag] ?? null;
  const knownMissing = MISSING_IN_FIGMA.has(c.tag);
  const opsName = opsNames.get(c.tag) ?? null;

  let figma = null;
  if (!knownMissing) {
    if (mapEntry) figma = { name: mapEntry.figmaName, nodeId: mapEntry.id ?? null };
    else if (opsName) figma = { name: opsName, nodeId: null }; // built by the ops pipeline; molecules resolve by name
  }

  const entry = {
    figma,
    lastSync: figma ? { date: now, codeHash, figmaDigest: opsDigestFor(c.tag) } : null,
    figmaCurrentDigest: null,
  };
  if (EXCLUDED[c.tag]) {
    entry.excluded = true;
    entry.note = EXCLUDED[c.tag];
  } else if (knownMissing) {
    entry.note = 'Known missing in Figma (instance map MISSING_IN_FIGMA) — needs a bespoke build.';
  } else if (!figma) {
    entry.note = `Not yet built in "${project.figma.fileName}".`;
  }

  manifest.components[c.tag] = entry;
  added += 1;
}

writeManifest(manifest, project);
const mapped = Object.values(manifest.components).filter((e) => e.figma).length;
const total = Object.keys(manifest.components).length;
console.log(
  `[${project.id}] ${project.resolved.parityManifest}: ${total} components ` +
    `(${mapped} mapped to "${project.figma.fileName}", ${total - mapped} unmapped) — ` +
    `${added} written, ${skipped} kept${pruned ? `, ${pruned} pruned (out of scope)` : ''}.` +
    (allowlist ? ` Scoped to library.components (${allowlist.size} of ${loadComponents().length}).` : ''),
);
