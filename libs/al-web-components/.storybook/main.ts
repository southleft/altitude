// Storybook 10 + Vite builder for @southleft/al-web-components.
//
// Deliberately kept in step with `libs/al-react/.storybook/main.ts`. The
// differences that remain are forced by the renderer, not by taste:
//   * the `@storybook/web-components-vite` framework;
//   * the `./components/**` story globs — this Storybook OWNS the
//     `Foundations/*` documentation elements; @southleft/al-react renders the same
//     elements through thin React CSF shims in `src/foundations/`;
//   * the shared `mdxFileUrlResolver` plugin and the generated-token pre-flight
//     below, both of which exist to make those MDX/token pages work at all.
// Everything that was manager/docs *chrome* — the sidebar reskin, the custom
// autodocs page, the per-story card frame — is gone, so the two Storybooks
// present the same UI.

import type { StorybookConfig } from '@storybook/web-components-vite';
import { mergeConfig } from 'vite';
import remarkGfm from 'remark-gfm';
// Shared with libs/al-react/.storybook/main.ts — see the module for why MDX
// under pnpm needs it. Kept in one place so the two configs cannot drift.
// @ts-expect-error — plain .mjs build glue, no type declarations by design.
import { mdxFileUrlResolver } from '../vite-plugins/mdx-file-url-resolver.mjs';
// Figma <-> code parity: writes dist/parity.json (served at /parity.json) for
// the sidebar badges in manager.js and the FigmaParity docs block. Node-side
// glue over libs/altitude-mcp/src/lib/parity.mjs — see the module header.
// @ts-expect-error — plain .mjs build glue, no type declarations by design.
import { emitParity } from './parity-emitter.mjs';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Pre-flight for the generated token artifacts.
//
// Two directories under `styles/` are GENERATED and GITIGNORED
// (`libs/al-web-components/.gitignore:7`), produced by `build:tokens`, and a
// fresh clone has neither. Failing here, in Node, before the dev server boots,
// turns "the whole Storybook is broken" into one actionable line.
//
// The `scss/host/` entry is the one that matters most: `theme.scss` `@use`s it,
// so a missing directory is not a degraded toolbar — it is a Sass compile error
// that takes down every story that renders any component. It replaced the
// `scss/brand/` check, which existed only for the preset switcher's old
// stylesheet swap; `scss/brand/` is still listed because
// `components/theme-switcher/theme-switcher.ts:15-20` imports six files out of
// it for its legacy global-swap fallback.
//
// CI is fine as-is: the root `build:storybook-web-components`
// (`package.json:20`) is preceded by `pnpm run build`, and
// `libs/al-web-components/package.json` chains `build:tokens` first inside
// `build`.
for (const [rel, why] of [
  ['../styles/dist-v5/scss/host', 'components/theme/theme.scss @uses it for the :host([brand]) rules'],
  ['../styles/dist/scss/brand', 'components/theme-switcher/theme-switcher.ts imports six bundles from it'],
] as const) {
  const dir = resolve(__dirname, rel);
  const found = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.scss')) : [];
  if (found.length === 0) {
    throw new Error(
      [
        '',
        '[al-storybook] Missing generated token artifacts.',
        `  Expected *.scss in: ${dir}`,
        `  Needed because: ${why}`,
        '  These are gitignored BUILD ARTIFACTS — a fresh clone does not have them.',
        '',
        '  Fix:  pnpm --filter @southleft/al-web-components build:tokens',
        '',
      ].join('\n'),
    );
  }
}

// Parity report, written BEFORE Storybook starts any build effect.
//
// `storybook build` runs the preview build and the staticDir copy concurrently,
// so a report written from `viteFinal` (~20s into the Vite build) misses the
// copy entirely and the static output ships with no badges. Module scope is the
// only place that is guaranteed to precede both. The write is memoised, so the
// `viteFinal` call below costs nothing and exists purely to arm the dev
// watcher. See the WHEN-it-runs note in `./parity-emitter.mjs`.
//
// Top-level await is safe here: Storybook 10 loads `main.ts` through Node's ESM
// loader (a syntax error in this file surfaces from `compileSourceTextModule`),
// and a loader that could not handle it would fail loudly rather than silently.
await emitParity();

const config: StorybookConfig = {
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },
  // `./templates/**`, `./pages/**` and `./recipes/**` are gone. Templates and
  // Pages were whole-screen compositions that existed in this Storybook only —
  // @southleft/al-react never had them — and `recipes/` never held anything but a
  // placeholder, so its glob logged "No story files found" on every boot.
  // What remains matches @southleft/al-react's shape plus the documentation this
  // Storybook owns: `./docs/*` (Resources) and `./components/**` (Foundations).
  stories: [
    './docs/*.@(js|jsx|ts|tsx|mdx)',
    '../components/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    './components/**/*.mdx',
    './components/**/*.stories.@(js|jsx|ts|tsx|mdx)',
  ],
  // Storybook 10 dropped addon-essentials (the docs/controls/measure/outline/
  // backgrounds/viewport modules now ship with core). a11y matches @southleft/al-react;
  // docs is required here for the MDX documentation pages.
  addons: [
    '@storybook/addon-a11y',
    {
      name: '@storybook/addon-docs',
      options: {
        // GFM tables. MDX v3 ships CommonMark only, and CommonMark has no
        // table syntax — so every `| a | b |` table in our .mdx docs was
        // rendering as literal pipe-delimited TEXT, not a table. This was
        // never configured (verified: no commit ever touched `remark-gfm` or
        // `mdxPluginOptions`), so it is a long-standing gap rather than a
        // regression. Same block in `libs/al-react/.storybook/main.ts`.
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
  ],
  // '../dist' serves the built component modules (the icon runtime lazy-loads
  // glyphs from `/icon-glyphs/`); './static' serves the manager brand assets
  // (images/logo.svg referenced by theme.js brandImage). Without './static'
  // the sidebar logo 404s (Cloudflare then serves the SPA fallback HTML for
  // it, so the brand image is broken).
  //
  // NOTE: unlike @southleft/al-react, `../dist` is safe to serve here — `tsc` does not
  // emit a `dist/package.json` for this package, so there is no static file
  // shadowing Vite's JSON->ESM transform.
  staticDirs: ['../dist', './static'],

  // NOTE: the old `docs: { autodocs: true }` was removed here. That option no
  // longer exists in Storybook 10 (core `DocsOptions` is only
  // `{ defaultName, docsMode }`), and the `as any` cast was hiding the fact
  // that it had become a no-op. Autodocs is tag-driven now and is switched on
  // globally via `tags: ['autodocs']` in preview.ts.
  docs: {
    // DOCS-ONLY SIDEBAR. `docsMode: true` drops every individual story entry
    // from the sidebar and leaves exactly one node per component — the Docs
    // page — so `Icons > Docs + Catalog` collapses to a single `Icons` that
    // opens the docs. The stories are NOT deleted: autodocs still renders all
    // of them inline (`<Canvas>` per export), which is where they are meant to
    // be read.
    //
    // Consequence worth knowing: Storybook renders no addon PANEL for a docs
    // entry, so the stock a11y and Interactions tabs are unreachable in this
    // mode. `./blocks/a11y-report` re-implements the a11y half as a docs block
    // that autodocs renders under every story — see `./docs-page.tsx`.
    docsMode: true,
    // The docs entry's own name. Under `docsMode` the entry collapses INTO the
    // component node, so this is what the URL slug ends with
    // (`atoms-button--docs`) rather than anything the sidebar shows.
    defaultName: 'Docs',
  },
  viteFinal: async (cfg, { configType }) => {
    // The report itself was already written at module scope; this call only
    // arms the dev watcher (badges flip live on a component edit). Parity is
    // sidebar chrome: a failure logs a warning and never blocks the server or a
    // build. The SECOND Storybook (`.storybook-sl/`) spreads this very config
    // and the emitter writes a DIFFERENTLY NAMED file for it
    // (`dist/parity.southleft.json`), so nothing here has to change per project
    // — see the MULTI-PROJECT note in `./parity-emitter.mjs`.
    await emitParity({ watch: configType === 'DEVELOPMENT' });
    return mergeConfig(cfg, {
      plugins: [mdxFileUrlResolver()],
      esbuild: {
        target: 'es2022',
        tsconfigRaw: {
          compilerOptions: {
            target: 'es2022',
            useDefineForClassFields: false,
            experimentalDecorators: true,
          },
        },
      },
      // SCSS imports inside component .ts files use the bare form
      // `import styles from './x.scss'`. Vite returns a CSSResult-friendly
      // string already; no extra loader needed.
      css: {
        preprocessorOptions: {
          scss: {
            // Use Sass's modern compiler API (Vite 5 still defaults to
            // the deprecated legacy JS API).
            api: 'modern-compiler',
          },
        },
      },
      resolve: {
        alias: {
          '@southleft/al-web-components': resolve(__dirname, '..'),
        },
      },
    });
  },
};

export default config;
