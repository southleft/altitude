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

const project = resolveProject();
const projectFlag = project.isDefault ? '' : ` --project ${project.id}`;
const JSON_OUT = hasFlag('--json');

const dir = join(project.resolved.figmaSyncDir, 'canvas-contracts');
if (!existsSync(dir)) {
  console.error(`[figma-conventions] No canvas contracts for "${project.id}" at ${dir}.`);
  console.error(`Extract them first: pnpm run contracts:canvas${projectFlag}`);
  process.exit(1);
}

const files = readdirSync(dir).filter((f) => f.endsWith('.canvas.json')).sort();
if (files.length === 0) {
  console.error(`[figma-conventions] ${dir} contains no .canvas.json files — nothing was checked.`);
  console.error(`Extract them first: pnpm run contracts:canvas${projectFlag}`);
  process.exit(1);
}

const manifest = readManifest(project);
const violations = [];
let oldest = null;

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
}

const skipped = skippedDimensions();

if (JSON_OUT) {
  console.log(JSON.stringify({ project: project.id, checked: files.length, violations, skipped }, null, 2));
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
  console.log(`\n[${project.id}] ${files.length} canvas contract(s) checked | ${violations.length} violation(s)`);
  console.log(`  oldest extraction read: ${oldest ? oldest.toISOString() : 'unknown'} — re-run \`pnpm run contracts:canvas${projectFlag}\` if that is stale.`);
  for (const s of skipped) console.log(`  not covered — ${s.dimension}: ${s.reason}`);
}

process.exit(violations.length ? 1 : 0);
