// T2.4 — Storybook 10 + Vite builder for al-react.

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import remarkGfm from 'remark-gfm';
// @ts-expect-error — plain .mjs build glue, no type declarations by design.
import { rewriteScssImports } from '../../al-web-components/vite-plugins/rewrite-scss-imports.mjs';
// @ts-expect-error — plain .mjs build glue, no type declarations by design.
import { mdxFileUrlResolver } from '../../al-web-components/vite-plugins/mdx-file-url-resolver.mjs';

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
  // The `Resources/*` documentation pages are SHARED with the web-components
  // Storybook by pointing at that package's files rather than copying them —
  // one source of truth, so the two Storybooks cannot drift. This is safe
  // ONLY because those three files are prose MDX: they use `<Meta title=…/>`
  // (a docs-only entry with no attached CSF) plus `<Markdown>`, and MDX
  // compiles to React in every Storybook regardless of the story renderer.
  //
  // The `Foundations/*` pages are deliberately NOT globbed in the same way.
  // Their CSF files return lit-html `TemplateResult`s and are typed against
  // `@storybook/web-components`; a Storybook has exactly one renderer, and the
  // React renderer would receive a `{_$litType$, strings, values}` object
  // where it expects a React element. Those pages are re-authored for this
  // renderer in `../src/foundations/` instead.
  stories: [
    '../src/**/*.stories.@(js|jsx|ts|tsx)',
    '../../al-web-components/.storybook/docs/*.mdx',
  ],
  addons: [
    '@storybook/addon-a11y',
    {
      name: '@storybook/addon-docs',
      options: {
        // GFM tables — see the identical block in
        // `libs/al-web-components/.storybook/main.ts` for why this is needed.
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
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
  // NOTE: `docs: { autodocs: true }` used to sit here. That option no longer
  // exists in Storybook 10 (core `DocsOptions` is only `{ defaultName, docsMode }`)
  // and the `as any` cast was hiding the fact that it had become a no-op — which
  // is why this Storybook had NO autodocs at all and `atoms-button--docs`
  // 404'd. Autodocs is tag-driven now and is switched on in `preview.ts` via
  // `tags: ['autodocs']`, matching the web-components Storybook.
  docs: {
    // DOCS-ONLY SIDEBAR, matching `al-web-components/.storybook/main.ts`: one
    // node per component that opens its docs page; the individual stories are
    // still rendered inline by autodocs. Consequence: docs entries get no
    // addon panel, so the stock a11y tab is unreachable — the shared
    // `AltitudeDocsPage` (wired in `preview.ts`) renders the inline
    // `<A11yReport>` under every story instead.
    docsMode: true,
    defaultName: 'Docs',
  },
  viteFinal: async (cfg) =>
    mergeConfig(cfg, {
      // The shared SCSS import-rewrite plugin. Needed because the
      // `Foundations/*` documentation elements live in al-web-components
      // SOURCE (`.storybook/components/**`) and use the bare
      // `import styles from './x.scss'` form, which Vite does not resolve to a
      // string without `?inline`. Imported rather than copied so the two
      // builds cannot drift.
      //
      // NOTE this is the one place al-react compiles al-web-components source
      // rather than its built `dist` (see the R8 note at the top of this file).
      // It is scoped to documentation elements only — every actual COMPONENT
      // still comes from `dist`.
      plugins: [rewriteScssImports(), mdxFileUrlResolver()],
      esbuild: {
        target: 'es2022',
        tsconfigRaw: {
          compilerOptions: {
            target: 'es2022',
            // Required by the Lit documentation elements above: they use
            // `@customElement` / `@property` decorators, which need the legacy
            // decorator semantics and non-standard class-field behaviour. The
            // React wrappers in `../src` are function components and are
            // unaffected by either flag.
            useDefineForClassFields: false,
            experimentalDecorators: true,
          },
        },
      },
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
