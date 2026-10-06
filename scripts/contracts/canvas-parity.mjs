#!/usr/bin/env node
/**
 * canvas-parity.mjs — CODE <-> CANVAS parity against a canvas Altitude code GENERATES.
 *
 * contracts:diff compares code contracts with Figma dumps, which are gitignored laptop
 * observations, so it can never gate. This gate builds the canvas itself: OpenPencil
 * (apps/open-pencil, Bun) turns the code contracts, the CEM and the DTCG tokens into a
 * component library headlessly, emits one canvas contract per component set
 * (canvas-contract.schema.json, OpenPencil identifiers in the `figma` fields), and this
 * script runs the unchanged diffContracts() against each code contract.
 *
 * Per component it reports API parity (props, variant axes and values, slots, states),
 * token parity (contract bindings bound to the same variable on the canvas) and the
 * disagreements list. Exit 1 when the aggregate is below a floor.
 *
 * Usage:
 *   pnpm run canvas:parity
 *   node scripts/contracts/canvas-parity.mjs [--project altitude] [--only al-button,al-chip]
 *     [--floor-api 95] [--floor-token 90] [--from <dir>] [--json] [--verbose]
 *
 *   --from <dir>  score canvas contracts already on disk instead of building them
 *                 (the build writes them to .altitude/canvas-parity/<project>/canvas-contracts/)
 *
 * Writes .altitude/canvas-parity/<project>/receipt.json (gitignored), which
 * `component-check --evidence` reads for its canvas-parity claim.
 *
 * Needs Bun and an installed, built OpenPencil checkout:
 *   cd apps/open-pencil && bun install && bun run build:packages
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_FLOORS, scoreComponent, summarize } from '../lib/canvas-parity.mjs';
import { argOf, hasFlag } from '../lib/argv.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const OPEN_PENCIL = process.env.OPEN_PENCIL_DIR ?? join(REPO_ROOT, 'apps', 'open-pencil');

const PROJECT = argOf('--project') ?? 'altitude';
const ONLY = argOf('--only');
const FROM = argOf('--from');
const JSON_OUT = hasFlag('--json');
const VERBOSE = hasFlag('--verbose');
const floors = {
  api: Number(argOf('--floor-api') ?? DEFAULT_FLOORS.api),
  token: Number(argOf('--floor-token') ?? DEFAULT_FLOORS.token),
};

const OUT_ROOT = join(REPO_ROOT, '.altitude', 'canvas-parity', PROJECT);
const CANVAS_DIR = FROM ?? join(OUT_ROOT, 'canvas-contracts');
const CONTRACTS_DIR = join(REPO_ROOT, '.altitude', 'contracts', PROJECT);

function fail(message, code = 2) {
  console.error(`canvas-parity: ${message}`);
  process.exit(code);
}

function buildCanvas() {
  if (!existsSync(join(OPEN_PENCIL, 'node_modules'))) {
    fail(`${OPEN_PENCIL} is not installed — run: cd apps/open-pencil && bun install && bun run build:packages`);
  }
  rmSync(CANVAS_DIR, { recursive: true, force: true });
  mkdirSync(CANVAS_DIR, { recursive: true });
  const args = ['run', 'open-pencil', 'altitude', 'canvas-contracts', REPO_ROOT, '--out', CANVAS_DIR, '--id', PROJECT, '--json'];
  if (ONLY) args.push('--only', ONLY);
  const run = spawnSync('bun', args, { cwd: OPEN_PENCIL, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: process.platform === 'win32' });
  if (run.error) fail(`could not run bun (${run.error.message}) — install Bun 1.4+ and make sure it is on PATH`);
  if (run.status !== 0) fail(`OpenPencil library build failed:\n${run.stderr || run.stdout}`);
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

if (!FROM) buildCanvas();
if (!existsSync(CANVAS_DIR)) fail(`no canvas contracts at ${CANVAS_DIR}`);

const report = existsSync(join(CANVAS_DIR, 'build-report.json')) ? loadJson(join(CANVAS_DIR, 'build-report.json')) : null;
const wanted = ONLY ? new Set(ONLY.split(',').map((tag) => tag.trim())) : null;
const rows = [];
for (const file of readdirSync(CANVAS_DIR).filter((f) => f.endsWith('.canvas.json')).sort()) {
  const canvasContract = loadJson(join(CANVAS_DIR, file));
  if (wanted && !wanted.has(canvasContract.component)) continue;
  const codePath = join(CONTRACTS_DIR, `${canvasContract.component}.contract.json`);
  if (!existsSync(codePath)) continue;
  rows.push(scoreComponent({ codeContract: loadJson(codePath), canvasContract }));
}
if (!rows.length) fail('no components to compare');
const summary = summarize(rows, floors);

const checkedAt = new Date().toISOString();
mkdirSync(OUT_ROOT, { recursive: true });
writeFileSync(
  join(OUT_ROOT, 'receipt.json'),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      project: PROJECT,
      checkedAt,
      canvas: 'open-pencil',
      floors,
      api: summary.api,
      token: summary.token,
      components: Object.fromEntries(
        rows.map((row) => [
          row.tag,
          {
            ok: row.disagreements.length === 0,
            api: row.api,
            token: row.token,
            disagreements: row.disagreements.map((d) => ({ dimension: d.dimension, kind: d.kind, key: d.key })),
          },
        ]),
      ),
      skipped: report?.skipped ?? [],
    },
    null,
    2,
  )}\n`,
);

if (JSON_OUT) {
  console.log(JSON.stringify({ summary, components: rows, skipped: report?.skipped ?? [] }, null, 2));
} else {
  console.log(`canvas-parity — ${PROJECT}: ${rows.length} component set(s) generated by OpenPencil from code\n`);
  console.log(`  ${'component'.padEnd(24)} ${'API'.padEnd(14)} ${'token'.padEnd(14)} disagreements`);
  for (const row of rows) {
    const cell = (t) => `${t.matched}/${t.total}`.padEnd(7) + `${Math.round(t.percent)}%`.padStart(5);
    console.log(`  ${row.tag.padEnd(24)} ${cell(row.api).padEnd(14)} ${cell(row.token).padEnd(14)} ${row.disagreements.length}`);
    if (VERBOSE) for (const d of row.disagreements) console.log(`      ${d.dimension} ${d.kind}: ${d.key}`);
  }
  if (report?.skipped?.length) {
    console.log(`\n  skipped (${report.skipped.length}, not built): ${report.skipped.map((s) => s.tag).join(', ')}`);
    console.log(`    ${report.skipped[0].reason}`);
  }
  console.log(`\n  API parity    ${summary.api.matched}/${summary.api.total}  ${summary.api.percent}%  (floor ${floors.api}%)`);
  console.log(`  token parity  ${summary.token.matched}/${summary.token.total}  ${summary.token.percent}%  (floor ${floors.token}%)`);
  if (summary.kinds.length) {
    console.log(`  disagreements ${summary.kinds.map((k) => `${k.kind} ${k.count}`).join(', ')}`);
  }
  console.log(`\n  receipt: ${join('.altitude', 'canvas-parity', PROJECT, 'receipt.json')}`);
}
if (!summary.ok) {
  for (const failure of summary.failures) console.error(`canvas-parity: ${failure}`);
  process.exit(1);
}
