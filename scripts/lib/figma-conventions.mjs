/**
 * figma-conventions.mjs — lint the library conventions an agent applies BY HAND
 * when it builds or repairs a Figma component set.
 *
 * T3, spec 2026-08-29-parity-judgement-gates-and-evals.
 *
 * WHY. `buildAiPrompt()` (libs/altitude-mcp/src/lib/parity.mjs, the
 * `missing-in-figma` branch) tells an agent to "follow the library
 * conventions: page <prefix><Component>, Labels/Instances/COMPONENT SET,
 * State axis, Title Case variant values". Every one of those was an
 * instruction with nothing checking it afterwards, so a set could be built
 * wrong and still pass every gate in the repo — the determinism and schema
 * gates assert self-consistency, never correctness.
 *
 * This runs OFFLINE, over the canvas contracts already extracted by
 * `scripts/contracts/extract-canvas.mjs`, so it needs no Figma connection.
 *
 * WHAT IT DELIBERATELY CANNOT CHECK, named rather than silently skipped:
 *
 *   - VARIANT ORDER. `extract-canvas.mjs:314` sorts every axis's options
 *     (`def.options.slice().sort()`), so a canvas contract records the SET of
 *     values and destroys their on-canvas order. `STATE_ORDER` therefore
 *     cannot be verified from this artifact at all — only membership can. Any
 *     "the State axis is in the wrong order" check has to read the live
 *     document. Reported as a skipped dimension, the same idiom
 *     `contract-diff.mjs` uses for facts the canvas cannot express.
 *   - PAGE NAME and the Labels/Instances/COMPONENT SET page structure. Not
 *     captured by a canvas contract. The page half is checked live by
 *     `scripts/figma-parity/check-pinned-nodes.mjs`.
 */
import { STATE_ORDER } from '../contracts/figma/conventions.mjs';

/**
 * Non-interaction states the library really uses on its `State` axis.
 *
 * `STATE_ORDER` is the INTERACTION order the generator builds from
 * (Default/Hover/Active/Focus/Disabled). It is not the whole vocabulary:
 * `State=Error` is present on 11 of the 37 extracted sets — al-input,
 * al-textarea, al-combobox, al-range, al-radio, al-radio-group,
 * al-checkbox-group, al-file-upload, al-input-stepper, al-field-note,
 * al-list-item — i.e. every form-ish component. Eleven components is a
 * convention, not a mistake, and a rule that failed all of them would be a
 * gate nobody could keep green.
 *
 * DELIBERATELY NOT sourced from the code contract: every contract inspected
 * declares the same uniform `["hover","focus","active","disabled"]` and none
 * declares `error`, so validating the canvas against the code side here would
 * flag all eleven. That disagreement is real and worth fixing — the code
 * contracts under-describe validation state — but it is a finding for the
 * contract pipeline, not something this lint should decide by failing.
 */
export const VALIDATION_STATES = ['Error'];

export const RULE = {
  SET_NAME: 'set-name',
  AXIS_NAME_CASE: 'axis-name-case',
  VALUE_CASE: 'value-case',
  PROP_NAME_CASE: 'prop-name-case',
  STATE_AXIS_VALUES: 'state-axis-values',
};

/**
 * Is this a Title Case label by the library's convention?
 *
 * Every space-separated word must start with a capital or a digit. Verified
 * against every axis name, variant value and property name in the 37 extracted
 * canvas contracts: the real library already satisfies this everywhere except
 * the two defects this module was written to catch, so the rule is descriptive
 * of the convention rather than an aspiration invented here.
 */
export function isTitleCase(label) {
  if (typeof label !== 'string' || label.trim() === '') return false;
  return label.trim().split(/\s+/).every((word) => /^[A-Z0-9]/.test(word));
}

const violation = (tag, rule, subject, detail) => ({ tag, rule, subject, detail });

/**
 * Lint one canvas contract.
 *
 * @param {object} canvas a parsed `<tag>.canvas.json`
 * @param {object|null} manifestEntry that tag's parity-manifest entry, for the
 *   set-name cross-check. Omit it and the name rule is skipped rather than
 *   guessed at.
 */
export function lintCanvasContract(canvas, manifestEntry = null) {
  const tag = canvas.component ?? '(unknown)';
  const out = [];

  const manifestName = manifestEntry?.figma?.name ?? null;
  if (manifestName && canvas.figma?.name && canvas.figma.name !== manifestName) {
    out.push(violation(tag, RULE.SET_NAME, canvas.figma.name,
      `the extracted set is named "${canvas.figma.name}" but the parity manifest maps this tag to "${manifestName}"`));
  }

  for (const axis of canvas.variantAxes ?? []) {
    if (!isTitleCase(axis.name)) {
      out.push(violation(tag, RULE.AXIS_NAME_CASE, axis.name, `variant axis "${axis.name}" is not Title Case`));
    }
    for (const value of axis.values ?? []) {
      if (!isTitleCase(value)) {
        out.push(violation(tag, RULE.VALUE_CASE, value, `variant value "${axis.name}=${value}" is not Title Case`));
      }
    }
    // The State axis is the one axis whose vocabulary the library fixes.
    // Membership only — see the header on why order is unverifiable here.
    if (axis.name === 'State') {
      const vocabulary = [...STATE_ORDER, ...VALIDATION_STATES];
      for (const value of axis.values ?? []) {
        if (!vocabulary.includes(value)) {
          out.push(violation(tag, RULE.STATE_AXIS_VALUES, value,
            `"State=${value}" is not a state this library models (${vocabulary.join(', ')}) — either a typo, or a non-state axis value put on the State axis`));
        }
      }
    }
  }

  for (const prop of canvas.componentProperties ?? []) {
    if (!isTitleCase(prop.name)) {
      out.push(violation(tag, RULE.PROP_NAME_CASE, prop.name, `component property "${prop.name}" is not Title Case`));
    }
  }

  return out;
}

/** The dimensions this lint knowingly does not cover, and why. Never empty. */
export function skippedDimensions() {
  return [
    {
      dimension: 'variant order',
      reason: 'extract-canvas.mjs sorts every axis\'s options, so a canvas contract records the SET of values and not their on-canvas order. STATE_ORDER is unverifiable from this artifact — it needs a live read.',
    },
    {
      dimension: 'page name / page structure',
      reason: 'not captured by a canvas contract. The page half is checked live by scripts/figma-parity/check-pinned-nodes.mjs.',
    },
  ];
}
