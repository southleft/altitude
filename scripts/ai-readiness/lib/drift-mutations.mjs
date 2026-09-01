/**
 * drift-mutations.mjs — turn the repo's tracked contract pairs into eval cases
 * with a machine-checkable answer key.
 *
 * T5, spec 2026-08-29-parity-judgement-gates-and-evals.
 *
 * THE IDEA. `libs/altitude-mcp/src/lib/contract-diff.mjs` already computes,
 * deterministically, exactly which props / variant values / states / token
 * bindings disagree between a component's CODE contract and its CANVAS
 * contract. That makes it an answer key. Take a real tracked pair, apply a
 * NAMED mutation to one side, and the differ tells you precisely what a
 * competent reconciliation agent should report — no human labelling, no LLM in
 * the grading path, and 35 components' worth of corpus for free.
 *
 * DETERMINISM IS NOT OPTIONAL. Every mutation below picks its target by a
 * stable rule (sorted order, first/last element) rather than at random, so the
 * same inputs always produce the same case and the same answer key. A random
 * mutation would make the corpus unreproducible and the tracked expectations
 * meaningless — and `Math.random()` is already banned in this repo's workflow
 * scripts for the same reason.
 *
 * Mutations are applied to the CANVAS side by default because that is the
 * direction the reconciliation prompt is usually pointed: the code moved, or
 * somebody edited the Figma set, and the agent has to find what disagrees.
 *
 * The corpus deliberately includes a `none` mutation — a pair with NOTHING
 * wrong. A suite that only ever asks "find the drift" trains and measures an
 * agent that always finds drift; the balanced set is the point.
 */

import { PAIRING_CONVENTIONS, normKey, unbindableReason } from '../../../libs/altitude-mcp/src/lib/contract-diff.mjs';

const clone = (o) => JSON.parse(JSON.stringify(o));

/**
 * Axes with at least `min` values, in a stable order, EXCLUDING "State".
 *
 * The State axis is deliberately skipped. `contract-diff.mjs` excludes it from
 * the component-property comparison by design (every Figma set carries one
 * with no code attribute counterpart) and compares it instead through the
 * dedicated `state` dimension, sourced from `canvasContract.states` rather
 * than from the axis's values. So mutating State's VALUES changes nothing the
 * differ looks at -- which is exactly the trap an earlier draft of this file
 * fell into: it targeted State on most components and reported the resulting
 * invisible mutations as "the differ is blind", when the differ was right and
 * the mutation was pointed at the wrong thing.
 */
const axesWithValues = (canvas, min = 1) =>
  (canvas.variantAxes ?? [])
    .filter((a) => Array.isArray(a.values) && a.values.length >= min && normKey(a.name) !== normKey('state'))
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

/**
 * Is this canvas property claimed by a slot-pairing convention?
 *
 * Dropping one of a redundant pair (a set carrying BOTH "Icon After" and
 * "Slot After" satisfies `slot-after` either way) produces no disagreement,
 * so those are not usable needles.
 */
const claimedByConvention = (name) => PAIRING_CONVENTIONS.some((c) => c.canvasPattern.test(String(name)));

/**
 * Every mutation. Each declares:
 *   id          stable name, used in the case id and in the tracked answer key
 *   side        which contract it edits
 *   describe    one line for the case file, so a reader knows what was done
 *   applicable  can this pair take this mutation at all?
 *   apply       returns a NEW pair; never edits its input
 */
export const MUTATIONS = [
  {
    id: 'none',
    side: 'none',
    describe: () => 'nothing was changed — the two sides agree',
    applicable: () => true,
    apply: (pair) => clone(pair),
  },
  {
    id: 'drop-variant-value',
    side: 'canvas',
    describe: (t) => `removed the variant value "${t.axis}=${t.value}" from the canvas set`,
    applicable: (pair) => axesWithValues(pair.canvasContract, 2).length > 0,
    apply: (pair) => {
      const next = clone(pair);
      const axis = axesWithValues(next.canvasContract, 2)[0];
      const target = next.canvasContract.variantAxes.find((a) => a.name === axis.name);
      const value = [...target.values].sort().pop();
      target.values = target.values.filter((v) => v !== value);
      // componentProperties carries the same vocabulary for VARIANT props;
      // leaving it behind would make the pair internally inconsistent in a way
      // no real Figma set ever is.
      const prop = (next.canvasContract.componentProperties ?? []).find((p) => p.name === axis.name);
      if (prop?.values) prop.values = prop.values.filter((v) => v !== value);
      return { pair: next, target: { axis: axis.name, value } };
    },
  },
  {
    id: 'add-variant-value',
    side: 'canvas',
    describe: (t) => `added a variant value "${t.axis}=${t.value}" to the canvas set that the code does not define`,
    applicable: (pair) => axesWithValues(pair.canvasContract, 1).length > 0,
    apply: (pair) => {
      const next = clone(pair);
      const axis = axesWithValues(next.canvasContract, 1)[0];
      const target = next.canvasContract.variantAxes.find((a) => a.name === axis.name);
      const value = 'Ghostly';
      target.values = [...target.values, value].sort();
      const prop = (next.canvasContract.componentProperties ?? []).find((p) => p.name === axis.name);
      if (prop?.values) prop.values = [...prop.values, value].sort();
      return { pair: next, target: { axis: axis.name, value } };
    },
  },
  {
    id: 'rename-axis',
    side: 'canvas',
    describe: (t) => `renamed the canvas variant axis "${t.from}" to "${t.to}"`,
    applicable: (pair) => axesWithValues(pair.canvasContract, 1).length > 0,
    apply: (pair) => {
      const next = clone(pair);
      const axis = axesWithValues(next.canvasContract, 1).slice(-1)[0];
      // CAPTURE THE NAME FIRST. `axesWithValues` returns references INTO the
      // cloned contract, so assigning `axis.name` below also changes what
      // `axis.name` reads -- an earlier draft looked the component property up
      // by `axis.name` afterwards, found nothing, and silently renamed only
      // half the pair. The mutation then produced no diff at all, and the
      // target it reported was `{from: "X Renamed", to: "X Renamed"}`, which
      // is what gave the bug away.
      const from = axis.name;
      const to = `${from} Renamed`;
      axis.name = to;
      const prop = (next.canvasContract.componentProperties ?? []).find((p) => p.name === from);
      if (prop) prop.name = to;
      return { pair: next, target: { from, to } };
    },
  },
  {
    id: 'drop-prop',
    side: 'canvas',
    describe: (t) => `removed the component property "${t.prop}" from the canvas set`,
    applicable: (pair) => (pair.canvasContract.componentProperties ?? [])
      .some((p) => p.type !== 'VARIANT' && !claimedByConvention(p.name)),
    apply: (pair) => {
      const next = clone(pair);
      const props = (next.canvasContract.componentProperties ?? [])
        .filter((p) => p.type !== 'VARIANT' && !claimedByConvention(p.name));
      const prop = props.slice().sort((a, b) => a.name.localeCompare(b.name))[0];
      next.canvasContract.componentProperties = next.canvasContract.componentProperties.filter((p) => p.name !== prop.name);
      return { pair: next, target: { prop: prop.name } };
    },
  },
  {
    id: 'drop-state',
    side: 'canvas',
    describe: (t) => `removed the state "${t.state}" from the canvas set`,
    applicable: (pair) => (pair.canvasContract.states ?? []).length > 0,
    apply: (pair) => {
      const next = clone(pair);
      const state = [...next.canvasContract.states].sort()[0];
      next.canvasContract.states = next.canvasContract.states.filter((s) => s !== state);
      return { pair: next, target: { state } };
    },
  },
  {
    id: 'retoken',
    side: 'canvas',
    describe: (t) => `rebound the canvas from Figma variable "${t.from}" to "${t.to}"`,
    // `contract-diff.mjs` compares token bindings at the level of the FIGMA
    // VARIABLE NAME. It reads the canvas side by WALKING `anatomy`
    // boundVariables (so it can skip nested-instance subtrees whose bindings
    // belong to their own set), falling back to the flat `tokens` list when a
    // canvas dump carries no anatomy. So mutate BOTH: an earlier draft touched
    // only `anatomy` and was invisible; a later one touched only `tokens` and
    // went invisible again the moment the walk landed. Mutate what is actually
    // compared, on every path that compares it.
    applicable: (pair) => (pair.canvasContract.tokensOwn ?? pair.canvasContract.tokens ?? []).some((t) => !unbindableReason(t))
      && pair.codeContract.anatomySource === 'measured'
      && pair.canvasContract.anatomySource === 'observed',
    apply: (pair) => {
      const next = clone(pair);
      // Pick a token the differ actually COMPARES. Some families (font-weight,
      // z-index, base/space) are skipped as unbindable, and several of them
      // sort first, so "the alphabetically first token" would silently mutate
      // something the differ ignores and inject no disagreement at all.
      const candidates = [...(next.canvasContract.tokensOwn ?? next.canvasContract.tokens)]
        .sort()
        .filter((t) => !unbindableReason(t));
      const from = candidates[0];
      const to = 'theme/color/content/nonexistent-eval-token';
      // Deep rename across the WHOLE canvas contract rather than a named list
      // of fields. The differ has now changed which surface it reads three
      // times -- flat `tokens`, then the `anatomy` walk, then `tokensOwn` /
      // `tokensNested` -- and each time a field-by-field mutation silently
      // stopped moving it while still "passing" its own applicability check.
      // Renaming every occurrence cannot fall out of step with that choice.
      const renameDeep = (node) => {
        if (Array.isArray(node)) {
          for (let i = 0; i < node.length; i += 1) {
            if (node[i] === from) node[i] = to;
            else renameDeep(node[i]);
          }
          return;
        }
        if (!node || typeof node !== 'object') return;
        for (const [key, value] of Object.entries(node)) {
          if (value === from) node[key] = to;
          else renameDeep(value);
        }
      };
      renameDeep(next.canvasContract);
      return { pair: next, target: { from, to } };
    },
  },
];

export const MUTATION_IDS = MUTATIONS.map((m) => m.id);

/** Look one up by id, or null. */
export function mutationById(id) {
  return MUTATIONS.find((m) => m.id === id) ?? null;
}

/**
 * Apply a mutation by id.
 *
 * @returns {{pair: object, target: object}|null} null when the mutation does
 *   not apply to this pair — an unapplicable mutation is a case that should
 *   not exist, never a case with an empty answer key.
 */
export function applyMutation(id, pair) {
  const mutation = mutationById(id);
  if (!mutation || !mutation.applicable(pair)) return null;
  const result = mutation.apply(pair);
  // `none` returns the pair directly; everything else returns {pair, target}.
  return result.pair ? result : { pair: result, target: {} };
}
