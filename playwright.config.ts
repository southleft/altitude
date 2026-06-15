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
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
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
  webServer: {
    command: 'yarn workspace al-app-web-components preview',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  snapshotPathTemplate: '.altitude/baselines/screenshots/{arg}{ext}',
});
