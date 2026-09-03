#!/usr/bin/env node
/**
 * check-figma-conventions.mjs — do the built Figma sets follow the library
 * conventions an agent is told to apply by hand?
 *
 *   node scripts/check-figma-conventions.mjs [--project <id>] [--json]
 *
 * T3, spec 2026-08-29-parity-judgement-gates-and-evals.
 *
 * Runs OFFLINE over the canvas contracts under
 * `<figmaSyncDir>/canvas-contracts/*.canvas.json` — no Figma connection, no
 * shim. Refresh them first with `pnpm run contracts:canvas` if they are stale;
 * this reports the extraction date it read so a stale run cannot masquerade as
 * a fresh pass.
 *
 * Exit 1 on any violation. A project with no extracted canvas contracts exits
 * 1 as well, with a distinct message: "nothing to check" and "everything is
 * fine" must never share an exit code, which is the failure mode
 * `check-parity.mjs` shipped with until T1.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { hasFlag } from './lib/argv.mjs';
import { lintCanvasContract, skippedDimensions } from './lib/figma-conventions.mjs';
import { resolveProject } from '../libs/altitude-mcp/src/lib/ds-project.mjs';
import { readManifest } from '../libs/altitude-mcp/src/lib/parity.mjs';
import { projectionToCanvasContract } from '../libs/altitude-mcp/src/lib/contract-diff.mjs';

const project = resolveProject();
const projectFlag = project.isDefault ? '' : ` --project ${project.id}`;
const JSON_OUT = hasFlag('--json');

const dir = join(project.resolved.figmaSyncDir, 'canvas-contracts');
const files = existsSync(dir)
  ? readdirSync(dir).filter((f) => f.endsWith('.canvas.json')).sort()
  : [];

/**
 * THE PROJECTION FALLBACK, which is what lets this gate run in CI at all.
 *
 * The canvas dumps are gitignored, so on a CI runner `canvas-contracts/` does
 * not exist and this gate exited 1 saying "extract them first" — advice nobody
 * on a runner can take. That is why `package.json` recorded it as local-only
 * and its own comment said gating it needed a tracked artifact first.
 *
 * `.altitude/figma-sync/canvas-projection.json` IS that artifact: the same
 * axes, properties, states, text styles and bound-variable names with every
 * node id, file key and number scrubbed. It carries every field these rules
 * read. Live dumps still win when they exist, and the source is always printed
 * — a projected lint is a point-in-time read of a file nobody opened during
 * this run, and must not be reported as though it were live.
 */
const projectionPath = join(project.resolved.figmaSyncDir, 'canvas-projection.json');
let projection = null;
if (files.length === 0 && existsSync(projectionPath)) {
  try {
    projection = JSON.parse(readFileSync(projectionPath, 'utf8'));
  } catch (e) {
    console.error(`[figma-conventions] ${projectionPath} is not valid JSON: ${e.message}`);
    process.exit(1);
  }
}

const projectedTags = projection?.components ? Object.keys(projection.components).sort() : [];
const source = files.length > 0 ? 'live-dump' : projectedTags.length > 0 ? 'projection' : 'none';

if (source === 'none') {
  console.error(`[figma-conventions] Nothing to check for "${project.id}".`);
  console.error(`No canvas contracts at ${dir}, and no tracked projection at ${projectionPath}.`);
  console.error(`Extract them first: pnpm run contracts:canvas${projectFlag}`);
  console.error(`Then track the projection: pnpm run parity:projection${projectFlag}`);
  process.exit(1);
}

const manifest = readManifest(project);
const violations = [];
let oldest = null;
// Files FOUND is not files LINTED: the pilot skip below drops throwaway
// extractions, and reporting the larger number overstates what was checked.
let linted = 0;

for (const file of files) {
  const path = join(dir, file);
  // `.pilot.canvas.json` and friends are throwaway extraction experiments, not
  // the tracked view of a component. Linting them would report the same
  // component twice under two names.
  if (file.split('.').length > 3) continue;
  let canvas;
  try {
    canvas = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    violations.push({ tag: file, rule: 'unreadable', subject: file, detail: `could not be parsed: ${e.message}` });
    continue;
  }
  const mtime = statSync(path).mtime;
  if (!oldest || mtime < oldest) oldest = mtime;
  violations.push(...lintCanvasContract(canvas, manifest?.components?.[canvas.component] ?? null));
  linted += 1;
}

// The projected half. Materialised through contract-diff's own
// projectionToCanvasContract() so there is ONE materializer in the repo rather
// than a second one here that could drift from it.
for (const tag of projectedTags) {
  const canvas = projectionToCanvasContract(projection.components[tag]);
  if (!canvas) {
    violations.push({ tag, rule: 'unreadable', subject: tag, detail: 'projection entry could not be materialised' });
    continue;
  }
  violations.push(...lintCanvasContract({ ...canvas, component: tag }, manifest?.components?.[tag] ?? null));
}

const checked = source === 'live-dump' ? linted : projectedTags.length;
const skipped = skippedDimensions();

if (JSON_OUT) {
  console.log(JSON.stringify({ project: project.id, source, checked, violations, skipped }, null, 2));
} else {
  const byTag = new Map();
  for (const v of violations) {
    if (!byTag.has(v.tag)) byTag.set(v.tag, []);
    byTag.get(v.tag).push(v);
  }
  for (const [tag, list] of byTag) {
    console.log(`\n${tag}`);
    for (const v of list) console.log(`  ${v.rule.padEnd(18)} ${v.detail}`);
  }
  console.log(
    `\n[${project.id}] ${checked} canvas contract(s) checked from ` +
      `${source === 'live-dump' ? 'LIVE dumps' : 'the TRACKED projection'} | ${violations.length} violation(s)`,
  );
  if (source === 'live-dump') {
    console.log(`  oldest extraction read: ${oldest ? oldest.toISOString() : 'unknown'} — re-run \`pnpm run contracts:canvas${projectFlag}\` if that is stale.`);
  } else {
    console.log(`  projected ${projection.generatedAt ?? 'unknown'} from dumps last extracted ${projection.source?.newestMtime ?? 'unknown'}.`);
    console.log('  This is the tracked projection, not a live read — regenerate it after any contracts:canvas run.');
  }
  for (const s of skipped) console.log(`  not covered — ${s.dimension}: ${s.reason}`);
}

process.exit(violations.length ? 1 : 0);
