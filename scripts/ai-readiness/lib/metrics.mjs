// Per-trial cost + latency extraction (R6, cost half). The axe half lives
// in lib/axe-check.mjs (a separate module because it needs a real browser
// and a built dist/ — this one is pure JSON parsing, always available).
//
// COST FIELD — verified, not guessed. Three real `claude` CLI invocations
// this wave (2026-08-25) all carried a top-level `total_cost_usd` on the
// FINAL result object:
//   - $1.3469  (opus-class, --output-format json, Task A fleet attempt —
//               the run wave 1 already measured and this wave re-parsed)
//   - $0.0740  (haiku, --output-format stream-json --verbose, MCP tool-call
//               trace proof-of-concept)
//   - $0.1265  (haiku, same, combined with --json-schema)
// stream-json's LAST line carries the identical envelope shape to
// --output-format json's single result object (same `total_cost_usd`,
// `usage`, `modelUsage` keys) — confirmed by direct comparison, not
// assumed. See lib/mcp-trace.mjs for how the rest of the stream is used.
//
// Codex's envelope shape is NOT verified this wave (codex CLI not
// installed on this machine — see spec Findings, "Not verified: the Codex
// path"). extractCostUsd is honest about that rather than guessing a field
// name that could silently read `undefined` and report a fabricated 0.

export function extractCostUsd(envelope, model) {
  if (!envelope || typeof envelope !== 'object') {
    return { costUsd: null, reason: 'no envelope parsed (attempt raw output was not valid JSON)' };
  }
  if (model === 'claude') {
    if (typeof envelope.total_cost_usd === 'number') {
      return { costUsd: envelope.total_cost_usd, reason: null };
    }
    return { costUsd: null, reason: 'total_cost_usd field missing from claude CLI envelope' };
  }
  if (model === 'codex') {
    return { costUsd: null, reason: 'codex cost field not verified this wave — codex CLI is not installed on this machine (see spec Findings)' };
  }
  return { costUsd: null, reason: `unknown model "${model}" — no cost-field mapping defined` };
}

/**
 * Per-model token usage breakdown, when the envelope carries it
 * (`modelUsage`, keyed by canonical model id -> { costUSD, inputTokens, ... }).
 * Purely informational — never required for the cost number itself.
 */
export function extractModelUsage(envelope) {
  if (!envelope || typeof envelope !== 'object' || !envelope.modelUsage) return null;
  return envelope.modelUsage;
}

// durationMs is already measured by run-probe.mjs's own t0/t1 wall-clock
// wrap around runChild() — this helper exists only so callers that only
// have the attempt object (not the original timing closure) have one
// place to read it from, and so a future field rename has one call site.
export function extractLatencyMs(attempt) {
  if (!attempt || typeof attempt.durationMs !== 'number') return { latencyMs: null, reason: 'durationMs missing from attempt' };
  return { latencyMs: attempt.durationMs, reason: null };
}
