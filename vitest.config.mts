/**
 * Unit-test runner for the component libraries — Vitest 3 in BROWSER MODE.
 *
 * Why browser mode and not jsdom/happy-dom: everything worth asserting about
 * these components is a real-DOM behavior. `:focus-visible`, `inert`, tab
 * order inside a shadow root, `checkValidity()`, `HTMLDialogElement`,
 * constructable stylesheets and `slotchange` are either absent or subtly wrong
 * under a DOM shim, which is exactly how a green suite ends up proving nothing.
 * The provider is Playwright, which the repo already installs for VRT.
 *
 * Two projects, because the two libraries resolve differently:
 *   - `wc`    — compiles `libs/al-web-components` FROM SOURCE (it needs the
 *               same SCSS-import rewrite and decorator settings the library
 *               build uses, or every `@property accessor` breaks).
 *   - `react` — imports `@southleft/al-react` from source, which in turn imports
 *               `@southleft/al-web-components` through its published `exports` map, i.e.
 *               the BUILT `dist/`. That is deliberate: the React layer's job is
 *               to bind to the shipped element, so the test should exercise the
 *               shipped element. Run `pnpm run build` first.
 *
 * Ports 6180+ — 6006/6007 belong to the Storybook dev servers.
 */
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { rewriteScssImports } from './libs/al-web-components/vite-plugins/rewrite-scss-imports.mjs';

const root = dirname(fileURLToPath(import.meta.url));

/** Lit's `@property accessor` decorators only work with these two settings. */
const litEsbuild = {
  target: 'es2022',
  tsconfigRaw: {
    compilerOptions: {
      target: 'es2022',
      useDefineForClassFields: false,
      experimentalDecorators: true,
    },
  },
} as const;

const browser = (port: number) =>
  ({
    enabled: true,
    provider: 'playwright' as const,
    headless: true,
    screenshotFailures: false,
    api: { port },
    instances: [{ browser: 'chromium' }],
  }) as const;

export default defineConfig({
  test: {
    // A runner whose glob matches nothing exits 0 and looks green. See the
    // module header; mirrors the Playwright and Jest floors already in the repo.
    reporters: ['default', resolve(root, 'tests/reporters/vitest-min-count.ts')],
    projects: [
      {
        plugins: [rewriteScssImports()],
        esbuild: litEsbuild,
        css: { preprocessorOptions: { scss: { api: 'modern-compiler' } } },
        test: {
          name: 'wc',
          root: resolve(root, 'libs/al-web-components'),
          include: ['**/*.test.ts'],
          exclude: ['**/node_modules/**', '**/dist/**', '**/dist-v5/**'],
          setupFiles: [resolve(root, 'tests/unit/setup-wc.ts')],
          browser: browser(6180),
        },
      },
      {
        esbuild: { ...litEsbuild, jsx: 'automatic' as const },
        test: {
          name: 'react',
          root: resolve(root, 'libs/al-react'),
          include: ['**/*.test.tsx'],
          exclude: ['**/node_modules/**', '**/dist/**'],
          setupFiles: [resolve(root, 'tests/unit/setup-react.ts')],
          browser: browser(6185),
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reportsDirectory: resolve(root, 'coverage'),
      reporter: ['text-summary', 'json-summary', 'json'],
      all: true,
      include: ['libs/al-web-components/components/**', 'libs/al-web-components/directives/**', 'libs/al-react/src/components/**'],
      exclude: ['**/*.stories.*', '**/*.test.*', '**/icon/phosphor/**', '**/icon/icons/**'],
    },
  },
});
