// The ACCESSIBILITY block on `altitude_get_component`: what the component's
// semantics are, what was measured, and what the consumer still has to do.
//
// Three sources, deliberately kept distinguishable in the output because they
// have different epistemic weight:
//
//   semantics  — from the component's CONTRACT
//                (.altitude/contracts/<project>/<tag>.contract.json): the host
//                element and role the implementation actually renders, plus the
//                ARIA-bearing props and the exposed CSS parts. Statements about
//                the code.
//   measured   — from .altitude/a11y/report.json (scripts/build-a11y-report.mjs,
//                axe-core over every story). Statements about a run.
//   obligations — from the authored guidance's `accessibility` section
//                (apps/docs/src/content/guidance/**.yaml). Statements about
//                what the CONSUMER must supply — `al-button` with `hideText`
//                needs an accessible name, and no amount of measuring the
//                component can tell you that, because the component is fine and
//                the usage is what fails.
//
// THE RULE THIS FILE ENFORCES: a missing result is never a pass. `llms.txt`
// states it as a rule for consumers ("You must not treat a missing
// accessibility result as a pass") and this is the surface where an agent is
// most likely to break it, so `measured` is ALWAYS present and always either
// `{ measured: true, ... }` or `{ measured: false, reason }`. There is no shape
// in which the absence of violations and the absence of a measurement look the
// same.

import { readFileSync, existsSync } from 'node:fs';

import { PATHS, HINTS } from './paths.mjs';

let cache = null;
let cachePath = null;

/** The axe report indexed by TAG (the file keys by slug and carries the tag). */
function loadReport() {
  const file = PATHS.a11yReport;
  if (cache && cachePath === file) return cache;

  if (!existsSync(file)) {
    cache = {
      ok: false,
      reason: `no accessibility sweep has been run in this checkout (${file} does not exist)`,
      hint: HINTS.a11yReport,
    };
    cachePath = file;
    return cache;
  }
  try {
    const report = JSON.parse(readFileSync(file, 'utf8'));
    const index = new Map();
    for (const [slug, row] of Object.entries(report.components ?? {})) {
      index.set(row.tag ?? `al-${slug}`, { slug, ...row });
    }
    cache = { ok: true, report, index };
  } catch (err) {
    cache = {
      ok: false,
      reason: `${file} exists but could not be parsed: ${err.message}`,
      hint: HINTS.a11yReport,
    };
  }
  cachePath = file;
  return cache;
}

/**
 * The measured half: the axe result for one tag, or a named reason there is none.
 *
 * `storiesMeasured` and `unmeasuredStories` are carried through rather than
 * summarised to a boolean. A component with two clean stories and three that
 * errored is not "clean", and the only way a caller can tell is by being handed
 * both numbers.
 */
function measuredFor(tag) {
  const loaded = loadReport();
  if (!loaded.ok) {
    return { measured: false, reason: `${loaded.reason}. Run: ${loaded.hint}` };
  }
  const row = loaded.index.get(tag);
  if (!row) {
    return {
      measured: false,
      reason:
        `the accessibility sweep of ${loaded.report.generated} covered ` +
        `${loaded.report.totals?.componentsMeasured ?? 'some'} components and "${tag}" was not among them`,
    };
  }
  return {
    measured: true,
    generated: loaded.report.generated,
    axeVersion: loaded.report.source?.axeVersion ?? null,
    axeTags: loaded.report.source?.axeTags ?? [],
    /**
     * Which rules the GATE ignores. A contrast violation is a real finding that
     * does not fail CI; reporting `clean: true` without saying so would let an
     * agent read "passes the gate" as "has no accessibility problems".
     */
    gateExcludes: loaded.report.source?.gateExcludes ?? [],
    storiesMeasured: row.storyCount ?? null,
    unmeasuredStories: (row.errored ?? []).map((entry) => entry.id ?? entry),
    structuralViolations: (row.violations ?? []).map((v) => ({ rule: v.id, nodes: v.nodes })),
    contrastViolations: (row.contrastViolations ?? []).map((v) => ({ rule: v.id, nodes: v.nodes })),
    clean: row.clean === true,
  };
}

/**
 * The full `a11y` block for one component.
 *
 * @param {string} tag
 * @param {object|null} contract the tag's contract JSON, or null when none exists
 * @param {object|null} guidance the tag's authored guidance, or null
 */
export function a11yFor(tag, contract, guidance) {
  const semantics = contract
    ? {
        /** The host element the implementation renders, from the contract. */
        element: contract.semantics?.element ?? null,
        /** An explicit ARIA role, or null when the element's implicit role stands. */
        role: contract.semantics?.role ?? null,
        /** Props that set or reflect an ARIA attribute. */
        ariaAttributes: contract.a11y?.ariaAttributes ?? [],
        /** Shadow parts a consumer may style without breaking the semantics. */
        cssParts: contract.a11y?.cssParts ?? [],
        source: `.altitude/contracts/<project>/${tag}.contract.json`,
      }
    : null;

  return {
    semantics,
    semanticsNote: semantics
      ? null
      : `no contract exists for "${tag}" in this project, so its rendered element and ARIA surface ` +
        'are not recorded here — read the component source or its CEM entry instead.',
    measured: measuredFor(tag),
    /**
     * What the CONSUMER must do. Authored, cited guidance only — never inferred
     * from the API, because "this component has a `hideText` prop" does not
     * imply "and you must then supply a label", and guessing the implication is
     * how a11y advice becomes noise.
     */
    obligations: guidance?.accessibility ?? [],
    obligationsNote: guidance?.accessibility?.length
      ? null
      : 'no accessibility obligations have been authored for this component. That is an unwritten ' +
        'section, not a statement that the component imposes none.',
  };
}
