/**
 * Minimum-test-count guard for the Vitest unit runner.
 *
 * Same reasoning as `tests/reporters/min-count-reporter.ts` (Playwright) and
 * `test-runner-min-tests.cjs` (Storybook/Jest): a runner whose `include` glob
 * matches nothing exits 0 and looks green, and on Windows a backslash in a glob
 * is the classic way to get there.
 *
 * The floor applies only to projects the run actually STARTED (recorded in
 * onInit), so `--project wc` does not trip the react floor — while a project
 * that started and then collected nothing still fails, which is the case worth
 * catching. `AL_MIN_VITEST_TESTS=0` disables it for a deliberately narrowed run
 * such as `vitest run components/button`.
 */
import type { Reporter } from 'vitest/node';

const FLOORS: Record<string, number> = { wc: 80, react: 110 };
const OVERRIDE = process.env.AL_MIN_VITEST_TESTS;

/** Project names arrive as `wc (chromium)` in browser mode. */
const baseName = (name: string) => name.split(' (')[0].trim();

export default class MinCountReporter implements Reporter {
  private started = new Set<string>();

  onInit(ctx: any) {
    for (const project of ctx?.projects ?? []) {
      if (project?.name) this.started.add(baseName(project.name));
    }
  }

  onFinished(files: any[] = []) {
    if (OVERRIDE === '0') return;

    const counted: Record<string, number> = {};
    const walk = (tasks: any[], project: string) => {
      for (const task of tasks ?? []) {
        if (task.type === 'test') counted[project] = (counted[project] ?? 0) + 1;
        if (task.tasks) walk(task.tasks, project);
      }
    };
    for (const file of files) {
      const project = baseName(file.projectName || file.project?.name || 'default');
      counted[project] = counted[project] ?? 0;
      walk(file.tasks, project);
    }

    const applicable = Object.keys(FLOORS).filter((name) => this.started.size === 0 || this.started.has(name));
    const floorFor = (name: string) => (OVERRIDE ? Number(OVERRIDE) : FLOORS[name]);
    const short = applicable.filter((name) => (counted[name] ?? 0) < floorFor(name));

    if (short.length) {
      for (const name of short) {
        console.error(
          `\n[min-count] FAIL — project '${name}' collected ${counted[name] ?? 0} tests, floor is ${floorFor(name)}. ` +
            'Either the include glob stopped matching or tests were deleted. ' +
            'Set AL_MIN_VITEST_TESTS=0 for a deliberately narrowed run.'
        );
      }
      process.exitCode = 1;
    } else {
      console.log(`[min-count] PASS — ${applicable.map((n) => `${n}: ${counted[n] ?? 0}/${floorFor(n)}`).join(', ')}`);
    }
  }
}
