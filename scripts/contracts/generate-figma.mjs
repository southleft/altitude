#!/usr/bin/env node
/**
 * generate-figma.mjs — build a Figma component set FROM A CONTRACT (T12, spec
 * 2026-08-25-contract-backed-figma-parity-and-generation). Pilot: al-button.
 *
 * Pipeline: contract JSON (.altitude/contracts/<project>/<tag>.contract.json)
 *   -> a deterministic intermediate OPS artifact (buildOps(), below)
 *   -> executed over scripts/figma-atoms/mcp-shim.mjs into a SCRATCH page.
 *
 * This is deliberately a NEW, small builder, not a re-drive of
 * build-component-ops.mjs / build-page.mjs: those consume measured DOM PIXEL
 * specs (measure-components.mjs's spec-light/dark.json — real x/y/w/h boxes,
 * real rendered characters). A contract carries none of that — anatomy is
 * COARSE (display/direction/align/justify only, no pixel geometry, no text
 * content — see contract.schema.json's anatomyNode) by design (it documents
 * what canvas-expressible facts the contract can honestly assert, not a
 * layout DSL a renderer consumes). So the reusable parts of the existing
 * pipeline are its CONVENTIONS, not its input shape:
 *   - token binding: a contract token already carries `.figma` (the resolved
 *     Figma variable NAME) directly — token-map.mjs's job is already done.
 *   - the plugin-side primitives (bindNum/boundSolid/font resolution) mirror
 *     scripts/figma-atoms/build-page.mjs almost verbatim.
 *   - library conventions (State axis, Title Case values, "Primary" not
 *     "default", Text/Is Full Width/Slot Before/Slot After/Icon Before/Icon
 *     After component properties, a 2px stroke focus ring) come straight from
 *     .claude/skills/altitude-figma-sync/SKILL.md.
 *   - T19: a `before`/`after` slot whose contract entry carries
 *     `figmaPlaceholder` (the real set's icon-instance placeholder
 *     convention, discovered live) ALSO gets an icon INSTANCE created in the
 *     right leading/trailing position, wired to Slot Before/After (BOOLEAN,
 *     `visible`) and Icon Before/After (INSTANCE_SWAP, `mainComponent`), and
 *     recolored recursively to the row's own content-color token per the
 *     Icon Recoloring reference (giorris.dev). The placeholder is resolved
 *     BY NAME inside the plugin code, never by a node id stored anywhere —
 *     see buildOps()'s componentProperties comment and
 *     .altitude/contracts/README.md.
 * Auto-layout is HUG on both axes throughout (no pixel geometry to target a
 * fixed size against) — see the Sizing Modes reference in the skill's
 * "External refs" table: dimension is never set via resize() here at all, so
 * the "resize() after sizing modes" trap cannot fire.
 *
 * SAFETY (hard constraint, not a default): every mutating operation targets
 * ONLY the scratch page named by --page (default "Contract Pilot"). The page
 * is created if absent, or REUSED with only its own children cleared if it
 * already exists from a prior run — never deleted, never rebuilt from
 * scratch as a new page object, and no other page is ever read-write
 * touched. A decoy-file guard (matching scripts/contracts/extract-canvas.mjs)
 * runs before anything else.
 *
 * Usage:
 *   node scripts/contracts/generate-figma.mjs --component al-button
 *   node scripts/contracts/generate-figma.mjs --component al-button --project southleft
 *   node scripts/contracts/generate-figma.mjs --component al-button --page "Contract Pilot"
 *   node scripts/contracts/generate-figma.mjs --component al-button --ops-only     # write the ops artifact only, never touch Figma
 *   node scripts/contracts/generate-figma.mjs --component al-button --check-determinism  # same contract, derive ops TWICE in memory, byte-compare; exit 1 on mismatch
 *
 * Ops artifact: .altitude/figma-sync/<project's figma-sync dir>/generated-ops/
 * <tag>.ops.json — gitignored (same zone as every other figma-sync artifact,
 * see .gitignore:110-125), because it is a build INPUT derived entirely from
 * the tracked contract, not durable state. Deterministic: stable key order
 * (fixed by construction, not sorted-then-hoped), no timestamps — the same
 * contract produces byte-identical bytes every run (`--check-determinism`
 * proves this without touching disk).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scope, projectArg } from '../figma-atoms/project-scope.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const CONTRACTS_DIR = join(REPO_ROOT, '.altitude', 'contracts');

// ── argv ────────────────────────────────────────────────────────────────

function argOf(flag) {
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1) || null;
  const i = process.argv.indexOf(flag);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('-') ? process.argv[i + 1] : null;
}

/** Case/dash-insensitive key, mirrors emit-contracts.mjs's normKey — used to pair a Figma
 * variant option ("Secondary") or Title Case state ("Hover") with a conditionalBindings
 * key ("secondary" / "hover"); not exported from there, so re-derived here (same
 * dependency-free-helper convention emit-contracts documents for parity.mjs's privates). */
const normKey = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const COMPONENT = argOf('--component') || 'al-button';
const PAGE_NAME = argOf('--page') || 'Contract Pilot';
const SHIM_PORT = Number(argOf('--shim') ?? 9401);
const OPS_ONLY = process.argv.includes('--ops-only');
const CHECK_DETERMINISM = process.argv.includes('--check-determinism');

// ── ops derivation (pure — no fs/network beyond the caller-supplied contract) ──

/** Interaction-state axis order, the library's own convention (SKILL.md §3,
 * confirmed against the REAL al-button set's "State" VARIANT options). */
const STATE_ORDER = ['Default', 'Hover', 'Active', 'Focus', 'Disabled'];

/**
 * T19: the Figma variable the real al-button set binds every slot icon
 * instance's width/height to, CONFIRMED live (figma_execute against node
 * 4271:9562 — every variant's "container"/"Icon After" instance, Primary AND
 * Secondary alike, resolves the SAME `VariableID` to this name; the
 * contract's `conditionalBindings.variant.primary` also carries a
 * `--al-icon-height`/`--al-icon-width` -> `theme/icon/lg` pair, but that CSS
 * override was confirmed to apply to a DIFFERENT rendering context (icon-only
 * buttons), not the slotted before/after icon the real set actually shows —
 * using it here would render the wrong size for every variant but Primary.
 * A fixed default, not a per-variant lookup, same class of constant as
 * FAMILY/fontSize below (documented judgment call, not a contract fact).
 */
const ICON_SIZE_FIGMA_VAR = 'theme/icon/md';

/**
 * T23: canonical order for boolean-turned-axis component properties, matching
 * the naming convention the task spelled out live ("State=Default,
 * Variant=Primary, Slot Before=False, Slot After=False, Is Full Width=True")
 * — State and Variant always come first (see buildOps), then these in this
 * fixed order when present. A future curated axis this repo doesn't know
 * about yet (generalized default) is appended after, sorted alphabetically,
 * so ordering stays deterministic without a hard-coded exhaustive list.
 */
const BOOLEAN_AXIS_CANONICAL_ORDER = ['Slot Before', 'Slot After', 'Is Full Width'];

/**
 * T23: "Is Full Width" has no measured pixel fact to render from at all — no
 * real Figma set exposes it as an axis to inspect live (VERIFIED against the
 * REAL Button set, node 4271:9562: `Is Full Width` is a BOOLEAN component
 * property there, not a VARIANT axis — see README.md § Fan-out convention
 * for the full discrepancy this generator's pilot now deliberately accepts).
 * Rendered here as "natural hug width plus a fixed visible margin" rather
 * than a fixed absolute pixel target, so it is ALWAYS demonstrably wider
 * than its same-row False sibling regardless of that variant's own label/
 * icon content length — a documented judgment call, not a contract fact.
 */
const FULL_WIDTH_EXTRA_PX = 160;

/**
 * T21: the "site" background token — CONFIRMED via token-map.mjs
 * (`--al-theme-color-body-background` -> `theme/color/body/background`) and
 * `libs/al-web-components/styles/core/base.scss:29` (`body { background: var(
 * --al-theme-color-body-background); }`), i.e. the literal CSS `<body>`
 * background, not a guess and not the same token T18's page-background
 * workaround used (`theme/color/background/default` — a general-purpose
 * surface token, plausible but not the one the app's own body rule reads).
 * Used for BOTH the presentation frame's fill (a real bound variable — unlike
 * PageNode, FrameNode.fills CAN bind variables) and the page-background
 * literal (kept from T18 as a belt-and-braces fallback for anyone viewing the
 * page without the frame in view; PageNode.backgrounds still cannot bind a
 * variable, so that one stays a resolved literal by API limitation).
 */
const SITE_BG_FIGMA_VAR = 'theme/color/body/background';

/** T21: padding around the presentation frame — a real spacing token (not a
 * literal pixel guess), same "bind everything to a token" convention as the
 * rest of this generator. */
const FRAME_PADDING_FIGMA_VAR = 'theme/space/xl';

/** T21: the variable COLLECTION whose mode drives whether bound `theme/*`
 * variables resolve Light or Dark — CONFIRMED live via
 * `figma.variables.getLocalVariableCollectionsAsync()` (exact name "Tier 2 |
 * Theme", modes Light/Dark, `defaultModeId` currently resolving to "Dark" —
 * matches SKILL.md's "library's default theme mode is DARK"). The
 * presentation frame gets this collection's OWN default mode explicitly set
 * via `setExplicitVariableModeForCollection` — "dep on defaults" per the
 * task: never hardcode Light or Dark, always follow whatever the collection's
 * `defaultModeId` currently says. */
const THEME_MODE_COLLECTION_NAME = 'Tier 2 | Theme';

/** Anatomy node (contract.schema.json shape) -> build-tree node carrying only
 * resolved Figma variable NAMES (contract tokens already carry `.figma`). */
function convertAnatomyNode(node) {
  if (!node) return null;
  const tokens = {};
  for (const [cssProp, binding] of Object.entries(node.tokens || {})) {
    if (binding && binding.figma) tokens[cssProp] = binding.figma;
  }
  return {
    tag: node.tag,
    cls: node.cls || null,
    layout: node.layout || null,
    tokens,
    children: (node.children || []).map(convertAnatomyNode).filter(Boolean),
  };
}

/** contract.anatomy.stateOverrides (node path -> cssProp -> tokenBinding) ->
 * the same shape with each binding collapsed to its Figma variable NAME. */
function convertStateOverrides(stateOverrides) {
  const out = {};
  for (const [state, byPath] of Object.entries(stateOverrides || {})) {
    const paths = {};
    for (const [path, props] of Object.entries(byPath || {})) {
      const resolved = {};
      for (const [cssProp, binding] of Object.entries(props || {})) {
        if (binding && binding.figma) resolved[cssProp] = binding.figma;
      }
      if (Object.keys(resolved).length) paths[path] = resolved;
    }
    if (Object.keys(paths).length) out[state] = paths;
  }
  return out;
}

/** { cssProp: tokenBinding } -> { cssProp: figmaVariableName }, dropping anything with no
 * resolved Figma variable (mirrors convertAnatomyNode's `if (binding && binding.figma)`).
 * Also safe to call on a `variantBinding` object that carries a `state` sub-map — that
 * key's value has no `.figma` of its own so it is silently skipped, not misread. */
function figmaMapOf(bindingMap) {
  const out = {};
  for (const [cssProp, tb] of Object.entries(bindingMap || {})) if (tb && tb.figma) out[cssProp] = tb.figma;
  return out;
}

/**
 * T18: resolve ONE contract's `conditionalBindings` (see contract.schema.json) into
 * lookup functions keyed the way the OPS variant/state axes actually spell things
 * (Figma Title Case option / state name), rather than forcing every caller to re-pair
 * casing. `null` values from either lookup mean "no SCSS-derived fact for this
 * condition" — the caller falls back to the anatomy-derived root tokens, never fabricates.
 */
function resolveConditionalBindings(contract) {
  const cb = contract.conditionalBindings || null;
  const variantEntries = Object.entries(cb?.variant || {});
  const stateEntries = Object.entries(cb?.state || {});

  return {
    /** Figma variant option name (e.g. "Secondary") -> that variant's own binding object
     * (may carry a `state` sub-map for compound variant+state overrides), or null. */
    variantBindingFor(optionName) {
      if (!optionName) return null;
      const key = normKey(optionName);
      return variantEntries.find(([name]) => normKey(name) === key)?.[1] ?? null;
    },
    /** Figma state name (e.g. "Hover") -> the GENERIC (variant-agnostic) binding for
     * that state, or null. */
    genericStateBindingFor(stateName) {
      if (!stateName) return null;
      const key = normKey(stateName);
      return stateEntries.find(([name]) => normKey(name) === key)?.[1] ?? null;
    },
  };
}

/**
 * contract JSON -> deterministic intermediate ops artifact.
 *
 * Pure function: same `contract` object -> byte-identical
 * `JSON.stringify(ops, null, 2)` every call (proven by --check-determinism).
 */
export function buildOps(contract, { projectId = 'altitude', pageName = 'Contract Pilot' } = {}) {
  const tag = contract.id;

  // Variant axis: the contract's OWN Figma-side option list already IS "the
  // enum plus its stated default" — bindings.figma.options for the `variant`
  // prop lists Bare/Danger/Secondary/Tertiary (the code enum) PLUS "Primary"
  // (the code-default rendering when no `variant` attribute is set at all;
  // the library calls that variant "Primary", never "default" — SKILL.md
  // §3). Reusing it verbatim avoids re-guessing a pairing the contract
  // README (Deviations) explicitly says is fragile to invent.
  const variantProp = (contract.props || []).find((p) => p.name === 'variant');
  const variantValues = variantProp && variantProp.bindings && variantProp.bindings.figma && Array.isArray(variantProp.bindings.figma.options)
    ? [...variantProp.bindings.figma.options].sort()
    : [];
  const variantAxis = variantValues.length
    ? { name: 'Variant', values: variantValues, default: variantValues.includes('Primary') ? 'Primary' : variantValues[0] }
    : null;

  // State axis: Default always, plus whichever of the contract's declared
  // `states` this component has (contract.states is lowercase; canvas/Figma
  // spells them Title Case).
  const declaredStates = new Set((contract.states || []).map((s) => String(s).toLowerCase()));
  const stateValues = STATE_ORDER.filter((s) => s === 'Default' || declaredStates.has(s.toLowerCase()));
  const stateAxis = { name: 'State', values: stateValues, default: 'Default' };

  // T23: boolean-turned-axis curation. `bindings.figma.axis: true` on the
  // `fullWidth` prop, `figmaAxis: true` on a `before`/`after` slot — a slot
  // or layout boolean marked this way FANS OUT as its own True/False VARIANT
  // axis (a real distinct component per combination) instead of staying a
  // single shared BOOLEAN component property (T12/T18/T19 behavior, still
  // the default for anything NOT curated — generalized rule, see
  // .altitude/contracts/README.md § Fan-out convention). Collected into one
  // list so axis-ordering, componentProperties, and the per-variant builder
  // below all read from the same classification rather than re-deriving it
  // three times.
  const slotByName = new Map((contract.slots || []).map((s) => [s.name, s]));
  const slotNames = new Set(slotByName.keys());
  const fullWidthProp = (contract.props || []).find((p) => p.name === 'fullWidth');

  // T27: `bindings.figma.omit: true` (props) / `slots[].figmaOmit: true`
  // (slots) is a hand-curated OPT-OUT — reserving the right to keep a
  // code-only boolean out of the generated Figma set entirely (owner: "I
  // don't need that in figma", al-button's `fullWidth`). Takes precedence
  // over `isAxis` if a contract were ever curated with both (should not
  // happen in practice — nothing left to fan out once omitted).
  const layoutBooleans = [];
  if (fullWidthProp) {
    const isOmit = !!fullWidthProp.bindings?.figma?.omit;
    const isAxis = !isOmit && !!fullWidthProp.bindings?.figma?.axis;
    layoutBooleans.push({
      kind: 'fullWidth',
      propertyName: fullWidthProp.bindings?.figma?.property || 'Is Full Width',
      options: fullWidthProp.bindings?.figma?.options?.length ? fullWidthProp.bindings.figma.options : ['False', 'True'],
      isAxis,
      isOmit,
    });
  }
  for (const side of ['before', 'after']) {
    if (!slotNames.has(side)) continue;
    const slot = slotByName.get(side);
    const layerName = side === 'before' ? 'Icon Before' : 'Icon After';
    const isOmit = !!slot.figmaOmit;
    layoutBooleans.push({
      kind: 'slot',
      side,
      propertyName: side === 'before' ? 'Slot Before' : 'Slot After',
      options: ['False', 'True'],
      isAxis: !isOmit && !!slot.figmaAxis,
      isOmit,
      layerName,
      iconName: slot.figmaPlaceholder || null,
    });
  }

  // Axis order: State, Variant, then curated boolean axes in the library's
  // documented convention order (BOOLEAN_AXIS_CANONICAL_ORDER), any future
  // curated name not in that list appended alphabetically after — see the
  // constant's own comment.
  const booleanAxisDefs = layoutBooleans
    .filter((b) => b.isAxis && !b.isOmit)
    .map((b) => ({ name: b.propertyName, values: [...b.options], default: b.options.includes('False') ? 'False' : b.options[0], kind: b.kind, side: b.side, layerName: b.layerName }))
    .sort((a, b) => {
      const ai = BOOLEAN_AXIS_CANONICAL_ORDER.indexOf(a.name);
      const bi = BOOLEAN_AXIS_CANONICAL_ORDER.indexOf(b.name);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

  const axes = [stateAxis, variantAxis, ...booleanAxisDefs].filter(Boolean);

  // Component properties: only for props/slots the contract actually
  // declares — never fabricated, and never for a boolean that became an axis
  // above (axis membership and property membership are mutually exclusive
  // for the SAME boolean). Icon Before/After (INSTANCE_SWAP) is a component
  // property EITHER WAY — the real set keeps it as one even when Slot
  // Before/After becomes an axis (T23 task) — `default` is the icon's NAME,
  // never a node id (icon libraries re-mint ids on republish); the actual
  // component is resolved BY NAME inside the plugin code at generation time
  // (buildPluginCode's findPhosphorComponentByName, T28 — the Phosphor
  // library, never the old "🛠 Icons" page), keeping this pure
  // function's determinism intact (--check-determinism never touches
  // Figma). `layerName` is the instance layer this property's
  // `mainComponent` reference targets (plus, in property mode only, the
  // paired boolean's own `visible` reference — see T19).
  const componentProperties = [{ name: 'Text', type: 'TEXT', default: contract.name || tag }];
  for (const b of layoutBooleans) {
    if (b.isOmit) continue; // T27: omitted -> nothing at all, no axis, no property, no instance
    if (!b.isAxis) componentProperties.push({ name: b.propertyName, type: 'BOOLEAN', default: false, ...(b.layerName ? { layerName: b.layerName } : {}) });
    if (b.kind === 'slot' && b.iconName) {
      componentProperties.push({ name: b.layerName, type: 'INSTANCE_SWAP', default: b.iconName, layerName: b.layerName });
    }
  }

  const root = contract.anatomy ? convertAnatomyNode(contract.anatomy.root) : null;
  const stateOverrides = convertStateOverrides(contract.anatomy && contract.anatomy.stateOverrides);

  // T18: per-(State, Variant) resolved tokens — base bindings (measured anatomy root,
  // ONE case) overridden by conditionalBindings.variant[<variant>] (SCSS, every variant),
  // in turn overridden for non-Default rows by a compound variant+state override when the
  // SCSS nests one directly under that variant, else the generic conditionalBindings.state
  // delta. This is the fix for the T12 pilot bug: anatomy alone gave every Variant column
  // the SAME background/color (it only ever measured one case); conditionalBindings is
  // keyed by variant precisely because anatomy cannot be.
  const { variantBindingFor, genericStateBindingFor } = resolveConditionalBindings(contract);
  const rootFigmaTokens = root ? root.tokens : {};

  /** T23: cartesian product of a list of {values:[...]} — used to fan out
   * every curated boolean axis alongside State x Variant. Order preserved:
   * first axis varies slowest (outermost loop), matching the naming
   * convention's own left-to-right axis order. */
  function cartesian(list) {
    return list.reduce((acc, axis) => acc.flatMap((combo) => axis.values.map((v) => [...combo, [axis.name, v]])), [[]]);
  }
  const axisCombos = booleanAxisDefs.length ? cartesian(booleanAxisDefs) : [[]];

  // Cross-product, State x Variant x every curated boolean axis (or just
  // State when the component has neither) — sorted by name for a stable,
  // readable ops file. `axisValues` carries ONLY the curated boolean axes
  // (State/Variant already have their own top-level fields, unchanged).
  const variants = [];
  for (const state of stateAxis.values) {
    for (const variant of variantAxis ? variantAxis.values : [null]) {
      const variantBinding = variant ? variantBindingFor(variant) : null;
      const variantLayer = variantBinding ? figmaMapOf(variantBinding) : {};
      let stateLayer = {};
      if (state !== 'Default') {
        const compound = variantBinding?.state
          ? Object.entries(variantBinding.state).find(([name]) => normKey(name) === normKey(state))?.[1]
          : null;
        stateLayer = figmaMapOf(compound ?? genericStateBindingFor(state));
      }
      for (const combo of axisCombos) {
        const axisValues = Object.fromEntries(combo);
        const nameParts = [`State=${state}`];
        if (variant) nameParts.push(`Variant=${variant}`);
        for (const axisDef of booleanAxisDefs) nameParts.push(`${axisDef.name}=${axisValues[axisDef.name]}`);
        variants.push({
          name: nameParts.join(', '),
          state,
          variant,
          axisValues,
          tokens: { ...rootFigmaTokens, ...variantLayer, ...stateLayer },
        });
      }
    }
  }
  variants.sort((a, b) => a.name.localeCompare(b.name));

  const degradations = [];
  if (!root) degradations.push('anatomy unavailable on this contract — no structural/token facts to build from.');
  if (variantAxis && !contract.conditionalBindings?.variant) {
    degradations.push(
      'per-Variant token deltas are not in the contract (anatomySource captured exactly one case, ' +
      `"${contract.anatomyCase}", and conditionalBindings has no variant section) — every Variant value ` +
      'renders with the SAME root/state tokens; only the State axis carries a measured delta.',
    );
  }
  degradations.push(
    'anatomy carries no literal text content (contract.schema.json\'s anatomyNode has no `text` field) — ' +
    'the Text component property default is a placeholder (the contract\'s display name), not measured copy.',
  );
  const slotSides = layoutBooleans.filter((b) => b.kind === 'slot' && !b.isOmit);
  const sidesWithPlaceholder = slotSides.filter((b) => b.iconName).map((b) => b.side);
  const sidesWithoutPlaceholder = slotSides.filter((b) => !b.iconName).map((b) => b.side);
  if (sidesWithoutPlaceholder.length) {
    const label = (s) => (s === 'before' ? 'Before' : 'After');
    degradations.push(
      `Slot ${sidesWithoutPlaceholder.map(label).join('/')} declared as a boolean only (presence, per SKILL.md's ` +
      `pairing convention) — the contract's slot entry has no \`figmaPlaceholder\`, so no Icon ` +
      `${sidesWithoutPlaceholder.map(label).join('/')} INSTANCE_SWAP property or icon instance is built.`,
    );
  }
  if (sidesWithPlaceholder.length) {
    degradations.push(
      `Icon ${sidesWithPlaceholder.map((s) => (s === 'before' ? 'Before' : 'After')).join('/')} INSTANCE_SWAP ` +
      'default is resolved LIVE by NAME from the Phosphor Figma library at generation time (T28 — never the old ' +
      '"🛠 Icons" page, never a hard-coded node id; see contract.slots[].figmaPlaceholder and ' +
      `findPhosphorComponentByName in buildPluginCode); icon size is a fixed ${ICON_SIZE_FIGMA_VAR} (documented ` +
      'judgment call above ICON_SIZE_FIGMA_VAR, not a per-variant contract fact), and the icon is recolored to ' +
      'this row\'s own resolved content-color token, recursively, per the Icon Recoloring reference.',
    );
  }
  const axisModeSlotSides = slotSides.filter((b) => b.isAxis).map((b) => b.side);
  if (axisModeSlotSides.length) {
    const label = (s) => (s === 'before' ? 'Before' : 'After');
    degradations.push(
      `T23: Slot ${axisModeSlotSides.map(label).join('/')} ${axisModeSlotSides.length > 1 ? 'are' : 'is'} curated as ` +
      'a variant AXIS (figmaAxis: true) — every combination fans out as a separately-built variant with the ' +
      'slot\'s icon statically shown/hidden, rather than one shared BOOLEAN property. VERIFIED against the ' +
      'real Button set (node 4271:9562) that this does NOT currently match its live shape (Slot Before/After ' +
      'there are still BOOLEAN properties) — see .altitude/contracts/README.md § Fan-out convention for the ' +
      'discrepancy this pilot deliberately accepts pending a decision on the real set.',
    );
  }
  if (layoutBooleans.some((b) => b.kind === 'fullWidth' && b.isAxis)) {
    degradations.push(
      'T23: "Is Full Width" is curated as a variant axis, but no real or measured pixel fact exists for what ' +
      '"full width" renders as (contract.schema.json\'s anatomyNode has no pixel geometry, and the real Button ' +
      `set does not expose this as an axis to inspect) — rendered as natural hug width + a fixed ${FULL_WIDTH_EXTRA_PX}px ` +
      'margin (documented judgment call, FULL_WIDTH_EXTRA_PX), not a measured or observed target width.',
    );
  }
  const omitted = layoutBooleans.filter((b) => b.isOmit);
  if (omitted.length) {
    const describe = (b) => (b.kind === 'slot' ? `Slot ${b.side === 'before' ? 'Before' : 'After'}` : b.propertyName);
    degradations.push(
      `T27: ${omitted.map(describe).join(', ')} ${omitted.length > 1 ? 'are' : 'is'} curated OMITTED ` +
      '(`bindings.figma.omit`/`figmaOmit: true`) — by design, NOTHING is built for it: no axis, no component ' +
      'property, no icon instance (for an omitted slot). This is an intentional opt-out (owner\'s call — the ' +
      'prop/slot is real in code but deliberately excluded from the generated Figma surface), not a degradation ' +
      'in the "missing measured fact" sense — see .altitude/contracts/README.md § Figma-expression opt-out.',
    );
  }

  return {
    schemaVersion: 1,
    generator: 'scripts/contracts/generate-figma.mjs',
    project: projectId,
    contract: { id: tag, name: contract.name, version: contract.version },
    page: pageName,
    componentSetName: contract.name,
    axes,
    componentProperties,
    anatomySource: contract.anatomySource,
    anatomyCase: contract.anatomyCase,
    root,
    stateOverrides,
    variants,
    degradations,
  };
}

function serialize(ops) {
  return `${JSON.stringify(ops, null, 2)}\n`;
}

// ── plugin code (runs inside Figma Desktop via figma_execute) ─────────────

/**
 * Build the code string figma_execute runs. Mirrors
 * scripts/figma-atoms/build-page.mjs's guard/variable/font conventions, but
 * builds from OPS (coarse layout + resolved variable names) instead of a
 * measured pixel tree, and is HUG-only throughout — never calls resize(), so
 * the "resize() undoes sizing modes" ordering trap (Sizing Modes ref) cannot
 * fire.
 */
function buildPluginCode(ops, SC) {
  return String.raw`
    // GUARD — refuse to write into any file but the one this project names.
    // Positive allow-list (not a decoy deny-list) so an unrecognised file is
    // refused the same way a known decoy is; the Node-side decoy check below
    // also runs BEFORE this code is ever sent.
    if (figma.fileKey !== ${JSON.stringify(SC.fileKey)}) {
      throw new Error(
        'REFUSING TO WRITE: expected file ' + ${JSON.stringify(SC.fileKey)} + ' (' + ${JSON.stringify(SC.fileName)} +
        ') but the Desktop Bridge is focused on "' + figma.root.name + '" (' + figma.fileKey + ').'
      );
    }
    const OPS = ${JSON.stringify(ops)};
    const PAGE_NAME = ${JSON.stringify(ops.page)};
    const ICON_SIZE_FIGMA_VAR = ${JSON.stringify(ICON_SIZE_FIGMA_VAR)};
    const FULL_WIDTH_EXTRA_PX = ${JSON.stringify(FULL_WIDTH_EXTRA_PX)};
    const SITE_BG_FIGMA_VAR = ${JSON.stringify(SITE_BG_FIGMA_VAR)};
    const FRAME_PADDING_FIGMA_VAR = ${JSON.stringify(FRAME_PADDING_FIGMA_VAR)};
    const THEME_MODE_COLLECTION_NAME = ${JSON.stringify(THEME_MODE_COLLECTION_NAME)};

    await figma.loadAllPagesAsync();
    const V = {};
    for (const v of await figma.variables.getLocalVariablesAsync()) V[v.name] = v;
    const misses = new Set();

    async function rawOf(v) {
      const c = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
      let val = v.valuesByMode[c.defaultModeId];
      let g = 0;
      while (val && val.type === 'VARIABLE_ALIAS' && g++ < 8) {
        const nv = await figma.variables.getVariableByIdAsync(val.id);
        const nc = await figma.variables.getVariableCollectionByIdAsync(nv.variableCollectionId);
        val = nv.valuesByMode[nc.defaultModeId];
      }
      return val;
    }
    async function boundSolid(name) {
      if (!name) return null;
      const vv = V[name];
      if (!vv) { misses.add(name); return null; }
      const val = await rawOf(vv);
      const color = val && val.r !== undefined ? { r: val.r, g: val.g, b: val.b } : { r: 0, g: 0, b: 0 };
      const paint = { type: 'SOLID', color };
      if (val && val.a !== undefined && val.a < 1) paint.opacity = val.a;
      return figma.variables.setBoundVariableForPaint(paint, 'color', vv);
    }
    function bindNum(node, field, name) {
      if (!name) return false;
      const vv = V[name];
      if (!vv) { misses.add(name); return false; }
      try { node.setBoundVariable(field, vv); return true; } catch (e) { return false; }
    }

    // T28: resolve an Icon Before/After INSTANCE_SWAP default BY NAME from
    // the PHOSPHOR Figma library — NEVER the old "🛠 Icons" flat-component
    // page (owner: "let's not use the icon component that was in the
    // figma... let's use the Phosphor library"). This function is
    // deliberately NOT a lookup against that page at all; there is no
    // fallback to it, silent or otherwise.
    //
    // CONFIRMED LIVE: the Figma plugin API has NO team-library component
    // enumeration — exhaustive introspection of figma.teamLibrary found
    // exactly two methods, getAvailableLibraryVariableCollectionsAsync and
    // getVariablesInLibraryCollectionAsync — both VARIABLES-only, nothing
    // for components. This bridge's REST-backed tools
    // (figma_search_components / figma_get_library_components /
    // figma_instantiate_component-by-name) are unusable without a
    // FIGMA_ACCESS_TOKEN (figma_diagnose: "No Figma access token detected");
    // without one they time out rather than resolving. That leaves exactly
    // two BY-NAME resolution paths a plugin can actually use:
    //   1. PHOSPHOR_KEY_BY_NAME - a hand-maintained name -> published
    //      component KEY registry. Preferred once populated: no document
    //      walk needed, resolves in one importComponentByKeyAsync call.
    //   2. A bounded-depth scan across every page for an EXISTING instance
    //      whose main component is REMOTE (from a library) and name-matches
    //      - the mainComponent reference resolves the real component with
    //      NO REST call, so this works the moment a human bootstraps one
    //      instance anywhere in the file. Never touches the Icons page for
    //      the MATCH ITSELF (that page's own flat icon components are
    //      LOCAL, not remote, by construction, so a remote-only check
    //      excludes them structurally, not just by name) — though the Icons
    //      page IS one of the pages walked, since the owner's bootstrap
    //      wrapper component happens to live there.
    //
    // NAMING, CONFIRMED LIVE (bootstrap discovery): Phosphor components are
    // named in PascalCase with NO separators ("ApproximateEquals",
    // "CheckCircle") — NOT the kebab-case catalog names
    // (libs/al-web-components/components/icon/catalog.ts style,
    // "check-circle") a contract's figmaPlaceholder stores (T25 decision:
    // the contract always speaks the CODE-side/catalog name). A name match
    // must therefore be NORMALIZED (lowercase, non-alphanumeric stripped) on
    // both sides, never an exact string compare — "check-circle" and
    // "CheckCircle" both normalize to "checkcircle".
    //
    // SET STRUCTURE, CONFIRMED LIVE: a Phosphor icon may be cached locally
    // as a full COMPONENT_SET with "Format" (Outline/Stroke) x "Weight"
    // (Thin/Light/Regular/Bold/Fill/Duotone) variants (the owner's own
    // bootstrap, "ApproximateEquals" — 12 variants, both fully cached the
    // moment ANY one variant was placed) OR as a single FLAT component with
    // no variant grouping at all (an existing al-alert Playground
    // prototype's "success" state icon override, "CheckCircle" — one Vector
    // child, no parent COMPONENT_SET). Both shapes are handled: when the
    // matched node's real "icon identity" lives on a COMPONENT_SET parent
    // (main.parent.type === 'COMPONENT_SET'), the actual per-variant
    // component name is just "Format=X, Weight=Y" — useless for matching —
    // so the SET's own name is what a target compares against, and
    // (task: "prefer the regular weight") a Weight=Regular variant is
    // selected from that set (tie-broken toward Format=Stroke) rather than
    // blindly reusing whichever specific variant a human happened to place.
    // A flat component with no parent set is returned as-is — nothing to
    // choose between.
    const PHOSPHOR_KEY_BY_NAME = {
      // "check-circle" is resolved by the live SCAN below (finds the
      // existing al-alert Playground prototype's "CheckCircle" icon
      // override in ~5ms) — this entry is a documented BACKUP only, never
      // actually reached while that prototype still exists. Its key was
      // read directly off the already-resolved .mainComponent (no REST
      // call) during the T28 bootstrap-resolution session. Kept as a
      // reference/fallback should that specific Playground prototype ever
      // be edited or removed — see the function-level comment above for why
      // it is tried LAST, not first (importComponentByKeyAsync hung for the
      // full execution ceiling in this environment, confirmed live, even
      // for this exact known-good key).
      'check-circle': '8362189ea7dca44f1ef7aa55495ec46f1f0f91f6',
      // 'paper-plane' — NOT YET resolvable. Confirmed live: no remote
      // instance anywhere checked (the owner's "Icons" page bootstrap, the
      // "Playground" page, and a full-document scan for
      // check|plane|paper|circle|send|arrow) matches "paper-plane"/
      // "PaperPlane"/"PaperPlaneTilt"/"PaperPlaneRight" or similar. Add a
      // key here (or place one instance on a PHOSPHOR_PRIORITY_PAGE_NAMES
      // page) once known.
    };
    const normalizeIconName = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    function pickPreferredPhosphorVariant(iconOwner) {
      if (iconOwner.type !== 'COMPONENT_SET') return iconOwner; // flat component — nothing to choose
      const regular = iconOwner.children.filter((c) => /weight\s*=\s*regular/i.test(c.name));
      if (!regular.length) return iconOwner.children[0] || iconOwner;
      return regular.find((c) => /format\s*=\s*stroke/i.test(c.name)) || regular[0];
    }
    // T28: the Desktop Bridge enforces a hard execution-time ceiling per
    // figma_execute call (CONFIRMED LIVE: an unbounded scan across all ~58
    // pages timed out at exactly 30000ms regardless of the timeout argument
    // this script requests — that ceiling is the plugin runtime's own, not
    // ours to raise). A name with genuinely no match anywhere (e.g.
    // "paper-plane" today) would otherwise walk the ENTIRE document every
    // single generation run for nothing. Two mitigations, both honest (never
    // fabricate a match, never silently truncate without saying so):
    //   - scan the two pages EVERY Phosphor instance has ever actually been
    //     found on first (🛠 Icons: the owner's own bootstrap; 🛝 Playground:
    //     an existing al-alert prototype's icon override) — a scope decision
    //     grounded in live discovery, not a guess;
    //   - a hard node-visit BUDGET across the whole call (all pages
    //     combined), so an unresolved name degrades to a reported miss
    //     instead of a timeout. Add a page name here if a future bootstrap
    //     lands somewhere else — the budgeted full-document fallback below
    //     still covers it, just slower.
    const PHOSPHOR_PRIORITY_PAGE_NAMES = ['🛠 Icons', '🛝 Playground'];
    const PHOSPHOR_SCAN_NODE_BUDGET = 2000;
    async function findInstanceByRemoteMainName(node, targetNorm, depth, budget) {
      if (depth > 8 || budget.visited > PHOSPHOR_SCAN_NODE_BUDGET) return null;
      budget.visited++;
      if (node.type === 'INSTANCE') {
        try {
          const main = await node.getMainComponentAsync(); // sync .mainComponent THROWS under dynamic-page access (SKILL.md trap 27)
          if (main && main.remote) {
            const iconOwner = main.parent && main.parent.type === 'COMPONENT_SET' ? main.parent : main;
            if (normalizeIconName(iconOwner.name) === targetNorm) return pickPreferredPhosphorVariant(iconOwner);
          }
        } catch (e) { /* keep walking — one bad instance must not abort the whole scan */ }
      }
      if ('children' in node) {
        for (const child of node.children) {
          const hit = await findInstanceByRemoteMainName(child, targetNorm, depth + 1, budget);
          if (hit) return hit;
          if (budget.visited > PHOSPHOR_SCAN_NODE_BUDGET) return null;
        }
      }
      return null;
    }
    async function findPhosphorComponentByName(name) {
      // T28, CONFIRMED LIVE, in this exact order for a reason: the live
      // remote-instance SCAN below resolved "CheckCircle" in 5ms (18 nodes
      // visited) — but figma.importComponentByKeyAsync(key), tried FIRST in
      // an earlier version of this function, hung for the full ~30s
      // execution ceiling on its own, every time, even for that SAME
      // already-known-good key. It is presumably a network-backed call
      // (an actual "import," not a read of an already-materialized local
      // reference) and is not reliable in this environment. The scan is
      // now the PRIMARY path; PHOSPHOR_KEY_BY_NAME + importComponentByKeyAsync
      // is a documented last resort ONLY, for a name the scan cannot reach
      // at all (not on either priority page) — expect it to be slow or to
      // hang, and budget accordingly if it's ever actually needed.
      const targetNorm = normalizeIconName(name);
      // Scanning beyond the two known-relevant pages is NOT viable within
      // the Desktop Bridge's hard ~30s execution ceiling — page.loadAsync()
      // on each of the remaining ~56 pages (unconditional, BEFORE the
      // per-node budget below ever gets a chance to matter) was by itself
      // enough to blow the whole call even though the per-node walk never
      // got close to its budget. Scoped to ONLY the two pages a Phosphor
      // instance has ever actually been found on; a name not found there is
      // reported as a genuine miss, not a wider (unaffordable) search.
      // Widen PHOSPHOR_PRIORITY_PAGE_NAMES once a future bootstrap lands
      // elsewhere.
      const priorityPages = figma.root.children.filter((p) => PHOSPHOR_PRIORITY_PAGE_NAMES.includes(p.name));
      const budget = { visited: 0 };
      for (const page of priorityPages) {
        await page.loadAsync();
        const hit = await findInstanceByRemoteMainName(page, targetNorm, 0, budget);
        if (hit) return hit;
        if (budget.visited > PHOSPHOR_SCAN_NODE_BUDGET) {
          misses.add('phosphor-scan-budget-exhausted:' + name);
          return null;
        }
      }
      const key = PHOSPHOR_KEY_BY_NAME[name];
      if (key) {
        try { return await figma.importComponentByKeyAsync(key); }
        catch (e) { misses.add('phosphor-key-import-failed:' + name); }
      }
      return null;
    }

    // T19: recursively rebind every fill/stroke under an icon instance to the
    // SAME resolved paint used for this row's label text — confirmed against
    // the real set live (the icon's inner vector fill and the label's text
    // fill are always the identical bound variable, every Variant/State row)
    // and matches the Icon Recoloring reference's "extract the color from a
    // sibling text node" convention. Recurses into children so a
    // multi-path/grouped icon is never left partially recolored.
    //
    // T28, CONFIRMED LIVE: recoloring the TOP-LEVEL instance's OWN fill (not
    // just its descendants) was harmless for the old local icon components
    // (their instance root's own fills was already empty) but actively
    // WRONG for a Phosphor "CheckCircle"-style icon, whose instance root
    // carries a real, non-empty fill of its own alongside the inner
    // Vector's — overwriting BOTH to the identical paint destroys the
    // negative-space contrast a checkmark-in-circle glyph depends on (the
    // checkmark "hole" becomes indistinguishable from its own backing),
    // rendering as one uniform-colored block. recolorIconChildren below
    // recolors every DESCENDANT but leaves the instance's own top-level
    // fill/stroke untouched — verified live against an isolated,
    // successfully-rendering checkmark-in-circle export.
    function recolorIconChildren(root, paint) {
      if (!paint || !('children' in root)) return;
      for (const child of root.children) recolorIconTree(child, paint);
    }
    function recolorIconTree(node, paint) {
      if (!paint) return;
      if (Array.isArray(node.fills) && node.fills.length) { try { node.fills = [paint]; } catch (e) { /* mixed/locked node */ } }
      if (Array.isArray(node.strokes) && node.strokes.length) { try { node.strokes = [paint]; } catch (e) { /* mixed/locked node */ } }
      if ('children' in node) for (const child of node.children) recolorIconTree(child, paint);
    }

    // Fonts — this contract has no font-size/family token on al-button (they are
    // inherited, not custom-property-bound, so anatomy never captured one); IBM
    // Plex Sans / 14px is the library's own base default (SKILL.md "Known state").
    const FAMILY = 'IBM Plex Sans';
    const FAMILY_STYLES = {};
    for (const fnt of await figma.listAvailableFontsAsync()) {
      (FAMILY_STYLES[fnt.fontName.family] = FAMILY_STYLES[fnt.fontName.family] || []).push(fnt.fontName.style);
    }
    const NEAR = { Bold: ['Bold', 'SemiBold', 'Medium', 'Regular'], Regular: ['Regular', 'Book', 'Medium'] };
    function pickStyle(style) {
      const have = FAMILY_STYLES[FAMILY] || [];
      if (have.indexOf(style) !== -1) return style;
      const chain = NEAR[style] || [style, 'Regular'];
      return chain.filter((s) => have.indexOf(s) !== -1)[0] || have[0] || 'Regular';
    }
    const loadedFonts = new Set();
    async function font(style) {
      const real = pickStyle(style);
      const k = FAMILY + '/' + real;
      if (!loadedFonts.has(k)) {
        try { await figma.loadFontAsync({ family: FAMILY, style: real }); }
        catch (e) { await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); loadedFonts.add('Inter/Regular'); return { family: 'Inter', style: 'Regular' }; }
        loadedFonts.add(k);
      }
      return { family: FAMILY, style: real };
    }

    // PAGE — scoped strictly to PAGE_NAME. Reuse if present (clear only ITS
    // children); otherwise create it. Never delete/recreate the page object,
    // never touch any other page.
    let page = figma.root.children.find((p) => p.name === PAGE_NAME);
    const reusedPage = !!page;
    if (!page) {
      page = figma.createPage();
      page.name = PAGE_NAME;
    } else {
      await page.loadAsync();
      for (const c of [...page.children]) c.remove();
    }
    await figma.setCurrentPageAsync(page);

    // Resolve every Icon Before/After INSTANCE_SWAP's default component ONCE
    // (same placeholder for every variant/state row — nothing per-row here),
    // keyed by the layer name both the boolean's 'visible' reference and the
    // instance-swap's 'mainComponent' reference target after combineAsVariants.
    // T28: this MUST run after the page above is created/reused and made
    // current — CONFIRMED LIVE: resolving/instantiating icons before the
    // page switch left new nodes rooted on whatever page was active when the
    // script started, invalidated once that source page was unloaded again
    // (documentAccess: dynamic-page — SKILL.md trap 1).
    //
    // T28, ALSO CONFIRMED LIVE (a second, separate problem — not just
    // speed): calling .clone() on a per-icon "template" instance and reusing
    // that clone per variant (the original plan, to avoid ~100
    // createInstance() calls against a REMOTE component after that alone
    // was measured hard-timing-out the whole call) silently CORRUPTS the
    // cloned vector's fill geometry — it renders as a solid filled
    // rectangle, not the icon's real shape, even though .vectorPaths still
    // reads back a normal-looking path string. A fresh createInstance()
    // straight off the resolved remote main component, exported in
    // isolation, renders correctly; its .clone() does not. Root cause not
    // fully diagnosed (an instance-override materialization quirk under
    // this dynamic-page bridge, most likely) — the fix that IS verified: go
    // back to createInstance() per occurrence, but only where an icon is
    // actually shown (roughly half of 100 rows, one resolved icon here, not
    // "up to 200 calls for two icons on all variants" like the run that
    // first timed out) — cheap enough in practice to stay under the ~30s
    // ceiling, and correct.
    const iconSwapProps = OPS.componentProperties.filter((p) => p.type === 'INSTANCE_SWAP');
    const iconComponentsByLayer = {};
    for (const p of iconSwapProps) {
      const comp = await findPhosphorComponentByName(p.default);
      if (comp) iconComponentsByLayer[p.layerName] = comp;
      else misses.add('phosphor-component-not-found:' + p.default);
    }

    // T18/T21: the library's default theme mode is DARK (main.css bakes dark
    // into root — SKILL.md), and the content colors this generator binds
    // (e.g. content-primary-weak) are authored to read on a dark surface. A
    // page left on Figma's default WHITE background is why the T12 pilot's
    // light text read as invisible — mirror the real file's page convention
    // here (kept as a belt-and-braces fallback now that the presentation
    // frame below carries the REAL bound fill — see SITE_BG_FIGMA_VAR).
    // NOTE: PageNode.backgrounds throws "cannot be bound to variables" — this
    // is the one paint in this whole generator that is a resolved LITERAL,
    // not a bound variable (a Figma API limitation on Page, not a choice).
    {
      const bgVarName = SITE_BG_FIGMA_VAR;
      const vv = V[bgVarName];
      if (vv) {
        try {
          const val = await rawOf(vv);
          if (val && val.r !== undefined) page.backgrounds = [{ type: 'SOLID', color: { r: val.r, g: val.g, b: val.b } }];
          else misses.add('page-background:' + bgVarName);
        } catch (e) { misses.add('page-background:' + bgVarName); }
      } else {
        misses.add('page-background:' + bgVarName);
      }
    }

    const root = OPS.root;
    const rootTokens = (root && root.tokens) || {};
    const textNodes = [];

    function overrideFor(state, path, cssProp) {
      const st = OPS.stateOverrides[state.toLowerCase()];
      if (!st) return null;
      const at = st[path];
      return at ? at[cssProp] || null : null;
    }

    // T23: boolean axes this component actually declares (kind 'slot' or
    // 'fullWidth' — State/Variant are handled separately, unchanged). Looked
    // up by kind/side rather than re-parsing variant NAMES, so buildVariant
    // reads axis membership the same deterministic way buildOps() wrote it.
    const slotAxisBefore = OPS.axes.find((a) => a.kind === 'slot' && a.side === 'before');
    const slotAxisAfter = OPS.axes.find((a) => a.kind === 'slot' && a.side === 'after');
    const fullWidthAxis = OPS.axes.find((a) => a.kind === 'fullWidth');

    async function buildVariant(state, variant, axisValues, tokens, variantName) {
      const comp = figma.createComponent();
      comp.name = variantName;
      page.appendChild(comp); // combineAsVariants requires siblings already on the target page
      comp.fills = [];

      const isFlex = !!(root && root.layout && (root.layout.display === 'flex' || root.layout.display === 'inline-flex'));
      if (isFlex) {
        comp.layoutMode = root.layout.direction === 'column' ? 'VERTICAL' : 'HORIZONTAL';
        comp.counterAxisAlignItems = root.layout.align === 'center' ? 'CENTER' : root.layout.align === 'flex-end' ? 'MAX' : 'MIN';
        comp.primaryAxisAlignItems = root.layout.justify === 'center' ? 'CENTER' : root.layout.justify === 'flex-end' ? 'MAX' : root.layout.justify === 'space-between' ? 'SPACE_BETWEEN' : 'MIN';
        // HUG both axes — no pixel geometry exists to target a FIXED size
        // against, and resize() is never called (Sizing Modes ref trap).
        comp.primaryAxisSizingMode = 'AUTO';
        comp.counterAxisSizingMode = 'AUTO';
        bindNum(comp, 'itemSpacing', rootTokens['column-gap'] || rootTokens['gap']);
        bindNum(comp, 'paddingTop', rootTokens['padding-top'] || rootTokens['padding']);
        bindNum(comp, 'paddingBottom', rootTokens['padding-bottom'] || rootTokens['padding']);
        bindNum(comp, 'paddingLeft', rootTokens['padding-left'] || rootTokens['padding']);
        bindNum(comp, 'paddingRight', rootTokens['padding-right'] || rootTokens['padding']);
      }

      // T18: tokens is this ROW's resolved facts — anatomy root overridden by
      // conditionalBindings.variant[<variant>] then a state delta (compound
      // variant+state, else the generic conditionalBindings.state) — see
      // buildOps(). Falls back to rootTokens only for facts conditionalBindings
      // never carries (border-radius, gap, padding — shared, not variant/state-conditional).
      { const p = await boundSolid(tokens['background-color']); if (p) comp.fills = [p]; }
      const radiusVar = rootTokens['border-radius'] || rootTokens['border-top-left-radius'];
      if (radiusVar) {
        for (const f of ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius']) bindNum(comp, f, radiusVar);
      }
      if (tokens['border-color']) {
        const strokePaint = await boundSolid(tokens['border-color']);
        if (strokePaint) {
          comp.strokes = [strokePaint];
          comp.strokeAlign = 'INSIDE';
          bindNum(comp, 'strokeWeight', tokens['border-width']);
        }
      }

      // T19: this row's content-color paint, resolved ONCE and shared by the
      // label text AND both slot icons — confirmed live against the real set
      // (icon fill and label fill are always the SAME bound variable, every
      // Variant/State row; see ICON_SIZE_FIGMA_VAR's neighbor comment above
      // for the one place this component deliberately does NOT follow a
      // per-variant contract fact).
      const contentPaint = await boundSolid(tokens['color']);

      // Icon Before (leading) — appended FIRST so it sits before the label in
      // the auto-layout's row order. T23: visibility is now STATIC per this
      // specific variant when Slot Before is a curated AXIS (this variant's
      // own axisValues['Slot Before'] — a separately-built component per
      // True/False, never a runtime toggle); falls back to the T19 default
      // (hidden, wired via a shared BOOLEAN property's visible reference
      // after combineAsVariants) when Slot Before stayed a property.
      // Icon Before/After itself is ALWAYS a component property either way
      // (component properties can only be added to the COMPONENT_SET, not a
      // lone variant — SKILL.md §3), wired below after combineAsVariants.
      const beforeIconComp = iconComponentsByLayer['Icon Before'];
      if (beforeIconComp) {
        const showBefore = slotAxisBefore ? axisValues[slotAxisBefore.name] === 'True' : false;
        // T28: only createInstance() when this row actually shows it (axis
        // mode) — property mode still needs one hidden instance per variant
        // for the shared boolean's visible reference to toggle.
        if (showBefore || !slotAxisBefore) {
          const inst = beforeIconComp.createInstance();
          inst.name = 'Icon Before';
          comp.appendChild(inst);
          inst.visible = showBefore;
          // T28: FIXED sizing explicitly, BEFORE binding width/height — an
          // auto-layout child's sizing mode can default to something that
          // fights a bound-variable resize otherwise (Sizing Modes ref).
          try { inst.layoutSizingHorizontal = 'FIXED'; inst.layoutSizingVertical = 'FIXED'; } catch (e) { /* not an auto-layout child */ }
          bindNum(inst, 'width', ICON_SIZE_FIGMA_VAR);
          bindNum(inst, 'height', ICON_SIZE_FIGMA_VAR);
          recolorIconChildren(inst, contentPaint);
        }
      }

      // Label — anatomy's nested text-only wrapper spans (al-c-button__text x2)
      // carry no tokens/layout facts beyond the leaf's own, so they collapse
      // into one text node appended directly to the component.
      const fontName = await font('Bold');
      const t = figma.createText();
      t.fontName = fontName;
      const textProp = OPS.componentProperties.find((p) => p.name === 'Text');
      t.characters = (textProp && textProp.default) || 'Label';
      t.fontSize = 14;
      comp.appendChild(t);
      textNodes.push(t);

      if (contentPaint) t.fills = [contentPaint];

      // Icon After (trailing) — appended LAST, same wiring as Icon Before.
      const afterIconComp = iconComponentsByLayer['Icon After'];
      if (afterIconComp) {
        const showAfter = slotAxisAfter ? axisValues[slotAxisAfter.name] === 'True' : false;
        if (showAfter || !slotAxisAfter) {
          const inst = afterIconComp.createInstance();
          inst.name = 'Icon After';
          comp.appendChild(inst);
          inst.visible = showAfter;
          try { inst.layoutSizingHorizontal = 'FIXED'; inst.layoutSizingVertical = 'FIXED'; } catch (e) { /* not an auto-layout child */ }
          bindNum(inst, 'width', ICON_SIZE_FIGMA_VAR);
          bindNum(inst, 'height', ICON_SIZE_FIGMA_VAR);
          recolorIconChildren(inst, contentPaint);
        }
      }

      // T23: "Is Full Width" axis — resize WIDTH to FIXED, then immediately
      // restore HEIGHT to hug (Sizing Modes ref: resize() sets BOTH axes to
      // FIXED, so the hug override must come AFTER, never before). Runs
      // AFTER icons/label are in place so comp.width here is this
      // variant's own true natural width (including whichever icons this
      // exact variant shows) — never a shared/default measurement. A fixed
      // MARGIN over natural width, not an absolute target — see
      // FULL_WIDTH_EXTRA_PX's module-level comment for why no measured pixel
      // fact exists to size this from.
      if (fullWidthAxis && axisValues[fullWidthAxis.name] === 'True' && comp.layoutMode !== 'NONE') {
        const target = comp.width + FULL_WIDTH_EXTRA_PX;
        comp.resize(target, comp.height);
        comp.primaryAxisSizingMode = 'FIXED';
        comp.counterAxisSizingMode = 'AUTO';
      }

      if (state === 'Disabled') {
        // conditionalBindings.state.disabled (SCSS &:disabled { opacity: ... }) first;
        // the measured-anatomy override is a fallback for a contract with no such fact.
        const opacityVar = tokens['opacity'] || overrideFor('disabled', '0', 'opacity');
        if (opacityVar) bindNum(comp, 'opacity', opacityVar);
      }

      if (state === 'Focus') {
        // Library convention: focus renders as a 2px outside stroke, not a CSS
        // outline (SKILL.md §3 + build-page.mjs's focusRing handling).
        const focusColor = overrideFor('focus', '0', 'outline-color');
        const focusWidth = overrideFor('focus', '0', 'outline-width');
        if (focusColor) {
          const ring = figma.createRectangle();
          ring.name = 'Focus Outline';
          ring.fills = [];
          const p = await boundSolid(focusColor);
          if (p) ring.strokes = [p];
          ring.strokeWeight = 2;
          if (focusWidth) bindNum(ring, 'strokeWeight', focusWidth);
          ring.cornerRadius = 6;
          comp.appendChild(ring);
          if (comp.layoutMode !== 'NONE') ring.layoutPositioning = 'ABSOLUTE';
          ring.resize(comp.width + 8, comp.height + 8);
          ring.x = -4; ring.y = -4;
        }
      }
      return comp;
    }

    const comps = [];
    for (const v of OPS.variants) comps.push(await buildVariant(v.state, v.variant, v.axisValues || {}, v.tokens || {}, v.name));

    // T21/T23/T28: pitch must reserve room for the WIDEST a variant can
    // ever render. Axis-mode slots/full-width already bake each variant's
    // TRUE final geometry in during buildVariant (a separately-built
    // component per combination — nothing to toggle), so comp.width/height
    // are ALREADY correct there — measuring them directly is enough and
    // (T28, CONFIRMED LIVE) matters for real: with actual cloned Phosphor
    // instances now present on ~half the comps, the force-visible/measure/
    // restore dance below (needed only for a slot that stayed a shared
    // BOOLEAN property, independently toggleable per variant COMPONENT by a
    // reviewer — see the T19/T21 reports) was enough EXTRA layout-reflow
    // work across up to 100 comps to blow the Desktop Bridge's hard ~30s
    // per-call execution ceiling once icon resolution started succeeding.
    // Skipped entirely when every slot is axis-mode (al-button's shape as of
    // T27) — there is no runtime toggle left to protect against, so it is
    // provably dead work, not just slow work.
    const hasPropertyModeSlot = OPS.componentProperties.some((p) => p.type === 'BOOLEAN' && p.layerName);
    let maxW;
    let maxH;
    if (hasPropertyModeSlot) {
      const iconLayerNamesForMeasurement = ['Icon Before', 'Icon After'];
      const builtVisibility = comps.map((comp) => {
        const vis = {};
        for (const child of comp.children) {
          if (child.type === 'INSTANCE' && iconLayerNamesForMeasurement.includes(child.name)) vis[child.name] = child.visible;
        }
        return vis;
      });
      for (const comp of comps) {
        for (const child of comp.children) {
          if (child.type === 'INSTANCE' && iconLayerNamesForMeasurement.includes(child.name)) child.visible = true;
        }
      }
      maxW = Math.max(...comps.map((c) => c.width), 60);
      maxH = Math.max(...comps.map((c) => c.height), 24);
      for (let i = 0; i < comps.length; i++) {
        const vis = builtVisibility[i];
        for (const child of comps[i].children) {
          if (child.name in vis) child.visible = vis[child.name];
        }
      }
    } else {
      maxW = Math.max(...comps.map((c) => c.width), 60);
      maxH = Math.max(...comps.map((c) => c.height), 24);
    }

    // T23: grid layout generalizes beyond State x Variant — COLUMNS = State
    // (matches "State columns x stacked ... row groups" from the task),
    // ROWS = the cartesian product of every OTHER axis (Variant, then
    // curated boolean axes in OPS.axes order), so this scales to any number
    // of fanned-out axes for any component, not just button's 5. Sizes are
    // hug/content-driven — pitch computed from the components AFTER
    // building, same pattern as build-page.mjs.
    const stateAxisDef = OPS.axes.find((a) => a.name === 'State');
    const colAxisDef = stateAxisDef || OPS.axes[0] || null;
    const rowAxisDefs = OPS.axes.filter((a) => a !== colAxisDef);
    const cols = colAxisDef ? colAxisDef.values : [null];

    function valueForAxis(v, axisDef) {
      if (!axisDef) return null;
      if (axisDef.name === 'State') return v.state;
      if (axisDef.name === 'Variant') return v.variant;
      return (v.axisValues || {})[axisDef.name];
    }
    function cartesianRows(list) {
      return list.reduce((acc, axis) => acc.flatMap((combo) => axis.values.map((val) => [...combo, val])), [[]]);
    }
    const rowCombos = cartesianRows(rowAxisDefs);
    const rowKeyOrder = rowCombos.map((combo) => combo.map((val, idx) => rowAxisDefs[idx].name + '=' + val).join('|'));
    function rowKeyFor(v) {
      return rowAxisDefs.map((a) => a.name + '=' + valueForAxis(v, a)).join('|');
    }

    const pitchX = Math.ceil((maxW + 40) / 2) * 2;
    const pitchY = Math.ceil((maxH + 40) / 2) * 2;
    for (let i = 0; i < OPS.variants.length; i++) {
      const v = OPS.variants[i];
      const comp = comps[i];
      const gx = colAxisDef ? cols.indexOf(valueForAxis(v, colAxisDef)) : 0;
      const gy = rowKeyOrder.indexOf(rowKeyFor(v));
      comp.x = 40 + Math.max(gx, 0) * pitchX;
      comp.y = 40 + Math.max(gy, 0) * pitchY;
    }

    const set = figma.combineAsVariants(comps, page);
    set.name = OPS.componentSetName;
    set.x = 0; set.y = 0;

    // T21: combineAsVariants sizes the resulting COMPONENT_SET (layoutMode
    // NONE — a static bounding box, not a HUG frame) from its children's
    // geometry AT THIS MOMENT. The force-visible/restore measurement above
    // can leave a property-mode icon narrower again by the time combine
    // runs (restored to ITS true, possibly-hidden state) even though the
    // PITCH already reserved the wider worst case — so the set, and the
    // presentation frame hugging it below, must be explicitly sized to the
    // full reserved grid footprint, or the last row/column clips against
    // that frame's edge instead of showing its reserved padding. Never
    // shrinks below what combineAsVariants already measured — only grows.
    {
      const footprintW = 40 + Math.max(cols.length - 1, 0) * pitchX + maxW;
      const footprintH = 40 + Math.max(rowKeyOrder.length - 1, 0) * pitchY + maxH;
      if (footprintW > set.width || footprintH > set.height) {
        try { set.resize(Math.max(set.width, footprintW), Math.max(set.height, footprintH)); }
        catch (e) { misses.add('set-resize-for-icon-worst-case'); }
      }
    }

    // T21: presentation FRAME — real padding (bound to a spacing token, not
    // a literal), fill bound to the site's own background token (unlike
    // PageNode, FrameNode.fills CAN bind a variable — this is the real
    // presentation surface now; the page-background literal above stays a
    // secondary fallback). HUG auto-layout with ONE child (the set) is a
    // padding box, nothing more — no manual size math needed, and no
    // resize() is ever called (Sizing Modes ref trap stays avoided).
    const presentationFrame = figma.createFrame();
    presentationFrame.name = OPS.componentSetName + ' — Generated';
    page.appendChild(presentationFrame);
    presentationFrame.layoutMode = 'HORIZONTAL';
    presentationFrame.primaryAxisSizingMode = 'AUTO';
    presentationFrame.counterAxisSizingMode = 'AUTO';
    bindNum(presentationFrame, 'paddingTop', FRAME_PADDING_FIGMA_VAR);
    bindNum(presentationFrame, 'paddingBottom', FRAME_PADDING_FIGMA_VAR);
    bindNum(presentationFrame, 'paddingLeft', FRAME_PADDING_FIGMA_VAR);
    bindNum(presentationFrame, 'paddingRight', FRAME_PADDING_FIGMA_VAR);
    { const p = await boundSolid(SITE_BG_FIGMA_VAR); if (p) presentationFrame.fills = [p]; }
    presentationFrame.appendChild(set); // auto-layout repositions set itself; the manual x/y above is moot post-reparent
    presentationFrame.x = 0; presentationFrame.y = 0;

    // T21: "dep on defaults" — never hardcode Light or Dark; read whichever
    // mode the collection's OWN defaultModeId currently names and set THAT
    // explicitly on the frame, so bound theme variables under it always
    // resolve consistently regardless of the file's own current appearance.
    const themeModeCollection = (await figma.variables.getLocalVariableCollectionsAsync())
      .find((c) => c.name === THEME_MODE_COLLECTION_NAME);
    let appliedThemeMode = null;
    if (themeModeCollection) {
      try {
        presentationFrame.setExplicitVariableModeForCollection(themeModeCollection, themeModeCollection.defaultModeId);
        appliedThemeMode = themeModeCollection.modes.find((m) => m.modeId === themeModeCollection.defaultModeId)?.name ?? themeModeCollection.defaultModeId;
      } catch (e) { misses.add('explicit-variable-mode:' + THEME_MODE_COLLECTION_NAME); }
    } else {
      misses.add('variable-collection:' + THEME_MODE_COLLECTION_NAME);
    }

    const addedProps = [];
    for (const prop of OPS.componentProperties) {
      try {
        if (prop.type === 'TEXT') {
          const propRef = set.addComponentProperty(prop.name, 'TEXT', prop.default || '');
          for (const variant of set.children) {
            const tn = variant.findOne((n) => n.type === 'TEXT');
            if (tn) tn.componentPropertyReferences = { characters: propRef };
          }
          addedProps.push(prop.name);
        } else if (prop.type === 'BOOLEAN') {
          const propRef = set.addComponentProperty(prop.name, 'BOOLEAN', !!prop.default);
          if (prop.layerName) {
            for (const variant of set.children) {
              const layer = variant.findOne((n) => n.type === 'INSTANCE' && n.name === prop.layerName);
              if (layer) layer.componentPropertyReferences = { ...(layer.componentPropertyReferences || {}), visible: propRef };
            }
          }
          addedProps.push(prop.name);
        } else if (prop.type === 'INSTANCE_SWAP') {
          // T19: wire AFTER combineAsVariants, same as TEXT/BOOLEAN above —
          // addComponentProperty only accepts the COMPONENT_SET (SKILL.md
          // §3). The default component id is resolved live above
          // (iconComponentsByLayer, keyed by name, never stored as an id in
          // OPS) — a miss there means no property is added at all, same
          // honest-degrade convention bindNum/boundSolid already use.
          const iconComp = iconComponentsByLayer[prop.layerName];
          if (!iconComp) { misses.add('component-property:' + prop.name + ' (icon "' + prop.default + '" not found)'); continue; }
          const propRef = set.addComponentProperty(prop.name, 'INSTANCE_SWAP', iconComp.id);
          for (const variant of set.children) {
            const layer = variant.findOne((n) => n.type === 'INSTANCE' && n.name === prop.layerName);
            if (layer) layer.componentPropertyReferences = { ...(layer.componentPropertyReferences || {}), mainComponent: propRef };
          }
          addedProps.push(prop.name);
        }
      } catch (e) { misses.add('component-property:' + prop.name); }
    }

    // Best-effort text-style linkage (link-text-styles.mjs walks EVERY page in
    // the file, which would break this page's scratch-only guarantee — so this
    // is scoped to just the text nodes THIS run created).
    const styles = await figma.getLocalTextStylesAsync();
    const styleKey = (fam, sty, size) => fam + '|' + sty + '|' + Math.round(size);
    const byKey = new Map();
    for (const s of styles) {
      const k = styleKey(s.fontName.family, s.fontName.style, s.fontSize);
      if (!byKey.has(k)) byKey.set(k, s);
    }
    let linked = 0;
    for (const t of textNodes) {
      const fn = t.fontName;
      if (!fn || fn === figma.mixed) continue;
      const st = byKey.get(styleKey(fn.family, fn.style, t.fontSize));
      if (st) { try { await t.setTextStyleIdAsync(st.id); linked++; } catch (e) { /* leave literal */ } }
    }

    return JSON.stringify({
      page: page.name,
      reusedPage,
      set: set.id,
      componentSetName: set.name,
      variants: set.children.length,
      componentProperties: addedProps,
      missingVars: [...misses],
      textStylesLinked: linked,
      textNodesTotal: textNodes.length,
      presentationFrame: presentationFrame.id,
      presentationFrameFill: SITE_BG_FIGMA_VAR,
      presentationFramePadding: FRAME_PADDING_FIGMA_VAR,
      explicitThemeModeCollection: THEME_MODE_COLLECTION_NAME,
      explicitThemeMode: appliedThemeMode,
      maxVariantWidth: maxW,
      maxVariantHeight: maxH,
      gridColumns: cols.length,
      gridRows: rowKeyOrder.length,
    });
  `;
}

// ── decoy guard (mirrors scripts/contracts/extract-canvas.mjs's checkDecoyGuard) ──

function checkDecoyGuard(project, statusText) {
  for (const decoy of (project.figma && project.figma.decoys) || []) {
    if (statusText.includes(decoy.fileKey)) return { blocked: true, decoy };
  }
  return { blocked: false, decoy: null };
}

// ── shim transport ─────────────────────────────────────────────────────────

async function call(port, name, args) {
  let res;
  try {
    res = await fetch(`http://127.0.0.1:${port}/call`, { method: 'POST', body: JSON.stringify({ name, arguments: args }) });
  } catch {
    console.error(
      `Cannot reach the figma-console shim on :${port}.\n` +
      'Start it first:  node scripts/figma-atoms/mcp-shim.mjs\n' +
      "(Figma Desktop must be open with the Desktop Bridge plugin running, on the project's file.)",
    );
    process.exit(1);
  }
  const body = await res.json();
  if (body.error || body.isError) throw new Error(`${name} failed: ${JSON.stringify(body.error ?? body.text).slice(0, 500)}`);
  return body.text;
}

function parsePayload(text) {
  try {
    const outer = JSON.parse(text);
    if (typeof outer === 'string') return JSON.parse(outer);
    if (outer && typeof outer.result === 'string') return JSON.parse(outer.result);
    return (outer && outer.result) ?? outer;
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error(`unparseable figma_execute payload: ${text.slice(0, 300)}`);
    return JSON.parse(text.slice(start, end + 1));
  }
}

// ── main ────────────────────────────────────────────────────────────────

function loadContract(projectId, tag) {
  const path = join(CONTRACTS_DIR, projectId, `${tag}.contract.json`);
  return { path, contract: JSON.parse(readFileSync(path, 'utf8')) };
}

function writeOps(SC, tag, ops) {
  const dir = join(SC.dirs.sync, 'generated-ops');
  mkdirSync(dir, { recursive: true });
  const outPath = join(dir, `${tag}.ops.json`);
  writeFileSync(outPath, serialize(ops), 'utf8');
  return outPath;
}

async function main() {
  const SC = scope(projectArg());
  const { contract } = loadContract(SC.id, COMPONENT);

  if (CHECK_DETERMINISM) {
    // T15's TODO(T12): same contract inputs -> byte-identical ops output,
    // independent of Figma/disk — mirrors emit-contracts.mjs's
    // --check-determinism exactly, one level down the pipeline.
    const first = serialize(buildOps(contract, { projectId: SC.id, pageName: PAGE_NAME }));
    const second = serialize(buildOps(contract, { projectId: SC.id, pageName: PAGE_NAME }));
    const ok = first === second;
    console.log(`[generate-figma] --check-determinism ${SC.id}/${COMPONENT}: ${ok ? 'DETERMINISTIC' : 'NONDETERMINISTIC'}`);
    if (!ok) {
      console.error('[generate-figma] two in-memory ops derivations of the same contract produced different bytes.');
      process.exit(1);
    }
    return;
  }

  const ops = buildOps(contract, { projectId: SC.id, pageName: PAGE_NAME });
  const outPath = writeOps(SC, COMPONENT, ops);
  console.log(`[generate-figma] ${SC.id}/${COMPONENT}: wrote ${ops.variants.length} variant ops -> ${outPath}`);

  if (OPS_ONLY) return;

  // Confirm the shim is reachable and NOT pointed at a decoy — before
  // sending anything that mutates.
  const status = parsePayload(await call(SHIM_PORT, 'figma_get_status', {}));
  const statusStr = JSON.stringify(status);
  const guard = checkDecoyGuard(SC.project, statusStr);
  if (guard.blocked) {
    console.error(
      `Refusing to generate: Figma is on the "${guard.decoy.fileName}" DECOY file. Open "${SC.fileName}" (${SC.fileKey}).` +
      (guard.decoy.why ? `\n  ${guard.decoy.why}` : ''),
    );
    process.exit(1);
  }

  const code = buildPluginCode(ops, SC);
  // T28: CONFIRMED LIVE — the Desktop Bridge enforces a hard ~30s execution
  // ceiling per figma_execute call, completely independent of this timeout
  // value (an unbounded scan and, separately, a large fan-out set with
  // cloned Phosphor instances both hit exactly "Execution timed out after
  // 30000ms" no matter how high this was raised, up to 280000). It is left
  // generous anyway — for a genuinely slow shim round-trip, not the plugin
  // ceiling — and the real fix for the plugin-side ceiling was reducing the
  // WORK per call (bounded scan budget, T21's icons-visible measurement
  // dance skipped entirely once every slot is axis-mode — see their own
  // comments), not this number.
  const text = await call(SHIM_PORT, 'figma_execute', { code, fileKey: SC.fileKey, timeout: 90000 });
  let payload;
  try { payload = JSON.parse(text); } catch { console.error(text); process.exit(1); }
  if (payload.success === false || payload.error) {
    console.error('[generate-figma] BUILD FAILED:', payload.error || payload);
    process.exit(1);
  }
  const result = typeof payload.result === 'string' ? JSON.parse(payload.result) : payload.result;
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/') || process.argv[1]?.endsWith('generate-figma.mjs')) {
  await main();
}
