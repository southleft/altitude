// contract-diff.mjs — the three-way differ (CODE contract <-> CANVAS contract)
// adapted from southleft/ds-contracts-poc's `parity/` instrument. "Three-way"
// names the lineage: contract (the spec) / code (the implementation) / canvas
// (the design). In Altitude's model the CODE contract already IS the emitted
// spec — `.altitude/contracts/<project>/<tag>.contract.json`, itself derived
// from the CEM, the token-map and measure-components.mjs (see
// .altitude/contracts/README.md) — so there is no separate hand-authored
// third input; the two legs this module actually compares are that CODE
// contract (contract.schema.json shape) and the CANVAS contract
// (canvas-contract.schema.json shape, scripts/contracts/extract-canvas.mjs).
//
// PURE. No fs, no network, no imports from sibling modules — every input is a
// plain parsed-JSON object, so this runs identically whether the caller read
// its two contracts from disk, a fixture, or an in-memory object built by a
// test. (`normKey` below intentionally duplicates parity.mjs's private
// helper of the same name rather than importing it — same call
// emit-contracts.mjs already made for the same reason: this stays a leaf
// module with zero sibling imports, and parity.mjs is free to import THIS
// module in turn (T7) without any risk of a circular import. Keep the two
// definitions identical; they encode one normalisation rule.)
//
// R2 (spec 2026-08-25-contract-backed-figma-parity-and-generation): this
// module never decides a parity STATUS — that vocabulary (in-sync,
// code-drift, figma-drift, conflict, missing-in-figma, missing-in-code,
// excluded) belongs to parity.mjs alone, unchanged. What this module adds is
// finer than status: which SPECIFIC prop, variant value, state or token
// binding disagrees, when a live canvas dump exists to compare against.
// Absence of a canvas dump is not this module's problem to solve — a caller
// with no `canvasContract` gets a clean "not comparable" result, never a
// crash and never a fabricated disagreement.

/**
 * Same case/separator-insensitive comparison parity.mjs's `diffFigmaContract()`
 * already applies when matching a Figma variant-property name to a CEM
 * attribute name — Figma axes are Title Case (`Variant`), code's are kebab
 * (`variant`). Reused here for EVERY label pairing this module does (prop
 * names, variant option values, state names) so a disagreement is never
 * "Figma spells it differently", only "Figma doesn't have it at all" or
 * "the set of values genuinely differs".
 */
const normKey = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const normSet = (arr) => new Set((arr ?? []).map(normKey));

/** Stable sort so two diffs of the same two inputs are byte-identical, ever. */
function sortDisagreements(list) {
  return list.slice().sort((a, b) => {
    if (a.dimension !== b.dimension) return a.dimension.localeCompare(b.dimension);
    return String(a.key).localeCompare(String(b.key));
  });
}

/**
 * T17 (spec 2026-08-25-contract-backed-figma-parity-and-generation): the
 * live al-button run surfaced pairing gaps that read as drift but aren't —
 * `normKey` alone treats canvas "Is Full Width" and code `fullWidth` as
 * unrelated strings. `NAME_ALIAS_PREFIXES` lists normalized-key prefixes
 * stripped from EITHER side before a prop/variant-axis name pairing is
 * attempted, so "Is Full Width" -> "isfullwidth" -> "fullwidth" meets
 * "fullWidth" -> "fullwidth", and "Disabled" meets "isDisabled" the same
 * way. One row per prefix; add here, not as a scattered `if`.
 */
const NAME_ALIAS_PREFIXES = ['is'];

/** Every normalized-key candidate a prop/variant-axis name could pair
 * under — the plain normalized key, plus one per matched alias-prefix
 * strip. Order doesn't matter; callers test set membership. */
function propNameKeys(rawName) {
  const base = normKey(rawName);
  const keys = new Set([base]);
  for (const prefix of NAME_ALIAS_PREFIXES) {
    if (base.startsWith(prefix) && base.length > prefix.length) keys.add(base.slice(prefix.length));
  }
  return keys;
}

/**
 * PAIRING_CONVENTIONS — canvas <-> code pairings this differ recognizes
 * beyond the straight normalized-name match `propNameKeys` gives every
 * prop for free. Two shapes, dispatched on which key is present:
 *
 * - SLOT rows (`codeSlot` set): one or more canvas `componentProperties`
 *   matching `canvasPattern` are the canvas-side ENCODING of one code
 *   SLOT (Figma has no slot concept — a set author expresses "there's a
 *   slot here" as a "Slot Before"/"Slot After" toggle, sometimes paired
 *   with an INSTANCE_SWAP "Icon Before"/"Icon After" for the default
 *   fill). Both sides present -> satisfied, presence-only, no
 *   disagreement. Either side alone -> one `slot-unpaired` disagreement,
 *   dimension `slot`.
 * - PROP rows (`codeProp` set): a canvas property matching `canvasPattern`
 *   (and `canvasType`, when given) pairs by PRESENCE ONLY with the named
 *   code prop when it exists; else with `fallbackCodeSlot` (a code slot
 *   name) when THAT exists; else it is left unclaimed and falls through to
 *   the generic "missing-in-code" report — a genuine gap, not a pairing
 *   miss.
 *
 * T23 (spec 2026-08-25-contract-backed-figma-parity-and-generation): a SLOT
 * row's `canvasPattern` deliberately carries no `canvasType` — the toggle a
 * hand-built set expresses "there's a slot here" with can be a BOOLEAN
 * component property (T12/T18/T19, still the default) OR its own True/False
 * VARIANT axis (the fan-out convention a contract opts into via
 * `slots[].figmaAxis: true` — see .altitude/contracts/README.md § Fan-out
 * convention and generate-figma.mjs). Pairing by NAME only, ignoring type,
 * means both styles pair identically without a second row per slot — proven
 * by the self-test fixture (`Slot Before` planted as VARIANT, `Slot After`
 * still BOOLEAN, both handled by this SAME table). The generic (non-slot)
 * prop-name pairing a few lines below this table is likewise type-agnostic
 * for non-enum code props (e.g. `fullWidth` <-> canvas "Is Full Width" pairs
 * whether that canvas property is BOOLEAN or, once curated as an axis,
 * VARIANT) — no PAIRING_CONVENTIONS row was needed for that case at all.
 *
 * A new convention is one row here; `applyPairingConventions()` below is
 * the whole generic engine over this table — see T17 (spec
 * 2026-08-25-contract-backed-figma-parity-and-generation) and T15's future
 * eval, which enumerates this table rather than re-deriving it.
 */
export const PAIRING_CONVENTIONS = [
  { id: 'slot-before', dimension: 'slot', codeSlot: 'before', canvasPattern: /^(slot|icon)\s+before$/i },
  { id: 'slot-after', dimension: 'slot', codeSlot: 'after', canvasPattern: /^(slot|icon)\s+after$/i },
  { id: 'text-label', dimension: 'prop', codeProp: 'label', canvasPattern: /^(text|label)$/i, canvasType: 'TEXT', fallbackCodeSlot: '' },
];

/**
 * Run every PAIRING_CONVENTIONS row against one codeContract/canvasContract
 * pair. Pure, no mutation of either input.
 *
 * @returns {{claimedCanvasProps: Set<object>, handledCodeSlots: Set<string>,
 *            skipCodePropNames: Set<string>, conventionDisagreements: Array,
 *            omissionSkips: Array<{dimension:string,reason:string,key:string}>,
 *            comparedSlots: number}}
 */
function applyPairingConventions({ codeContract, canvasContract }) {
  const claimedCanvasProps = new Set();
  const handledCodeSlots = new Set();
  const skipCodePropNames = new Set();
  const conventionDisagreements = [];
  const omissionSkips = [];
  let comparedSlots = 0;

  const canvasProps = canvasContract.componentProperties ?? [];
  const slotByName = new Map((codeContract.slots ?? []).map((s) => [s.name, s]));
  const codePropByName = new Map((codeContract.props ?? []).map((p) => [p.name, p]));

  for (const conv of PAIRING_CONVENTIONS) {
    const canvasMatches = canvasProps.filter(
      (cp) => conv.canvasPattern.test(cp.name) && (!conv.canvasType || cp.type === conv.canvasType),
    );

    if (conv.codeSlot) {
      const codeSlot = slotByName.get(conv.codeSlot);

      // T27 (spec 2026-08-25-contract-backed-figma-parity-and-generation):
      // a slot curated `figmaOmit: true` is a deliberate opt-out — it is
      // NEVER a `slot-unpaired` disagreement when canvas has nothing for it
      // (that is the DESIRED state, recorded as a named skip rather than
      // silently vanishing). Canvas STILL expressing it despite the opt-out
      // is the one real problem — flagged `present-despite-omission`,
      // distinct from an ordinary pairing gap.
      if (codeSlot?.figmaOmit) {
        handledCodeSlots.add(conv.codeSlot);
        for (const cp of canvasMatches) claimedCanvasProps.add(cp);
        if (canvasMatches.length) {
          const names = canvasMatches.map((c) => c.name).sort();
          comparedSlots += 1;
          conventionDisagreements.push({
            dimension: 'slot',
            key: `slot:${conv.codeSlot}`,
            code: conv.codeSlot,
            canvas: names,
            kind: 'present-despite-omission',
            detail: `code slot "${conv.codeSlot}" is curated figmaOmit: true (should not be expressed in Figma) but canvas still exposes ${names.map((n) => `"${n}"`).join(', ')}.`,
          });
        } else {
          omissionSkips.push({ dimension: 'slot', reason: 'intentional-omission', key: `slot:${conv.codeSlot}` });
        }
        continue;
      }

      if (!codeSlot && !canvasMatches.length) continue; // neither side expresses this slot — convention doesn't apply
      comparedSlots += 1;
      if (codeSlot && canvasMatches.length) {
        handledCodeSlots.add(conv.codeSlot);
        for (const cp of canvasMatches) claimedCanvasProps.add(cp);
      } else if (codeSlot) {
        handledCodeSlots.add(conv.codeSlot);
        conventionDisagreements.push({
          dimension: 'slot',
          key: `slot:${conv.codeSlot}`,
          code: conv.codeSlot,
          canvas: null,
          kind: 'slot-unpaired',
          detail: `code slot "${conv.codeSlot}" has no matching canvas "Slot ${conv.codeSlot === 'before' ? 'Before' : 'After'}"/"Icon ${conv.codeSlot === 'before' ? 'Before' : 'After'}" property.`,
        });
      } else {
        const names = canvasMatches.map((c) => c.name).sort();
        for (const cp of canvasMatches) claimedCanvasProps.add(cp);
        conventionDisagreements.push({
          dimension: 'slot',
          key: names.join(', '),
          code: null,
          canvas: names,
          kind: 'slot-unpaired',
          detail: `canvas exposes ${names.map((n) => `"${n}"`).join(', ')} with no matching code slot "${conv.codeSlot}".`,
        });
      }
      continue;
    }

    if (conv.codeProp) {
      if (!canvasMatches.length) continue; // nothing on the canvas side to pair — generic path decides
      const codeProp = codePropByName.get(conv.codeProp);
      if (codeProp) {
        for (const cp of canvasMatches) claimedCanvasProps.add(cp);
        skipCodePropNames.add(codeProp.name);
        continue;
      }
      const fallbackSlot = conv.fallbackCodeSlot != null ? slotByName.get(conv.fallbackCodeSlot) : null;
      if (fallbackSlot) {
        for (const cp of canvasMatches) claimedCanvasProps.add(cp);
        handledCodeSlots.add(conv.fallbackCodeSlot);
        comparedSlots += 1;
        continue;
      }
      // Neither the named prop nor the fallback slot exists in the code
      // contract — leave canvasMatches unclaimed; the generic prop loop's
      // "missing-in-code" report below is correct here, not a pairing miss.
    }
  }

  return { claimedCanvasProps, handledCodeSlots, skipCodePropNames, conventionDisagreements, omissionSkips, comparedSlots };
}

/** Canvas componentProperties index for the generic name-pairing pass,
 * keyed by every `propNameKeys` candidate, EXCLUDING props already claimed
 * by a PAIRING_CONVENTIONS row (they're spoken for). */
function buildCanvasPropIndex(canvasProps, excluded) {
  const byKey = new Map();
  for (const cp of canvasProps) {
    if (excluded.has(cp)) continue;
    for (const key of propNameKeys(cp.name)) {
      if (!byKey.has(key)) byKey.set(key, cp);
    }
  }
  return byKey;
}

function findCanvasProp(index, name) {
  for (const key of propNameKeys(name)) {
    const cp = index.get(key);
    if (cp) return cp;
  }
  return null;
}

/**
 * Walk a contract.schema.json `anatomy` tree, collecting every REFERENCED
 * Figma variable name -> the set of `--al-*` code token names bound to it.
 * Covers `anatomy.root` and every `anatomy.stateOverrides.*` delta — a code
 * token bound only on hover, say, still counts as "code expects this Figma
 * variable to be bound somewhere".
 */
function collectCodeFigmaTokens(anatomy) {
  const out = new Map(); // figmaVarName -> Set(alTokenName)
  const add = (binding) => {
    if (!binding?.figma) return;
    if (!out.has(binding.figma)) out.set(binding.figma, new Set());
    out.get(binding.figma).add(binding.code);
  };
  const walkNode = (node) => {
    if (!node) return;
    for (const binding of Object.values(node.tokens ?? {})) add(binding);
    for (const child of node.children ?? []) walkNode(child);
  };
  walkNode(anatomy?.root ?? null);
  for (const perNode of Object.values(anatomy?.stateOverrides ?? {})) {
    for (const perProp of Object.values(perNode ?? {})) {
      for (const binding of Object.values(perProp ?? {})) add(binding);
    }
  }
  return out;
}

/**
 * Diff ONE component's CODE contract against its CANVAS contract.
 *
 * @param {object} args
 * @param {object|null} args.codeContract contract.schema.json-shaped object
 *   (e.g. the parsed contents of `.altitude/contracts/<project>/<tag>.contract.json`)
 * @param {object|null} args.canvasContract canvas-contract.schema.json-shaped
 *   object (e.g. `.altitude/figma-sync/<project>/canvas-contracts/<tag>.canvas.json`),
 *   or `null`/`undefined` when no canvas dump exists on disk — the expected,
 *   common case (canvas dumps are OBSERVATIONS, gitignored, extracted on
 *   demand). This must degrade gracefully, never throw.
 * @returns {{disagreements: Array<{dimension:string,key:string,code:*,canvas:*,kind:string,detail:string}>,
 *            compared: {props:number,variants:number,states:number,tokens:number,anatomy:number,slots:number},
 *            skipped: Array<{dimension:string|null,reason:string,[k:string]:*}>}}
 */
export function diffContracts({ codeContract, canvasContract } = {}) {
  const disagreements = [];
  const skipped = [];
  const compared = { props: 0, variants: 0, states: 0, tokens: 0, anatomy: 0, slots: 0 };

  if (!codeContract) {
    skipped.push({ dimension: null, reason: 'no code contract provided — nothing to diff.' });
    return { disagreements, compared, skipped };
  }
  if (!canvasContract) {
    skipped.push({ dimension: null, reason: 'no canvas contract on disk — run contracts:canvas (or extract-canvas.mjs --component <tag>) first.' });
    return { disagreements, compared, skipped };
  }

  const degradations = canvasContract.degradations ?? [];
  const degraded = (prefix) => degradations.some((d) => String(d).startsWith(prefix));

  // The whole set was not found live (missing/renamed/deleted in Figma) —
  // nothing below it is comparable, so say that once and stop, rather than
  // reporting every dimension as "missing in canvas" (which would be true but
  // would bury the one fact that actually matters: the set itself is gone).
  if (degraded('anatomy, variantAxes, componentProperties')) {
    skipped.push({
      dimension: null,
      reason: 'canvas set was not found live (missing, renamed, or deleted in Figma) — nothing comparable.',
    });
    return { disagreements, compared, skipped };
  }

  // Slot<->property pairing convention (T17) — Figma has no slot concept,
  // so a set author expresses "there's a slot here" as componentProperties
  // (Slot Before/After, Icon Before/After) or a TEXT property (Text/Label
  // <-> the `label` prop, falling back to the default slot). Run this
  // BEFORE the NOT_CANVAS_EXPRESSIBLE bookkeeping below, so slots this
  // convention actually paired no longer count toward the blanket "slots —
  // not canvas-expressible" skip.
  const conventionResult = applyPairingConventions({ codeContract, canvasContract });
  disagreements.push(...conventionResult.conventionDisagreements);
  compared.slots = conventionResult.comparedSlots;
  skipped.push(...conventionResult.omissionSkips); // T27: named intentional-omission skips, not disagreements

  // Facts a canvas read can never express, named rather than silently
  // skipped — see canvas-contract.schema.json's own `degradations` field and
  // extract-canvas.mjs's unconditional degradation lines. Not dimensions
  // (the schema's dimension enum has no slot for events/slots/a11y/role) —
  // recorded here so "silent truncation" cannot happen for them either.
  const NOT_CANVAS_EXPRESSIBLE = [
    ['events', codeContract.events?.length ?? 0],
    ['slots', Math.max(0, (codeContract.slots?.length ?? 0) - conventionResult.handledCodeSlots.size)],
    ['a11y.ariaAttributes', codeContract.a11y?.ariaAttributes?.length ?? 0],
    ['a11y.cssParts', codeContract.a11y?.cssParts?.length ?? 0],
    ['semantics.role', codeContract.semantics?.role ? 1 : 0],
  ];
  for (const [label, count] of NOT_CANVAS_EXPRESSIBLE) {
    if (count > 0) {
      skipped.push({ dimension: null, reason: `${label} (${count}) — not canvas-expressible (see canvas-contract.schema.json degradations).`, count });
    }
  }

  // ── props / variant-axis / variant-value ─────────────────────────────────
  //
  // Every code prop is matched to a canvas componentProperty by name — via
  // the OBSERVED Figma binding when the contract has one
  // (`prop.bindings.figma.property`), else by the prop's own name — both
  // sides run through `propNameKeys` (normalised, plus alias-prefix strips
  // — see NAME_ALIAS_PREFIXES) so e.g. canvas "Is Full Width" pairs with
  // code `fullWidth`. `type: 'enum'` code props are the variant-axis case;
  // every other type (`boolean`/`string`/`number`) is a plain `prop`
  // existence check, since canvas cannot pair a free-text/boolean code type
  // to a Figma property type with any confidence beyond "a property with
  // this name exists". Props/canvas properties already claimed by a
  // PAIRING_CONVENTIONS row above are excluded from this generic pass —
  // they're already spoken for.
  const canvasPropsByKey = buildCanvasPropIndex(canvasContract.componentProperties ?? [], conventionResult.claimedCanvasProps);
  const matchedCanvasProps = new Set(conventionResult.claimedCanvasProps);

  for (const prop of codeContract.props ?? []) {
    if (conventionResult.skipCodePropNames.has(prop.name)) {
      // Paired by presence via a PAIRING_CONVENTIONS row (e.g. `label` <-> canvas "Text").
      compared.props += 1;
      continue;
    }
    const figmaPropName = prop.bindings?.figma?.property ?? prop.name;
    const canvasProp = findCanvasProp(canvasPropsByKey, figmaPropName) ?? findCanvasProp(canvasPropsByKey, prop.name);
    const isEnumVariant = prop.type === 'enum';

    // T27: a prop curated `bindings.figma.omit: true` is a deliberate
    // opt-out (the owner's call — e.g. al-button's `fullWidth`: "I don't
    // need that in figma"). Absent from canvas is the DESIRED state, named
    // as an intentional-omission skip rather than a missing-in-canvas
    // disagreement; canvas STILL exposing a matching property despite the
    // opt-out is the one real problem (`present-despite-omission`). Neither
    // branch falls through to the normal enum/prop comparison below.
    if (prop.bindings?.figma?.omit) {
      if (canvasProp) {
        matchedCanvasProps.add(canvasProp);
        disagreements.push({
          dimension: isEnumVariant ? 'variant-axis' : 'prop',
          key: prop.name,
          code: prop.name,
          canvas: canvasProp.name,
          kind: 'present-despite-omission',
          detail: `code prop "${prop.name}" is curated bindings.figma.omit: true (should not be expressed in Figma) but canvas still exposes "${canvasProp.name}".`,
        });
      } else {
        skipped.push({ dimension: isEnumVariant ? 'variant-axis' : 'prop', reason: 'intentional-omission', key: prop.name });
      }
      continue;
    }

    if (isEnumVariant) {
      compared.variants += 1;
      if (!canvasProp) {
        disagreements.push({
          dimension: 'variant-axis',
          key: prop.name,
          code: prop.name,
          canvas: null,
          kind: 'missing-in-canvas',
          detail: `code prop "${prop.name}" (enum) has no matching Figma component property on canvas.`,
        });
        continue;
      }
      matchedCanvasProps.add(canvasProp);
      if (canvasProp.type !== 'VARIANT') {
        disagreements.push({
          dimension: 'variant-axis',
          key: prop.name,
          code: 'VARIANT (expected)',
          canvas: canvasProp.type,
          kind: 'value-mismatch',
          detail: `code prop "${prop.name}" is an enum; the matched Figma property "${canvasProp.name}" is type ${canvasProp.type}, not VARIANT.`,
        });
        continue;
      }

      const codeValues = (prop.values ?? []).slice().sort();
      const canvasValues = (canvasProp.values ?? []).slice().sort();
      const codeNorm = normSet(codeValues);
      const canvasNorm = normSet(canvasValues);
      const equalAsSets = codeNorm.size === canvasNorm.size && [...codeNorm].every((v) => canvasNorm.has(v));
      if (!equalAsSets) {
        const missingInCanvas = codeValues.filter((v) => !canvasNorm.has(normKey(v)));
        const missingInCode = canvasValues.filter((v) => !codeNorm.has(normKey(v)));
        disagreements.push({
          dimension: 'variant-value',
          key: prop.name,
          code: codeValues,
          canvas: canvasValues,
          kind: 'value-mismatch',
          detail:
            `option sets differ (normalised): code: [${codeValues.join(', ')}], canvas: [${canvasValues.join(', ')}]` +
            (missingInCanvas.length ? `; in code but not canvas: ${missingInCanvas.join(', ')}` : '') +
            (missingInCode.length ? `; in canvas but not code: ${missingInCode.join(', ')}` : '') +
            '.',
        });
      }
    } else {
      compared.props += 1;
      if (!canvasProp) {
        disagreements.push({
          dimension: 'prop',
          key: prop.name,
          code: prop.name,
          canvas: null,
          kind: 'missing-in-canvas',
          detail: `code prop "${prop.name}" (${prop.type}) has no matching Figma component property on canvas.`,
        });
        continue;
      }
      matchedCanvasProps.add(canvasProp);
    }
  }

  // Canvas component properties with no matching code prop at all. The
  // synthetic "State" axis is excluded on purpose — every Figma set carries
  // one with no code attribute counterpart (states are behaviour, not a
  // prop; see parity.mjs's diffFigmaContract() comment), and it is already
  // compared on its own terms below, via the dedicated 'state' dimension.
  // Flagging it here too would double-report the exact same non-drift case
  // parity.mjs already documents as curation, not drift. Props already
  // claimed by a PAIRING_CONVENTIONS row (Slot/Icon Before-After, Text) are
  // excluded too — they were compared, and found satisfied, above.
  for (const cp of canvasContract.componentProperties ?? []) {
    if (matchedCanvasProps.has(cp)) continue;
    if (normKey(cp.name) === normKey('state')) continue;
    const dimension = cp.type === 'VARIANT' ? 'variant-axis' : 'prop';
    if (dimension === 'variant-axis') compared.variants += 1; else compared.props += 1;
    disagreements.push({
      dimension,
      key: cp.name,
      code: null,
      canvas: cp.name,
      kind: 'missing-in-code',
      detail: `Figma component property "${cp.name}" (${cp.type}) has no matching code prop.`,
    });
  }

  // ── states ────────────────────────────────────────────────────────────
  //
  // `canvasContract.states` is empty in exactly one honest case (no "State"
  // variant axis on the set) AND a matching degradation is recorded for it —
  // that is a DEGRADED FACT, not "canvas confirms code has no states", and
  // must be skipped rather than reported as four missing-in-canvas entries.
  if (degraded('states —')) {
    skipped.push({
      dimension: 'state',
      reason: 'canvas set has no "State" variant axis (degraded fact) — code states not compared.',
      codeStates: codeContract.states ?? [],
    });
  } else {
    const codeStates = new Set(codeContract.states ?? []);
    const canvasStates = new Set(canvasContract.states ?? []);
    compared.states = new Set([...codeStates, ...canvasStates]).size;
    for (const s of codeStates) {
      if (!canvasStates.has(s)) {
        disagreements.push({
          dimension: 'state',
          key: s,
          code: s,
          canvas: null,
          kind: 'missing-in-canvas',
          detail: `code declares state "${s}" (measured); canvas's State axis has no matching value.`,
        });
      }
    }
    for (const s of canvasStates) {
      if (!codeStates.has(s)) {
        disagreements.push({
          dimension: 'state',
          key: s,
          code: null,
          canvas: s,
          kind: 'missing-in-code',
          detail: `canvas's State axis includes "${s}"; not among code's measured states.`,
        });
      }
    }
  }

  // ── token bindings ────────────────────────────────────────────────────
  //
  // Compared at the level of the FIGMA VARIABLE NAME, not anatomy node
  // position — code anatomy nodes are keyed by DOM tag/class, canvas anatomy
  // nodes by Figma layer name, and there is no reliable 1:1 mapping between
  // the two trees (see `anatomy` skip below). What both sides CAN honestly
  // say is "this Figma variable is referenced somewhere" — code via
  // `anatomy.*.tokens[cssProp].figma`, canvas via its flat `tokens` list.
  if (codeContract.anatomySource !== 'measured') {
    skipped.push({ dimension: 'token-binding', reason: 'code anatomy unavailable (anatomySource !== "measured") — no --al-* token bindings to compare.' });
  } else if (canvasContract.anatomySource !== 'observed') {
    skipped.push({ dimension: 'token-binding', reason: 'canvas anatomy unavailable (anatomySource !== "observed") — nothing to compare against.' });
  } else {
    const codeFigmaTokens = collectCodeFigmaTokens(codeContract.anatomy);
    const canvasTokenSet = new Set(canvasContract.tokens ?? []);
    compared.tokens = new Set([...codeFigmaTokens.keys(), ...canvasTokenSet]).size;

    for (const [figmaVar, alTokens] of codeFigmaTokens) {
      if (!canvasTokenSet.has(figmaVar)) {
        const codeTokenNames = [...alTokens].sort();
        disagreements.push({
          dimension: 'token-binding',
          key: figmaVar,
          code: codeTokenNames,
          canvas: null,
          kind: 'missing-in-canvas',
          detail: `code anatomy binds ${codeTokenNames.join(', ')} to Figma variable "${figmaVar}"; no node in the canvas anatomy has that variable bound.`,
        });
      }
    }
    for (const figmaVar of canvasTokenSet) {
      if (!codeFigmaTokens.has(figmaVar)) {
        disagreements.push({
          dimension: 'token-binding',
          key: figmaVar,
          code: null,
          canvas: figmaVar,
          kind: 'missing-in-code',
          detail: `canvas anatomy binds Figma variable "${figmaVar}"; no code anatomy token references it.`,
        });
      }
    }
  }

  // ── anatomy (structural) ────────────────────────────────────────────────
  //
  // Deliberately not diffed. Code anatomy nodes are keyed by rendered
  // DOM tag/class; canvas anatomy nodes are keyed by the Figma layer name at
  // that position — the two trees describe the same component through two
  // unrelated naming schemes, and guessing a node-to-node mapping between
  // them would fabricate a fact neither side actually states (see
  // .altitude/contracts/README.md § Deviations). Recorded as skipped, always,
  // so this dimension of the schema's enum is never silently absent.
  skipped.push({
    dimension: 'anatomy',
    reason:
      'structural anatomy comparison not attempted — code anatomy nodes are keyed by DOM tag/class, canvas ' +
      'anatomy nodes by Figma layer name, with no reliable 1:1 node mapping between the two.',
  });

  return { disagreements: sortDisagreements(disagreements), compared, skipped };
}
