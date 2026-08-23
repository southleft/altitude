import { test, expect, type Page } from '@playwright/test';

/**
 * T4.6 acceptance — `versioned` registry mode, asserted against the REAL bundle.
 *
 * WHAT THIS REPLACED. The previous version of this file reimplemented
 * `registerAltitude` inline inside `page.evaluate` and asserted against its own
 * copy. `libs/al-web-components/directives/register.ts` could have been deleted
 * and it would still have passed — and in fact it hid a live bug: the fixture
 * registered the SAME constructor under two suffixed tags, which
 * `customElements.define` rejects with
 * `NotSupportedError: this constructor has already been used with this registry`.
 * `defineSafely` catches and logs that, so `al-button-2-0-0`, `al-card-2-0-0`,
 * `al-heading-1-0-0` and `al-heading-2-0-0` were never defined at all while the
 * job stayed green. See the `asCopy` comment in apps/mfe/src/main.js.
 *
 * WHAT IT DOES NOW. It loads `apps/mfe`'s built Vite bundle (webServer #2 in
 * playwright.config.ts, port 5176), which imports the real `registerAltitude`
 * and the real `ALButton`/`ALCard`/`ALHeading`, and drives that same real export
 * — re-exposed on `window.__ALTITUDE_MFE_FIXTURE__.registerAltitude` — for the
 * `stable` / `manual` / missing-suffix paths.
 */

const MFE_URL = 'http://localhost:5176/';

/** Collects console errors + uncaught exceptions for the lifetime of the page. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

test.describe('T4.6 — versioned registry mode (real bundle)', () => {
  test('two versions of the same component coexist as distinct, working tags', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(MFE_URL, { waitUntil: 'networkidle' });

    const result = await page.evaluate(() => {
      const fixture = (window as any).__ALTITUDE_MFE_FIXTURE__;
      const { leftTag, rightTag } = fixture ?? {};
      const leftHost = leftTag ? document.querySelector(leftTag) : null;
      const rightHost = rightTag ? document.querySelector(rightTag) : null;
      return {
        hasFixture: Boolean(fixture),
        leftTag,
        rightTag,
        leftCtor: Boolean(customElements.get(leftTag)),
        rightCtor: Boolean(customElements.get(rightTag)),
        ctorsDistinct: customElements.get(leftTag) !== customElements.get(rightTag),
        // `versioned` must never claim the bare tag — that is the whole point
        // of the mode for a page hosting more than one Altitude version.
        plainTagTaken: Boolean(customElements.get('al-button')),
        // Real ALButton renders `<button class="al-c-button">` into its shadow
        // root. A stub or an unupgraded unknown element cannot produce this.
        leftRendersRealButton: Boolean(leftHost?.shadowRoot?.querySelector('button.al-c-button')),
        rightRendersRealButton: Boolean(rightHost?.shadowRoot?.querySelector('button.al-c-button')),
        leftText: leftHost?.textContent?.trim(),
        rightText: rightHost?.textContent?.trim(),
        // The shell registration is a third, independent suffix in the same page.
        shellThemeDefined: Boolean(customElements.get('al-theme-shell')),
        cardsDefined: [Boolean(customElements.get('al-card-1-0-0')), Boolean(customElements.get('al-card-2-0-0'))],
        headingsDefined: [
          Boolean(customElements.get('al-heading-1-0-0')),
          Boolean(customElements.get('al-heading-2-0-0')),
        ],
      };
    });

    expect(result.hasFixture, 'apps/mfe/src/main.js did not run').toBe(true);
    // The tag names come from the real `registerAltitude`, not from this test.
    expect(result.leftTag).toBe('al-button-1-0-0');
    expect(result.rightTag).toBe('al-button-2-0-0');
    expect(result.leftCtor).toBe(true);
    expect(result.rightCtor).toBe(true);
    expect(result.ctorsDistinct).toBe(true);
    expect(result.plainTagTaken).toBe(false);
    expect(result.leftRendersRealButton).toBe(true);
    expect(result.rightRendersRealButton).toBe(true);
    expect(result.leftText).toBe('Left button');
    expect(result.rightText).toBe('Right button');
    expect(result.shellThemeDefined).toBe(true);
    expect(result.cardsDefined).toEqual([true, true]);
    expect(result.headingsDefined).toEqual([true, true]);

    // The bug this file previously hid surfaced ONLY as a console error, so it
    // is an assertion, not a diagnostic.
    expect(errors, 'registry errors on the MFE fixture page').toEqual([]);
  });

  test('the real registerAltitude honours stable / manual / missing-suffix', async ({ page }) => {
    await page.goto(MFE_URL, { waitUntil: 'networkidle' });

    const result = await page.evaluate(() => {
      // The REAL export, bundled from
      // libs/al-web-components/directives/register.ts. Delete or break that
      // module and every assertion below fails.
      const registerAltitude = (window as any).__ALTITUDE_MFE_FIXTURE__?.registerAltitude;
      if (typeof registerAltitude !== 'function') return { missing: true } as any;

      const probe = () => class extends HTMLElement {};

      const stable = registerAltitude({ mode: 'stable' }, [['al-probe-stable', probe()]]);
      const manual = registerAltitude({ mode: 'manual', suffix: '9-9-9' }, [['al-probe-manual', probe()]]);
      // `sanitize()` turns every non-word character into '-'.
      const messy = registerAltitude({ mode: 'versioned', suffix: '2.0.0-beta 1' }, [['al-probe-messy', probe()]]);

      let threw = false;
      let noSuffixSize = -1;
      try {
        noSuffixSize = registerAltitude({ mode: 'versioned' }, [['al-probe-nosuffix', probe()]]).size;
      } catch {
        threw = true;
      }

      return {
        missing: false,
        stableTag: stable.get('al-probe-stable'),
        stableDefined: Boolean(customElements.get('al-probe-stable')),
        manualTag: manual.get('al-probe-manual'),
        manualDefined: Boolean(customElements.get('al-probe-manual-9-9-9')),
        manualPlainDefined: Boolean(customElements.get('al-probe-manual')),
        messyTag: messy.get('al-probe-messy'),
        messyDefined: Boolean(customElements.get('al-probe-messy-2-0-0-beta-1')),
        noSuffixThrewOrEmpty: threw || noSuffixSize === 0,
        noSuffixDefinedAnything: Boolean(
          customElements.get('al-probe-nosuffix') || customElements.get('al-probe-nosuffix-')
        ),
      };
    });

    expect(result.missing, 'window.__ALTITUDE_MFE_FIXTURE__.registerAltitude missing').toBe(false);

    // stable → plain tag, defined.
    expect(result.stableTag).toBe('al-probe-stable');
    expect(result.stableDefined).toBe(true);

    // manual → alias computed, nothing defined. Note manual keeps the plain
    // alias (register.ts only appends the suffix in `versioned`).
    expect(result.manualTag).toBe('al-probe-manual');
    expect(result.manualDefined).toBe(false);
    expect(result.manualPlainDefined).toBe(false);

    // versioned → suffix sanitized to kebab by `sanitize()`.
    expect(result.messyTag).toBe('al-probe-messy-2-0-0-beta-1');
    expect(result.messyDefined).toBe(true);

    // versioned without a suffix must register nothing (dev build throws;
    // production build logs and returns an empty Map — either is a refusal).
    expect(result.noSuffixThrewOrEmpty).toBe(true);
    expect(result.noSuffixDefinedAnything).toBe(false);
  });
});
