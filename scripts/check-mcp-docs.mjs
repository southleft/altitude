#!/usr/bin/env node
/**
 * check-mcp-docs.mjs — asserts every doc that lists the Altitude MCP's tools
 * matches what the server actually registers.
 *
 * Why: the tool roster drifted three separate times — AGENTS.md, the MCP's own
 * README, and the public southleft.com tools page all said "six tools" long
 * after the server registered eight. `check:llms` already guards the generated
 * root llms.txt against exactly this; this script extends the same guarantee to
 * the hand-written surfaces.
 *
 * Checks, per documented surface:
 *   1. every `server.registerTool('<name>')` in libs/altitude-mcp/src/server.mjs
 *      appears at least once in the doc;
 *   2. every `altitude_<word>` token in the doc names a registered tool
 *      (catches renamed/removed tools lingering in prose).
 *
 * A THIRD check, not per-doc: libs/altitude-mcp/CAPABILITY-MATRIX.md (the
 * intent -> tool/resource/prompt -> required filters -> expected result
 * fields -> common failure mode table, R8/T-"Adopt Carbon's Capability
 * Matrix format") is itself GENERATED from a real MCP handshake against the
 * live server (libs/altitude-mcp/scripts/build-capability-matrix.mjs) rather
 * than hand-written — so instead of re-deriving that gate here, this script
 * just runs the generator's own `--check` mode and propagates its result.
 * Same principle as check:llms (scripts/build-root-llms.mjs --check):
 * a generated artifact is gated by re-running its generator, not by a
 * second, independently-drifting parser.
 *
 * Run: node scripts/check-mcp-docs.mjs   (alias: pnpm run check:mcp-docs)
 * Exit: 1 on any mismatch, 0 when all surfaces agree with the server.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(import.meta.dirname, '..');

// The roster of record. Tool registrations moved from inline
// `server.registerTool('name', ...)` calls in server.mjs to the TOOLS array in
// tools.mjs (registered generically by index.mjs) — the old regex against
// server.mjs matched NOTHING after that refactor, so this script errored on
// its own roster-extraction guard rather than checking anything (found
// 2026-08-27, spec parity-system-audit-remediation).
const TOOLS_SOURCE = resolve(ROOT, 'libs/altitude-mcp/src/lib/tools.mjs');

/** Hand-written surfaces that enumerate the FULL tool roster. */
const DOCS = [
  'AGENTS.md',
  'libs/altitude-mcp/README.md',
  'apps/southleft/src/pages/tools/index.astro',
  // The sync skill enumerates the roster too (its "Also available" block) —
  // it drifted to five-of-eight before 2026-08-27 precisely because this
  // script did not cover .claude/skills/ (spec parity-system-audit-remediation, R3).
  '.claude/skills/altitude-figma-sync/SKILL.md',
];

/**
 * Every OTHER skill gets the STALE-NAME check only (an `altitude_*` mention
 * must name a registered tool), never the full-roster check — a skill that
 * mentions two tools in passing is not claiming to enumerate eight.
 */
function skillFiles() {
  const dir = join(ROOT, '.claude', 'skills');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => `.claude/skills/${d.name}/SKILL.md`)
    .filter((rel) => existsSync(join(ROOT, rel)));
}

const toolsSource = readFileSync(TOOLS_SOURCE, 'utf8');
const registered = [...toolsSource.matchAll(/name:\s*'(altitude_[a-z0-9_]+)'/g)].map((m) => m[1]);

if (registered.length === 0) {
  console.error(`check-mcp-docs: found no tool names in ${TOOLS_SOURCE} — regex or file moved?`);
  process.exit(1);
}

let failures = 0;

for (const rel of DOCS) {
  const path = resolve(ROOT, rel);
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    console.error(`FAIL ${rel}: file missing (documented surface list in scripts/check-mcp-docs.mjs is stale)`);
    failures++;
    continue;
  }

  const missing = registered.filter((name) => !text.includes(name));
  const mentioned = new Set([...text.matchAll(/\baltitude_[a-z0-9_]+\b/g)].map((m) => m[0]));
  const stale = [...mentioned].filter((name) => !registered.includes(name));

  for (const name of missing) {
    console.error(`FAIL ${rel}: registered tool "${name}" is not documented here`);
    failures++;
  }
  for (const name of stale) {
    console.error(`FAIL ${rel}: mentions "${name}" which the server does not register (renamed or removed?)`);
    failures++;
  }
  if (missing.length === 0 && stale.length === 0) {
    console.log(`OK   ${rel} — all ${registered.length} tools documented, no stale names`);
  }
}

// ── skills: stale-name check only (R3, spec 2026-08-27) ─────────────────
for (const rel of skillFiles()) {
  if (DOCS.includes(rel)) continue; // already fully checked above
  const text = readFileSync(resolve(ROOT, rel), 'utf8');
  const mentioned = new Set([...text.matchAll(/\baltitude_[a-z0-9_]+\b/g)].map((m) => m[0]));
  const stale = [...mentioned].filter((name) => !registered.includes(name));
  for (const name of stale) {
    console.error(`FAIL ${rel}: mentions "${name}" which the server does not register (renamed or removed?)`);
    failures++;
  }
  if (stale.length === 0 && mentioned.size > 0) {
    console.log(`OK   ${rel} — ${mentioned.size} tool mention(s), none stale`);
  }
}

// ── the generated capability matrix ─────────────────────────────────────
// Re-run its own generator in --check mode rather than re-implementing the
// comparison here (see module docstring). `--experimental-strip-types` is a
// harmless no-op on Node versions where type stripping is unflagged, and the
// generator lives inside libs/altitude-mcp/ so it resolves
// @modelcontextprotocol/sdk from that workspace's own node_modules.
const matrixGenerator = resolve(ROOT, 'libs/altitude-mcp/scripts/build-capability-matrix.mjs');
const matrixCheck = spawnSync(
  process.execPath,
  ['--experimental-strip-types', '--no-warnings', matrixGenerator, '--check'],
  { encoding: 'utf8' }
);
if (matrixCheck.error || matrixCheck.status !== 0) {
  console.error('FAIL libs/altitude-mcp/CAPABILITY-MATRIX.md: generator --check failed');
  if (matrixCheck.stdout) console.error(matrixCheck.stdout.trim());
  if (matrixCheck.stderr) console.error(matrixCheck.stderr.trim());
  if (matrixCheck.error) console.error(String(matrixCheck.error));
  failures++;
} else {
  console.log(`OK   libs/altitude-mcp/CAPABILITY-MATRIX.md — ${matrixCheck.stdout.trim()}`);
}

if (failures > 0) {
  console.error(
    `\ncheck-mcp-docs: ${failures} mismatch(es). The server registers ${registered.length} tools: ${registered.join(', ')}`
  );
  process.exit(1);
}
console.log(`check-mcp-docs: all surfaces match the server's ${registered.length} registered tools.`);
