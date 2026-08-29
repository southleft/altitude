/**
 * derive-ops.mjs — the PARITY CORE: contract JSON -> deterministic
 * intermediate OPS artifact (T12, spec
 * 2026-08-25-contract-backed-figma-parity-and-generation; split out of
 * generate-figma.mjs by spec 2026-08-26-modularize-generate-figma-mjs…).
 *
 * Pure function: same `contract` + same resolved per-component `config` ->
 * byte-identical `JSON.stringify(ops, null, 2)` every call (proven by
 * `--check-determinism`). No fs/network beyond the caller-supplied inputs.
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
 *   - library conventions (State axis, Title Case values, "Primary" not
 *     "default", Text/Is Full Width/Slot Before/Slot After/Icon Before/Icon
 *     After component properties, a 2px stroke focus ring) come straight from
 *     .claude/skills/altitude-figma-sync/SKILL.md — now centralized in
 *     conventions.mjs.
 */
import {
  DOC_HEADER_LINK_TEXT,
  DOC_HEADER_MASTER_NAME,
  DOC_HEADER_MASTER_PAGE,
  DOC_HEADER_MIN_WIDTH_PX,
  docHeaderDescription,
  docHeaderDocsUrl,
} from './doc-header-style.mjs';
import { normKey, STATE_ORDER, BOOLEAN_AXIS_CANONICAL_ORDER } from './conventions.mjs';
import { DEFAULT_COMPONENT_CONFIG } from './component-config.mjs';

/** Anatomy node (contract.schema.json shape) -> build-tree node carrying only
 * resolved Figma variable NAMES (contract tokens already carry `.figma`). */
/**
 * CSS shorthand -> the longhand the set builder actually reads (spec
 * 2026-08-26-contract-coverage…, Badge walkthrough bug): SCSS-derived
 * conditionalBindings carry `background:` (the shorthand the stylesheet
 * literally wrote) while measured anatomy carries BOTH `background` and
 * `background-color` — the builder reads `background-color`, so an
 * un-normalized variant delta under `background` silently lost to the root's
 * stale default (every Badge variant rendered the default-grey pill).
 * Normalizing here, at map-build time, lets plain `{ ...root, ...variant }`
 * layering do the right thing in every consumer.
 */
function normalizeCssProp(cssProp) {
  return cssProp === 'background' ? 'background-color' : cssProp;
}

export function convertAnatomyNode(node) {
  if (!node) return null;
  const tokens = {};
  for (const [cssProp, binding] of Object.entries(node.tokens || {})) {
    if (binding && binding.figma) tokens[normalizeCssProp(cssProp)] = binding.figma;
  }
  return {
    tag: node.tag,
    cls: node.cls || null,
    // Nested-component annotation (spec 2026-08-26-contract-coverage…) —
    // carried through verbatim so the set builder can place an INSTANCE of
    // that component's own Figma set here instead of rebuilding the subtree.
    ...(node.component ? { component: node.component } : {}),
    // Measured rendered text + size (Checkbox walkthrough) — real label
    // copy and leaf-glyph geometry, straight from the contract.
    ...(node.text ? { text: node.text } : {}),
    ...(node.box ? { box: node.box } : {}),
    // PAGE-lane literal type metrics (generate-snippet attaches fsPx/lhPx —
    // the measured USED font-size/line-height; hero learnings note
    // 2026-08-28). Never present on real contracts, so component ops are
    // byte-identical to before.
    ...(node.fsPx ? { fsPx: node.fsPx } : {}),
    ...(node.lhPx ? { lhPx: node.lhPx } : {}),
    ...(node.padPx ? { padPx: node.padPx } : {}),
    ...(node.gapPx ? { gapPx: node.gapPx } : {}),
    ...(node.bgCss ? { bgCss: node.bgCss } : {}),
    ...(node.fcCss ? { fcCss: node.fcCss } : {}),
    ...(node.fwCss ? { fwCss: node.fwCss } : {}),
    ...(node.bcCss ? { bcCss: node.bcCss, bwPx: node.bwPx, ...(node.bw4 ? { bw4: node.bw4 } : {}) } : {}),
    ...(node.radPx ? { radPx: node.radPx } : {}),
    ...(node.absPos ? { absPos: node.absPos } : {}),
    ...(node.imgB64 ? { imgB64: node.imgB64 } : {}),
    ...(node.ffCss ? { ffCss: node.ffCss } : {}),
    ...(node.gridTex ? { gridTex: node.gridTex } : {}),
    ...(node.runs ? { runs: node.runs } : {}),
    ...(node.mbPx ? { mbPx: node.mbPx } : {}),
    ...(node.mrPx ? { mrPx: node.mrPx } : {}),
    ...(node.inlineFlow ? { inlineFlow: true } : {}),
    ...(node.gridCols ? { gridCols: node.gridCols } : {}),
    layout: node.layout || null,
    tokens,
    children: (node.children || []).map(convertAnatomyNode).filter(Boolean),
  };
}

/** The first measured text anywhere in an anatomy tree (depth-first) — the
 * component's own real rendered copy, used as the Text property default so a
 * generated set (and its sheet instances) reads like the app, not like a
 * component-name placeholder. */
export function firstAnatomyText(root) {
  if (!root) return null;
  if (root.text) return root.text;
  for (const c of root.children || []) {
    const t = firstAnatomyText(c);
    if (t) return t;
  }
  return null;
}

/** Every DISTINCT component tag annotated anywhere in a converted anatomy
 * tree (outermost and nested alike — the builder applies its own
 * outermost-wins rule when placing instances), sorted for determinism. */
export function collectNestedComponentTags(root) {
  const out = new Set();
  const walk = (n) => {
    if (!n) return;
    if (n.component) out.add(n.component);
    for (const c of n.children || []) walk(c);
  };
  // The root itself is never annotated (it IS this contract's component).
  for (const c of root?.children || []) walk(c);
  return [...out].sort();
}

/** contract.anatomy.stateOverrides (node path -> cssProp -> tokenBinding) ->
 * the same shape with each binding collapsed to its Figma variable NAME. */
export function convertStateOverrides(stateOverrides) {
  const out = {};
  for (const [state, byPath] of Object.entries(stateOverrides || {})) {
    const paths = {};
    for (const [path, props] of Object.entries(byPath || {})) {
      const resolved = {};
      for (const [cssProp, binding] of Object.entries(props || {})) {
        if (binding && binding.figma) resolved[normalizeCssProp(cssProp)] = binding.figma;
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
export function figmaMapOf(bindingMap) {
  const out = {};
  for (const [cssProp, tb] of Object.entries(bindingMap || {})) if (tb && tb.figma) out[normalizeCssProp(cssProp)] = tb.figma;
  return out;
}

/**
 * T18: resolve ONE contract's `conditionalBindings` (see contract.schema.json) into
 * lookup functions keyed the way the OPS variant/state axes actually spell things
 * (Figma Title Case option / state name), rather than forcing every caller to re-pair
 * casing. `null` values from either lookup mean "no SCSS-derived fact for this
 * condition" — the caller falls back to the anatomy-derived root tokens, never fabricates.
 */
export function resolveConditionalBindings(contract) {
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
 * The prop that becomes the set's enum VARIANT axis. GENERALIZED beyond the
 * al-button pilot's hard-coded `p.name === 'variant'`: the contract already
 * carries the generic fact — `bindings.figma.kind: 'VARIANT'` plus the Figma
 * `property` name and Title Case `options` list (al-range's `behavior` ->
 * "Behavior", al-input's `label` -> "Label"). Selection:
 *   1. config.enumProp, when a component's figma.gen.json names one
 *      explicitly (only needed if a contract ever declares more than one
 *      VARIANT-kind prop and the default pick is wrong);
 *   2. a prop literally named `variant` with VARIANT-kind figma bindings
 *      (the library's dominant convention — 13 of 17 curated contracts);
 *   3. the sole VARIANT-kind prop the contract declares;
 *   4. none -> no enum axis (State-only set, e.g. al-toggle).
 */
export function resolveEnumProp(contract, config) {
  const props = contract.props || [];
  const isVariantKind = (p) => p.bindings?.figma?.kind === 'VARIANT' && Array.isArray(p.bindings.figma.options);
  if (config.enumProp) return props.find((p) => p.name === config.enumProp && isVariantKind(p)) || null;
  const named = props.find((p) => p.name === 'variant' && isVariantKind(p));
  if (named) return named;
  const candidates = props.filter(isVariantKind);
  return candidates.length === 1 ? candidates[0] : null;
}

/** Generic Figma property name for a boolean code prop with no
 * `bindings.figma.property` curation: fullWidth -> "Is Full Width". */
function defaultBooleanPropertyName(propName) {
  const spaced = String(propName)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return /^Is\b/.test(spaced) ? spaced : `Is ${spaced}`;
}

/**
 * contract JSON -> deterministic intermediate ops artifact.
 *
 * `config` is the RESOLVED per-component config (component-config.mjs) — the
 * generation judgment calls that used to be module-level constants in the
 * al-button pilot. Defaults are applied here too so tests can call with just
 * a contract.
 */
export function buildOps(contract, {
  projectId = 'altitude', pageName = 'Contract Pilot',
  // T31: `--sheet`'s own use of this SAME derivation — every non-omitted
  // boolean (slot or fullWidth) is forced into axis mode regardless of the
  // contract's own `figma.axis`/`figmaAxis` curation, so the documentation
  // sheet always fans out EVERY property combination, independent of what
  // the live (property-mode-by-default) set itself curates. This is the
  // "repurpose, don't duplicate" seam for the T23 fan-out machinery below —
  // NO CALLER SETS THIS ANY MORE. buildSheetPlan() was its only user and the
  // prop sheet was retired 2026-08-29, so every run now takes the `false`
  // branch. Kept (rather than ripped out of the axis logic) because it still
  // documents WHY the two branches differ; delete it the next time this
  // derivation is reworked.
  // buildSheetPlan() called buildOps(contract, { forceAllBooleanAxes: true })
  // to get the full cartesian `variants` list, then re-groups it for
  // rendering rather than re-deriving the cartesian product itself.
  forceAllBooleanAxes = false,
  config = DEFAULT_COMPONENT_CONFIG,
  // Spec 2026-08-26-contract-coverage…: component tag -> that component's
  // Figma set NAME (from each sibling contract's bindings.figma.
  // componentSetName, real-set name when mapped; the caller builds this map
  // from the tracked contracts dir so this function stays pure). Used to
  // resolve nested-component instances BY NAME at generation time — never a
  // node id.
  nestedSetNames = {},
} = {}) {
  const tag = contract.id;

  // Enum axis: the contract's OWN Figma-side option list already IS "the
  // enum plus its stated default" — e.g. al-button's `variant` prop lists
  // Bare/Danger/Secondary/Tertiary (the code enum) PLUS "Primary" (the
  // code-default rendering when no `variant` attribute is set at all; the
  // library calls that variant "Primary", never "default" — SKILL.md §3).
  // Reusing it verbatim avoids re-guessing a pairing the contract README
  // (Deviations) explicitly says is fragile to invent. The axis NAME comes
  // from the prop's own `bindings.figma.property` (usually "Variant"; al-
  // range's "Behavior", al-input's "Label"), see resolveEnumProp above.
  const variantProp = resolveEnumProp(contract, config);
  const variantValues = variantProp && variantProp.bindings && variantProp.bindings.figma && Array.isArray(variantProp.bindings.figma.options)
    ? [...variantProp.bindings.figma.options].sort()
    : [];
  const variantAxisName = variantProp?.bindings?.figma?.property || 'Variant';
  const variantAxis = variantValues.length
    ? { name: variantAxisName, values: variantValues, default: variantValues.includes('Primary') ? 'Primary' : variantValues[0] }
    : null;

  // State axis: Default always, plus whichever of the contract's declared
  // `states` this component has (contract.states is lowercase; canvas/Figma
  // spells them Title Case) — AND (spec 2026-08-26-contract-coverage…, the
  // Badge walkthrough finding) only states some FACT actually distinguishes:
  // a generic conditionalBindings.state delta, a compound variant+state
  // delta, or a measured anatomy stateOverride. `contract.states` records
  // which states the measurement pass CAPTURED; a captured state whose
  // tokens are identical to Default (al-badge: no state styling exists at
  // all) would fan out as byte-identical duplicate variant rows — the real
  // Badge set rightly has no State axis, and neither should a generated one.
  // When only Default survives, the State axis is dropped entirely (no
  // "State=Default" prefix, no one-option State property on the set).
  const declaredStates = new Set((contract.states || []).map((s) => String(s).toLowerCase()));
  const statesWithFacts = new Set();
  for (const key of Object.keys(contract.conditionalBindings?.state || {})) statesWithFacts.add(normKey(key));
  for (const vb of Object.values(contract.conditionalBindings?.variant || {})) {
    for (const key of Object.keys(vb?.state || {})) statesWithFacts.add(normKey(key));
  }
  for (const key of Object.keys(contract.anatomy?.stateOverrides || {})) statesWithFacts.add(normKey(key));
  const droppedStates = STATE_ORDER.filter((s) => s !== 'Default' && declaredStates.has(s.toLowerCase()) && !statesWithFacts.has(normKey(s)));
  const stateValues = STATE_ORDER.filter((s) => s === 'Default' || (declaredStates.has(s.toLowerCase()) && statesWithFacts.has(normKey(s))));
  const stateAxis = stateValues.length > 1 ? { name: 'State', values: stateValues, default: 'Default' } : null;

  // T23: boolean-turned-axis curation. `bindings.figma.axis: true` on the
  // full-width prop, `figmaAxis: true` on a `before`/`after` slot — a slot
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
  const fullWidthProp = (contract.props || []).find((p) => p.name === config.fullWidthProp);

  // T27: `bindings.figma.omit: true` (props) / `slots[].figmaOmit: true`
  // (slots) is a hand-curated OPT-OUT — reserving the right to keep a
  // code-only boolean out of the generated Figma set entirely (owner: "I
  // don't need that in figma", al-button's `fullWidth`). Takes precedence
  // over `isAxis` if a contract were ever curated with both (should not
  // happen in practice — nothing left to fan out once omitted).
  const layoutBooleans = [];
  if (fullWidthProp) {
    const isOmit = !!fullWidthProp.bindings?.figma?.omit;
    const isAxis = !isOmit && (forceAllBooleanAxes || !!fullWidthProp.bindings?.figma?.axis);
    layoutBooleans.push({
      kind: 'fullWidth',
      propertyName: fullWidthProp.bindings?.figma?.property || defaultBooleanPropertyName(fullWidthProp.name),
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
      isAxis: !isOmit && (forceAllBooleanAxes || !!slot.figmaAxis),
      isOmit,
      layerName,
      iconName: slot.figmaPlaceholder || null,
    });
  }

  // ── Case axes (spec 2026-08-26-contract-coverage…, Breadcrumbs Item
  // walkthrough): the measurement pass renders a component across a case
  // MATRIX ("Current=Yes,Separator=no"), and anatomy.cases now carries every
  // case's FULL tree. A case DIMENSION becomes a real variant axis when it
  // maps to a boolean code prop — automatically when the names pair
  // (Current ↔ isCurrent, Separator ↔ hasSeparator; the is/has prefix is
  // stripped before comparing), or by hand in the component's figma.gen.json
  // `caseAxes: [{ dimension, prop, property?, valueMap? }]` for a pairing
  // the names don't reveal (Badge's Shape ↔ isDot -> a "Type" axis with
  // valueMap { label: "Default", dot: "Dot" }). Each fanned combination
  // builds from its OWN case tree — structure included (a separator child
  // that only exists when Separator=yes), which token deltas alone could
  // never express. A dimension matching the enum axis, mapping to no prop,
  // or mapping to an omitted prop stays un-fanned at its base-case value.
  // Dimension keys are TRIMMED. The harness joins state cases as
  // `${base}, State=Disabled` (plan.mjs), so the split yields a key with a
  // LEADING SPACE — ' State' — which matched no prop and no curation, and was
  // recorded as an accepted quirk (altitude-figma-generate trap 15). That is
  // what kept Checkbox Group's and Radio Group's Error/Disabled rows out of
  // their generated sets even though both are measurably distinct (Error adds
  // an error-note subtree; Disabled adds theme/opacity/disabled to 11 nodes)
  // and both are drawn in the design library's own reference frames.
  const parseCase = (s) => Object.fromEntries(
    String(s || '').split(',').filter(Boolean).map((kv) => {
      const eq = kv.indexOf('=');
      return eq === -1 ? [kv.trim(), ''] : [kv.slice(0, eq).trim(), kv.slice(eq + 1).trim()];
    }),
  );
  const dimKeyOf = (dims) => Object.entries(dims).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join(',');
  // `implicitDefault` on a curated case axis: a dimension the harness only
  // spells out when it is NON-default. State is the standing example — the
  // base case is `Legend=shown` and the state cases are
  // `Legend=shown, State=Error`, so "no State key" IS State=Default. Without
  // this the base rows key differently from the state rows and the dimension
  // can never be fanned into a complete axis.
  const implicitDefaults = new Map(
    (config.caseAxes || []).filter((e) => e.implicitDefault).map((e) => [e.dimension, e.implicitDefault]),
  );
  const anatomyCases = (contract.anatomy?.cases || []).map((c, i) => {
    const dims = parseCase(c.case);
    for (const [dim, dflt] of implicitDefaults) if (!(dim in dims)) dims[dim] = dflt;
    return { ...c, dims, index: i };
  });
  const caseIndexByKey = new Map(anatomyCases.map((c) => [dimKeyOf(c.dims), c.index]));
  const baseDims = parseCase(contract.anatomyCase);
  for (const [dim, dflt] of implicitDefaults) if (!(dim in baseDims)) baseDims[dim] = dflt;
  const titleize = (v) => (v ? String(v)[0].toUpperCase() + String(v).slice(1) : v);
  const strippedPropKey = (name) => normKey(String(name).replace(/^(is|has)(?=[A-Z])/, ''));
  const caseAxisDefs = [];
  if (anatomyCases.length > 1) {
    const dimValues = new Map();
    for (const c of anatomyCases) for (const [k, v] of Object.entries(c.dims)) {
      if (!dimValues.has(k)) dimValues.set(k, new Set());
      dimValues.get(k).add(v);
    }
    const curated = new Map((config.caseAxes || []).map((e) => [e.dimension, e]));
    for (const [dim, values] of [...dimValues.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      if (values.size < 2) continue;
      if (variantProp && (normKey(dim) === normKey(variantProp.name) || normKey(dim) === normKey(variantProp.bindings?.figma?.property || ''))) continue; // the enum axis owns this dimension (conditionalBindings), never a case axis
      const cur = curated.get(dim);
      // A dimension may be backed by ONE prop (the common case, auto-matched
      // or curated via `prop`) or by SEVERAL (`props: [...]`). State is the
      // compound case: its values are driven by isError and isDisabled, so no
      // single prop names it, and the old single-prop lookup dropped the whole
      // dimension. Every named prop must exist on the contract — a dimension
      // is still never fabricated, it just no longer has to be spelled by one
      // prop to count as backed.
      const curProps = cur && Array.isArray(cur.props) ? cur.props : null;
      let backing;
      if (curProps) {
        backing = curProps.map((n) => (contract.props || []).find((p) => p.name === n)).filter(Boolean);
        if (backing.length !== curProps.length) continue; // a named prop does not exist — curation is stale
      } else {
        const prop = cur
          ? (contract.props || []).find((p) => p.name === cur.prop)
          : (contract.props || []).find((p) => strippedPropKey(p.name) === normKey(dim));
        if (!prop) continue; // no code prop backs this dimension — stays at its base value, never fabricated
        backing = [prop];
      }
      if (backing.every((p) => p.bindings?.figma?.omit)) continue; // T27 opt-out applies to case axes too
      const valueMap = cur?.valueMap || {};
      const optionOf = (raw) => valueMap[raw] || titleize(raw);
      const optionToRaw = {};
      for (const raw of values) optionToRaw[optionOf(raw)] = raw;
      const options = Object.keys(optionToRaw).sort();
      caseAxisDefs.push({
        name: cur?.property || titleize(dim),
        values: options,
        default: optionOf(baseDims[dim] ?? [...values][0]),
        kind: 'case',
        dimension: dim,
        optionToRaw,
      });
    }
  }

  // Enum-dimension tree selection (spec 2026-08-26, molecules batch): when
  // the measured case matrix ALSO varies the enum axis (Banner's Variant,
  // Menu's Variant, Range's Behavior), each enum row can build from its OWN
  // measured tree — real per-variant structure (a success banner's icon, a
  // range's second handle), not just token deltas. Gated to WALK-built
  // components (composite anatomy or case axes) so the non-walk pilot recipe
  // (Button) keeps its approved behavior byte-for-byte.
  const anyNestedAnno = (function anyAnno(n) {
    if (!n) return false;
    if (n.component) return true;
    return (n.children || []).some(anyAnno);
  });
  const isWalkComponent = (contract.anatomy && (anyNestedAnno(contract.anatomy.root) || (contract.anatomy.cases || []).some((c) => anyNestedAnno(c.root)))) || false;
  let enumDimName = null;
  if (variantAxis && anatomyCases.length > 1 && (caseAxisDefs.length || isWalkComponent)) {
    const dimNames = new Set();
    for (const c of anatomyCases) for (const k of Object.keys(c.dims)) dimNames.add(k);
    for (const dim of dimNames) {
      if (normKey(dim) === normKey(variantProp.name) || normKey(dim) === normKey(variantAxis.name)) { enumDimName = dim; break; }
    }
  }

  // Axis order: State, the enum axis, then curated boolean axes in the
  // library's documented convention order (BOOLEAN_AXIS_CANONICAL_ORDER),
  // any future curated name not in that list — case axes included — appended
  // alphabetically after; see the constant's own comment in conventions.mjs.
  const booleanAxisDefs = [...layoutBooleans
    .filter((b) => b.isAxis && !b.isOmit)
    .map((b) => ({ name: b.propertyName, values: [...b.options], default: b.options.includes('False') ? 'False' : b.options[0], kind: b.kind, side: b.side, layerName: b.layerName })), ...caseAxisDefs]
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
  // glyph is resolved BY NAME inside the plugin code at generation time
  // (build-set-code.mjs's findPhosphorComponentByName, T28 — the Phosphor
  // library, never the old "🛠 Icons" flat-component page), keeping this
  // pure function's determinism intact (--check-determinism never touches
  // Figma). As of T29, that resolved glyph is never instantiated at the top
  // level on its own — it is swapped INTO the nested slot of an instance of
  // the owner's DS "Icon" wrapper component (also resolved by name,
  // findIconWrapperComponent), so this property's own `mainComponent`
  // default is the WRAPPER, not the glyph (see build-set-code.mjs).
  // `layerName` is the instance layer this property's `mainComponent`
  // reference targets (plus, in property mode only, the paired boolean's own
  // `visible` reference — see T19).
  // Text default: the component's own MEASURED copy when the anatomy carries
  // it ('Checkbox label', 'Button'), the display name otherwise — so the set
  // and its sheet instances read like the app, not like a name placeholder.
  const componentProperties = [{ name: 'Text', type: 'TEXT', default: firstAnatomyText(contract.anatomy?.root) || contract.name || tag }];
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

  // Converted ONCE, indexed the same as anatomyCases — each fanned variant
  // resolves its own tree (and base tokens) from here via rootIndex.
  const caseRoots = (caseAxisDefs.length || enumDimName) ? anatomyCases.map((c) => ({ case: c.case, root: convertAnatomyNode(c.root) })) : [];

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
  for (const state of stateAxis ? stateAxis.values : ['Default']) {
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
        // Case axes: this combination's TRUE anatomy tree — the case whose
        // fanned dimensions carry the combo's values and whose remaining
        // dimensions sit at the base case's values. A combination the
        // measurement matrix never produced falls back to the base tree
        // (reported once, below).
        let rootIndex;
        let caseTokens = rootFigmaTokens;
        if (caseAxisDefs.length || (enumDimName && variant)) {
          const want = { ...baseDims };
          for (const ax of caseAxisDefs) want[ax.dimension] = ax.optionToRaw[axisValues[ax.name]];
          if (enumDimName && variant) {
            const raw = [...(anatomyCases.flatMap((c) => (c.dims[enumDimName] !== undefined ? [c.dims[enumDimName]] : [])))]
              .find((v) => normKey(v) === normKey(variant));
            if (raw !== undefined) want[enumDimName] = raw;
          }
          rootIndex = caseIndexByKey.get(dimKeyOf(want));
          if (rootIndex === undefined) rootIndex = -1;
          if (rootIndex >= 0) caseTokens = caseRoots[rootIndex].root?.tokens ?? rootFigmaTokens;
        }
        // combineAsVariants derives the set's variant PROPERTIES from these
        // names — a dropped State axis means no "State=" segment, so the set
        // gets no State property at all. A component with NO surviving axis
        // still needs one name segment for its single variant; "State=
        // Default" matches how the file's own single-variant sets are shaped
        // (the real Breadcrumbs set: one variant, a one-option State axis).
        const nameParts = stateAxis ? [`State=${state}`] : [];
        if (variant) nameParts.push(`${variantAxis.name}=${variant}`);
        for (const axisDef of booleanAxisDefs) nameParts.push(`${axisDef.name}=${axisValues[axisDef.name]}`);
        if (!nameParts.length) nameParts.push('State=Default');
        variants.push({
          name: nameParts.join(', '),
          state,
          variant,
          axisValues,
          ...((caseAxisDefs.length || enumDimName) ? { rootIndex } : {}),
          tokens: { ...caseTokens, ...variantLayer, ...stateLayer },
        });
      }
    }
  }
  variants.sort((a, b) => a.name.localeCompare(b.name));

  // Spec 2026-08-26-contract-coverage…: the nesting facts the builder acts
  // on. `nestedSets` lists every component annotated in this anatomy with
  // the Figma set NAME to resolve it by (real-set name from the sibling
  // contract when mapped, the tag's own Title Case name otherwise — the same
  // name a generated set would carry).
  const titleCaseTag = (t) => t.replace(/^al-/, '').split('-').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
  const nestedTags = [...new Set([
    ...(root ? collectNestedComponentTags(root) : []),
    ...caseRoots.flatMap((c) => (c.root ? collectNestedComponentTags(c.root) : [])),
  ])].sort();
  const nestedSets = nestedTags.map((t) => ({ tag: t, setName: nestedSetNames[t] || titleCaseTag(t) }));

  const degradations = [];
  if (!root) degradations.push('anatomy unavailable on this contract — no structural/token facts to build from.');
  if (droppedStates.length) {
    degradations.push(
      `declared state${droppedStates.length > 1 ? 's' : ''} ${droppedStates.join(', ')} carr${droppedStates.length > 1 ? 'y' : 'ies'} ` +
      'no distinguishing fact (no conditionalBindings.state delta, no compound variant+state delta, no measured ' +
      'stateOverride) — omitted from the State axis rather than fanning out byte-identical duplicate rows. ' +
      'The measurement pass captures every state regardless of whether the component styles it; only styled ' +
      'states earn a variant.',
    );
  }
  if (!root && contract.composition?.renders?.length) {
    degradations.push(
      `composition is known from source (${contract.composition.renders.map((r) => r.tag).join(', ')}) but anatomy is ` +
      'unavailable in this environment — nested-component instances cannot be PLACED without measured structure; ' +
      'run the measurement pass (measure-components.mjs) and contracts --refresh, then regenerate.',
    );
  }
  if (caseAxisDefs.length) {
    const unmatched = variants.some((v) => v.rootIndex === -1);
    degradations.push(
      `case axes ${caseAxisDefs.map((a) => `${a.name} (dimension "${a.dimension}" ↔ prop, options ${a.values.join('/')})`).join('; ')} ` +
      'fan out from anatomy.cases — every combination builds from its OWN measured case tree (structure included), ' +
      'with conditionalBindings variant/state deltas layered on top. Measured stateOverrides were diffed against the ' +
      'BASE case only and are applied to every combination as an approximation.' +
      (unmatched ? ' At least one combination had NO matching measured case and fell back to the base tree.' : ''),
    );
  }
  if (nestedTags.length) {
    degradations.push(
      `nested components (${nestedTags.join(', ')}) render as INSTANCES of their own Figma sets, resolved BY NAME ` +
      '(outermost annotation wins; the annotated subtree is that component\'s internals and is never rebuilt). A tag ' +
      'whose set does not resolve (e.g. al-layout, an arrangement primitive with no set of its own, or an unmapped/' +
      'ungenerated component) falls back to a coarse auto-layout frame recursing its children — reported per miss, ' +
      'never silent. Nested instances render their OWN set\'s default variant; this component\'s State/Variant token ' +
      'deltas apply to the composed root only (per-state nested-instance switching is a refinement this ops schema ' +
      'does not yet carry).',
    );
  }
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
      `Icon ${sidesWithPlaceholder.map((s) => (s === 'before' ? 'Before' : 'After')).join('/')} is built as an ` +
      'INSTANCE of the owner\'s DS "Icon" wrapper component (resolved LIVE by name, findIconWrapperComponent, ' +
      'never a hard-coded node id — T29), with the Phosphor glyph named by contract.slots[].figmaPlaceholder ' +
      'resolved LIVE by name from the Phosphor Figma library (T28, findPhosphorComponentByName) and swapped INTO ' +
      'the wrapper\'s own nested instance (swapComponent) — never instantiated as a raw top-level Phosphor ' +
      `library instance. Icon size is a fixed ${config.iconSizeVar} (documented judgment call — the component's ` +
      'figma.gen.json `iconSizeVar`, not a per-variant contract fact) bound on both the wrapper AND its nested glyph ' +
      'instance (the wrapper does not auto-scale its child), and the icon is recolored to this row\'s own ' +
      'resolved content-color token, recursively, per the Icon Recoloring reference — skipping the top-level ' +
      'fill/stroke at EVERY instance boundary (wrapper root AND nested glyph root), not just the outermost one.',
    );
  }
  const axisModeSlotSides = slotSides.filter((b) => b.isAxis).map((b) => b.side);
  if (axisModeSlotSides.length) {
    const label = (s) => (s === 'before' ? 'Before' : 'After');
    degradations.push(
      forceAllBooleanAxes
        ? `T31 (--sheet): Slot ${axisModeSlotSides.map(label).join('/')} ${axisModeSlotSides.length > 1 ? 'are' : 'is'} ` +
          'fanned out as a documentation-only variant AXIS for this sheet plan (every property combination gets its ' +
          'own labeled instance) — this is NOT contract curation and has no bearing on the live, property-mode ' +
          'generated set, which keeps this as a shared BOOLEAN property. See .altitude/contracts/README.md § ' +
          'Documentation sheet (--sheet, T31).'
        : `T23: Slot ${axisModeSlotSides.map(label).join('/')} ${axisModeSlotSides.length > 1 ? 'are' : 'is'} curated as ` +
          'a variant AXIS (figmaAxis: true) — every combination fans out as a separately-built variant with the ' +
          'slot\'s icon statically shown/hidden, rather than one shared BOOLEAN property. VERIFIED against the ' +
          'real Button set (node 4271:9562) that this does NOT match its live shape (Slot Before/After there are ' +
          'still BOOLEAN properties, the library\'s real, lean convention — see .altitude/contracts/README.md § ' +
          'Fan-out convention) — curating this true on a NEW contract should be reserved for a component whose ' +
          'real set demonstrably fans a boolean out as its own axis, not the default.',
    );
  }
  if (layoutBooleans.some((b) => b.kind === 'fullWidth' && b.isAxis)) {
    degradations.push(
      `${forceAllBooleanAxes ? 'T31 (--sheet)' : 'T23'}: "Is Full Width" is fanned out as a variant axis, but no real or ` +
      'measured pixel fact exists for what "full width" renders as (contract.schema.json\'s anatomyNode has no pixel ' +
      'geometry, and the real Button set does not expose this as an axis to inspect) — rendered as natural hug width ' +
      `+ a fixed ${config.fullWidthExtraPx}px margin (documented judgment call — the component's figma.gen.json ` +
      '`fullWidthExtraPx`), not a measured or observed target width.',
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
    // Owner direction 2026-08-29: a component page is ONE frame — this
    // header sitting above the real COMPONENT_SET. Everything the retired
    // prop sheet added (the variant break-out grid and its dashed
    // separators) is gone; variants get expanded by hand with Propstar when
    // a page needs them. The header is presentation only and is NEVER a
    // parity fact — see conventions.mjs § "Resolve the set structurally".
    header: {
      masterName: DOC_HEADER_MASTER_NAME,
      masterPageName: DOC_HEADER_MASTER_PAGE,
      title: contract.name || tag,
      description: docHeaderDescription(contract.description),
      linkText: DOC_HEADER_LINK_TEXT,
      linkUrl: docHeaderDocsUrl(tag),
      minWidth: DOC_HEADER_MIN_WIDTH_PX,
    },
    axes,
    componentProperties,
    anatomySource: contract.anatomySource,
    anatomyCase: contract.anatomyCase,
    root,
    ...(caseRoots.length ? { caseRoots } : {}),
    stateOverrides,
    composition: contract.composition ?? null,
    nestedSets,
    variants,
    degradations,
  };
}

/** The State axis is the library-wide grid/column convention; the ENUM axis
 * is whichever axis is neither State nor a boolean axis (boolean axes carry
 * a `kind`). Shared by the sheet planner and the code emitters so "which
 * axis is the Variant-like one" is decided in exactly one place — and stays
 * derivable from the ops JSON itself (no extra field, keeping the ops
 * artifact's bytes stable across the modularization). */
export function classifyAxes(axes) {
  const stateAxis = axes.find((a) => a.name === 'State') || null;
  const enumAxis = axes.find((a) => a !== stateAxis && !a.kind) || null;
  const boolAxes = axes.filter((a) => a !== stateAxis && a !== enumAxis);
  return { stateAxis, enumAxis, boolAxes };
}
