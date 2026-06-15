import { expect, test } from '@playwright/test';

/**
 * T0.1 baseline — VRT screenshots for the 5 pilot components.
 *
 * Each test isolates the section for its pilot and captures a screenshot.
 * The baseline lives under `.altitude/baselines/screenshots/`. Phase gates
 * compare against these.
 */

const PILOTS = [
  { id: 'button', headingText: 'button' },
  { id: 'input', headingText: 'input' },
  { id: 'select', headingText: 'select' },
  { id: 'dialog', headingText: 'dialog' },
  { id: 'theme-switcher', headingText: 'theme-switcher' },
] as const;

for (const pilot of PILOTS) {
  test(`${pilot.id} renders and matches baseline`, async ({ page }) => {
    await page.goto('/');
    // Wait for the section heading specific to this pilot before screenshotting.
    const section = page.locator('section', { hasText: pilot.headingText });
    await expect(section).toBeVisible();
    // Give web components a beat to upgrade + paint.
    await page.waitForLoadState('networkidle');
    await expect(section).toHaveScreenshot(`${pilot.id}.png`, {
      animations: 'disabled',
      caret: 'hide',
    });
  });
}
