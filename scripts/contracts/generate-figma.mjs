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
 *                         deterministic documentation-table plan (T31/T32).
 *   doc-header-style.mjs PURE PRESENTATION constants for the doc header above
 *                       the set. Never a parity fact.
 *   plugin-snippets.mjs   The ONE copy of the plugin-side guard/variable/text-
 *                         style/cell-frame helpers both code emitters compose.
 *   build-set-code.mjs    Emits the lean-set figma_execute code (T12–T30).
 *
 * Pipeline: contract JSON (.altitude/contracts/<project>/<tag>.contract.json)
 *   + per-component config (figma.gen.json, optional)
 *   -> deterministic OPS artifact (derive-ops.mjs)
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
import { buildPluginCode } from './figma/build-set-code.mjs';
import { loadMeasuredIndex, measuredBoxFor } from './figma/measured-boxes.mjs';
import { classifyAxes } from './figma/derive-ops.mjs';
import { argOf } from '../lib/argv.mjs';
// NOT from ./extract-canvas.mjs — that module is a CLI that runs `await main()`
// at top level; the shared lib is the import-safe home for all three.
import { call as shimCall, parsePayload, shimPortFromArgv, checkDecoyGuard } from '../lib/figma-shim.mjs';
import { contractFilePath } from '../../libs/altitude-mcp/src/lib/parity.mjs';

// Re-exported so existing importers (tests, capture harnesses) keep working —
// the implementations live in scripts/contracts/figma/.
export { buildOps } from './figma/derive-ops.mjs';
export { buildPluginCode } from './figma/build-set-code.mjs';

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
// RETIRED 2026-08-29 (owner direction). The prop sheet — a variant
// break-out grid with dashed separators — is gone; a component page is now
// ONE frame: the doc header above the real COMPONENT_SET. Variants get
// expanded by hand with the Propstar plugin when a page wants them. The flag
// is refused LOUDLY rather than ignored, so an old command line or script
// fails visibly instead of silently generating something different from what
// it asked for.
if (process.argv.includes('--sheet')) {
  console.error('[generate-figma] --sheet is retired. The doc header is now generated above the set by the ordinary run; the variant break-out grid is not generated at all — expand variants with Propstar. Re-run without --sheet.');
  process.exit(2);
}

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

async function main() {
  const SC = scope(projectArg());
  const { contract } = loadContract(SC.id, COMPONENT);
  // Config roots: the brand layer (when this project declares one) shadows
  // the base library — the contract for a superseded/brand-only tag describes
  // the BRAND implementation, so its figma.gen.json lives with that code.
  const configRoots = [
    ...(SC.brandLibrary?.root ? [SC.brandLibrary.root] : []),
    'libs/al-web-components',
  ];
  const { config, path: configPath, fileExists: configFileExists } = loadComponentConfig(REPO_ROOT, COMPONENT, configRoots);
  if (configFileExists) console.log(`[generate-figma] per-component config: ${configPath}`);
  const nestedSetNames = loadNestedSetNames(SC.id);

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

  // Join the MEASURED browser box onto each variant, so the ops artifact
  // carries both halves parity needs: which variants exist (this lane) and
  // how big each should be (the measurement lane). Done HERE rather than in
  // buildOps so that derivation stays pure — --check-determinism compares two
  // in-memory buildOps runs and must not depend on gitignored run output.
  // A variant nothing measured keeps no `expected`, and check-parity reports
  // it as size-unverified rather than passing it.
  {
    const byTag = loadMeasuredIndex(SC.dirs.sync).get(COMPONENT);
    const { enumAxis } = classifyAxes(ops.axes ?? []);
    let matched = 0;
    for (const v of ops.variants ?? []) {
      const box = measuredBoxFor(byTag, ops.anatomyCase, v, enumAxis?.name ?? null);
      if (box) { v.expected = box; matched++; }
    }
    ops.measuredVariants = matched;
    console.log(`[generate-figma] measured boxes joined: ${matched}/${(ops.variants ?? []).length} variant(s)${matched === 0 ? ' — none matched; check-parity will report size unverified' : ''}`);
  }

  const outPath = writeOps(SC, COMPONENT, ops);
  console.log(`[generate-figma] ${SC.id}/${COMPONENT}: wrote ${ops.variants.length} variant ops -> ${outPath}`);

  // DEGENERATE-CONTRACT GUARD. A contract whose measured root box has no
  // width did not measure small — it measured NOTHING, which is what happens
  // to every width:100% / flex:1 component in an unconstrained harness (repair
  // skill trap 12). Generating from one cannot produce anything but a bare
  // frame: on 2026-08-29 al-progress generated ZERO children this way, and a
  // whole-library sweep replaced real design work with boxes before anyone
  // looked. The variant matrix matched perfectly the whole time, which is why
  // no existing check caught it.
  //
  // Refused rather than warned, because the output is worthless by
  // construction and it OVERWRITES the good set. `pnpm run check:contract-fidelity`
  // lists every contract in this state.
  {
    const rootBox = (contract.anatomy?.root ?? contract.anatomy)?.box ?? null;
    if (!rootBox || !(rootBox.w >= 1)) {
      console.error(`[generate-figma] REFUSING to generate ${SC.id}/${COMPONENT}: its contract's root box is ${rootBox ? rootBox.w + 'x' + rootBox.h : 'absent'} — nothing was measured, so the generated set would be a bare frame that REPLACES whatever is on the page.`);
      console.error('  Fix the measurement (a harness width for width:100% components), re-measure, re-derive.');
      console.error('  Inspect the whole library:  pnpm run check:contract-fidelity');
      console.error('  Deliberate override (you have looked and want it anyway):  --allow-degenerate');
      if (!process.argv.includes('--allow-degenerate')) process.exit(1);
      console.error('  --allow-degenerate given: proceeding against a contract that measured nothing.');
    }
  }

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
  // POSITIVE file match (2026-08-28): the decoy guard blocks only LISTED
  // decoys — an unrelated file (a client file left focused) passed it. The
  // open file must BE the target, not merely not-a-decoy.
  if (status.currentFileKey && status.currentFileKey !== SC.fileKey) {
    console.error(`Refusing to generate: Figma has "${status.currentFileName}" (${status.currentFileKey}) open — not "${SC.fileName}" (${SC.fileKey}). Focus the target file and re-run.`);
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
