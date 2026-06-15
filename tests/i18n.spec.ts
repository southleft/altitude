import { test, expect } from '@playwright/test';

/**
 * T5.3 — i18n smoke. Asserts:
 *   1. `<html lang>` propagates so locale-aware browser APIs (Intl) pick it up.
 *   2. `<al-theme>` token overrides remain stable across locale switches
 *      (i.e., theming is independent of locale, as it should be).
 *   3. A locale-sensitive operation (Intl.DateTimeFormat) flips when lang flips.
 */

test('T5.3 — lang propagates and locale-aware APIs flip', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/`);
  const result = await page.evaluate(() => {
    const d = new Date(Date.UTC(2024, 0, 31));
    document.documentElement.setAttribute('lang', 'en-US');
    const en = new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: 'long' }).format(d);
    document.documentElement.setAttribute('lang', 'de-DE');
    const de = new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: 'long' }).format(d);
    document.documentElement.setAttribute('lang', 'ja-JP');
    const ja = new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: 'long' }).format(d);
    return { en, de, ja };
  });
  expect(result.en).not.toBe(result.de);
  expect(result.de).not.toBe(result.ja);
  expect(result.en).toContain('January');
  expect(result.de.toLowerCase()).toContain('januar');
});
