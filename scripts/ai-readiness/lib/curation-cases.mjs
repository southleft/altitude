/**
 * curation-cases.mjs — Task F's corpus: is this curation right or wrong?
 *
 * T8, spec 2026-08-29-parity-judgement-gates-and-evals.
 *
 * WHY THIS IS A REVIEW TASK AND NOT A GENERATION TASK. The original plan was
 * "hold out a figma.gen.json and ask the agent to produce it". That is not
 * fairly posable from tracked data, and finding out why was the useful part:
 * the curated `anatomyCase` values are MEASURED CASE NAMES, not code prop
 * values. al-badge's curation is `Variant=default,Shape=label`, while its code
 * contract declares `variant: [danger, info, success, warning]` and no `Shape`
 * prop at all — the vocabulary comes from the measurement harness's output,
 * which is gitignored. Asking an agent to produce a value from a vocabulary it
 * cannot see measures nothing but its willingness to guess.
 *
 * So the question is inverted into one that IS answerable from tracked data:
 * here is a curation, is it right? Half the cases present the real curated
 * value and half present a real value belonging to a DIFFERENT component. The
 * wrong ones are well-formed and plausible — they are only detectable by
 * understanding what the component actually is, which is the judgement being
 * measured. This also mirrors Task C, the violation-spotting task that already
 * works well in this harness.
 *
 * The corpus is read live from the 33 tracked `figma.gen.json` files, so it
 * cannot drift from them. Hand-authored cases for two DOCUMENTED historical
 * reversals live alongside in fixtures/curation-negatives.json — an eval that
 * cannot reproduce a failure you already had is not yet measuring anything.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT } from '../../../libs/altitude-mcp/src/lib/paths.mjs';

const COMPONENT_ROOTS = [
  join(REPO_ROOT, 'libs', 'al-web-components', 'components'),
  join(REPO_ROOT, 'libs', 'sl-web-components', 'components'),
];
const NEGATIVES = join(REPO_ROOT, 'scripts', 'ai-readiness', 'fixtures', 'curation-negatives.json');

/**
 * The curation keys worth asking about.
 *
 * Deliberately NOT every key. `$comment` is prose, `sheet` is layout pitch
 * (`sheet-style.mjs` calls it "the same class of judgment call" but it has no
 * component-specific right answer), and a raw pixel number like
 * `fullWidthExtraPx` has no tracked ground truth to check against. These three
 * are the ones whose correctness is decidable from the component's own
 * contract, which is what makes them gradeable.
 */
export const REVIEWABLE_KEYS = ['anatomyCase', 'caseAxes', 'nestedProps'];

/** Every tracked figma.gen.json, as `{tag, dir, config}`. */
export function loadCurations() {
  const out = [];
  for (const root of COMPONENT_ROOTS) {
    if (!existsSync(root)) continue;
    for (const dir of readdirSync(root).sort()) {
      const file = join(root, dir, 'figma.gen.json');
      if (!existsSync(file)) continue;
      out.push({ tag: `al-${dir}`, dir, file, config: JSON.parse(readFileSync(file, 'utf8')) });
    }
  }
  return out;
}

const stringify = (v) => (typeof v === 'string' ? v : JSON.stringify(v));

/**
 * Build the review corpus.
 *
 * Pairing for the WRONG cases is deterministic: each component's value is
 * replaced by the NEXT component's value for the same key, cycling. That
 * guarantees the wrong value is real, well-formed, and belongs to a different
 * component — plausible enough that spotting it requires reading the contract,
 * which is the point.
 */
export function buildCurationCases() {
  const curations = loadCurations();
  const cases = [];

  for (const key of REVIEWABLE_KEYS) {
    const withKey = curations.filter((c) => c.config[key] !== undefined);
    if (withKey.length < 2) continue; // no donor available; a wrong case would have to be invented
    withKey.forEach((entry, i) => {
      const own = stringify(entry.config[key]);
      // The donor must hold a DIFFERENT value. Five components share
      // `anatomyCase: "Label=shown"` (combobox, file-upload, input,
      // input-stepper, textarea), so a naive next-in-list donor produced
      // "wrong" cases that presented the component's OWN CORRECT VALUE and
      // graded a correct agent as failing. Walk forward until the value
      // actually differs.
      let donor = null;
      for (let step = 1; step < withKey.length; step += 1) {
        const candidate = withKey[(i + step) % withKey.length];
        if (stringify(candidate.config[key]) !== own) { donor = candidate; break; }
      }
      // Alternate correct/wrong by index so the set is balanced by
      // construction rather than by hoping the counts work out. With no donor
      // holding a different value there is no honest wrong case to pose, so
      // this component contributes a correct one instead.
      const presentWrong = i % 2 === 1 && donor !== null;
      cases.push({
        id: `${entry.tag}.${key}.${presentWrong ? 'wrong' : 'correct'}`,
        tag: entry.tag,
        key,
        presented: presentWrong ? stringify(donor.config[key]) : own,
        expected: presentWrong ? 'wrong' : 'correct',
        // The curation file's own $comment is the human's rationale. It is
        // withheld from the agent (it would give the answer away) but kept
        // here so a failing case can be reviewed against what the author meant.
        authorRationale: entry.config.$comment ?? null,
        ...(presentWrong ? { borrowedFrom: donor.tag, trueValue: own } : {}),
        ...(i % 2 === 1 && !donor
          ? { note: `every other component with a ${key} carries the same value, so no honest wrong case can be posed for this one` }
          : {}),
      });
    });
  }

  return [...cases, ...loadNegatives()];
}

/** The hand-authored historical-reversal cases, or [] when the fixture is absent. */
export function loadNegatives() {
  if (!existsSync(NEGATIVES)) return [];
  const fixture = JSON.parse(readFileSync(NEGATIVES, 'utf8'));
  return (fixture.cases ?? []).map((c) => ({ ...c, historical: true }));
}

/**
 * Interleave correct and wrong so any prefix a small fleet draws is balanced.
 *
 * A fleet of 2 that drew two `correct` cases would report a number that says
 * nothing about whether the agent can spot a bad curation — and "always answer
 * correct" would pass it.
 */
export function orderedCases(cases) {
  const correct = cases.filter((c) => c.expected === 'correct');
  const wrong = cases.filter((c) => c.expected === 'wrong');
  const out = [];
  for (let i = 0; i < Math.max(correct.length, wrong.length); i += 1) {
    if (i < wrong.length) out.push(wrong[i]);
    if (i < correct.length) out.push(correct[i]);
  }
  return out;
}

/** Deterministic: attempt `i` (1-based) always draws the same case. */
export function caseForAttempt(corpus, i) {
  const cases = orderedCases(corpus?.cases ?? []);
  return cases.length ? cases[(i - 1) % cases.length] : null;
}

/** The corpus, shaped like the other case sources. */
export function loadCurationCorpus() {
  const cases = buildCurationCases();
  return cases.length ? { schemaVersion: 1, cases } : null;
}
