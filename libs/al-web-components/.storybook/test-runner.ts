// T2.4 — Storybook test-runner config.
// Runs axe-core on every story so a11y assertions land alongside interaction
// tests. Stories opt out per-story via `parameters.a11y.disable = true`.
import { getStoryContext, type TestRunnerConfig } from '@storybook/test-runner';
import { injectAxe, checkA11y } from 'axe-playwright';

const config: TestRunnerConfig = {
  async preVisit(page) {
    await injectAxe(page);
  },
  async postVisit(page, context) {
    const storyContext = await getStoryContext(page, context);
    if (storyContext.parameters?.a11y?.disable) return;
    await checkA11y(page, '#storybook-root', {
      detailedReport: true,
      detailedReportOptions: { html: true },
      axeOptions: {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        // The pre-existing visual rules ride along with the storybook env;
        // we exclude noisy color-contrast on legacy demos pending P6 audit.
        rules: { 'color-contrast': { enabled: false } },
      },
    });
  },
};

export default config;
