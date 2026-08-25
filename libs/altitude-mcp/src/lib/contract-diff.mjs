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
 *            compared: {props:number,variants:number,states:number,tokens:number,anatomy:number},
 *            skipped: Array<{dimension:string|null,reason:string,[k:string]:*}>}}
 */
export function diffContracts({ codeContract, canvasContract } = {}) {
  const disagreements = [];
  const skipped = [];
  const compared = { props: 0, variants: 0, states: 0, tokens: 0, anatomy: 0 };

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

  // Facts a canvas read can never express, named rather than silently
  // skipped — see canvas-contract.schema.json's own `degradations` field and
  // extract-canvas.mjs's unconditional degradation lines. Not dimensions
  // (the schema's dimension enum has no slot for events/slots/a11y/role) —
  // recorded here so "silent truncation" cannot happen for them either.
  const NOT_CANVAS_EXPRESSIBLE = [
    ['events', codeContract.events?.length ?? 0],
    ['slots', codeContract.slots?.length ?? 0],
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
  // normalised. `type: 'enum'` code props are the variant-axis case; every
  // other type (`boolean`/`string`/`number`) is a plain `prop` existence
  // check, since canvas cannot pair a free-text/boolean code type to a
  // Figma property type with any confidence beyond "a property with this
  // name exists".
  const canvasPropsByKey = new Map((canvasContract.componentProperties ?? []).map((p) => [normKey(p.name), p]));
  const matchedCanvasKeys = new Set();

  for (const prop of codeContract.props ?? []) {
    const figmaPropName = prop.bindings?.figma?.property ?? prop.name;
    const canvasProp = canvasPropsByKey.get(normKey(figmaPropName)) ?? canvasPropsByKey.get(normKey(prop.name));
    const isEnumVariant = prop.type === 'enum';

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
      matchedCanvasKeys.add(normKey(canvasProp.name));
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
      matchedCanvasKeys.add(normKey(canvasProp.name));
    }
  }

  // Canvas component properties with no matching code prop at all.
  for (const cp of canvasContract.componentProperties ?? []) {
    const key = normKey(cp.name);
    if (matchedCanvasKeys.has(key)) continue;
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
