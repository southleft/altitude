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

    // Preset switcher guard (spec 2026-07-28-storybook-preset-toolbar-switcher,
    // R5). `<al-theme>` must be UPGRADED in the preview iframe, or every
    // `:host([mode|density|contrast])` rule silently does nothing while the
    // brand stylesheet swap keeps working — a failure that looks like
    // "density does nothing", not like an error. See
    // `.storybook/auto-registry.ts`.
    const themeState = await page.evaluate(() => {
      const root = document.querySelector('#storybook-root');
      return {
        defined: customElements.get('al-theme') !== undefined,
        hasRoot: !!root,
        hasWrapper: !!root?.querySelector('al-theme'),
      };
    });
    if (!themeState.defined) {
      throw new Error(
        '[al-storybook] `al-theme` is not defined in the preview iframe. ' +
          'The alAutoRegistry import-ordering hazard is back — see .storybook/auto-registry.ts.',
      );
    }
    const presetDisabled = storyContext.parameters?.alPreset?.disable === true;
    if (!presetDisabled && themeState.hasRoot && !themeState.hasWrapper) {
      throw new Error(
        '[al-storybook] The preset decorator did not wrap this story in <al-theme>. ' +
          'Expected `#storybook-root al-theme` — see .storybook/with-preset.ts.',
      );
    }

    if (storyContext.parameters?.a11y?.disable) return;
    await checkA11y(page, '#storybook-root', {
      detailedReport: true,
      detailedReportOptions: { html: true },
      axeOptions: {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        // `color-contrast` is excluded from THE GATE, and only from the gate.
        //
        // The old comment here said "noisy … pending P6 audit", which was a
        // guess: nobody had ever seen the rule's output, because disabling it
        // globally is also what stopped it being reported anywhere. It has now
        // been measured — `scripts/build-a11y-report.mjs` runs the identical
        // WCAG tag set with this rule ENABLED, against a static build, and the
        // result is checked in at `.altitude/a11y/report.json` and rendered
        // per-component by the docs site.
        //
        // Measured 2026-08-23 against 522 stories: 0 structural violations,
        // and 18 components failing `color-contrast` — concentrated in
        // disabled-state form controls (al-checkbox, al-radio, al-input,
        // al-range, al-select…) and al-header. That is real, and it is why the
        // line below stays: flipping it on turns a green suite red today
        // without fixing a single contrast ratio. Fix the tokens, then delete
        // this line — the docs panel will show the progress either way.
        rules: { 'color-contrast': { enabled: false } },
      },
    });
  },
};

export default config;
