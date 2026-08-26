#!/usr/bin/env node
/**
 * diff-contracts.mjs — CLI over contract-diff.mjs's `diffContracts()`: the
 * property-level CODE <-> CANVAS contract differ (T6, spec
 * 2026-08-25-contract-backed-figma-parity-and-generation). This is the cheap
 * reconciliation-loop path — point it at one tag and see exactly which
 * props/variant values/states/token bindings disagree, without regenerating
 * a full parity report.
 *
 * Usage:
 *   node scripts/contracts/diff-contracts.mjs --component al-button
 *   node scripts/contracts/diff-contracts.mjs --project southleft --component al-button
 *   node scripts/contracts/diff-contracts.mjs --all [--project <id>]
 *   node scripts/contracts/diff-contracts.mjs --component al-button --json
 *   node scripts/contracts/diff-contracts.mjs --component al-button --canvas-file .altitude/figma-sync/canvas-contracts/al-button.pilot.canvas.json  # T12: diff against a candidate dump (e.g. a generate-figma.mjs pilot), not the tracked mapping
 *   node scripts/contracts/diff-contracts.mjs --self-test   # offline, fixtures only — see __fixtures__/
 *
 * Reads:
 *   - the CODE contract:   .altitude/contracts/<project>/<tag>.contract.json
 *     (run `pnpm run contracts:emit` first if missing)
 *   - the CANVAS contract: <project's figma-sync dir>/canvas-contracts/<tag>.canvas.json
 *     (run `pnpm run contracts:canvas` first — a canvas dump is an
 *     OBSERVATION, gitignored, and commonly absent on a fresh clone; a
 *     missing dump is NOT an error here — one clean line, exit 0)
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveProject } from '../../libs/altitude-mcp/src/lib/ds-project.mjs';
import { diffContracts } from '../../libs/altitude-mcp/src/lib/contract-diff.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const CONTRACTS_DIR = join(REPO_ROOT, '.altitude', 'contracts');
const FIXTURES_DIR = join(HERE, '__fixtures__');

// ── argv ────────────────────────────────────────────────────────────────

function argOf(flag) {
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1) || null;
  const i = process.argv.indexOf(flag);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('-') ? process.argv[i + 1] : null;
}

const COMPONENT = argOf('--component');
const ALL = process.argv.includes('--all');
const JSON_OUT = process.argv.includes('--json');
const SELF_TEST = process.argv.includes('--self-test');
// T12: diff the CODE contract against an arbitrary canvas dump instead of the
// tracked `<tag>.canvas.json` — the reconciliation-loop path for a candidate
// set (e.g. extract-canvas.mjs --node-id's `<tag>.pilot.canvas.json`) that is
// not the tag's tracked Figma mapping and must never be confused with it.
const CANVAS_FILE = argOf('--canvas-file');

// ── io ──────────────────────────────────────────────────────────────────

function loadJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function diffOne(project, tag, canvasFileOverride = null) {
  const codeContract = loadJson(join(CONTRACTS_DIR, project.id, `${tag}.contract.json`));
  const canvasPath = canvasFileOverride
    ? join(REPO_ROOT, canvasFileOverride)
    : join(project.resolved.figmaSyncDir, 'canvas-contracts', `${tag}.canvas.json`);
  const canvasContract = loadJson(canvasPath);
  return { tag, codeContract, canvasContract, diff: diffContracts({ codeContract, canvasContract }) };
}

function printResult({ tag, codeContract, canvasContract, diff }) {
  if (!codeContract) {
    console.log(`[diff] ${tag}: no code contract at .altitude/contracts/<project>/${tag}.contract.json — run contracts:emit.`);
    return;
  }
  if (!canvasContract) {
    console.log(`[diff] ${tag}: no canvas dump; run contracts:canvas.`);
    return;
  }
  if (!diff.disagreements.length) {
    console.log(`[diff] ${tag}: OK — compared ${JSON.stringify(diff.compared)}, ${diff.skipped.length} skipped fact(s).`);
    return;
  }
  console.log(`[diff] ${tag}: ${diff.disagreements.length} disagreement(s) — compared ${JSON.stringify(diff.compared)}`);
  for (const d of diff.disagreements) {
    console.log(`    [${d.dimension}] ${d.key} (${d.kind}) — ${d.detail}`);
  }
  if (diff.skipped.length) {
    console.log(`  skipped (${diff.skipped.length}):`);
    for (const s of diff.skipped) console.log(`    - ${s.dimension ?? 'general'}: ${s.reason}`);
  }
}

// ── self-test — the acceptance test for contract-diff.mjs ────────────────

function runSelfTest() {
  const codeContract = loadJson(join(FIXTURES_DIR, 'diff-code-sample.contract.json'));
  const canvasContract = loadJson(join(FIXTURES_DIR, 'diff-canvas-sample.canvas.json'));
  if (!codeContract || !canvasContract) {
    console.error('[self-test] FAIL — fixture(s) missing from scripts/contracts/__fixtures__/.');
    process.exit(1);
  }

  const { disagreements, skipped } = diffContracts({ codeContract, canvasContract });
  const find = (dimension, kind) => disagreements.filter((d) => d.dimension === dimension && d.kind === kind);

  const checks = [
    [
      'exactly one missing prop (dimension:prop, kind:missing-in-canvas, key:fullWidth)',
      find('prop', 'missing-in-canvas').length === 1 && find('prop', 'missing-in-canvas')[0].key === 'fullWidth',
    ],
    [
      'exactly one variant-value mismatch (dimension:variant-value, kind:value-mismatch, key:variant)',
      find('variant-value', 'value-mismatch').length === 1 && find('variant-value', 'value-mismatch')[0].key === 'variant',
    ],
    [
      'exactly one token-binding mismatch (dimension:token-binding, kind:missing-in-canvas)',
      find('token-binding', 'missing-in-canvas').length === 1,
    ],
    [
      'the degraded "state" fact was SKIPPED, not flagged (zero state disagreements, one state skip)',
      disagreements.filter((d) => d.dimension === 'state').length === 0 && skipped.some((s) => s.dimension === 'state'),
    ],
    [
      'T17 (a) name-normalized pair that AGREES (isChecked <-> canvas "Checked") produces NO disagreement',
      !disagreements.some((d) => d.key === 'isChecked' || d.key === 'Checked'),
    ],
    [
      'T17 (b) name-normalized pair with a type mismatch (isSelected <-> canvas "Selected") produces exactly ONE disagreement',
      find('variant-axis', 'value-mismatch').length === 1 && find('variant-axis', 'value-mismatch')[0].key === 'isSelected',
    ],
    [
      'T17/T23 (c) paired slot convention (code slot "before" <-> canvas "Slot Before", fixture type VARIANT — T23\'s fan-out shape, proving pairing is type-agnostic) produces NO disagreement',
      !disagreements.some((d) => d.dimension === 'slot' && d.key === 'slot:before'),
    ],
    [
      'T17 (d) unpaired canvas slot property ("Slot After", still BOOLEAN — the pre-T23 property style, no code "after" slot) produces exactly ONE slot-unpaired disagreement',
      find('slot', 'slot-unpaired').length === 1 && find('slot', 'slot-unpaired')[0].key === 'Slot After',
    ],
    ['no other disagreements were fabricated (exactly 5 total)', disagreements.length === 5],
  ];

  let ok = true;
  for (const [label, pass] of checks) {
    console.log(`[self-test] ${pass ? 'PASS' : 'FAIL'} — ${label}`);
    if (!pass) ok = false;
  }
  if (!ok) {
    console.error('\n[self-test] disagreements found:', JSON.stringify(disagreements, null, 2));
    console.error('[self-test] skipped:', JSON.stringify(skipped, null, 2));
  }
  process.exit(ok ? 0 : 1);
}

// ── main ────────────────────────────────────────────────────────────────

function main() {
  if (SELF_TEST) return runSelfTest();

  const project = resolveProject();

  if (ALL) {
    const dir = join(CONTRACTS_DIR, project.id);
    if (!existsSync(dir)) {
      console.error(`[diff] no contracts emitted for "${project.id}" — run contracts:emit first.`);
      process.exit(2);
    }
    const tags = readdirSync(dir)
      .filter((f) => f.endsWith('.contract.json'))
      .map((f) => f.replace(/\.contract\.json$/, ''))
      .sort();
    const results = tags.map((tag) => diffOne(project, tag));

    if (JSON_OUT) {
      console.log(
        JSON.stringify(
          results.map(({ tag, diff, codeContract, canvasContract }) => ({
            tag,
            hasCodeContract: Boolean(codeContract),
            hasCanvasContract: Boolean(canvasContract),
            ...diff,
          })),
          null,
          2,
        ),
      );
      return;
    }

    for (const r of results) printResult(r);
    const totalDisagreements = results.reduce((n, r) => n + (r.diff?.disagreements.length ?? 0), 0);
    const withCanvas = results.filter((r) => r.canvasContract).length;
    console.log(
      `[diff] ${project.id}: ${results.length} tag(s), ${withCanvas} with a canvas dump, ${totalDisagreements} disagreement(s) total.`,
    );
    return;
  }

  if (!COMPONENT) {
    console.error('[diff] pass --component <tag> or --all.');
    process.exit(2);
  }

  const result = diffOne(project, COMPONENT, CANVAS_FILE);
  if (JSON_OUT) {
    console.log(
      JSON.stringify(
        {
          tag: COMPONENT,
          hasCodeContract: Boolean(result.codeContract),
          hasCanvasContract: Boolean(result.canvasContract),
          ...result.diff,
        },
        null,
        2,
      ),
    );
    return;
  }
  printResult(result);
}

main();
