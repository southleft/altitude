// T2.4 — Storybook 10 + Vite builder for al-react.

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

// R8 — al-react is a wrapper package: every one of its 66 components imports
// from `al-web-components/dist/...`, `preview.ts` injects
// `dist/css/main.css?inline`, and the `<ALTheme>` wrapper's `:host([brand])`
// rules ride along inside `dist/components/theme/theme.js`. None of that exists
// until al-web-components has been built, and the root `build` script
// (`pnpm --filter al-web-components build && pnpm --filter al-react build`)
// encodes the ordering while `pnpm --filter al-react start` did not — so a
// clean checkout failed with an unresolved-import stack trace pointing at a
// `?inline` CSS query, which names neither the cause nor the fix.
//
// Checked here rather than in a `prestart` script so `build:storybook` and any
// other entry into this config is covered by the same guard, and so the cost is
// two `existsSync` calls on an already-built tree.
const HERE = dirname(fileURLToPath(import.meta.url));
const WC_DIST = join(HERE, '../../al-web-components/dist');
const REQUIRED = [
  ['css/main.css', 'the global stylesheet injected by .storybook/preview.ts'],
  ['components/theme/theme.js', "<al-theme>, which carries the scoped :host([brand]) token blocks"],
] as const;

const missing = REQUIRED.filter(([rel]) => !existsSync(join(WC_DIST, rel)));
if (missing.length > 0) {
  throw new Error(
    [
      '',
      'al-react Storybook cannot start: al-web-components has not been built.',
      '',
      ...missing.map(([rel, why]) => `  missing  ${join(WC_DIST, rel)}\n           (${why})`),
      '',
      'Run this first, from the repo root:',
      '',
      '  pnpm --filter al-web-components build',
      '',
    ].join('\n')
  );
}

const config: StorybookConfig = {
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  // The `components/**/*.stories.@(js|jsx|ts|tsx)` glob (i.e. `.storybook/
  // components/`) is gone. Its only two matches were the IconFont and IconSvgs
  // docs stories, deleted with the Phosphor migration; the sole remaining
  // occupant of that directory is `Fpo/`, a placeholder component imported BY
  // other stories rather than a story itself. Storybook printed
  // "No story files found for the specified pattern" on every boot for it.
  stories: [
    '../src/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-a11y',
  ],
  // WAS `['../dist']`, which broke EVERY story in this Storybook whenever
  // `pnpm --filter al-react build` had been run.
  //
  // `tsc` emits `dist/package.json` (all 66 wrappers do `import PackageJson
  // from '../../../package.json'` and `resolveJsonModule` copies it to
  // `outDir`). Serving `../dist` statically therefore publishes it at
  // `/package.json`, where the static middleware answers BEFORE Vite's
  // JSON->ESM transform — so the browser got `Content-Type: application/json`
  // for a module script and refused it, and every story died with
  // "Failed to fetch dynamically imported module".
  //
  // `../dist` was only ever serving `dist/images/logo.svg` (the manager
  // `brandImage` in `./theme.ts`), which is a build-time copy of
  // `./static/images/logo.svg`. Pointing at the source directory serves the
  // identical file, drops a build prerequisite, and stops the shadowing.
  // `dist/css` is fetched over HTTP by nothing — `preview.ts` takes the global
  // stylesheet through a Vite `?inline` import instead.
  staticDirs: ['./static'],
  docs: { autodocs: true } as any,
  viteFinal: async (cfg) =>
    mergeConfig(cfg, {
      css: {
        preprocessorOptions: {
          scss: {
            // Use Sass's modern compiler API (Vite 5 still defaults to
            // the deprecated legacy JS API).
            api: 'modern-compiler',
          },
        },
      },
    }),
};

export default config;
