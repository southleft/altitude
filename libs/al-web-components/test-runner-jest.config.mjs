// Jest config for `@storybook/test-runner` — picked up automatically by
// `test-storybook` (it globs `test-runner-jest*` in the config dir and the
// cwd; see @storybook/test-runner/dist/test-storybook.js `executeJestPlaywright`).
//
// WHY THIS FILE EXISTS: on Windows the runner found 0 tests.
//
// `test-storybook` derives `testMatch` from Storybook's `stories` globs:
//
//   getStorybookMetadata() → normalizeStories(...) → path.join(workingDir, dir)
//
// `path.join` is platform-native, so on Windows the patterns come out as
// backslash-separated absolute paths, e.g.
//
//   D:\repo\.claude\worktrees\wt\libs\al-web-components\components\**\*.stories.@(js|jsx|ts|tsx|mdx)
//
// Jest tries to repair that with `replacePathSepForGlob`, but it deliberately
// keeps a backslash that precedes a glob metacharacter:
//
//   path.replaceAll(/\\(?![$()+.?^{}])/g, '/')     // jest-util
//
// `.` is in that exclusion set, so any path segment starting with a dot keeps
// its backslash and stops being a separator — `al-web-components\.storybook`
// is read as the literal text `al-web-components.storybook`, which matches
// nothing. That silently breaks:
//
//   - the `./.storybook/components/**` stories entry on EVERY Windows machine, and
//   - ALL entries when the repo lives under a dot-directory, which is exactly
//     what `git worktree` layouts like `.claude/worktrees/<id>/` produce.
//
// Hence 0 tests, with no error — the five specs that shipped before this one
// each had to substitute manual verification.
//
// The fix is to hand Jest patterns that contain no backslashes at all, so
// `replacePathSepForGlob` becomes a no-op. Nothing here changes WHICH stories
// run; on Linux the mapping is already an identity transform.

import { getJestConfig } from '@storybook/test-runner';

const base = getJestConfig();

/** Absolute glob patterns are all-separator; POSIX-ify every one of them. */
const toPosixGlob = (p) => (typeof p === 'string' ? p.split('\\').join('/') : p);

/** @type {import('@jest/types').Config.InitialOptions} */
export default {
  ...base,
  testMatch: (base.testMatch ?? []).map(toPosixGlob),
  // `roots` is only set in index-json mode (a generated temp dir). Same
  // treatment for the same reason.
  ...(base.roots ? { roots: base.roots.map(toPosixGlob) } : {}),
};
