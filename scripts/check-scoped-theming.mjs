#!/usr/bin/env node
/**
 * R3 / R5 / R9 — the regression guard for scoped `<al-theme>` theming.
 *
 * `scripts/check-brand-distinctiveness.js` proves the BUNDLES differ and
 * `scripts/build-brand-compare.mjs` proves one bundle applied per iframe
 * reaches a component. Neither can see whether `<al-theme brand>` does
 * anything, which is exactly how the attribute stayed inert for a whole
 * release while three documents advertised it.
 *
 * This script renders `.altitude/visual-compare/harness/scoped.html` — four
 * brands, one document, one `:root` — and asserts:
 *
 *   1. four distinct computed `--al-theme-color-background-primary-default`
 *      values across four sibling hosts;
 *   2. four distinct computed `font` shorthands on a rendered element INSIDE
 *      each column's shadow root (a custom-property diff proves the token
 *      moved; only a computed style proves it reached the component);
 *   3. the tier-1 properties brands override (`--al-typography-preset-16`,
 *      `--al-box-shadow`, `--al-theme-border-radius`) are carried by the scoped
 *      output — a `--al-theme-*`-only emission would silently drop every
 *      brand's typography;
 *   4. nesting resolves to the INNER host;
 *   5. `mode` moves the whole 23-property surface, not two hardcoded hexes;
 *   6. `motion='reduced'` computes a 0s transition on a real component.
 *
 * Requires `pnpm --filter al-web-components build` (dist components + css).
 *
 *   node scripts/check-scoped-theming.mjs
 *   node scripts/check-scoped-theming.mjs --no-screenshot
 */

import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// vite is a workspace dep, not a root one (same resolution dance as
// build-brand-compare.mjs).
const require_ = createRequire(path.join(REPO, 'libs', 'al-web-components', 'package.json'));
const viteEntry = path.join(path.dirname(require_.resolve('vite/package.json')), 'dist', 'node', 'index.js');
const { createServer } = await import(pathToFileURL(viteEntry).href);

const PAGE = '/.altitude/visual-compare/harness/scoped.html';
const OUT = path.join(REPO, '.altitude', 'visual-compare', 'brands.scoped.png');
const BRANDS = ['altitude', 'northright', 'odyssey', 'southleft'];
const PORT = 5198;

const distDir = path.join(REPO, 'libs', 'al-web-components', 'dist', 'components');
const cssFile = path.join(REPO, 'libs', 'al-web-components', 'dist', 'css', 'main.css');
for (const p of [distDir, cssFile]) {
  if (!fs.existsSync(p)) {
    console.error(
      `[scoped-theming] ${path.relative(REPO, p)} missing — run \`pnpm --filter al-web-components build\` first.`
    );
    process.exit(1);
  }
}

const failures = [];
const check = (ok, message) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${message}`);
  if (!ok) failures.push(message);
};

const server = await createServer({
  root: REPO,
  configFile: false,
  logLevel: 'warn',
  server: { port: PORT, strictPort: true },
});
await server.listen();

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1400 }, deviceScaleFactor: 2 });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('console', (m) => m.type() === 'error' && pageErrors.push(m.text()));

await page.goto(`http://localhost:${PORT}${PAGE}`, { waitUntil: 'load' });
await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 30_000 });

// `[data-probe]` and not a tag selector, so the versioned-registry column
// (`<al-theme-9-9-9>`) is reachable by exactly the same helpers.
/** Computed custom property on the `<al-theme>` element itself. */
const prop = (probe, name) =>
  page.evaluate(
    ([p, n]) => getComputedStyle(document.querySelector(`[data-probe="${p}"]`)).getPropertyValue(n).trim(),
    [probe, name]
  );

/** Computed style of an element rendered INSIDE a column's shadow root. */
const inner = (probe, host, sel, css) =>
  page.evaluate(
    ([p, h, s, c]) => {
      const scope = document.querySelector(`[data-probe="${p}"]`);
      const el = scope?.querySelector(h)?.shadowRoot?.querySelector(s);
      if (!el) return '(not found)';
      const st = getComputedStyle(el);
      return c === 'font'
        ? st.font || `${st.fontWeight} ${st.fontSize}/${st.lineHeight} ${st.fontFamily}`
        : st[c] || st.getPropertyValue(c);
    },
    [probe, host, sel, css]
  );

console.log('\n[scoped-theming] four <al-theme brand> siblings, one document, one :root\n');

// ---------- 1 + 3: custom properties on the hosts ----------

const PROPS = [
  '--al-theme-color-background-primary-default', // tier-2, what brands already varied
  '--al-typography-preset-16',                   // tier-1 — the silent-drop canary
  '--al-theme-border-radius',
  '--al-theme-box-shadow',
];
const table = {};
for (const brand of BRANDS) {
  table[brand] = {};
  for (const p of PROPS) table[brand][p] = await prop(brand, p);
}
for (const p of PROPS) {
  const values = BRANDS.map((b) => table[b][p]);
  const distinct = new Set(values.filter(Boolean));
  console.log(`  ${p}`);
  for (const b of BRANDS) console.log(`      ${b.padEnd(11)} ${table[b][p] || '(empty)'}`);
  check(
    values.every(Boolean) && distinct.size >= 2,
    `${p}: ${distinct.size} distinct value(s) across ${BRANDS.length} hosts (need >= 2, all non-empty)`
  );
}
check(
  new Set(BRANDS.map((b) => table[b]['--al-theme-color-background-primary-default'])).size === BRANDS.length,
  `--al-theme-color-background-primary-default is distinct for all ${BRANDS.length} brands`
);

// ---------- 2: it reaches the component ----------

console.log('\n  computed `font` on al-button\'s label, inside the shadow root');
const fonts = {};
for (const brand of BRANDS) {
  fonts[brand] = await inner(brand, 'al-button', '.al-c-button', 'font');
  console.log(`      ${brand.padEnd(11)} ${fonts[brand]}`);
}
check(!Object.values(fonts).includes('(not found)'), 'every column rendered an al-button label');
check(
  new Set(Object.values(fonts)).size === BRANDS.length,
  `al-button label resolves to ${new Set(Object.values(fonts)).size} distinct fonts across ${BRANDS.length} brands`
);

// ---------- 4: nesting ----------

console.log('\n  nesting — odyssey inside southleft');
const outerFont = await inner('outer', 'al-button', '.al-c-button', 'font');
const innerFont = await inner('inner', 'al-button', '.al-c-button', 'font');
console.log(`      outer (southleft) ${outerFont}`);
console.log(`      inner (odyssey)   ${innerFont}`);
check(outerFont === fonts.southleft, 'outer subtree resolves to southleft');
check(innerFont === fonts.odyssey, 'inner subtree resolves to odyssey, not the outer brand');

// ---------- 4b: the versioned registry (T4.6) ----------
//
// The case that decided Option C over a document-level `al-theme[brand='x']`
// rule: under `registerAltitude({ mode: 'versioned' })` the tag is
// `al-theme-9-9-9`, which no type-selector rule would match. `:host` matches
// whatever the host's tag is.

console.log('\n  versioned registry — <al-theme-9-9-9 brand="odyssey">');
const versionedTag = await page.evaluate(
  () => document.querySelector('[data-probe="versioned"]')?.tagName.toLowerCase() ?? '(missing)'
);
const versionedFont = await inner('versioned', 'al-button', '.al-c-button', 'font');
console.log(`      tag  ${versionedTag}`);
console.log(`      font ${versionedFont}`);
check(versionedTag === 'al-theme-9-9-9', 'the versioned host really is a suffixed tag');
check(versionedFont === fonts.odyssey, 'the scoped brand block applies under a versioned tag too');

// ---------- 5: the mode axis ----------

console.log('\n  mode — northright light vs dark, over a dark :root');
const darkBg = await prop('northright', '--al-theme-color-background-default');
const lightBg = await prop('northright-light', '--al-theme-color-background-default');
const darkBorder = await prop('northright', '--al-theme-color-border-default');
const lightBorder = await prop('northright-light', '--al-theme-color-border-default');
console.log(`      background  dark ${darkBg}   light ${lightBg}`);
console.log(`      border      dark ${darkBorder}   light ${lightBorder}`);
check(darkBg !== lightBg, 'mode moves --al-theme-color-background-default');
check(
  darkBorder !== lightBorder,
  'mode moves --al-theme-color-border-default too (it used to move exactly two properties, both hardcoded)'
);
const paintedLight = await page.evaluate(() =>
  getComputedStyle(document.querySelector('al-theme[data-probe="northright-light"] .surface')).backgroundColor
);
const paintedDark = await page.evaluate(() =>
  getComputedStyle(document.querySelector('al-theme[data-probe="northright"] .surface')).backgroundColor
);
console.log(`      painted     dark ${paintedDark}   light ${paintedLight}`);
check(paintedLight !== paintedDark, 'the painted surface actually differs between the two modes');

// ---------- 6: motion ----------

console.log('\n  motion — reduced vs default');
const normalDuration = await prop('altitude', '--al-theme-animation-duration');
const reducedDuration = await prop('motion-reduced', '--al-theme-animation-duration');
// `al-button`'s root carries `transition: all var(--al-theme-animation-duration) …`
// (`button.scss:24`) — an unconditional transition on the element itself, which
// is what makes it a usable probe. `al-heading` only transitions `::slotted(a)`.
const normalT = await inner('altitude', 'al-button', '.al-c-button', 'transitionDuration');
const reducedT = await inner('motion-reduced', 'al-button', '.al-c-button', 'transitionDuration');
console.log(`      --al-theme-animation-duration   default ${normalDuration || '(empty)'}   reduced ${reducedDuration || '(empty)'}`);
console.log(`      al-button transition-duration   default ${normalT}   reduced ${reducedT}`);
check(normalDuration !== '' && normalDuration !== '0s', 'the default host has a non-zero animation duration');
check(reducedDuration === '0s', "motion='reduced' zeroes --al-theme-animation-duration");
check(
  /^0s(,\s*0s)*$/.test(reducedT) && !/^0s(,\s*0s)*$/.test(normalT),
  `motion='reduced' zeroes a real component's computed transition-duration (${normalT} -> ${reducedT})`
);

// ---------- artifact ----------

if (!process.argv.includes('--no-screenshot')) {
  await page.screenshot({ path: OUT, fullPage: true });
  console.log(`\n[scoped-theming] wrote ${path.relative(REPO, OUT)}`);
}

if (pageErrors.length) {
  console.error(`\n[scoped-theming] ${pageErrors.length} page error(s):`);
  for (const e of pageErrors.slice(0, 5)) console.error(`    ${e}`);
  failures.push('page errors');
}

await browser.close();
await server.close();

if (failures.length) {
  console.error(`\n[scoped-theming] FAIL — ${failures.length} check(s):`);
  for (const f of failures) console.error(`    ${f}`);
  process.exit(1);
}
console.log('\n[scoped-theming] PASS — <al-theme brand> renders four brands distinctly on one page.');
