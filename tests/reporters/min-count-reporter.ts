import type { Reporter, FullConfig, Suite, FullResult } from '@playwright/test/reporter';

/**
 * Minimum-test-count guard for the Playwright suite.
 *
 * WHY. A runner that matches ZERO test files exits 0 and reports success. That
 * is not hypothetical here: `libs/al-web-components/test-runner-jest.config.mjs`
 * documents a Windows-only path-separator bug that made the Storybook test
 * runner find 0 tests silently, and five specs shipped against it before anyone
 * noticed. Playwright has the same failure mode — a bad `testDir`, a `testMatch`
 * typo, or a checkout that lost `tests/` all produce a green run with nothing in
 * it. `pnpm test:vrt` is a required CI job, so "green" there is load-bearing.
 *
 * WHAT IT DOES.
 *   - Zero tests collected → always a failure, whatever the invocation.
 *   - A FULL run (no file filter, no --grep, no --shard, no --last-failed)
 *     collecting fewer than `MIN_FULL_RUN_TESTS` → failure.
 *   - A deliberately narrowed run → floor skipped, because "I asked for one
 *     spec and got one spec" is not the failure mode this guards against.
 *
 * RATCHET. `AL_MIN_PLAYWRIGHT_TESTS` overrides the floor for a run (`0`
 * disables it entirely). Raise `MIN_FULL_RUN_TESTS` as the suite grows; adding
 * tests never requires touching it, but deleting a spec file does.
 */

/** Current suite: 22 tests in 6 files (`pnpm exec playwright test --list`). */
const MIN_FULL_RUN_TESTS = 20;

/** CLI flags that deliberately narrow the run, so the floor does not apply. */
const NARROWING_FLAGS = ['--grep', '-g', '--grep-invert', '--shard', '--last-failed', '--only-changed', '--project'];

function isNarrowedRun(argv: string[]): boolean {
  const args = argv.slice(2);
  const testIdx = args.indexOf('test');
  const rest = testIdx === -1 ? args : args.slice(testIdx + 1);
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--') continue;
    // A positional argument is a file/path filter.
    if (!arg.startsWith('-')) return true;
    if (NARROWING_FLAGS.some((flag) => arg === flag || arg.startsWith(`${flag}=`))) return true;
  }
  return false;
}

export default class MinCountReporter implements Reporter {
  private min = MIN_FULL_RUN_TESTS;
  private total = 0;

  onBegin(_config: FullConfig, suite: Suite): void {
    const override = process.env.AL_MIN_PLAYWRIGHT_TESTS;
    if (override !== undefined) this.min = Number(override);
    else if (isNarrowedRun(process.argv)) this.min = 1;
    this.total = suite.allTests().length;
  }

  onEnd(result: FullResult): { status: FullResult['status'] } | void {
    if (this.min <= 0 || this.total >= this.min) return;
    console.error(
      `\n[min-count] FAIL — Playwright collected ${this.total} test(s); floor for this run is ${this.min}.\n` +
        `[min-count] A runner that matches nothing exits 0 and looks green — that is the bug\n` +
        `[min-count] this guard exists for. Set AL_MIN_PLAYWRIGHT_TESTS=0 to bypass deliberately.\n`
    );
    return { status: result.status === 'passed' ? 'failed' : result.status };
  }
}
