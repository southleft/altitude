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
/**
 * The SECOND measurement surface. `build-a11y-docs-report.mjs` runs axe against
 * the built documentation site for components the Storybook run cannot reach —
 * today, the nine components of the Southleft brand layer, whose own Storybook
 * was retired. Same axe version, same WCAG tags, one story instead of all of
 * them; the record says so, and this module never lets it outrank a Storybook
 * record for the same component.
 */
const DOCS_REPORT_PATH = path.join(REPO_ROOT, '.altitude', 'a11y', 'report-docs.json');
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
const docsReport = readJson(DOCS_REPORT_PATH);
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
 * WHICH LIBRARY THE AXE RUN ACTUALLY COVERED.
 *
 * The report STATES it, in `source.measuredLibrary`. It used to be derived by
 * splitting `source.gateConfig` on `/.storybook/`, which tied these panels to a
 * directory being deleted and to the assumption that a fixture always lives
 * inside a Storybook. The fallback below keeps an older report readable rather
 * than silently attributing it to nothing.
 */
const MEASURED_LIBRARY = (() => {
  const stated = report.data?.source?.measuredLibrary;
  if (stated) return stated;
  // Pre-2026-08-25 reports: derive it the old way.
  const gateConfig = report.data?.source?.gateConfig ?? '';
  const [root] = gateConfig.split('/.storybook/');
  return root && root !== gateConfig ? root : null;
})();

/**
 * Why a component has no axe result — and it matters which reason it is.
 *
 * "No stories in the measured build" was the only answer this panel had, and on
 * a brand-layer component it is false twice over: those components DO have
 * stories (the playground above is rendered from them), and the build that
 * would have measured them — that layer's own Storybook — was retired, which
 * the sentence never mentioned. A reader was told the component was untested
 * because nobody wrote stories, when in fact nobody has pointed axe at it.
 *
 * So the two cases are separated. Inside the measured library, "no stories" is
 * the true answer. Outside it, the honest answer names both libraries and says
 * the gap is in coverage, not in authoring.
 */
/** Is this component part of the library the Storybook run covered? */
function fromMeasuredLibrary(component) {
  const root = String(component.libraryRoot ?? '').replace(/\\/g, '/');
  return !MEASURED_LIBRARY || root.endsWith(MEASURED_LIBRARY);
}

/**
 * The record for one component, from whichever surface measured it.
 *
 * PRECEDENCE, and why it is not "whichever file has the slug". Both reports are
 * keyed by slug, and a slug is not unique across libraries — a brand layer's
 * `header` and the base library's `header` are different components sharing
 * one. So each side is confirmed against the component's own library before it
 * is used: the Storybook record only for a component of the library that run
 * covered, the docs record only when its `libraryWorkspace` matches. Without
 * that check the brand header would inherit the Altitude header's results — a
 * clean bill of health measured on a different component.
 *
 * Storybook wins where both exist: it measures every story, a docs page one.
 */
function recordFor(component) {
  if (fromMeasuredLibrary(component)) {
    const fromStorybook = report.data?.components?.[component.slug];
    if (fromStorybook) return { record: fromStorybook, surface: 'storybook' };
  }
  const fromDocs = docsReport.data?.components?.[component.slug];
  if (
    fromDocs &&
    (!fromDocs.libraryWorkspace ||
      !component.libraryWorkspace ||
      fromDocs.libraryWorkspace === component.libraryWorkspace)
  ) {
    return { record: fromDocs, surface: 'docs' };
  }
  return { record: null, surface: null };
}

function notMeasuredReason(component) {
  if (fromMeasuredLibrary(component)) {
    return 'This component has no stories in the measured Storybook build, so axe never ran against it.';
  }

  const owner = component.libraryWorkspace ? `${component.libraryWorkspace} ` : '';
  return (
    `The axe run measures ${MEASURED_LIBRARY}'s Storybook. This component ships in ` +
    `${owner}— a separate package with no Storybook in the measured set — so axe has not ` +
    'been pointed at it yet. It is not that the component lacks stories: the preview above ' +
    'is rendered from them.'
  );
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
export function a11yFor(component) {
  // Callers used to pass a bare slug. Accept both so a stale call site degrades
  // to the old (less specific) message rather than throwing.
  const record_ = typeof component === 'string' ? { slug: component } : component;
  const slug = record_.slug;
  const { record: measured, surface } = recordFor(record_);
  const record = manualFor(slug);

  if (!measured) {
    return {
      measured: false,
      reason: A11Y_REPORT.available ? notMeasuredReason(record_) : A11Y_REPORT.reason,
      rows: [],
      violations: [],
      contrastViolations: [],
      manual: record,
    };
  }
  const component_ = measured;

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

  const keyboardStories = component_.interaction.playFnStories.length;
  const keyboardRecord = record?.keyboard ?? null;
  const screenReaderRecord = record?.screenReader ?? null;

  const rows = [
    axeRow('default-state', 'Default state', component_.defaultState, {
      error: component_.defaultState?.error ?? null,
      detail: component_.defaultState ? component_.defaultState.storyId : null,
    }),
    /*
     * A docs-surface record measured the default story and nothing else, so
     * this row has no evidence behind it. `axeRow` would return 'pass' — no
     * rules failed, because no rules ran — which is the single most misleading
     * thing this panel could say. It reports 'not-measured' and why instead.
     */
    surface === 'docs'
      ? {
          id: 'advanced-states',
          label: 'Advanced states',
          state: 'not-measured',
          evidence: 'AXE',
          detail:
            'The docs page renders the default story only. This component’s other stories have not been measured.',
          rules: [],
        }
      : axeRow('advanced-states', 'Advanced states', component_.advancedStates, {
          detail: `${component_.advancedStates.storyCount} further ${component_.advancedStates.storyCount === 1 ? 'story' : 'stories'}`,
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
    /** 'storybook' (every story) or 'docs' (the default story, on this site). */
    surface,
    /** Stated on the panel, so a reader never has to assume which run this was. */
    surfaceNote:
      surface === 'docs'
        ? `Measured by axe on this documentation site’s own preview of the default story — ${
            record_.libraryWorkspace ?? 'this package'
          } has no Storybook in the measured set.`
        : null,
    storyCount: component_.storyCount,
    /*
     * Normalised to an array here rather than trusted from the file. Two
     * scripts now write this record shape, `artifacts.mjs` maps over this
     * field, and a producer that wrote a count instead took the whole build
     * down with `checks.errored.map is not a function` — a build failure caused
     * by a JSON artifact, which is exactly the class of break a consumer should
     * absorb rather than propagate.
     */
    errored: Array.isArray(component_.errored) ? component_.errored : [],
    rows,
    violations: component_.violations,
    contrastViolations: component_.contrastViolations,
    manual: record,
  };
}

/** Site-wide roll-up, for the overview screen. */
export const A11Y_TOTALS = report.data?.totals ?? null;
