#!/usr/bin/env node
/**
 * build-component-ops.mjs — T3: the per-component generalisation of build-button-ops.mjs.
 *
 * Reads the measured spec trees (measure-components.mjs) and, for EVERY entry in
 * plan.mjs, emits the Figma bind operations for each `case x state` — the same
 * shape that drove the successful in-place Button repair, plus:
 *
 *   - `children`: the simplified shadow-DOM box tree, so structured components
 *     (checkbox square, dismiss button, progress track, date grid) no longer
 *     collapse to "one box + one text node". Auto-layout props AND measured
 *     offsets are both carried, so either build strategy stays possible.
 *   - `differsFromDefault`: per state row, whether the authored rules actually
 *     change anything — the honest input to "which State variants earn a slot".
 *
 * Every colour/number is a VARIABLE binding resolved from the token the CSS names
 * (token-map.mjs). Nothing is inferred from computed colours.
 *
 * Usage:
 *   node scripts/figma-atoms/build-component-ops.mjs
 * Reads:   .altitude/figma-sync/spec-light.json, spec-dark.json
 * Writes:  .altitude/figma-sync/ops/<key>.json (one per plan entry) + index.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PLAN } from './plan.mjs';
import { figmaVariableFor } from './token-map.mjs';
import { scope, scopePlan, projectArg } from './project-scope.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SC = scope(projectArg());
// Node ids in an instance map are FILE-scoped. A project with no map of its own
// gets a no-op resolver rather than another file's ids (ds-project.mjs is explicit
// that this must never fall back).
const { resolveInstance } = SC.instanceMapPath
  ? await import(pathToFileURL(SC.instanceMapPath).href)
  : { resolveInstance: () => null };
const SYNC = SC.dirs.sync;
const OPS_DIR = SC.dirs.ops;
mkdirSync(OPS_DIR, { recursive: true });

const specLight = JSON.parse(readFileSync(join(SYNC, 'spec-light.json'), 'utf8'));
const specDark = JSON.parse(readFileSync(join(SYNC, 'spec-dark.json'), 'utf8'));

const STATES = ['default', 'hover', 'focus', 'active', 'disabled'];
const title = (s) => String(s).split(/[-_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

// spec rows indexed by `key::case::state` per mode
const index = (spec) => {
  const m = new Map();
  for (const state of Object.keys(spec)) {
    for (const row of spec[state]) m.set(`${row.tag}::${row.case}::${state}`, row);
  }
  return m;
};
const lightBy = index(specLight);
const darkBy = index(specDark);

/** First descendant carrying visible text — typography truth for the label. */
function textNode(node) {
  if (!node) return null;
  if (node.text) return node;
  for (const k of node.kids || []) {
    const hit = textNode(k);
    if (hit) return hit;
  }
  return null;
}

/**
 * Collapse each instanced child to the FACTS THAT REACH FIGMA before the state signature
 * is taken. A nested atom becomes an INSTANCE pinned to a resolved variant, so its own
 * internal pixels are irrelevant to whether the MOLECULE has a state delta.
 *
 * Without this, every molecule inherits its children's interaction states: al-menu has no
 * :hover rule at all, yet the menu-items inside it do, so the raw deep signature reported
 * a delta for all four states and produced 10 variants where 2 were real — and the 8 fakes
 * would render pixel-identically, because the instances are pinned to State=Default.
 *
 * What IS kept is the instance's RESOLVED props: when a molecule's state genuinely
 * propagates to its children (Checkbox Group Disabled sets isdisabled on every
 * al-checkbox), the resolved variant changes and the delta is correctly preserved.
 */
function pruneInstances(kids) {
  return (kids || []).map((k) => {
    if (k.host) {
      const inst = resolveInstance(k.host, k.hostAttrs || {}, k.hostText, k.hostSlots || []);
      return inst
        ? { host: k.host, props: inst.props, text: inst.text, bools: inst.bools }
        // Unmapped/missing in Figma -> it will be FLATTENED, so its pixels do count.
        : { host: k.host, kids: pruneInstances(k.kids) };
    }
    return { ...k, kids: pruneInstances(k.kids) };
  });
}

/** Simplified box tree for structural fidelity (offsets AND auto-layout props). */
function simplify(node, v, depth = 0) {
  if (!node || depth > 6) return null;
  const t = node.tokens || {};
  return {
    tag: node.host || node.tag,
    // Instance-boundary passthrough: `host` marks a nested al-* component, and the
    // builder turns it into a Figma INSTANCE instead of re-flattening its shadow tree.
    // Kept SEPARATE from `tag` (which collapses the two) so the builder can tell a
    // nested component apart from a plain element that happens to be named al-*.
    host: node.host || undefined,
    hostAttrs: node.hostAttrs || undefined,
    hostBox: node.hostBox || undefined,
    hostText: node.hostText || undefined,
    hostSlots: node.hostSlots || undefined,
    cls: node.cls || undefined,
    slotted: node.slotted || undefined,
    box: { x: node.x, y: node.y, w: node.w, h: node.h },
    layout: {
      display: node.computed.display, dir: node.computed.dir,
      align: node.computed.align, justify: node.computed.justify,
      gap: node.computed.gap, pad: node.computed.pad,
      pos: node.computed.pos,
    },
    fill: v(t['background-color']),
    textColor: v(t['color']),
    // MEASURED fallbacks. A declaration with no token behind it used to emit
    // nothing at all, and build-page then left the node unpainted — text fell back
    // to Figma's default BLACK, which is invisible on the dark canvas this brand
    // ships. Carrying the measured colour keeps the same policy build-section uses:
    // bind where a token exists, use the literal where one honestly does not.
    fillLit: node.computed.bg || null,
    textColorLit: node.computed.fc || null,   // light-tree value; roots above prefer dark
    stroke: t['border-top-color'] ? { color: v(t['border-top-color']), width: v(t['border-top-width']) } : undefined,
    radius: t['border-top-left-radius'] ? v(t['border-top-left-radius']) : undefined,
    // Focus rings (al-focus mixin = outline), disabled opacities and shadows land on
    // DESCENDANTS as often as on the root — without these the state signature is blind
    // to them (toggle's :focus-visible lives on its hidden input).
    opacity: t['opacity'] ? v(t['opacity']) : undefined,
    outline: t['outline-width'] || t['outline-color']
      ? { width: v(t['outline-width']), color: v(t['outline-color']) } : undefined,
    shadow: t['box-shadow'] ? v(t['box-shadow']) : (node.computed.shadow || undefined),
    gradient: node.authored && node.authored['background-image'] ? node.authored['background-image'] : undefined,
    text: node.text || undefined,
    font: node.text ? {
      ff: node.computed.ff, fs: node.computed.fs, fw: node.computed.fw, lh: node.computed.lh,
    } : undefined,
    kids: (node.kids || []).map((k) => simplify(k, v, depth + 1)).filter(Boolean),
  };
}

const summary = [];

for (const entry of scopePlan(PLAN, SC)) {
  const unresolved = new Set();
  const hooks = new Set();
  const compPrefix = entry.tag.replace(/^al-/, '') + '-';
  const v = (css) => {
    if (!css) return null;
    const f = figmaVariableFor(css);
    if (!f) {
      // `--al-toggle-height: 22px` is a component CONSTANT defined on the host, not a
      // design token — unwrapVar rightly kept it. Classify it as a hook, not a miss.
      (css.startsWith(compPrefix) ? hooks : unresolved).add(css);
      return null;
    }
    return f;
  };

  const rows = [];
  const missing = [];
  // Attribute-driven states (stateCases in plan.mjs) REPLACE the pseudo-rewritten
  // measurement for that State value: al-toggle's disabled is `isdisabled` +
  // `.al-is-disabled`, not `:disabled`, so the pseudo pass sees nothing there.
  const replaced = new Set(entry.stateCases || []);
  const baseCases = entry.cases.filter((c) => !c.stateOf);
  const stateCases = entry.cases.filter((c) => c.stateOf);
  const defaultSigByAxes = new Map();

  const work = [];
  for (const c of baseCases) {
    for (const state of STATES) {
      if (state !== 'default' && replaced.has(title(state))) continue;
      work.push({ c, pseudo: state, stateName: title(state) });
    }
  }
  for (const c of stateCases) work.push({ c, pseudo: 'default', stateName: c.stateOf });

  for (const { c, pseudo, stateName } of work) {
    {
      const state = pseudo;
      const l = lightBy.get(`${entry.key}::${c.id}::${state}`);
      const d = darkBy.get(`${entry.key}::${c.id}::${state}`);
      if (!l || !l.root) { missing.push(`${c.id}::${state}`); continue; }

      const root = l.root;
      const t = root.tokens || {};
      const tn = textNode(root);
      const darkTextNode = d && d.root ? textNode(d.root) : null;
      const tt = (tn && tn.tokens) || {};

      // Delta detection must be DEEP: list-item's hover lands on a descendant, not the
      // root, so a root-only signature reports 0 state deltas for it. The simplified
      // tree carries every node's token bindings; geometry is excluded because it is
      // measured in the default state regardless (pseudo-states are never applied).
      // kids is EMITTED as the build tree and must keep every node's box/tokens.
      // The pruned copy is for the state SIGNATURE only — sharing one variable between
      // the two silently stripped geometry out of the build input.
      const kids = simplify(root, v).kids;
      const sig = JSON.stringify(
        [t, tt, root.authored['border-top-style'], pruneInstances(kids)],
        (k, val) => (k === 'box' ? undefined : val),
      );
      const axesKey = JSON.stringify(c.axisValues);
      const isDefaultRow = stateName === 'Default';
      if (isDefaultRow) defaultSigByAxes.set(axesKey, sig);
      const defaultSig = defaultSigByAxes.get(axesKey);
      // Attribute-driven state rows are REAL renderings (the browser applied the
      // attrs), so their computed values are trustworthy — unlike pseudo rows.
      const computedTrust = pseudo === 'default';

      const axisParts = Object.entries(c.axisValues).map(([axis, value]) => {
        const mapped = (entry.valueNames[axis] || {})[value] || title(value);
        return `${axis}=${mapped}`;
      });

      /**
       * Figma variables cannot do ARITHMETIC. empty-state authors
       *   padding: calc(var(--al-theme-space) * 3) var(--al-theme-space)
       * and the token extractor reports `theme-space` for all four sides — the "* 3"
       * is silently dropped, so Figma bound 16px where the browser renders 48px and the
       * component came out 84px short. When a declaration multiplies a token, the only
       * faithful thing Figma can hold is the computed LITERAL.
       */
      const calcLit = (authored, computedPx) =>
        (authored && authored.indexOf('calc(') !== -1 && typeof computedPx === 'number'
          ? { lit: computedPx }
          : null);
      const padShorthand = root.authored['padding'];
      const padOf = (side, idx) => {
        const authored = root.authored['padding-' + side] || padShorthand;
        const px = root.computed.pad ? root.computed.pad[idx] : undefined;
        return calcLit(authored, px) || v(t['padding-' + side]);
      };

      const styleOf = root.authored['border-top-style'];
      const hasBorder = styleOf && styleOf !== 'none'
        && (t['border-top-width'] || root.computed.bw > 0);

      rows.push({
        variant: [`State=${stateName}`, ...axisParts].join(', '),
        state: stateName,
        axes: c.axisValues,
        layout: {
          display: root.computed.display, dir: root.computed.dir,
          align: root.computed.align, justify: root.computed.justify,
        },
        differsFromDefault: isDefaultRow ? undefined : sig !== defaultSig,
        fill: v(t['background-color']),
        textColor: v(t['color'] || tt['color']),
        // DARK is the resolution these sets are pinned to (the brand ships dark by
        // default), so prefer the dark measurement and fall back to light.
        textColorLit: (darkTextNode && darkTextNode.computed.fc) || (tn && tn.computed.fc) || null,
        fillLit: (d && d.root && d.root.computed.bg) || root.computed.bg || null,
        opacity: t['opacity'] ? v(t['opacity']) : null,
        stroke: hasBorder ? { color: v(t['border-top-color']), width: v(t['border-top-width']) } : null,
        padding: {
          top: padOf('top', 0), right: padOf('right', 1),
          bottom: padOf('bottom', 2), left: padOf('left', 3),
        },
        radius: {
          tl: v(t['border-top-left-radius']), tr: v(t['border-top-right-radius']),
          br: v(t['border-bottom-right-radius']), bl: v(t['border-bottom-left-radius']),
        },
        gap: calcLit(root.authored['gap'] || root.authored['column-gap'], root.computed.gap)
          || v(t['column-gap'] || t['gap']),
        // Focus renders as a 2px stroke in this library, not a CSS outline.
        // Width/colour come from the measured al-focus tokens; the literals are only
        // the fallback for components whose focus ring lives on an unmeasured node.
        focusRing: stateName === 'Focus'
          ? {
              width: v(t['outline-width']) || 'theme/border/width/md',
              color: v(t['outline-color']) || 'theme/color/border/primary-default',
            }
          : null,
        text: tn ? {
          content: tn.text,
          family: tn.computed.ff, size: tn.computed.fs, weight: tn.computed.fw, lineHeight: tn.computed.lh,
          sizeToken: v(tt['font-size']), weightToken: v(tt['font-weight']), lineHeightToken: v(tt['line-height']),
          colorToken: v(tt['color']),
          colorLit: (darkTextNode && darkTextNode.computed.fc) || tn.computed.fc || null,
        } : null,
        // Computed values are only trustworthy when the browser actually rendered the
        // state (Default rows, and attribute-driven stateCases rows). Pseudo rows'
        // computed w/h/bg still describe the DEFAULT rendering.
        expected: computedTrust
          ? {
              w: root.w, h: root.h,
              light: { bg: root.computed.bg, fc: root.computed.fc },
              dark: d && d.root ? { bg: d.root.computed.bg, fc: d.root.computed.fc } : null,
            }
          : null,
        // Children on the Default row always; on state rows only when they differ —
        // that IS the state's structural delta (e.g. a hover fill on an inner box).
        children: isDefaultRow || sig !== defaultSig ? kids : undefined,
      });
    }
  }

  const out = {
    tag: entry.tag,
    key: entry.key,
    name: entry.figmaName,
    axisNames: ['State', ...entry.axisNames],
    states: entry.states
      || [...STATES.map(title).filter((s) => s === 'Default' || !replaced.has(s)), ...replaced],
    note: entry.note,
    unresolved: [...unresolved],
    hooks: [...hooks],
    missing,
    rows,
  };
  const file = join(OPS_DIR, `${entry.key}.json`);
  writeFileSync(file, JSON.stringify(out, null, 1) + '\n');

  const deltas = rows.filter((r) => r.differsFromDefault).length;
  const unbound = rows.filter((r) => r.state === 'Default' && !r.fill && !r.textColor).length;
  summary.push({
    key: entry.key, name: entry.figmaName,
    cases: entry.cases.length, rows: rows.length, stateDeltas: deltas,
    defaultRowsWithoutBinding: unbound,
    unresolved: [...unresolved], hooks: [...hooks], missing: missing.length,
  });
  console.log(
    `${entry.figmaName.padEnd(20)} rows ${String(rows.length).padStart(4)}  state-deltas ${String(deltas).padStart(3)}` +
    `  unresolved ${unresolved.size ? [...unresolved].join(',') : '-'}` +
    `${hooks.size ? `  hooks ${[...hooks].join(',')}` : ''}${missing.length ? `  MISSING ${missing.length}` : ''}`
  );
}

writeFileSync(join(OPS_DIR, 'index.json'), JSON.stringify({ generated: 'measure-components.mjs + build-component-ops.mjs', components: summary }, null, 1) + '\n');
console.log(`\n${summary.length} components → ${OPS_DIR}`);
