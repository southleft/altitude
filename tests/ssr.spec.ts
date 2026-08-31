import { test, expect, type Page } from '@playwright/test';

/**
 * T5.2 acceptance — SSR + Declarative Shadow DOM, asserted against the REAL
 * `apps/ssr` output.
 *
 * WHAT THIS REPLACED. The previous version called `page.setContent` with a
 * hand-written `class FakeButton`, a hand-written DSD template and a hand-written
 * hydration marker. It never loaded `apps/ssr/dist` at all, so it asserted that
 * Chrome parses `<template shadowrootmode>` — a browser feature, not Altitude's
 * pipeline. It hid two real defects:
 *   1. `apps/ssr/scripts/serve.mjs` rooted the static server at `apps/ssr/dist`,
 *      so the pages' `../../../libs/al-web-components/dist/...` stylesheet and
 *      module both 404'd.
 *   2. Even served correctly, the hydration entry was `tsc` output carrying bare
 *      specifiers, so the browser failed with
 *      `Failed to resolve module specifier "lit"` and NOTHING ever hydrated.
 *
 * WHAT IT DOES NOW. It fetches the generated HTML as bytes and asserts on what
 * `@lit-labs/ssr` actually serialized, renders the pages with JavaScript both
 * off and on, and requires the real component classes to upgrade the markup.
 *
 * Served by webServer #3 in playwright.config.ts (`pnpm --filter al-app-ssr
 * start`, port 5177, rooted at the repo root).
 */

const SSR_BASE = 'http://localhost:5177/apps/ssr/dist';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => errors.push(`requestfailed: ${req.url()}`));
  return errors;
}

test.describe('T5.2 — SSR fixture', () => {
  test('lit-ssr serialized a real DSD template for the opted-in pilot', async ({ request }) => {
    const res = await request.get(`${SSR_BASE}/al-theme.html`);
    expect(res.status()).toBe(200);
    const html = await res.text();

    // Server-rendered, before a byte of JS runs.
    expect(html).toContain('shadowrootmode="open"');
    expect(html).toMatch(/<al-theme[^>]*brand="southleft"/);
    // The scoped-theming payload really is inside the DSD template: al-theme
    // serializes its `:host([brand=…])` blocks into the shadow root, which is
    // the cost `.altitude/SSR.md` documents. If that stops happening, the page
    // cannot be branded with JS disabled and the next test would go red too.
    expect(html).toContain(':host([brand=southleft][mode=dark])');
    expect(html).toContain('<slot>');

    // The stylesheet the page links must exist — this is the 404 that made the
    // fixture render unstyled for as long as it had a test.
    const css = await request.get('http://localhost:5177/libs/al-web-components/dist/css/main.css');
    expect(css.status()).toBe(200);
  });

  test('the non-opted-in pilots are plain elements, by design', async ({ request }) => {
    // apps/ssr/scripts/build.mjs opts pilots into lit-ssr ONE AT A TIME because
    // `ALElement.slotEmpty()` throws under lit-ssr's DOM shim; an empty shadow
    // stub would hide the light DOM until JS lands. Locking the current split in
    // makes any change to it deliberate rather than accidental.
    const html = await (await request.get(`${SSR_BASE}/al-button.html`)).text();
    expect(html).toContain('<al-button>Hello</al-button>');
    expect(html).not.toContain('shadowrootmode');
  });

  test('the DSD page is branded with JavaScript disabled', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`${SSR_BASE}/al-theme.html`);

    const probe = await page.evaluate(() => {
      const p = document.querySelector('al-theme p');
      return p ? getComputedStyle(p).color : null;
    });

    // `color: var(--al-theme-color-background-primary-default)` — southleft's
    // brand orange, resolved purely from the serialized DSD + main.css.
    expect(probe).toBe('rgb(240, 87, 53)');
    await context.close();
  });

  test('the real component classes upgrade the server-rendered markup', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(`${SSR_BASE}/al-theme.html`, { waitUntil: 'networkidle' });
    await expect(page.locator('[data-hydration]')).toHaveAttribute('data-hydration', 'complete');

    const result = await page.evaluate(() => {
      const host = document.querySelector('al-theme') as any;
      const ctor = customElements.get('al-theme') as any;
      return {
        defined: Boolean(ctor),
        // `static el` is Altitude's own convention (ALElement subclasses), so
        // this is the real class and not some shim that happens to be defined.
        staticEl: ctor?.el,
        upgraded: host instanceof (ctor ?? HTMLElement),
        keptShadow: Boolean(host?.shadowRoot?.querySelector('slot')),
        // The light DOM survived hydration — no remeasure, no wipe.
        probeText: host?.querySelector('p')?.textContent?.trim(),
      };
    });

    expect(result.defined).toBe(true);
    expect(result.staticEl).toBe('al-theme');
    expect(result.upgraded).toBe(true);
    expect(result.keptShadow).toBe(true);
    expect(result.probeText).toBe('Branded with JavaScript disabled.');
    expect(errors, 'console errors / failed requests on the SSR page').toEqual([]);
  });

  test('a non-DSD pilot still hydrates into the real component', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(`${SSR_BASE}/al-button.html`, { waitUntil: 'networkidle' });
    await expect(page.locator('[data-hydration]')).toHaveAttribute('data-hydration', 'complete');

    const result = await page.evaluate(() => {
      const host = document.querySelector('al-button') as any;
      return {
        staticEl: (customElements.get('al-button') as any)?.el,
        // Real ALButton markup — button.scss's BEM root class.
        rendersRealButton: Boolean(host?.shadowRoot?.querySelector('button.al-c-button')),
        label: host?.textContent?.trim(),
      };
    });

    expect(result.staticEl).toBe('al-button');
    expect(result.rendersRealButton).toBe(true);
    expect(result.label).toBe('Hello');
    expect(errors, 'console errors / failed requests on the SSR page').toEqual([]);
  });
});
