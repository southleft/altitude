import { test, expect } from '@playwright/test';

/**
 * T5.3 acceptance — RTL / direction support, asserted against the REAL library.
 *
 * WHAT THIS REPLACED. The previous version of this file loaded no Altitude code
 * whatsoever: it set `document.documentElement.lang` and asserted that
 * `Intl.DateTimeFormat` formats January differently in `de-DE` than in `en-US`.
 * That is a test of V8's ICU data. Grepping the library confirms why it could
 * not have been anything else — `libs/al-web-components/components/**` contains
 * zero `Intl.`, `toLocaleDateString` or `navigator.language` references, so
 * there is no locale-aware formatting in Altitude to test. (`al-calendar` and
 * `al-date-picker` format dates from their own `dateFormat` property.)
 *
 * WHAT IT DOES NOW. Altitude's actual internationalization surface is direction:
 * `styles/core/base.scss:14-19` defines four `[dir='rtl']` custom properties for
 * the cases logical properties cannot cover, and components read them inside
 * their SHADOW ROOTS — `dialog.scss:60`, `popover.scss:100`, `range.scss:34`,
 * `tooltip.scss:107`. This file asserts that chain end to end against the real
 * `main.css` and a real `<al-dialog>` in the al-app-web-components fixture
 * (webServer #1, port 5174).
 *
 * If `[dir='rtl']` is dropped from base.scss, or `--rtlTranslateX` stops being
 * read by dialog.scss, or the custom property stops inheriting through the
 * shadow boundary, these tests fail.
 */

/** Reads the RTL custom property at the root and inside al-dialog's shadow root. */
const readDirectionState = () =>
  ({
    rootVar: getComputedStyle(document.documentElement).getPropertyValue('--rtlTranslateX').trim(),
    shadowVar: (() => {
      const el = document.getElementById('dlg')?.shadowRoot?.querySelector('.al-c-dialog__container');
      return el ? getComputedStyle(el).getPropertyValue('--rtlTranslateX').trim() : null;
    })(),
    shadowTransform: (() => {
      const el = document.getElementById('dlg')?.shadowRoot?.querySelector('.al-c-dialog__container');
      return el ? getComputedStyle(el).transform : null;
    })(),
  }) as { rootVar: string; shadowVar: string | null; shadowTransform: string | null };

test.describe('T5.3 — direction (RTL) support', () => {
  test('[dir=rtl] flips the base.scss custom properties and they cross the shadow boundary', async ({
    page,
    baseURL,
  }) => {
    await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });

    // The real component must be upgraded, otherwise there is no shadow root to
    // look into and the rest of this test would vacuously pass.
    const upgraded = await page.evaluate(() => Boolean((customElements.get('al-dialog') as any)?.el));
    expect(upgraded, 'al-dialog is not registered — the fixture did not load').toBe(true);

    const ltr = await page.evaluate(readDirectionState);
    // LTR: the property is not set at all, so dialog.scss's `var(…, -50%)`
    // fallback is what applies.
    expect(ltr.rootVar).toBe('');
    expect(ltr.shadowVar).toBe('');
    expect(ltr.shadowTransform).toBeTruthy();

    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const rtl = await page.evaluate(readDirectionState);

    // base.scss:15 — `[dir='rtl'] { --rtlTranslateX: 50%; }`, shipped in main.css.
    expect(rtl.rootVar).toBe('50%');
    // Custom properties inherit into shadow DOM; this is what makes RTL work for
    // components at all, and nothing else in the repo asserts it.
    expect(rtl.shadowVar).toBe('50%');

    // dialog.scss:60 — `transform: translate(var(--rtlTranslateX, -50%), -50%)`.
    // The horizontal translate must flip sign; `matrix(a,b,c,d,tx,ty)`.
    const tx = (m: string | null) => Number(m?.match(/matrix\(([^)]*)\)/)?.[1].split(',')[4]);
    expect(tx(ltr.shadowTransform)).toBeLessThan(0);
    expect(tx(rtl.shadowTransform)).toBeGreaterThan(0);
    expect(tx(rtl.shadowTransform)).toBe(-tx(ltr.shadowTransform));
  });

  test('the other three RTL custom properties are shipped in the stylesheet', async ({ page, baseURL }) => {
    // base.scss:14-19 defines four. Only --rtlTranslateX is exercised above
    // (gradients and background-position need an animating component), so the
    // remaining three are asserted at the stylesheet + computed-value level so a
    // silent drop is still caught.
    await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });

    // Read the rule out of the document's OWN stylesheets — the built bundle's
    // filename is content-hashed, so there is no stable URL to fetch.
    const rule = await page.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRule[];
        try {
          rules = Array.from(sheet.cssRules);
        } catch {
          continue;
        }
        const flatten = (list: CSSRule[]): CSSRule[] =>
          list.flatMap((r) => ((r as CSSGroupingRule).cssRules ? [r, ...flatten(Array.from((r as CSSGroupingRule).cssRules))] : [r]));
        // CSSOM may normalise the quoting of the attribute value.
        const hit = flatten(rules).find((r) => /^\[dir=['"]?rtl['"]?\]$/.test((r as CSSStyleRule).selectorText ?? ''));
        if (hit) return hit.cssText;
      }
      return null;
    });
    expect(rule, "no [dir='rtl'] rule in the shipped stylesheet").toBeTruthy();
    for (const prop of ['--rtlTranslateX', '--rtlGradientToRight', '--rtlBackgroundPositionFrom', '--rtlBackgroundPositionTo']) {
      expect(rule, `${prop} missing from the shipped [dir='rtl'] rule`).toContain(prop);
    }

    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const values = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return {
        gradient: cs.getPropertyValue('--rtlGradientToRight').trim(),
        from: cs.getPropertyValue('--rtlBackgroundPositionFrom').trim(),
        to: cs.getPropertyValue('--rtlBackgroundPositionTo').trim(),
      };
    });
    expect(values).toEqual({ gradient: '270deg', from: '-135%', to: '0%' });
  });
});
