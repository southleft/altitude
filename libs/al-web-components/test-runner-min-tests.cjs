/**
 * Jest reporter: minimum-test-count guard for `test-storybook`.
 *
 * WHY. `test-runner-jest.config.mjs` (same directory) documents, at length, a
 * Windows-only path-separator bug that made this runner match ZERO story files
 * and exit 0 — "Hence 0 tests, with no error", after five specs had already
 * shipped against it. The config fixes the cause. This reporter guards the
 * SYMPTOM, which is the part that generalises: any future breakage in the story
 * globs, the Storybook metadata, or the index-json temp dir produces the same
 * silent green.
 *
 * `getLastError()` is the documented Reporter hook for failing a run from a
 * reporter — Jest checks it after `onRunComplete` and exits non-zero if it
 * returns an Error. Setting `process.exitCode` here would be overwritten by
 * Jest's own exit handling.
 *
 * FLOORS. The last measured full run was 522 tests across 72 suites
 * (.mm/specs/2026-08-22-accessibility-remediation/axe-baseline.md records
 * 428 passed + 94 failed). The defaults sit well below that so adding or
 * removing a single component never touches this file — they only catch a
 * collapse. Override with AL_MIN_STORYBOOK_TESTS / AL_MIN_STORYBOOK_SUITES
 * (0 disables), e.g. when running a single story with `--testPathPattern`.
 */

const MIN_TESTS = Number(process.env.AL_MIN_STORYBOOK_TESTS ?? 300);
const MIN_SUITES = Number(process.env.AL_MIN_STORYBOOK_SUITES ?? 55);

class MinTestsReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options || {};
    this._error = undefined;
  }

  onRunComplete(_contexts, results) {
    const tests = results.numTotalTests;
    const suites = results.numTotalTestSuites;
    const belowTests = MIN_TESTS > 0 && tests < MIN_TESTS;
    const belowSuites = MIN_SUITES > 0 && suites < MIN_SUITES;
    if (!belowTests && !belowSuites) return;

    const message =
      `[min-tests] test-storybook ran ${tests} test(s) in ${suites} suite(s); ` +
      `floors are ${MIN_TESTS} test(s) / ${MIN_SUITES} suite(s). ` +
      'A runner that matches (almost) nothing exits 0 and looks green — see the header of ' +
      'test-runner-jest.config.mjs for the Windows bug this exists for. ' +
      'Set AL_MIN_STORYBOOK_TESTS=0 AL_MIN_STORYBOOK_SUITES=0 to bypass deliberately.';
    console.error(`\n${message}\n`);
    this._error = new Error(message);
  }

  getLastError() {
    return this._error;
  }
}

module.exports = MinTestsReporter;
