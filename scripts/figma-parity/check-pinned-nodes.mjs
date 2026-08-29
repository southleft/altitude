#!/usr/bin/env node
/**
 * check-pinned-nodes.mjs — are the parity manifest's PINNED Figma node ids
 * still pointing at live component sets?
 *
 *   node scripts/figma-parity/check-pinned-nodes.mjs [--project <id>] [--port <n>] [--json] [--repin]
 *
 * T2, spec 2026-08-29-parity-judgement-gates-and-evals. Needs the shim running
 * (scripts/figma-atoms/mcp-shim.mjs), like every script that reads the canvas.
 *
 * WHY THIS EXISTS. `figma.getNodeByIdAsync()` returns a DETACHED node after
 * its page is deleted: `removed` is false, the parent chain reaches no PAGE.
 * "It resolved" is not proof it is in the document. Found live 2026-08-27
 * (altitude-figma-repair/SKILL.md trap 1): 11 of 20 pinned ids in the parity
 * manifest were ghosts after the owner rebuilt those pages, and
 * `extract-canvas.mjs` extracted from the ghost — reporting a DELETED set as
 * in-sync, with the old set's axes.
 *
 * extract-canvas was fixed at the point of use (liveness check, then by-name
 * fallback). THE MANIFEST WAS NOT. A stale id stays pinned, `buildAiPrompt()`
 * keeps telling agents "node 3435:877", and `figmaNodeUrlFor()` keeps building
 * a deep link into nothing. This reports that, and `--repin` fixes it where
 * the correct answer is unambiguous.
 *
 * Exit 0 when every pin is live, correctly typed and correctly named; 1 on any
 * finding; 1 on an unreachable shim (an unrunnable check is not a pass).
 */
import { call, parsePayload, shimPortFromArgv } from '../lib/figma-shim.mjs';
import { hasFlag } from '../lib/argv.mjs';
import { classifyPins, findings, jsonAscii, repairable, VERDICT } from '../lib/pinned-nodes.mjs';
import { resolveProject } from '../../libs/altitude-mcp/src/lib/ds-project.mjs';
import { readManifest, writeManifest } from '../../libs/altitude-mcp/src/lib/parity.mjs';

const project = resolveProject();
const projectFlag = project.isDefault ? '' : ` --project ${project.id}`;
const PORT = shimPortFromArgv();
const JSON_OUT = hasFlag('--json');
const REPIN = hasFlag('--repin');

const manifest = readManifest(project);
if (!manifest) {
  console.error(`No parity manifest for "${project.id}". Run: node scripts/figma-parity/seed-manifest.mjs${projectFlag}`);
  process.exit(1);
}

// Only entries that actually PIN an id. Molecule sets map by name with
// `nodeId: null` on purpose — molecule pages are rebuilt and re-mint ids, so
// there is nothing here to go stale (see scripts/figma-atoms/instance-map.mjs).
const pins = Object.entries(manifest.components)
  .filter(([, e]) => e.figma?.nodeId)
  .map(([tag, e]) => ({ tag, name: e.figma.name ?? null, nodeId: e.figma.nodeId }));

if (pins.length === 0) {
  console.log(`[${project.id}] No pinned node ids in the manifest — nothing to check.`);
  process.exit(0);
}

const prefix = project.figma.componentPagePrefix ?? '';
const code = `
await figma.loadAllPagesAsync();
const PREFIX = ${jsonAscii(prefix)};
const IDS = ${jsonAscii(pins.map((p) => p.nodeId))};

// The liveness test from altitude-figma-repair/SKILL.md trap 1, verbatim in
// intent: a node is in the document only if walking its parent chain reaches
// a PAGE that is still one of figma.root.children.
function isLive(n) {
  try { if (n.removed) return false; } catch (e) { return false; }
  var q = n;
  while (q && q.type !== 'PAGE') q = q.parent;
  return !!q && figma.root.children.indexOf(q) !== -1;
}

const setsByName = {};
for (const page of figma.root.children) {
  if (PREFIX && page.name.indexOf(PREFIX) !== 0) continue;
  for (const node of page.findAllWithCriteria({ types: ['COMPONENT_SET'] })) {
    if (!setsByName[node.name]) setsByName[node.name] = [];
    setsByName[node.name].push({ id: node.id, page: page.name });
  }
}

const probes = {};
for (const id of IDS) {
  let n = null;
  try { n = await figma.getNodeByIdAsync(id); } catch (e) { n = null; }
  if (!n) { probes[id] = { resolved: false, live: false, type: null, name: null }; continue; }
  probes[id] = { resolved: true, live: isLive(n), type: n.type, name: n.name };
}
return JSON.stringify({ fileKey: figma.fileKey || null, probes, setsByName });
`;

let live;
try {
  const payload = parsePayload(await call('figma_execute', { code, timeout: 180000 }, { port: PORT, fileName: project.figma.fileName }));
  if (payload && payload.success === false) throw new Error(String(payload.error ?? 'figma_execute reported success:false'));
  live = typeof payload === 'string' ? JSON.parse(payload) : payload;
} catch (e) {
  console.error(`[check-pinned-nodes] Could not read the document: ${String(e.message).slice(0, 400)}`);
  console.error('Is scripts/figma-atoms/mcp-shim.mjs running, and is the target file open?');
  process.exit(1);
}

const results = classifyPins(pins, live.probes ?? {}, live.setsByName ?? {});
const bad = findings(results);

if (JSON_OUT) {
  console.log(JSON.stringify({ project: project.id, fileKey: live.fileKey ?? null, results }, null, 2));
} else {
  for (const r of results) {
    if (r.verdict === VERDICT.OK) continue;
    console.log(`${r.verdict.toUpperCase().padEnd(11)} ${r.tag.padEnd(22)} ${r.nodeId}  — ${r.detail}`);
    if (r.repinTo) console.log(`            repin to ${r.repinTo.id} (live "${r.name}" on page "${r.repinTo.page}")`);
  }
  console.log(`\n[${project.id}] ${pins.length} pinned id(s) | ${pins.length - bad.length} live | ${bad.length} finding(s)`);
}

const fixable = repairable(results);
if (REPIN && fixable.length) {
  for (const r of fixable) {
    manifest.components[r.tag].figma.nodeId = r.repinTo.id;
    console.log(`repinned ${r.tag}: ${r.nodeId} -> ${r.repinTo.id}`);
  }
  writeManifest(manifest, project);
  console.log(`[${project.id}] Rewrote ${fixable.length} pin(s). Re-run to confirm, then commit the manifest.`);
  // The remaining findings are the ones a repin cannot decide.
  process.exit(bad.length - fixable.length > 0 ? 1 : 0);
}

if (bad.length) {
  if (fixable.length) console.error(`\n${fixable.length} of these have exactly one live set of that name — re-run with --repin to rewrite them.`);
  console.error('[check-pinned-nodes] FAIL — a stale pin sends every agent and every deep link at a node that is not in the file.');
  process.exit(1);
}
console.log('[check-pinned-nodes] PASS');
