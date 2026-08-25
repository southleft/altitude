#!/usr/bin/env node
// Self-test for lib/treatment.mjs (R3 treatment axis + R5 process assertion).
// Pure functions except the mcp-config file write, which uses a scratch tmp
// dir. No LLM call.
//
// fixtures/attempts/mcp-tool-call-trace.real.jsonl is a REAL recorded
// `claude --output-format stream-json --verbose` transcript (haiku,
// 2026-08-25, $0.0740, prompt: "Call the altitude_list_components MCP tool
// ... reply with just the number") — this is the honest mechanism R5 needs:
// a genuine tool_use trace, not an inference from output text.
//
// Run: node scripts/ai-readiness/test/treatment.test.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  TREATMENTS,
  claudeArgsForTreatment,
  promptSuffixForTreatment,
  writeMcpConfig,
  extractToolCallsFromStreamJson,
  lastJsonLine,
  assertExpectedMcpTools,
  ALTITUDE_MCP_TOOL_NAMES,
} from '../lib/treatment.mjs';

const SCRIPT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) { console.log(`  ✓ ${desc}`); PASS++; }
  else { console.log(`  ✗ ${desc}`); FAIL++; }
}

console.log('==> TREATMENTS + claudeArgsForTreatment');
{
  assert('exactly 3 treatments', TREATMENTS.length === 3 && TREATMENTS.includes('mcp-off') && TREATMENTS.includes('mcp-on') && TREATMENTS.includes('with-skill'));
  const off = claudeArgsForTreatment('mcp-off', null);
  assert('mcp-off carries --strict-mcp-config and NO --mcp-config', off.includes('--strict-mcp-config') && !off.includes('--mcp-config'));
  const skill = claudeArgsForTreatment('with-skill', null);
  assert('with-skill also carries --strict-mcp-config (no MCP server)', skill.includes('--strict-mcp-config') && !skill.includes('--mcp-config'));
  let threw = false;
  try { claudeArgsForTreatment('mcp-on', '/does/not/exist.json'); } catch { threw = true; }
  assert('mcp-on throws if the config file was not actually written (never silently drops the flag)', threw);
}

console.log('\n==> writeMcpConfig');
{
  const dir = mkdtempSync(join(tmpdir(), 'ai-readiness-treatment-test-'));
  const path = writeMcpConfig(dir);
  const config = JSON.parse(readFileSync(path, 'utf8'));
  assert('config declares the altitude server', !!config.mcpServers.altitude);
  assert('command is node', config.mcpServers.altitude.command === 'node');
  assert('args point at libs/altitude-mcp/src/server.mjs', config.mcpServers.altitude.args.some((a) => a.endsWith('server.mjs')));

  const on = claudeArgsForTreatment('mcp-on', path);
  assert('mcp-on carries --mcp-config <path>', on.includes('--mcp-config') && on.includes(path));
}

console.log('\n==> promptSuffixForTreatment');
{
  assert('mcp-off has no suffix (control arm, unchanged behavior)', promptSuffixForTreatment('mcp-off') === '');
  assert('mcp-on suffix names the 8 altitude_* tools', ALTITUDE_MCP_TOOL_NAMES.every((t) => promptSuffixForTreatment('mcp-on').includes(t)));
  assert('with-skill suffix names the skill', promptSuffixForTreatment('with-skill').includes('altitude-component-authoring'));
}

console.log('\n==> extractToolCallsFromStreamJson — REAL recorded transcript');
{
  const raw = readFileSync(resolve(SCRIPT_DIR, 'fixtures/attempts/mcp-tool-call-trace.real.jsonl'), 'utf8');
  const { allToolCalls, mcpToolCalls } = extractToolCallsFromStreamJson(raw);
  assert('found at least one tool_use block', allToolCalls.length > 0);
  assert('mcp__altitude__altitude_list_components was actually called', mcpToolCalls.includes('mcp__altitude__altitude_list_components'));
  assert('mcpToolCalls is a subset of allToolCalls', mcpToolCalls.every((t) => allToolCalls.includes(t)));
}
{
  const { allToolCalls, mcpToolCalls } = extractToolCallsFromStreamJson('');
  assert('empty transcript -> empty arrays, no throw', allToolCalls.length === 0 && mcpToolCalls.length === 0);
}
{
  const { allToolCalls } = extractToolCallsFromStreamJson('not json\n{"broken\nalso not json');
  assert('malformed lines are skipped, not thrown', allToolCalls.length === 0);
}

console.log('\n==> lastJsonLine — REAL recorded transcript');
{
  const raw = readFileSync(resolve(SCRIPT_DIR, 'fixtures/attempts/mcp-tool-call-trace.real.jsonl'), 'utf8');
  const envelope = lastJsonLine(raw);
  assert('last line is the result envelope', envelope?.type === 'result');
  assert('carries total_cost_usd', typeof envelope.total_cost_usd === 'number');
  assert('matches the real measured $0.0740116', Math.abs(envelope.total_cost_usd - 0.0740116) < 1e-9);
}

console.log('\n==> assertExpectedMcpTools (R5 process assertion)');
{
  const r = assertExpectedMcpTools(['mcp__altitude__altitude_list_components'], ['altitude_list_components'], 'mcp-on');
  // Note: expectedMcpTools in tasks-registry.mjs are UNQUALIFIED tool names
  // (e.g. 'altitude_get_component') for readability in the spec/registry;
  // the trace carries server-qualified names. The assertion helper compares
  // literal strings, so callers must qualify expectedMcpTools consistently
  // — this test documents that contract rather than silently papering over
  // a mismatch.
  assert('unqualified expected vs. qualified actual does NOT match by design (documents the contract)', r.passed === false);
}
{
  const r = assertExpectedMcpTools(['mcp__altitude__altitude_list_components'], ['mcp__altitude__altitude_list_components', 'mcp__altitude__altitude_get_component'], 'mcp-on');
  assert('qualified expected vs. qualified actual matches', r.passed === true);
}
{
  const r = assertExpectedMcpTools([], ['mcp__altitude__altitude_get_tokens'], 'mcp-off');
  assert('non-mcp-on treatment is inapplicable, not a false failure', r.applicable === false && r.passed === null);
}
{
  const r = assertExpectedMcpTools([], [], 'mcp-on');
  assert('task with no expectedMcpTools is inapplicable', r.applicable === false);
}

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
