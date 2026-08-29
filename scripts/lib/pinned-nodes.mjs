/**
 * pinned-nodes.mjs — classify a parity manifest's PINNED Figma node ids
 * against what the live document actually contains.
 *
 * T2, spec 2026-08-29-parity-judgement-gates-and-evals.
 *
 * THE TRAP THIS EXISTS FOR (altitude-figma-repair/SKILL.md trap 1, found live
 * 2026-08-27): `figma.getNodeByIdAsync('3435:877')` happily returns a detached
 * COMPONENT_SET after its page has been deleted. `node.removed` is `false` and
 * its parent chain reaches no PAGE. **"It resolved" is not proof it is in the
 * document.** 11 of 20 pinned ids in the parity manifest were ghosts, and
 * `extract-canvas.mjs` extracted from the ghost — so the tooling reported a
 * DELETED set as in-sync, with the old set's axes, while the live set had
 * different ones.
 *
 * `extract-canvas.mjs` was fixed at the point of use (it liveness-checks, then
 * falls back to by-name). What was never fixed is the MANIFEST: the stale id
 * stays pinned, `buildAiPrompt()` keeps handing agents `node <id>`, and
 * `figmaNodeUrlFor()` keeps building a deep link to a node that is not in the
 * file. Nothing reported it. This module is the report.
 *
 * The classifier is a pure function on a probe result so it can be tested
 * offline — the probe itself needs a live Figma connection through the shim
 * and cannot run in CI.
 */

/**
 * JSON, with every non-ASCII UTF-16 unit escaped as \\uXXXX.
 *
 * Values injected into Figma plugin source travel as a string inside a JSON
 * payload over the shim's HTTP hop. The component page prefix is an emoji
 * ("wrench + space", U+1F6E0), so at least one injected value is always
 * non-ASCII. Escaping here means no step of that pipeline has to agree about
 * encoding. `check-parity.mjs` hand-wrote the escape sequence into its
 * template for the same reason; this does it without the escaping games that
 * are their own documented trap in the generator files (see
 * scripts/contracts/figma/check-parse.mjs).
 *
 * Iterates by UTF-16 unit (charCodeAt), NOT by code point (for..of): an emoji
 * is a surrogate pair and \\uXXXX addresses one half at a time. Reading it as
 * a single code point would emit an escape no JS parser accepts.
 */
export function jsonAscii(value) {
  const s = JSON.stringify(value);
  let out = '';
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    out += c < 0x80 ? s[i] : '\\u' + c.toString(16).padStart(4, '0');
  }
  return out;
}

/** Every verdict this can return. `ok` is the only one that is not a finding. */
export const VERDICT = {
  OK: 'ok',
  GHOST: 'ghost',
  MISSING: 'missing',
  RENAMED: 'renamed',
  WRONG_TYPE: 'wrong-type',
};

/**
 * Classify one pinned entry.
 *
 * @param {{tag: string, name: string|null, nodeId: string}} pin manifest's `figma` record for a tag
 * @param {{resolved: boolean, live: boolean, type: string|null, name: string|null}|undefined} probe
 *   what the document said about that id. `undefined` is treated as unresolved
 *   rather than throwing — a probe that silently dropped an id must not read
 *   as a pass.
 * @param {Record<string, {id: string, page: string}[]>} setsByName live 🛠-page
 *   COMPONENT_SETs indexed by name, used to suggest a repin.
 */
export function classifyPin(pin, probe, setsByName = {}) {
  const live = setsByName[pin.name] ?? [];
  // Only suggest a repin when it is unambiguous. Two sets sharing a name is
  // its own documented trap (repair SKILL trap 10: "two sets on one page share
  // a NAME → tools disagree"); guessing between them would be inventing a fact.
  const repinTo = live.length === 1 && live[0].id !== pin.nodeId ? live[0] : null;
  const base = { tag: pin.tag, name: pin.name, nodeId: pin.nodeId, repinTo };

  if (!probe || !probe.resolved) {
    return { ...base, verdict: VERDICT.MISSING, detail: 'the pinned id does not resolve in this file at all' };
  }
  if (!probe.live) {
    return {
      ...base,
      verdict: VERDICT.GHOST,
      detail: 'the id resolves but the node is detached — its parent chain reaches no page in this document',
    };
  }
  if (probe.type !== 'COMPONENT_SET') {
    return { ...base, verdict: VERDICT.WRONG_TYPE, detail: `the pinned node is a ${probe.type}, not a COMPONENT_SET` };
  }
  if (pin.name && probe.name !== pin.name) {
    return {
      ...base,
      verdict: VERDICT.RENAMED,
      detail: `the live set is named "${probe.name}", the manifest says "${pin.name}"`,
      liveName: probe.name,
    };
  }
  return { ...base, verdict: VERDICT.OK, detail: `resolves to the live set "${probe.name}"`, repinTo: null };
}

/** Classify a whole manifest's worth of pins. Order follows the input. */
export function classifyPins(pins, probesById, setsByName = {}) {
  return pins.map((pin) => classifyPin(pin, probesById[pin.nodeId], setsByName));
}

/** Findings only — everything that is not `ok`. */
export function findings(results) {
  return results.filter((r) => r.verdict !== VERDICT.OK);
}

/**
 * Which results can be repaired by rewriting the manifest's nodeId?
 *
 * A `renamed` pin is deliberately NOT repairable here: the id is correct and
 * it is the NAME that disagrees, which is a curation question (does the set
 * get renamed, or the manifest?) rather than a mechanical repin.
 */
export function repairable(results) {
  return results.filter((r) => r.repinTo && (r.verdict === VERDICT.GHOST || r.verdict === VERDICT.MISSING));
}
