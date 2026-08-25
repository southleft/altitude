#!/usr/bin/env node
// Self-test for lib/metrics.mjs (R6 — cost + latency extraction).
// Pure JSON parsing, no network, no LLM call.
//
// Run: node scripts/ai-readiness/test/metrics.test.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractCostUsd, extractLatencyMs, extractModelUsage } from '../lib/metrics.mjs';

const SCRIPT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) { console.log(`  ✓ ${desc}`); PASS++; }
  else { console.log(`  ✗ ${desc}`); FAIL++; }
}

console.log('==> extractCostUsd — REAL recorded envelope (2026-08-25 fleet attempt)');
{
  const attempt = JSON.parse(readFileSync(resolve(SCRIPT_DIR, 'fixtures/attempts/A-composition-claude-1.real.json'), 'utf8'));
  const envelope = JSON.parse(attempt.raw);
  const { costUsd, reason } = extractCostUsd(envelope, 'claude');
  assert('reads the real measured $1.3469 (approx, floating point)', Math.abs(costUsd - 1.3468699999999998) < 1e-9);
  assert('reason is null on success', reason === null);

  const usage = extractModelUsage(envelope);
  assert('modelUsage carries both opus + haiku entries', usage && Object.keys(usage).length === 2);
}

console.log('\n==> extractCostUsd — edge cases (SYNTHETIC envelopes)');
{
  const { costUsd, reason } = extractCostUsd(null, 'claude');
  assert('null envelope -> costUsd null with a reason', costUsd === null && typeof reason === 'string');
}
{
  const { costUsd, reason } = extractCostUsd({ some: 'field' }, 'claude');
  assert('envelope missing total_cost_usd -> null, never a fabricated 0', costUsd === null && reason.includes('total_cost_usd'));
}
{
  const { costUsd, reason } = extractCostUsd({ total_cost_usd: 0.05 }, 'codex');
  assert('codex is honestly unverified this wave -> null, never guessed', costUsd === null && reason.includes('not verified'));
}
{
  const { costUsd } = extractCostUsd({ total_cost_usd: 0.05 }, 'some-future-model');
  assert('unknown model -> null, not a silent 0', costUsd === null);
}

console.log('\n==> extractLatencyMs');
{
  const { latencyMs, reason } = extractLatencyMs({ durationMs: 96614 });
  assert('reads durationMs through', latencyMs === 96614 && reason === null);
}
{
  const { latencyMs, reason } = extractLatencyMs({});
  assert('missing durationMs -> null with reason, not 0', latencyMs === null && typeof reason === 'string');
}

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
