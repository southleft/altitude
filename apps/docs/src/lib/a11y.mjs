/**
 * Accessibility results, for the docs site. Build time only.
 *
 * WHERE THE NUMBERS COME FROM. `.altitude/a11y/report.json`, written by
 * `scripts/build-a11y-report.mjs`: axe-core run against a static Storybook
 * build, story by story, with every rule outcome recorded per component. This
 * module reads that file and joins it to the component registry. It computes no
 * result of its own and contains no component name, rule id, or count.
 *
 * WHAT REPLACED WHAT. In Storybook this surface is
 * `.storybook/blocks/a11y-report.tsx` — 363 lines that re-implement the
 * addon-a11y panel inside the preview iframe, because docs blocks render there
 * and addon panels do not exist in that context. It re-runs axe in the browser
 * on every page view, which means the result depends on when you looked. Here
 * the run happens once, on a known build, and the page states which build.
 *
 * THE FOUR ROWS come from Carbon's per-component accessibility status
 * (default state / advanced states / screen reader / keyboard navigation).
 * Two of them are machine-measured, two are not, and this module refuses to
 * blur that line:
 *
 *   default state       — axe on the component's default story          MEASURED
 *   advanced states     — axe on its remaining stories                  MEASURED
 *   keyboard navigation — Storybook `play-fn` interaction coverage,     PARTIAL
 *                         plus a manual record if one exists
 *   screen reader       — manual record only                            MANUAL
 *
 * A manual row with no record reads NOT RECORDED. It never reads "pass".
 */
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './repo-root.mjs';

const REPO_ROOT = repoRoot();
const REPORT_PATH = path.join(REPO_ROOT, '.altitude', 'a11y', 'report.json');
const MANUAL_PATH = path.join(REPO_ROOT, '.altitude', 'a11y', 'manual-tests.json');

/** Regenerate line printed in the panel when the report is missing or stale. */
export const A11Y_COMMAND =
  'pnpm --filter @southleft/al-web-components exec storybook build --output-dir <dir> && node scripts/build-a11y-report.mjs --storybook <dir>';

function readJson(file) {
  try {
    return { data: JSON.parse(fs.readFileSync(file, 'utf8')), error: null };
  } catch (error) {
    return { data: null, error: error.code === 'ENOENT' ? 'missing' : error.message };
  }
}

const report = readJson(REPORT_PATH);
const manual = readJson(MANUAL_PATH);

/**
 * Report-level facts, including its absence. A missing report is rendered as
 * "not measured", never as a clean bill of health — the whole point of the
 * spec's "make failure visible" requirement.
 */
export const A11Y_REPORT = report.data
  ? {
      available: true,
      generated: report.data.generated,
      source: report.data.source,
      totals: report.data.totals,
      /** The path is relative so the public page never quotes a local build dir. */
      artifact: '.altitude/a11y/report.json',
    }
  : {
      available: false,
      reason:
        report.error === 'missing'
          ? 'No accessibility report has been generated for this build.'
          : `The accessibility report could not be read: ${report.error}`,
      command: A11Y_COMMAND,
      artifact: '.altitude/a11y/report.json',
    };

/**
 * Manual test records — screen-reader and keyboard passes a human actually ran.
 * The file is a record store, not a component list: components are enumerated
 * from the CEM registry, and one with no entry here is reported as untested.
 * The schema is documented in `.altitude/a11y/manual-tests.json` itself.
 */
export const A11Y_MANUAL_AVAILABLE = Boolean(manual.data);

function manualFor(slug) {
  return manual.data?.components?.[slug] ?? null;
}

/**
 * The four Carbon rows for one component, each tagged with how it was
 * established. `state` is one of:
 *   'pass'          measured, no violations
 *   'violations'    measured, violations found
 *   'not-measured'  the run errored or the component has no stories
 *   'partial'       machine evidence exists but is not a full answer
 *   'not-recorded'  needs a human, and no human has recorded one
 */
export function a11yFor(slug) {
  const component = report.data?.components?.[slug] ?? null;
  const record = manualFor(slug);

  if (!component) {
    return {
      measured: false,
      reason: A11Y_REPORT.available
        ? 'This component has no stories in the measured Storybook build, so axe never ran against it.'
        : A11Y_REPORT.reason,
      rows: [],
      violations: [],
      contrastViolations: [],
      manual: record,
    };
  }

  const axeRow = (id, label, bucket, extra = {}) => {
    const errored = extra.error ?? null;
    if (errored) return { id, label, state: 'not-measured', evidence: 'AXE', detail: errored, rules: [] };
    const rules = bucket?.structural ?? [];
    return {
      id,
      label,
      state: rules.length ? 'violations' : 'pass',
      evidence: 'AXE',
      detail: extra.detail ?? null,
      rules,
    };
  };

  const keyboardStories = component.interaction.playFnStories.length;
  const keyboardRecord = record?.keyboard ?? null;
  const screenReaderRecord = record?.screenReader ?? null;

  const rows = [
    axeRow('default-state', 'Default state', component.defaultState, {
      error: component.defaultState?.error ?? null,
      detail: component.defaultState ? component.defaultState.storyId : null,
    }),
    axeRow('advanced-states', 'Advanced states', component.advancedStates, {
      detail: `${component.advancedStates.storyCount} further ${component.advancedStates.storyCount === 1 ? 'story' : 'stories'}`,
    }),
    {
      id: 'screen-reader',
      label: 'Screen reader',
      state: screenReaderRecord ? (screenReaderRecord.result === 'pass' ? 'pass' : 'violations') : 'not-recorded',
      evidence: 'MANUAL',
      detail: screenReaderRecord
        ? `${screenReaderRecord.tool} · ${screenReaderRecord.date}${screenReaderRecord.notes ? ` · ${screenReaderRecord.notes}` : ''}`
        : 'No screen-reader pass has been recorded for this component.',
      rules: [],
    },
    {
      id: 'keyboard',
      label: 'Keyboard navigation',
      state: keyboardRecord ? (keyboardRecord.result === 'pass' ? 'pass' : 'violations') : keyboardStories ? 'partial' : 'not-recorded',
      evidence: keyboardRecord ? 'MANUAL' : 'INTERACTION TESTS',
      detail: keyboardRecord
        ? `${keyboardRecord.date}${keyboardRecord.notes ? ` · ${keyboardRecord.notes}` : ''}`
        : keyboardStories
          ? `${keyboardStories} interaction ${keyboardStories === 1 ? 'test drives' : 'tests drive'} this component; no manual keyboard pass recorded.`
          : 'No interaction tests and no manual keyboard pass.',
      rules: [],
    },
  ];

  return {
    measured: true,
    storyCount: component.storyCount,
    errored: component.errored,
    rows,
    violations: component.violations,
    contrastViolations: component.contrastViolations,
    manual: record,
  };
}

/** Site-wide roll-up, for the overview screen. */
export const A11Y_TOTALS = report.data?.totals ?? null;
