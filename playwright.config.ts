import { defineConfig, devices } from '@playwright/test';

/**
 * T0.1 — Playwright config for the v2 refactor VRT baselines.
 *
 * Tests run against the al-app-web-components fixture (a Vite preview of all
 * 5 pilot components) rather than against Storybook. Vite preview comes up in
 * ~500ms; Storybook 7 dev mode takes minutes — and the fixture is what we
 * already promised CI would build (T0.3).
 *
 * Baselines: `.altitude/baselines/screenshots/`. The G8 gate enforces that
 * any change to build/dep/token config must update these (the diff goes into
 * the same PR).
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  // `min-count-reporter` fails the run when suspiciously few tests were
  // collected — a runner that matches nothing exits 0 and looks green. See the
  // module header; `AL_MIN_PLAYWRIGHT_TESTS=0` disables it for --grep runs.
  reporter: [
    ...(process.env.CI ? [['github'] as const, ['list'] as const] : [['list'] as const]),
    ['./tests/reporters/min-count-reporter.ts'],
  ],
  expect: {
    // Allow tiny anti-aliasing diffs; T0.1 baselines are the absolute truth.
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, threshold: 0.2 },
  },
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Three fixtures, because three specs now assert against REAL built output
  // instead of markup they wrote themselves inside `page.evaluate` /
  // `page.setContent`:
  //   5174 — al-app-web-components (VRT baselines, tests/i18n.spec.ts)
  //   5176 — al-app-mfe            (tests/mfe.spec.ts)
  //   5177 — al-app-ssr            (tests/ssr.spec.ts); rooted at the REPO ROOT
  //          so the generated pages' ../../../libs/... references resolve.
  //   5178 — story-fixture          (tests/components.vrt.spec.ts)
  // All three serve pre-built output: run `pnpm run build:fixtures` first.
  webServer: [
    {
      command: 'pnpm --filter al-app-web-components preview',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter al-app-mfe preview',
      url: 'http://localhost:5176',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter al-app-ssr start',
      url: 'http://localhost:5177/apps/ssr/dist/index.html',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    // 5178 - the story fixture, which renders every component's stories with
    // real Lit. It already backs the accessibility sweep; pointing VRT at it
    // too means the two measure the SAME rendered states rather than two
    // separately-maintained fixtures that can drift apart. Built by
    // `pnpm run build:story-fixture` (part of build:fixtures).
    {
      // Run through the WORKSPACE PACKAGE, not `--dir`. story-fixture/ is nested
      // inside al-web-components, so the `libs/*` workspace glob does not match
      // it, it has no node_modules of its own, and `pnpm --dir … exec vite`
      // finds no binary on a clean CI install (exit 254, "Command vite not
      // found"). Same trap the build script hit; fixed the same way.
      command:
        'pnpm --filter @southleft/al-web-components exec vite preview -c story-fixture/vite.config.mjs --port 5178',
      url: 'http://localhost:5178/iframe.html?id=button--Default',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  snapshotPathTemplate: '.altitude/baselines/screenshots/{arg}{ext}',
});
