#!/usr/bin/env node
/**
 * Docs visual-compare — the repeatable verification the docs↔site parity work
 * asked for (spec 2026-08-28-southleft-docs-parity-with-example-site, R9).
 *
 * Before this script, NOTHING in the repo screenshotted a docs page: the VRT
 * suite renders apps/web-components + apps/mfe + apps/ssr + the story
 * fixture, `brands:compare` renders a fixed component harness, and
 * `check-scoped-theming` asserts computed tokens — none of them can see the
 * page a reader actually visits at /docs/<project>/, which is how the
 * Southleft docs shipped IBM Plex headings and a monogram logo for a brand
 * whose site is Agrandir with a wordmark.
 *
 * It renders every project's built docs (dist/docs — run
 * `pnpm --filter al-app-docs build` first), and per project:
 *
 *   1. asserts ZERO page errors;
 *   2. asserts the brand host carries the project's registry theming defaults
 *      (`docs.theme.defaultMode` boots the page in that mode,
 *      `docs.theme.contrast` lands on the host attribute);
 *   3. asserts the display heading's computed font-family matches the family
 *      the brand's own `--al-typography-preset-48-bold` names — the trap this
 *      guards is real: the `--al-theme-typography-*` aliases resolve at
 *      `:root` against the BASE presets, so a binding through them renders
 *      the default brand's face under every brand (docs.css, type-ramp block);
 *   4. asserts `<al-layout>` upgraded and the overview hero resolved to a
 *      multi-track grid (the docs pages arrange sections with the layout
 *      primitive — an unregistered element here means every section silently
 *      block-stacks);
 *   5. writes `.altitude/visual-compare/docs-<project>.png` (full-page
 *      overview) and `docs-<project>-detail.png` (a component detail page)
 *      for eyeball comparison against the design system's own site.
 *
 * Projects, routes and brands all come from `.altitude/ds-projects.json` —
 * nothing here names a brand, so a third design system is covered with no
 * edit (same rule `check-third-project.mjs` enforces on the docs app).
 *
 *   node scripts/build-docs-compare.mjs
 *   node scripts/build-docs-compare.mjs --no-screenshot
 */

import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCREENSHOT = !process.argv.includes('--no-screenshot');
const PORT = 5199;

// vite is a workspace dep, not a root one (same resolution dance as
// check-scoped-theming.mjs).
const require_ = createRequire(path.join(REPO, 'libs', 'al-web-components', 'package.json'));
const viteEntry = path.join(path.dirname(require_.resolve('vite/package.json')), 'dist', 'node', 'index.js');
const { createServer } = await import(pathToFileURL(viteEntry).href);

const DIST = path.join(REPO, 'dist', 'docs');
if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('[docs-compare] dist/docs/index.html missing — run `pnpm --filter al-app-docs build` first.');
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(path.join(REPO, '.altitude', 'ds-projects.json'), 'utf8'));
const projects = Object.values(registry.projects).map((entry) => ({
  id: entry.id,
  brand: entry.brand,
  route: entry.id === registry.default ? '' : `/${entry.id}`,
  defaultMode: entry.docs?.theme?.defaultMode ?? 'light',
  contrast: entry.docs?.theme?.contrast ?? null,
  /** A detail page that exists for every project: al-button is in every scope. */
  detail: 'components/button',
  /** The brand layer's flagship page, when the project declares a layer. */
  layerDetail: entry.brandLibrary ? 'components/footer' : null,
}));

const failures = [];
const check = (ok, message) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${message}`);
  if (!ok) failures.push(message);
};

const server = await createServer({
  root: path.join(REPO, 'dist'),
  configFile: false,
  logLevel: 'warn',
  server: { port: PORT, strictPort: true },
});
await server.listen();

const browser = await chromium.launch();
const outDir = path.join(REPO, '.altitude', 'visual-compare');
fs.mkdirSync(outDir, { recursive: true });

try {
  for (const project of projects) {
    console.log(`\n[docs-compare] ${project.id} (${project.route || '/'})`);
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await page.goto(`http://localhost:${PORT}/docs${project.route}/`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-booting'));

    const facts = await page.evaluate(() => {
      const host = document.querySelector('al-theme[data-brand-host]');
      const h1 = document.querySelector('.t-display-lg');
      const hero = document.querySelector('.hero__grid');
      const heroGrid = hero?.shadowRoot?.querySelector('.al-c-layout');
      return {
        theme: document.documentElement.dataset.theme ?? 'light',
        hostMode: host?.getAttribute('mode') ?? null,
        hostContrast: host?.getAttribute('contrast') ?? null,
        h1Family: h1 ? getComputedStyle(h1).fontFamily : null,
        presetFamily: host
          ? getComputedStyle(host).getPropertyValue('--al-typography-preset-48-bold').split('/').pop()?.trim() ?? ''
          : '',
        layoutDefined: Boolean(customElements.get('al-layout')),
        heroTracks: heroGrid ? getComputedStyle(heroGrid).gridTemplateColumns.split(' ').length : 0,
      };
    });

    check(pageErrors.length === 0, `no page errors (${pageErrors.length === 0 ? 'clean' : pageErrors[0]})`);
    check(
      facts.theme === project.defaultMode,
      `boots in the registry's default mode (${project.defaultMode} — got ${facts.theme})`,
    );
    check(
      facts.hostContrast === project.contrast,
      `host contrast matches the registry (${project.contrast ?? 'unset'} — got ${facts.hostContrast ?? 'unset'})`,
    );
    const presetLead = facts.presetFamily.split(',')[0]?.trim().replace(/^[\d.rem\s]+/, '');
    check(
      Boolean(facts.h1Family) && presetLead !== '' && facts.h1Family.replace(/"/g, '').startsWith(presetLead),
      `display heading renders the brand's own face (${presetLead || '?'} — got ${facts.h1Family})`,
    );
    check(facts.layoutDefined, 'al-layout upgraded');
    check(facts.heroTracks >= 2, `overview hero resolved to a multi-track grid (${facts.heroTracks} tracks)`);

    if (SCREENSHOT) {
      const shot = path.join(outDir, `docs-${project.id}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      console.log(`  shot  ${path.relative(REPO, shot)}`);
    }

    const detail = project.layerDetail ?? project.detail;
    await page.goto(`http://localhost:${PORT}/docs${project.route}/${detail}/`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-booting'));
    check(pageErrors.length === 0, `detail page ${detail} has no page errors`);
    if (SCREENSHOT) {
      const shot = path.join(outDir, `docs-${project.id}-detail.png`);
      await page.screenshot({ path: shot, fullPage: true });
      console.log(`  shot  ${path.relative(REPO, shot)}`);
    }

    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}

if (failures.length) {
  console.error(`\n[docs-compare] ${failures.length} check(s) FAILED.`);
  process.exit(1);
}
console.log('\n[docs-compare] all checks passed.');
