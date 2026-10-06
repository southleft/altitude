/**
 * canvas-parity.mjs — score Altitude's code contracts against canvas contracts emitted from
 * the OpenPencil library that Altitude code generates (apps/open-pencil, tools/altitude).
 *
 * PURE. Callers pass parsed JSON; no fs, no spawn. The differ is the unchanged
 * `diffContracts()` from libs/altitude-mcp/src/lib/contract-diff.mjs, so this module only
 * turns its result into the three numbers .slate/AUDIT.md asks for, never one blended
 * figure:
 *
 *   API parity    props, variant axes and values, slots, states (dimensions prop,
 *                 variant-axis, variant-value, slot, state)
 *   token parity  every contract binding bound to the same variable on the canvas
 *                 (dimension token-binding)
 *   disagreements the differ's own list, unchanged
 *
 * Visual parity (pixel diff per plan.mjs case) is the third number in the audit and is not
 * measured here.
 */
import { diffContracts } from '../../libs/altitude-mcp/src/lib/contract-diff.mjs';

export const API_DIMENSIONS = ['prop', 'variant-axis', 'variant-value', 'slot', 'state'];
export const TOKEN_DIMENSIONS = ['token-binding'];

/** Default floors, in percent, for the aggregate across every built component. */
export const DEFAULT_FLOORS = Object.freeze({ api: 95, token: 90 });

const percent = (matched, total) => (total === 0 ? 100 : Math.round((matched / total) * 10000) / 100);

function tally(compared, disagreements, dimensions) {
  const total = compared;
  const missed = disagreements.filter((d) => dimensions.includes(d.dimension)).length;
  const matched = Math.max(0, total - missed);
  return { matched, total, percent: percent(matched, total) };
}

/**
 * One component: the differ's result reduced to API and token parity.
 *
 * `compared` counts come straight from diffContracts. A disagreement on a dimension is one
 * compared item that did not match, so `matched = compared - disagreements`, floored at 0
 * (a variant-value mismatch is reported against an axis already counted once).
 */
export function scoreComponent({ codeContract, canvasContract }) {
  const result = diffContracts({ codeContract, canvasContract });
  const c = result.compared;
  const api = tally(c.props + c.variants + c.slots + c.states, result.disagreements, API_DIMENSIONS);
  const token = tally(c.tokens, result.disagreements, TOKEN_DIMENSIONS);
  return {
    tag: codeContract?.id ?? canvasContract?.component ?? null,
    api,
    token,
    disagreements: result.disagreements,
    skipped: result.skipped,
    source: result.source,
  };
}

/** `dimension:kind` → count, most frequent first, for the summary line. */
export function disagreementKinds(rows) {
  const counts = new Map();
  for (const row of rows) {
    for (const d of row.disagreements) {
      const key = `${d.dimension}:${d.kind}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([kind, count]) => ({ kind, count }));
}

/** Aggregate across components and the floor verdict. */
export function summarize(rows, floors = DEFAULT_FLOORS) {
  const sum = (pick) => rows.reduce((acc, row) => ({ matched: acc.matched + pick(row).matched, total: acc.total + pick(row).total }), { matched: 0, total: 0 });
  const apiSum = sum((row) => row.api);
  const tokenSum = sum((row) => row.token);
  const api = { ...apiSum, percent: percent(apiSum.matched, apiSum.total) };
  const token = { ...tokenSum, percent: percent(tokenSum.matched, tokenSum.total) };
  const failures = [];
  if (api.percent < floors.api) failures.push(`API parity ${api.percent}% is below the ${floors.api}% floor`);
  if (token.percent < floors.token) failures.push(`token parity ${token.percent}% is below the ${floors.token}% floor`);
  return { components: rows.length, api, token, floors, kinds: disagreementKinds(rows), ok: failures.length === 0, failures };
}
