#!/usr/bin/env node
/**
 * bind-canvas-tokens.mjs — emit the Figma variable bindings a component's
 * CONTRACT already knows about, for canvas nodes that carry a hardcoded value
 * instead.
 *
 * WHY THIS EXISTS. `altitude-figma-sync` is explicit that you must never infer
 * a token from a value: 16 is simultaneously theme/space/@, space/16,
 * font-size/16 and line-height/16, and that guess once bound a button's
 * font-size to a spacing token. But the contract ALREADY records which token
 * each CSS property on each node uses — recovered from the authored
 * declaration, not from the computed value. So the binding does not have to be
 * guessed at all; it has to be JOINED.
 *
 * THE JOIN. contract-diff.mjs deliberately does not compare anatomy
 * structurally, because code nodes are keyed by DOM tag/class and canvas nodes
 * by Figma layer name "with no reliable 1:1 node mapping". That is true in
 * general and false for the nodes that matter here: generated sets name their
 * frames after the BEM class (`al-c-input__container`), so a name-to-class join
 * is exact where it exists and simply absent where it does not. Measured
 * 2026-08-31: 60 of 113 al-c-* canvas nodes join, and the misses are
 * concentrated in radio-group/checkbox-group, whose nodes belong to their CHILD
 * components. Nothing is guessed — a node that does not join is skipped and
 * counted.
 *
 * THE SAFETY RULE, and it is the whole reason this is not a one-liner. A class
 * appears in many variant cases, and a property's token can DIFFER between them
 * (al-button's background-color is transparent on Bare and danger-strong on
 * Danger+Hover). The ops here are applied to every variant of a set at once, so
 * emitting a per-variant token would paint the wrong colour on most of them.
 * An op is therefore emitted ONLY when every case that mentions that class
 * agrees on the token. Conflicts are reported, never silently resolved — they
 * are real per-variant bindings and need the per-variant path, not this one.
 *
 * Usage:
 *   node scripts/contracts/bind-canvas-tokens.mjs --component al-input [--dry-run]
 *   node scripts/contracts/bind-canvas-tokens.mjs --all [--dry-run]
 *
 * Writes .altitude/figma-sync/ops/bind-tokens.json — apply it with the plugin
 * snippet the file itself carries under `apply`. It never talks to Figma.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const CONTRACTS = path.join(ROOT, '.altitude', 'contracts', 'altitude');
const CANVAS = path.join(ROOT, '.altitude', 'figma-sync', 'canvas-contracts');
const OUT = path.join(ROOT, '.altitude', 'figma-sync', 'ops', 'bind-tokens.json');

/**
 * CSS property -> the Figma field(s) that express it.
 *
 * Only properties with an UNAMBIGUOUS Figma counterpart are listed. Notably
 * absent: width/height (a `width: size(5)` is a calc multiple, and Figma sizing
 * is auto-layout-dependent — see the base/space note in contract-diff.mjs), and
 * anything shorthand, which the measurement pass has already expanded.
 */
const FIELD_MAP = {
  'padding-top': ['paddingTop'],
  'padding-right': ['paddingRight'],
  'padding-bottom': ['paddingBottom'],
  'padding-left': ['paddingLeft'],
  gap: ['itemSpacing'],
  'row-gap': ['itemSpacing'],
  'column-gap': ['counterAxisSpacing'],
  'border-radius': ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'],
  'border-top-width': ['strokeTopWeight'],
  'border-bottom-width': ['strokeBottomWeight'],
  'border-left-width': ['strokeLeftWeight'],
  'border-right-width': ['strokeRightWeight'],
  // fills are node-type-dependent and the same class covers both shapes: an
  // <input> is a FRAME with a background AND a nested TEXT run. Mapping both
  // `background-color` and `color` to fills[0].color unqualified would paint
  // the field's surface with its text colour. `only` pins each to the node
  // kind that can legitimately carry it.
  'background-color': [{ field: 'fills[0].color', only: 'not-text' }],
  color: [{ field: 'fills[0].color', only: 'text' }],
  'border-color': ['strokes[0].color'],
  'border-top-color': ['strokes[0].color'],
  'font-size': [{ field: 'fontSize', only: 'text' }],
  'letter-spacing': [{ field: 'letterSpacing', only: 'text' }],
  // `opacity` is deliberately absent. It reaches a class only through the
  // DISABLED case (attribute-driven states are recorded as anatomy cases, not
  // states — altitude-figma-repair trap 11), so binding it set-wide would fade
  // every variant of the component to 40%. Disabled opacity is a per-variant
  // binding; it belongs on the Disabled variants alone.
};

/** Token families no Figma field can express — kept in step with contract-diff.mjs. */
const UNBINDABLE = ['base/space', 'z-index/', 'typography/font-weight/', 'font-weight/'];
const isUnbindable = (v) => UNBINDABLE.some((p) => v.startsWith(p));

const argOf = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
};

/**
 * class -> cssProp -> { values:Set(figmaVar), seen:number }, plus how many
 * times the class itself occurred, across root AND every variant case.
 *
 * Both counters are needed, and only tracking `values` is the bug that nearly
 * shipped. A property carried by SOME cases and not others is conditional even
 * when the cases that do carry it all agree — nothing contradicts it, so an
 * agreement test alone waves it through. `opacity` was the live example: it
 * reaches a class only via the disabled case, agrees with itself trivially, and
 * would have been bound set-wide, fading every variant. An op is emitted only
 * when the property appears in EVERY occurrence of the class.
 */
function codeTokensByClass(contract) {
  const byClass = new Map();
  const visit = (node) => {
    if (!node || node.component) return; // nested component: its own contract's job
    const classes = (node.cls || '').split(/\s+/).filter((c) => c.startsWith('al-c-'));
    for (const cls of classes) {
      if (!byClass.has(cls)) byClass.set(cls, { occurrences: 0, props: new Map() });
      const entry = byClass.get(cls);
      entry.occurrences += 1;
      for (const [cssProp, binding] of Object.entries(node.tokens ?? {})) {
        const figma = binding?.figma;
        if (!figma) continue;
        if (!entry.props.has(cssProp)) entry.props.set(cssProp, { values: new Set(), seen: 0 });
        const rec = entry.props.get(cssProp);
        rec.values.add(figma);
        rec.seen += 1;
      }
    }
    for (const child of node.children ?? []) visit(child);
  };
  const anatomy = contract.anatomy ?? {};
  visit(anatomy.root ?? null);
  for (const c of anatomy.cases ?? []) visit(c?.root ?? null);
  return byClass;
}

/** Canvas node names present in the observed anatomy (the join's left side). */
function canvasNodeNames(canvas) {
  const names = new Set();
  const walk = (n) => {
    if (!n) return;
    if (n.name) names.add(n.name);
    for (const c of n.children ?? []) walk(c);
  };
  walk(canvas.anatomy ?? null);
  return names;
}

function planFor(tag) {
  const contractPath = path.join(CONTRACTS, `${tag}.contract.json`);
  const canvasPath = path.join(CANVAS, `${tag}.canvas.json`);
  if (!fs.existsSync(contractPath) || !fs.existsSync(canvasPath)) return null;

  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const canvas = JSON.parse(fs.readFileSync(canvasPath, 'utf8'));
  const setNodeId = canvas.figma?.nodeId ?? null;
  if (!setNodeId) return null;

  const byClass = codeTokensByClass(contract);
  const present = canvasNodeNames(canvas);

  const byClassOps = {};
  const conflicts = [];
  const unmapped = new Set();
  let ops = 0;

  const conditional = [];
  for (const [cls, entry] of byClass) {
    if (!present.has(cls)) continue; // no such node on canvas — nothing to bind
    for (const [cssProp, rec] of entry.props) {
      const fields = FIELD_MAP[cssProp];
      if (!fields) { unmapped.add(cssProp); continue; }
      const values = [...rec.values].filter((v) => !isUnbindable(v));
      if (!values.length) continue;
      if (values.length > 1) {
        // Real per-variant binding. Emitting one would repaint the others.
        conflicts.push({ cls, cssProp, values: values.sort() });
        continue;
      }
      if (rec.seen < entry.occurrences) {
        // Present in only some cases — conditional, however unanimous.
        conditional.push({ cls, cssProp, value: values[0], seen: rec.seen, of: entry.occurrences });
        continue;
      }
      for (const spec of fields) {
        const field = typeof spec === 'string' ? spec : spec.field;
        const only = typeof spec === 'string' ? null : spec.only;
        (byClassOps[cls] ??= []).push({ field, variable: values[0], from: cssProp, only });
        ops += 1;
      }
    }
  }

  return {
    tag,
    setNodeId,
    setName: canvas.figma?.name ?? null,
    ops,
    byClass: byClassOps,
    conflicts,
    conditional,
    unmappedCssProps: [...unmapped].sort(),
  };
}

const tags = process.argv.includes('--all')
  ? fs.readdirSync(CANVAS).filter((f) => f.endsWith('.canvas.json')).map((f) => f.slice(0, -12)).sort()
  : [argOf('--component')].filter(Boolean);

if (!tags.length) {
  console.error('usage: bind-canvas-tokens.mjs --component <al-tag> | --all [--dry-run]');
  process.exit(2);
}

const plans = tags.map(planFor).filter((p) => p && p.ops > 0);
const totalOps = plans.reduce((n, p) => n + p.ops, 0);
const totalConflicts = plans.reduce((n, p) => n + p.conflicts.length, 0);

for (const p of plans) {
  console.log(`[bind] ${p.tag}: ${p.ops} binding(s) across ${Object.keys(p.byClass).length} node name(s)` +
    (p.conflicts.length ? `, ${p.conflicts.length} per-variant conflict(s) left alone` : ''));
  if (process.argv.includes('--verbose')) {
    for (const [cls, list] of Object.entries(p.byClass)) {
      for (const op of list) console.log(`         ${cls}.${op.field} <- ${op.variable}  (${op.from})`);
    }
    for (const c of p.conflicts) console.log(`         SKIP ${c.cls}.${c.cssProp}: differs per variant (${c.values.join(' | ')})`);
    for (const c of p.conditional) console.log(`         SKIP ${c.cls}.${c.cssProp}: conditional — present in ${c.seen}/${c.of} cases (${c.value})`);
  }
}
console.log(`[bind] ${plans.length} component(s), ${totalOps} binding(s), ${totalConflicts} per-variant conflict(s) deliberately not bound.`);

if (!process.argv.includes('--dry-run')) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify({
    generated: new Date().toISOString(),
    note: 'Apply inside Figma: for each plan, walk EVERY variant of setNodeId and, for each descendant whose name is a key of byClass, bind the listed fields. Conflicts are intentionally absent — they are per-variant and must not be applied set-wide.',
    plans,
  }, null, 2)}\n`, 'utf8');
  console.log(`[bind] wrote ${path.relative(ROOT, OUT)}`);
}
