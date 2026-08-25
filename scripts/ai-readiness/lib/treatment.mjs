// Treatment axis (R3) — same scenario run under three arms, modelled on
// @primer/agent-eval's MCP on/off/with-skill A/B test:
//
//   mcp-off     — control. No MCP server attached. Digests + AGENTS.md/CLAUDE.md
//                 are the only ground truth available (today's harness default).
//   mcp-on      — the altitude MCP server (libs/altitude-mcp) is attached via
//                 --mcp-config, and the prompt tells the agent the 8 altitude_*
//                 tools are available and preferred over reading raw digest files.
//   with-skill  — no MCP, but the prompt explicitly instructs the agent to
//                 invoke the altitude-component-authoring skill
//                 (.claude/skills/altitude-component-authoring/SKILL.md)
//                 before answering.
//
// IMPORTANT — why --strict-mcp-config is on EVERY arm, including mcp-off:
// this repo's own .mcp.json (at REPO ROOT) registers the "altitude" MCP
// server (plus monday-morning/playwright/figma-console) for THIS Claude
// Code session. A child `claude --print` invocation run with cwd=REPO ROOT
// inherits and auto-loads .mcp.json UNLESS --strict-mcp-config is passed —
// so without it, "mcp-off" would silently still have the altitude MCP
// server available, and the treatment axis would not actually vary MCP
// availability at all. --strict-mcp-config makes mcp-off a genuine control:
// no --mcp-config flag = ZERO MCP servers, not "whatever the ambient repo
// config happens to have".
//
// MCP config format verified against the repo's own .mcp.json (same
// mcpServers / command / args shape --mcp-config expects).

import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const TREATMENTS = ['mcp-off', 'mcp-on', 'with-skill'];

const ALTITUDE_MCP_SERVER = resolve(import.meta.dirname, '..', '..', '..', 'libs/altitude-mcp/src/server.mjs');
const SKILL_PATH = resolve(import.meta.dirname, '..', '..', '..', '.claude/skills/altitude-component-authoring/SKILL.md');

export const ALTITUDE_MCP_TOOL_NAMES = [
  'altitude_list_components',
  'altitude_get_component',
  'altitude_validate',
  'altitude_get_tokens',
  'altitude_search_icons',
  'altitude_generate_theme',
  'altitude_check_parity',
  'altitude_list_ds_projects',
];

/**
 * Writes the --mcp-config JSON file the mcp-on arm attaches, once per run
 * (into TMPDIR, alongside the digest mirrors). Idempotent — re-writing with
 * the same content is harmless and keeps callers from needing to coordinate
 * "did I already write this".
 */
export function writeMcpConfig(tmpDir) {
  const path = resolve(tmpDir, 'ai-readiness-mcp-config.json');
  const config = {
    mcpServers: {
      altitude: {
        command: 'node',
        args: ['--experimental-strip-types', '--no-warnings', ALTITUDE_MCP_SERVER],
      },
    },
  };
  writeFileSync(path, JSON.stringify(config, null, 2));
  return path;
}

/**
 * Extra CLI args for the `claude` invocation, by treatment. Always includes
 * --strict-mcp-config (see header comment) — mcp-on additionally attaches
 * the generated config.
 */
export function claudeArgsForTreatment(treatment, mcpConfigPath) {
  if (treatment === 'mcp-on') {
    if (!mcpConfigPath || !existsSync(mcpConfigPath)) {
      throw new Error(`mcp-on treatment requires a written mcp config file; got ${mcpConfigPath}`);
    }
    return ['--strict-mcp-config', '--mcp-config', mcpConfigPath];
  }
  // mcp-off and with-skill both run with zero MCP servers attached — the
  // only variable between them is the prompt instruction below.
  return ['--strict-mcp-config'];
}

/** Extra prompt text appended to the task CONTEXT preamble, by treatment. */
export function promptSuffixForTreatment(treatment) {
  if (treatment === 'mcp-on') {
    return `\n\n## Treatment: mcp-on\n\nThe Altitude MCP server is attached to this session with these tools: ${ALTITUDE_MCP_TOOL_NAMES.join(', ')}. PREFER calling these tools over reading the raw digest JSON files directly — e.g. use \`altitude_get_component\` instead of grepping cem-digest.json, and \`altitude_get_tokens\` instead of grepping tokens-digest.json. This is the scenario under test: does having the MCP server change your output quality, cost, or latency versus reading the same information from static files?`;
  }
  if (treatment === 'with-skill') {
    if (!existsSync(SKILL_PATH)) {
      throw new Error(`with-skill treatment requires ${SKILL_PATH} to exist, but it does not — the skill this treatment tests may have been renamed or removed.`);
    }
    return `\n\n## Treatment: with-skill\n\nBefore answering, invoke the "altitude-component-authoring" skill (it is available in this session — use the Skill tool). It documents the end-to-end authoring flow and traps not written down elsewhere. This is the scenario under test: does the skill change your output quality versus the docs alone?`;
  }
  // mcp-off: no suffix — this is the control arm, unchanged from the
  // harness's pre-existing (docs-only) behavior.
  return '';
}

/**
 * Parses a completed `claude --output-format stream-json --verbose`
 * transcript (newline-delimited JSON, one object per line) for MCP
 * tool_use calls (R5 process assertion).
 *
 * HONEST MECHANISM, verified this wave (2026-08-25, two real minimal
 * invocations, $0.0740 + $0.1265): every `type: "assistant"` line's
 * `message.content` array may contain `{ type: "tool_use", name, input }`
 * items. MCP-server-backed tools are named `mcp__<serverName>__<toolName>`
 * — confirmed directly: calling `altitude_list_components` through the
 * "altitude" server produced a tool_use block named
 * `mcp__altitude__altitude_list_components`. This is a REAL trace of what
 * the agent did, not an inference from its final output text.
 */
export function extractToolCallsFromStreamJson(rawStreamText) {
  const allToolCalls = [];
  const mcpToolCalls = [];
  if (!rawStreamText) return { allToolCalls, mcpToolCalls };
  for (const line of rawStreamText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj;
    try { obj = JSON.parse(trimmed); } catch { continue; }
    if (obj.type !== 'assistant' || !Array.isArray(obj.message?.content)) continue;
    for (const block of obj.message.content) {
      if (block?.type !== 'tool_use' || !block.name) continue;
      allToolCalls.push(block.name);
      if (block.name.startsWith('mcp__altitude__')) mcpToolCalls.push(block.name);
    }
  }
  return { allToolCalls, mcpToolCalls };
}

/**
 * Finds the `type: "result"` envelope in a stream-json transcript — the
 * same result object --output-format json returns as its single line
 * (verified this wave — identical `total_cost_usd` / `usage` /
 * `structured_output` keys).
 *
 * DEFECT CAUGHT AND FIXED DURING THIS WAVE'S OWN real-run verification
 * (2026-08-25, Task A / mcp-on / haiku, $0.1995): this function used to
 * just take the LAST parseable JSON line, on the assumption the result
 * envelope is always last. It usually is — but a longer/more-tool-call-
 * heavy conversation (this trial: 26 turns, 6 MCP calls) can emit one more
 * `{"type":"system","subtype":"task_summary",...}` line AFTER the result
 * envelope. Blindly taking "last line" silently picked that summary object
 * instead — same JSON-parses-fine shape, wrong content — and every
 * downstream signal (cost, structured_output) read as missing. Still named
 * lastJsonLine for caller-compatibility, but now explicitly searches for
 * `type === "result"` rather than trusting line order.
 */
export function lastJsonLine(rawStreamText) {
  if (!rawStreamText) return null;
  const lines = rawStreamText.split('\n').map((l) => l.trim()).filter(Boolean);
  let fallback = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    let obj;
    try { obj = JSON.parse(lines[i]); } catch { continue; }
    if (obj.type === 'result') return obj;
    if (!fallback) fallback = obj; // last parseable line, in case no "result" line exists at all
  }
  return fallback;
}

/**
 * R5 process assertion: did the actual mcpToolCalls intersect the task's
 * expectedMcpTools? Only meaningful when treatment === 'mcp-on' (no MCP
 * server is attached otherwise, so the assertion would trivially always
 * fail and that failure would mean nothing).
 */
export function assertExpectedMcpTools(mcpToolCalls, expectedMcpTools, treatment) {
  if (treatment !== 'mcp-on') {
    return { applicable: false, passed: null, reason: `treatment is "${treatment}", not mcp-on — no MCP server was attached, so this assertion does not apply` };
  }
  if (!expectedMcpTools || expectedMcpTools.length === 0) {
    return { applicable: false, passed: null, reason: 'task defines no expectedMcpTools' };
  }
  const called = new Set(mcpToolCalls || []);
  const matchedAny = expectedMcpTools.some((t) => called.has(t));
  return {
    applicable: true,
    passed: matchedAny,
    expected: expectedMcpTools,
    actual: [...called],
    reason: matchedAny ? null : `agent called none of [${expectedMcpTools.join(', ')}] — actual mcp calls: [${[...called].join(', ') || '(none)'}]`,
  };
}
