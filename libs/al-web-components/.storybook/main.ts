// T2.4 — Storybook 10 with the Vite builder.
//
// Replaces the legacy `@storybook/web-components-webpack5` + webpackFinal
// SCSS shim. The Vite builder consumes our existing vite.config.mjs via
// `viteFinal`; SCSS handling is native through Vite's built-in sass support.

import type { StorybookConfig } from '@storybook/web-components-vite';
import { mergeConfig } from 'vite';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
// Explicit extension: Storybook warns on extensionless imports in main.ts,
// and its ESM config loader resolves this path directly rather than through
// TypeScript's resolver.
import { themeApiPlugin } from './ai-theme/vite-plugin-theme-api.ts';

// Under pnpm's symlinked layout, @storybook/addon-docs's MDX loader injects
// an `import` whose specifier is a `file:///…` absolute URL pointing into
// the pnpm virtual store. Rollup cannot resolve `file:` URIs, so the
// preview build crashes on any MDX file. This plugin strips the prefix so
// Rollup sees an absolute filesystem path it can load.
const fileUrlResolver = {
  name: 'al-mdx-file-url-resolver',
  enforce: 'pre' as const,
  resolveId(id: string) {
    if (id.startsWith('file://')) return fileURLToPath(id);
    return null;
  },
};

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
        '  Fix:  pnpm --filter al-web-components build:tokens',
        '',
      ].join('\n'),
    );
  }
}

const config: StorybookConfig = {
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },
  stories: [
    './docs/*.@(js|jsx|ts|tsx|mdx)',
    '../components/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    './components/**/*.mdx',
    './components/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    './recipes/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    './templates/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    './pages/**/*.stories.@(js|jsx|ts|tsx|mdx)',
  ],
  // Storybook 10 dropped addon-essentials (the docs/controls/measure/outline/
  // backgrounds/viewport modules now ship with core). a11y stays. interactions
  // is replaced by @storybook/test wiring (T2.4 sub-step).
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
  ],
  // '../dist' serves the built component modules; './static' serves the
  // manager brand assets (images/logo.svg referenced by theme.js brandImage).
  // Without './static' the sidebar logo 404s (Cloudflare then serves the SPA
  // fallback HTML for it, so the brand image is broken).
  staticDirs: ['../dist', './static'],

  // NOTE: the old `docs: { autodocs: true }` was removed here. That option no
  // longer exists in Storybook 10 (core `DocsOptions` is only
  // `{ defaultName, docsMode }`), and the `as any` cast was hiding the fact
  // that it had become a no-op. Autodocs is tag-driven now and is switched on
  // globally via `tags: ['autodocs']` in preview.ts.

  // The onboarding checklist and the "what's new" toast both sit inside the
  // sidebar/footer area and fight the reskin for space.
  // NOTE: the flag is `sidebarOnboardingChecklist` — there is a `Feature.ONBOARDING`
  // enum member in the type defs, but it is not the config key.
  features: {
    sidebarOnboardingChecklist: false,
  },
  core: {
    disableWhatsNewNotifications: true,
  },
  viteFinal: async (cfg) => {
    return mergeConfig(cfg, {
      // themeApiPlugin serves /api/theme during `storybook dev`, mirroring the
      // Cloudflare Pages Function that serves it in production. Without it the
      // AI panel would only work in the deployed build.
      plugins: [fileUrlResolver, themeApiPlugin()],
      esbuild: {
        target: 'es2022',
        tsconfigRaw: {
          compilerOptions: {
            target: 'es2022',
            useDefineForClassFields: false,
            experimentalDecorators: true,
            // JSX for the custom docs page (.storybook/blocks/AltitudeDocsPage.tsx).
            //
            // Vite still loads the nearest tsconfig and then spreads
            // `tsconfigRaw.compilerOptions` over it — so these fields win, but
            // they do not erase the rest. Our tsconfig.json sets no `jsx`, so
            // without this esbuild falls back to the classic transform and the
            // page dies with "React is not defined".
            //
            // Do NOT also set `esbuild.jsx` at the Vite level: Vite nulls
            // `compilerOptions.jsx` when that option is present. One mechanism only.
            jsx: 'react-jsx',
            jsxImportSource: 'react',
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
          'al-web-components': resolve(__dirname, '..'),
        },
      },
    });
  },
};

export default config;
