#!/usr/bin/env node
/**
 * R10 — the per-brand-column distinctiveness artifact, and R7 — the rendered
 * typography check.
 *
 * Serves `.altitude/visual-compare/harness/` with Vite, renders the same fixed
 * component set once per brand (each column linking exactly one
 * `styles/dist/css/brand/tokens-<brand>-dark.css`, all at the same
 * mode/density/contrast), screenshots the grid to
 * `.altitude/visual-compare/brands.dark.png`, and reads the computed `font`
 * shorthand off rendered elements inside each column's shadow roots.
 *
 * Requires `pnpm --filter @southleft/al-web-components build:tokens` (for the bundles)
 * and a built `libs/al-web-components/dist/` (for the components).
 *
 *   node scripts/build-brand-compare.mjs
 *   node scripts/build-brand-compare.mjs --no-screenshot   # computed styles only
 */

import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// vite is a workspace dep, not a root one — resolve it from the workspace that
// owns it rather than adding a root dependency for a one-off harness.
const require_ = createRequire(path.join(REPO, 'libs', 'al-web-components', 'package.json'));
const viteEntry = path.join(path.dirname(require_.resolve('vite/package.json')), 'dist', 'node', 'index.js');
const { createServer } = await import(pathToFileURL(viteEntry).href);
const HARNESS = '/.altitude/visual-compare/harness/';
const OUT = path.join(REPO, '.altitude', 'visual-compare', 'brands.dark.png');
const BRANDS = ['altitude', 'southleft'];
const PORT = 5199;

const bundleDir = path.join(REPO, 'libs', 'al-web-components', 'styles', 'dist', 'css', 'brand');
const distDir = path.join(REPO, 'libs', 'al-web-components', 'dist', 'components');
for (const [dir, hint] of [
  [bundleDir, 'pnpm --filter @southleft/al-web-components build:tokens'],
  [distDir, 'pnpm --filter @southleft/al-web-components build'],
]) {
  if (!fs.existsSync(dir)) {
    console.error(`[brand-compare] ${path.relative(REPO, dir)} missing — run \`${hint}\` first.`);
    process.exit(1);
  }
}

const server = await createServer({
  root: REPO,
  configFile: false,
  logLevel: 'warn',
  server: { port: PORT, strictPort: true },
});
await server.listen();

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 960 }, deviceScaleFactor: 2 });
page.on('console', (m) => m.type() === 'error' && console.error('  [page]', m.text()));
page.on('pageerror', (e) => console.error('  [page]', e.message));

await page.goto(`http://localhost:${PORT}${HARNESS}index.html`, { waitUntil: 'load' });
for (const frame of page.frames()) {
  if (frame === page.mainFrame()) continue;
  await frame.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 30_000 });
}

// ---------- R7: computed `font` on rendered elements, per brand ----------

const PROBES = [
  ['al-button label', 'al-button', '.al-c-button'],
  ['al-heading', 'al-heading', '.al-c-heading'],
  ['al-input field', 'al-input', '.al-c-input__input'],
];

const rows = [];
for (const brand of BRANDS) {
  const frame = page.frames().find((f) => f.url().includes(`${brand}.html`));
  for (const [label, host, inner] of PROBES) {
    const font = await frame.evaluate(
      ([h, i]) => {
        const el = document.querySelector(h)?.shadowRoot?.querySelector(i);
        return el ? getComputedStyle(el).font || `${getComputedStyle(el).fontWeight} ${getComputedStyle(el).fontSize}/${getComputedStyle(el).lineHeight} ${getComputedStyle(el).fontFamily}` : '(not found)';
      },
      [host, inner]
    );
    rows.push({ brand, element: label, font });
  }
}

console.log('\nComputed `font` on rendered elements (R7):\n');
const w = Math.max(...rows.map((r) => r.element.length));
for (const brand of BRANDS) {
  console.log(`  ${brand}`);
  for (const r of rows.filter((r) => r.brand === brand)) {
    console.log(`    ${r.element.padEnd(w)}  ${r.font}`);
  }
}

const distinct = new Set(rows.filter((r) => r.element === 'al-button label').map((r) => r.font));
if (distinct.size < BRANDS.length) {
  console.error(`\n[brand-compare] FAIL — al-button label resolves to only ${distinct.size} distinct fonts across ${BRANDS.length} brands (R7).`);
  await browser.close();
  await server.close();
  process.exit(1);
}
if (rows.some((r) => r.font === '(not found)')) {
  console.error('\n[brand-compare] FAIL — a probe element was not found; the harness markup drifted.');
  await browser.close();
  await server.close();
  process.exit(1);
}

// ---------- R10: the artifact ----------

if (!process.argv.includes('--no-screenshot')) {
  await page.screenshot({ path: OUT, fullPage: true });
  console.log(`\n[brand-compare] wrote ${path.relative(REPO, OUT)}`);
}

await browser.close();
await server.close();
console.log(`[brand-compare] PASS — ${distinct.size}/${BRANDS.length} brands render a distinct \`font\` on the same element.`);
