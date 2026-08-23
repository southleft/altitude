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
 * Run: node scripts/check-mcp-docs.mjs   (alias: pnpm run check:mcp-docs)
 * Exit: 1 on any mismatch, 0 when all surfaces agree with the server.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

const SERVER = resolve(ROOT, 'libs/altitude-mcp/src/server.mjs');

/** Hand-written surfaces that enumerate the tool roster. */
const DOCS = [
  'AGENTS.md',
  'libs/altitude-mcp/README.md',
  'apps/southleft/src/pages/tools/index.astro',
];

const serverSource = readFileSync(SERVER, 'utf8');
const registered = [...serverSource.matchAll(/registerTool\(\s*'([a-z0-9_]+)'/g)].map((m) => m[1]);

if (registered.length === 0) {
  console.error(`check-mcp-docs: found no registerTool calls in ${SERVER} — regex or file moved?`);
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

if (failures > 0) {
  console.error(
    `\ncheck-mcp-docs: ${failures} mismatch(es). The server registers ${registered.length} tools: ${registered.join(', ')}`
  );
  process.exit(1);
}
console.log(`check-mcp-docs: all surfaces match the server's ${registered.length} registered tools.`);
