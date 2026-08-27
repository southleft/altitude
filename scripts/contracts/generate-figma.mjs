#!/usr/bin/env node
/**
 * generate-figma.mjs — build a Figma component set FROM A CONTRACT (T12, spec
 * 2026-08-25-contract-backed-figma-parity-and-generation; modularized by spec
 * 2026-08-26-modularize-generate-figma-mjs-into-per-component-contract-driven-generator).
 *
 * THIS FILE IS THE THIN CLI/ORCHESTRATOR ONLY — argv, contract + per-component
 * config loading, the decoy guard, the shim transport, and the call sequence.
 * The generator itself lives in scripts/contracts/figma/:
 *
 *   conventions.mjs       LIBRARY-WIDE conventions (State axis order, canonical
 *                         boolean-axis order, theme collection, site background,
 *                         Phosphor resolution rules incl. the T29 WRONG-LIBRARY
 *                         INCIDENT record, DS Icon wrapper name, focus ring).
 *   component-config.mjs  PER-COMPONENT generation judgment calls, loaded from
 *                         libs/al-web-components/components/<name>/figma.gen.json
 *                         (OPTIONAL — defaults documented there; al-button ships
 *                         the worked exemplar) and merged over defaults.
 *   derive-ops.mjs        The PARITY CORE: pure contract -> deterministic ops
 *                         artifact (buildOps + conditional-binding resolution).
 *   derive-sheet-plan.mjs `--sheet`'s pure derivation: ops fan-out -> a
 *                         deterministic documentation-table plan (T31/T32).
 *   sheet-style.mjs       PURE PRESENTATION constants for the sheet (border
 *                         color/dash/weights, cell pitch defaults, doc header).
 *   plugin-snippets.mjs   The ONE copy of the plugin-side guard/variable/text-
 *                         style/cell-frame helpers both code emitters compose.
 *   build-set-code.mjs    Emits the lean-set figma_execute code (T12–T30).
 *   build-sheet-code.mjs  Emits the sheet setup + per-group figma_execute code.
 *
 * Pipeline: contract JSON (.altitude/contracts/<project>/<tag>.contract.json)
 *   + per-component config (figma.gen.json, optional)
 *   -> deterministic OPS artifact (derive-ops.mjs / derive-sheet-plan.mjs)
 *   -> executed over scripts/figma-atoms/mcp-shim.mjs into a SCRATCH page.
 *
 * SAFETY (hard constraint, not a default): every mutating operation targets
 * ONLY the scratch page named by --page (default "Contract Pilot"). The page
 * is created if absent, or REUSED with only its own children cleared if it
 * already exists from a prior run — never deleted, never rebuilt from
 * scratch as a new page object, and no other page is ever read-write
 * touched. A decoy-file guard (matching scripts/contracts/extract-canvas.mjs)
 * runs before anything else.
 *
 * Usage:
 *   node scripts/contracts/generate-figma.mjs --component al-button
 *   node scripts/contracts/generate-figma.mjs --component al-button --project southleft
 *   node scripts/contracts/generate-figma.mjs --component al-button --page "Contract Pilot"
 *   node scripts/contracts/generate-figma.mjs --component al-button --ops-only     # write the ops artifact only, never touch Figma
 *   node scripts/contracts/generate-figma.mjs --component al-button --check-determinism  # same contract+config, derive ops TWICE in memory, byte-compare; exit 1 on mismatch
 *   node scripts/contracts/generate-figma.mjs --component al-button --sheet       # T31: plugin-free Propstar-equivalent documentation sheet (run AFTER the lean-set build above)
 *
 * Ops artifact: .altitude/figma-sync/<project's figma-sync dir>/generated-ops/
 * <tag>.ops.json — gitignored (same zone as every other figma-sync artifact,
 * see .gitignore:110-125), because it is a build INPUT derived entirely from
 * the tracked contract, not durable state. Deterministic: stable key order
 * (fixed by construction, not sorted-then-hoped), no timestamps — the same
 * contract + config produces byte-identical bytes every run
 * (`--check-determinism` proves this without touching disk).
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scope, projectArg } from '../figma-atoms/project-scope.mjs';
import { loadComponentConfig } from './figma/component-config.mjs';
import { buildOps } from './figma/derive-ops.mjs';
import { buildSheetPlan } from './figma/derive-sheet-plan.mjs';
import { buildPluginCode } from './figma/build-set-code.mjs';
import { buildSheetSetupPluginCode, buildSheetGroupPluginCode } from './figma/build-sheet-code.mjs';
import { argOf } from '../lib/argv.mjs';
// NOT from ./extract-canvas.mjs — that module is a CLI that runs `await main()`
// at top level; the shared lib is the import-safe home for all three.
import { call as shimCall, parsePayload, shimPortFromArgv, checkDecoyGuard } from '../lib/figma-shim.mjs';
import { contractFilePath } from '../../libs/altitude-mcp/src/lib/parity.mjs';

// Re-exported so existing importers (tests, capture harnesses) keep working —
// the implementations live in scripts/contracts/figma/.
export { buildOps } from './figma/derive-ops.mjs';
export { buildSheetPlan } from './figma/derive-sheet-plan.mjs';
export { buildPluginCode } from './figma/build-set-code.mjs';
export { buildSheetSetupPluginCode, buildSheetGroupPluginCode } from './figma/build-sheet-code.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

// ── argv ────────────────────────────────────────────────────────────────

const COMPONENT = argOf('--component') || 'al-button';
const PAGE_NAME = argOf('--page') || 'Contract Pilot';
// `--port` is the canonical flag repo-wide; `--shim` stays as this script's
// historical alias (both handled by shimPortFromArgv).
const SHIM_PORT = shimPortFromArgv();
const OPS_ONLY = process.argv.includes('--ops-only');
const CHECK_DETERMINISM = process.argv.includes('--check-determinism');
/**
 * T31: plugin-free Propstar-equivalent documentation mode. Builds a labeled
 * grid of INSTANCES of the already-generated (or pre-existing) lean,
 * property-mode component set — one instance per State x Variant x every
 * BOOLEAN component property combination — as its own top-level frame next
 * to the set, never inside it. Requires the target set to already exist on
 * `--page`; run generate-figma.mjs without `--sheet` first (or a real,
 * hand-built set of the same name). See derive-sheet-plan.mjs and
 * .altitude/contracts/README.md § Documentation sheet (--sheet, T31).
 */
const SHEET = process.argv.includes('--sheet');

function serialize(ops) {
  return `${JSON.stringify(ops, null, 2)}\n`;
}

// ── decoy guard + shim transport — shared copies in scripts/lib/figma-shim.mjs;
//    this wrapper keeps the CLI's exit-1-on-unreachable behavior and the local
//    call(port, name, args) signature ──

async function call(port, name, args) {
  try {
    return await shimCall(name, args, { port });
  } catch (e) {
    if (e?.code === 'ERR_SHIM_UNREACHABLE') {
      console.error(e.message);
      process.exit(1);
    }
    throw e;
  }
}

// ── main ────────────────────────────────────────────────────────────────

function loadContract(projectId, tag) {
  // One path rule for contract files: parity.mjs's contractFilePath().
  const path = contractFilePath(projectId, tag);
  return { path, contract: JSON.parse(readFileSync(path, 'utf8')) };
}

/**
 * Spec 2026-08-26-contract-coverage…: component tag -> that component's Figma
 * set NAME, read from every tracked contract's own
 * `bindings.figma.componentSetName` (the REAL set's name when the parity
 * manifest maps one; derive-ops falls back to the tag's Title Case name — the
 * same name a generated set carries — for tags absent here). Used to resolve
 * nested-component INSTANCES by name at generation time; deterministic
 * (reads only tracked, committed contracts).
 */
function loadNestedSetNames(projectId) {
  const dir = dirname(contractFilePath(projectId, '_'));
  const map = {};
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.contract.json')).sort()) {
    try {
      const c = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      if (c.id && c.bindings?.figma?.componentSetName) map[c.id] = c.bindings.figma.componentSetName;
    } catch { /* an unreadable sibling contract must not block this component's build */ }
  }
  return map;
}

function writeOps(SC, tag, ops) {
  const dir = join(SC.dirs.sync, 'generated-ops');
  mkdirSync(dir, { recursive: true });
  const outPath = join(dir, `${tag}.ops.json`);
  writeFileSync(outPath, serialize(ops), 'utf8');
  return outPath;
}

/** T31: the sheet plan's own ops artifact — same zone, same "gitignored build
 * INPUT" convention as writeOps() above, distinct filename so a `--sheet` run
 * never clobbers (or is clobbered by) the lean set's own `<tag>.ops.json`. */
function writeSheetOps(SC, tag, plan) {
  const dir = join(SC.dirs.sync, 'generated-ops');
  mkdirSync(dir, { recursive: true });
  const outPath = join(dir, `${tag}.sheet.ops.json`);
  writeFileSync(outPath, serialize(plan), 'utf8');
  return outPath;
}

/**
 * T31 `--sheet` entry point. Mirrors the non-sheet path's own
 * ops-only/check-determinism/decoy-guard shape, then drives the batched
 * setup-call + one-call-per-group sequence build-sheet-code.mjs implements —
 * never a single all-100-instances call (see sheet-style.mjs's pitch
 * constants' comment on the ~30s per-call ceiling).
 */
async function mainSheet(SC, contract, config, nestedSetNames) {
  if (CHECK_DETERMINISM) {
    const first = serialize(buildSheetPlan(contract, { projectId: SC.id, pageName: PAGE_NAME, config, nestedSetNames }));
    const second = serialize(buildSheetPlan(contract, { projectId: SC.id, pageName: PAGE_NAME, config, nestedSetNames }));
    const ok = first === second;
    console.log(`[generate-figma] --sheet --check-determinism ${SC.id}/${COMPONENT}: ${ok ? 'DETERMINISTIC' : 'NONDETERMINISTIC'}`);
    if (!ok) {
      console.error('[generate-figma] two in-memory sheet-plan derivations of the same contract produced different bytes.');
      process.exit(1);
    }
    return;
  }

  const plan = buildSheetPlan(contract, { projectId: SC.id, pageName: PAGE_NAME, config, nestedSetNames });
  const outPath = writeSheetOps(SC, COMPONENT, plan);
  console.log(`[generate-figma] --sheet ${SC.id}/${COMPONENT}: wrote a ${plan.totalInstances}-instance plan -> ${outPath}`);

  if (OPS_ONLY) return;

  const status = parsePayload(await call(SHIM_PORT, 'figma_get_status', {}));
  const statusStr = JSON.stringify(status);
  const guard = checkDecoyGuard(SC.project, statusStr);
  if (guard.blocked) {
    console.error(
      `Refusing to generate: Figma is on the "${guard.decoy.fileName}" DECOY file. Open "${SC.fileName}" (${SC.fileKey}).` +
      (guard.decoy.why ? `\n  ${guard.decoy.why}` : ''),
    );
    process.exit(1);
  }

  const setupText = await call(SHIM_PORT, 'figma_execute', { code: buildSheetSetupPluginCode(plan, SC), fileKey: SC.fileKey, timeout: 90000 });
  let setupPayload;
  try { setupPayload = JSON.parse(setupText); } catch { console.error(setupText); process.exit(1); }
  if (setupPayload.success === false || setupPayload.error) {
    console.error('[generate-figma] --sheet SETUP FAILED:', setupPayload.error || setupPayload);
    process.exit(1);
  }
  const ids = typeof setupPayload.result === 'string' ? JSON.parse(setupPayload.result) : setupPayload.result;
  console.log('[generate-figma] --sheet setup:', JSON.stringify(ids));

  const missingVars = [...(ids.missingVars || [])];
  let totalBuilt = 0;
  for (let gi = 0; gi < plan.table.groups.length; gi++) {
    const code = buildSheetGroupPluginCode(plan, gi, ids, SC);
    const text = await call(SHIM_PORT, 'figma_execute', { code, fileKey: SC.fileKey, timeout: 90000 });
    let payload;
    try { payload = JSON.parse(text); } catch { console.error(text); process.exit(1); }
    if (payload.success === false || payload.error) {
      console.error(`[generate-figma] --sheet GROUP ${gi + 1}/${plan.table.groups.length} FAILED:`, payload.error || payload);
      process.exit(1);
    }
    const result = typeof payload.result === 'string' ? JSON.parse(payload.result) : payload.result;
    console.log(`[generate-figma] --sheet group ${gi + 1}/${plan.table.groups.length}:`, JSON.stringify(result));
    totalBuilt += result.built || 0;
    missingVars.push(...(result.missingVars || []));
  }

  console.log(JSON.stringify({
    sheetFrameId: ids.sheetFrameId,
    totalInstancesPlanned: plan.totalInstances,
    totalInstancesBuilt: totalBuilt,
    missingVars,
  }, null, 2));
}

async function main() {
  const SC = scope(projectArg());
  const { contract } = loadContract(SC.id, COMPONENT);
  const { config, path: configPath, fileExists: configFileExists } = loadComponentConfig(REPO_ROOT, COMPONENT);
  if (configFileExists) console.log(`[generate-figma] per-component config: ${configPath}`);
  const nestedSetNames = loadNestedSetNames(SC.id);

  if (SHEET) {
    await mainSheet(SC, contract, config, nestedSetNames);
    return;
  }

  if (CHECK_DETERMINISM) {
    // T15's TODO(T12): same contract+config inputs -> byte-identical ops
    // output, independent of Figma/disk — mirrors emit-contracts.mjs's
    // --check-determinism exactly, one level down the pipeline.
    const first = serialize(buildOps(contract, { projectId: SC.id, pageName: PAGE_NAME, config, nestedSetNames }));
    const second = serialize(buildOps(contract, { projectId: SC.id, pageName: PAGE_NAME, config, nestedSetNames }));
    const ok = first === second;
    console.log(`[generate-figma] --check-determinism ${SC.id}/${COMPONENT}: ${ok ? 'DETERMINISTIC' : 'NONDETERMINISTIC'}`);
    if (!ok) {
      console.error('[generate-figma] two in-memory ops derivations of the same contract produced different bytes.');
      process.exit(1);
    }
    return;
  }

  const ops = buildOps(contract, { projectId: SC.id, pageName: PAGE_NAME, config, nestedSetNames });
  const outPath = writeOps(SC, COMPONENT, ops);
  console.log(`[generate-figma] ${SC.id}/${COMPONENT}: wrote ${ops.variants.length} variant ops -> ${outPath}`);

  if (OPS_ONLY) return;

  // Confirm the shim is reachable and NOT pointed at a decoy — before
  // sending anything that mutates.
  const status = parsePayload(await call(SHIM_PORT, 'figma_get_status', {}));
  const statusStr = JSON.stringify(status);
  const guard = checkDecoyGuard(SC.project, statusStr);
  if (guard.blocked) {
    console.error(
      `Refusing to generate: Figma is on the "${guard.decoy.fileName}" DECOY file. Open "${SC.fileName}" (${SC.fileKey}).` +
      (guard.decoy.why ? `\n  ${guard.decoy.why}` : ''),
    );
    process.exit(1);
  }

  const code = buildPluginCode(ops, SC, config);
  // T28: CONFIRMED LIVE — the Desktop Bridge enforces a hard ~30s execution
  // ceiling per figma_execute call, completely independent of this timeout
  // value (an unbounded scan and, separately, a large fan-out set with
  // cloned Phosphor instances both hit exactly "Execution timed out after
  // 30000ms" no matter how high this was raised, up to 280000). It is left
  // generous anyway — for a genuinely slow shim round-trip, not the plugin
  // ceiling — and the real fix for the plugin-side ceiling was reducing the
  // WORK per call (bounded scan budget, T21's icons-visible measurement
  // dance skipped entirely once every slot is axis-mode — see the comments
  // in build-set-code.mjs), not this number.
  const text = await call(SHIM_PORT, 'figma_execute', { code, fileKey: SC.fileKey, timeout: 90000 });
  let payload;
  try { payload = JSON.parse(text); } catch { console.error(text); process.exit(1); }
  if (payload.success === false || payload.error) {
    console.error('[generate-figma] BUILD FAILED:', payload.error || payload);
    process.exit(1);
  }
  const result = typeof payload.result === 'string' ? JSON.parse(payload.result) : payload.result;
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/') || process.argv[1]?.endsWith('generate-figma.mjs')) {
  await main();
}
