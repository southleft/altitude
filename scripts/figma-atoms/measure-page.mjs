#!/usr/bin/env node
/**
 * measure-page.mjs — measure REAL PAGE SECTIONS from the running site.
 *
 * WHY this exists. `measure-components.mjs` renders plan.mjs entries in a synthetic
 * harness: one component, invented props, invented copy, light mode. That is fine for a
 * component library and it is the WRONG input for "make Figma look like the site" — it
 * produced a Figma "Hero" from `al-hero`, a component the Southleft home page does not
 * use (index.astro:125 names it only to explain why it is NOT used), with copy nobody
 * wrote, on a white background the site never shows.
 *
 * This drives a headless browser over the actual routes and measures the sections a
 * visitor sees, with the real DOM, the real copy, and the site's own theme.
 *
 *   node scripts/figma-atoms/measure-page.mjs --project southleft \
 *     --base http://localhost:4188/southleft [--route /] [--mode dark]
 *
 * Writes <syncDir>/page-<mode>.json: { route: [ {id, box, root} ] } where `root` is the
 * same token-provenance tree build-component-ops already understands.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scope, projectArg } from './project-scope.mjs';

const SC = scope(projectArg());
const arg = (f, d = null) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg('--base', 'http://localhost:4188/southleft').replace(/\/$/, '');
const MODE = arg('--mode', 'dark');
// Comma-separated so a whole set of docs component pages is one run.
// Git Bash (MSYS) rewrites a leading "/" in an argument into a Windows path, so
// "/components/hero" arrived as "C:/Program Files/Git/components/hero". Accept routes
// with or without the leading slash and add it back here.
const ROUTES = (arg('--route') ? arg('--route').split(',') : ['/']).map((r) => {
  const t = r.trim();
  if (t === '/' || t === '') return '';
  return t.startsWith('/') ? t : '/' + t;
});
const WIDTH = Number(arg('--width', '1440'));

// Sections worth capturing. `[data-section-id]` is the site's own marker; the rest are
// the named page-section classes it uses where that attribute is absent.
const SELECTOR = arg('--selector', '[data-section-id]');

mkdirSync(SC.dirs.sync, { recursive: true });

async function loadChromium() {
  for (const pkg of ['playwright', 'playwright-core', '@playwright/test']) {
    try { return (await import(pkg)).chromium; } catch { /* next */ }
  }
  throw new Error('no playwright package resolvable');
}

const MEASURE_LIB = readFileSync(join(process.cwd(), 'scripts/figma-atoms/measure-lib.js'), 'utf8');

const chromium = await loadChromium();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: 2400 }, deviceScaleFactor: 2 });

const out = {};
for (const route of ROUTES) {
  const url = BASE + route;
  await page.goto(url, { waitUntil: 'networkidle' });

  // The site's theme host owns brand/mode/contrast. Force the mode we asked for rather
  // than trusting whatever a previous visit persisted to localStorage.
  // The example site has ONE theme host (#sl-theme). The docs site mounts one per
  // preview (15 on a component page), so setting only the id misses every specimen.
  await page.evaluate((m) => {
    for (const host of document.querySelectorAll('al-theme, #sl-theme')) host.setAttribute('mode', m);
  }, MODE);

  // Docs previews mount CLIENT-SIDE — the markup ships a "Loading preview" placeholder
  // and fills [data-pg-mount] afterwards. Measuring before that captures the spinner.
  try {
    await page.waitForFunction(() => {
      const m = document.querySelectorAll('[data-pg-mount]');
      return m.length === 0 || [...m].some((n) => n.children.length > 0);
    }, null, { timeout: 15000 });
  } catch { console.warn('[page] preview mount wait timed out'); }

  // Wait for the TARGET to have a real box rather than for one hardcoded tag. The docs
  // site does not eagerly define al-heading, so waiting on it threw there.
  try {
    await page.waitForFunction((sel) => {
      const els = [...document.querySelectorAll(sel)];
      return els.length > 0 && els.some((e) => e.getBoundingClientRect().height > 4);
    }, SELECTOR, { timeout: 30000 });
  } catch { console.warn(`[page] no laid-out "${SELECTOR}" on ${url}`); }
  await page.evaluate(async () => {
    for (const el of document.querySelectorAll('*')) {
      if (el.updateComplete) { try { await el.updateComplete; } catch (e) { /* keep going */ } }
    }
  });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.evaluate(() => (document.fonts && document.fonts.ready) || null);

  await page.addScriptTag({ content: MEASURE_LIB });
  const sections = await page.evaluate((sel) => window.__section(sel), SELECTOR);

  // Rasterise every replaced element the walker tagged. Screenshotting the LIVE element
  // captures it exactly as painted — CSS filters, SVG without intrinsic size, and
  // cross-origin sources all included — which drawImage into a canvas does not.
  const forest = { kids: sections.map((s) => s.root) };
  const collect = (n, acc) => {
    if (!n) return acc;
    if (n.rasterId) acc.push(n.rasterId);
    for (const k of (n.kids || [])) collect(k, acc);
    return acc;
  };
  const ids = collect(forest, []);
  const rasters = {};
  for (const id of ids) {
    try {
      const h = await page.$(`[data-fig-raster="${id}"]`);
      if (!h) continue;
      const buf = await h.screenshot({ omitBackground: true });
      rasters[id] = 'data:image/png;base64,' + buf.toString('base64');
    } catch { /* off-screen or zero-size */ }
  }
  const attach = (n) => {
    if (!n) return;
    if (n.rasterId && rasters[n.rasterId]) n.canvasPng = rasters[n.rasterId];
    for (const k of (n.kids || [])) attach(k);
  };
  attach(forest);
  if (ids.length) console.log(`[page]   rasterised ${Object.keys(rasters).length}/${ids.length} replaced elements`);
  out[route || '/'] = sections;
  console.log(`[page] ${url} (${MODE}) -> ${sections.length} sections: ${sections.map((s) => s.id).join(', ')}`);
}

// --out keeps distinct sources apart. The example site and the docs previews are both
// "pages" but different subjects; writing both to page-<mode>.json made the second run
// silently clobber the first.
const OUT_NAME = arg('--out', 'page');
const dest = join(SC.dirs.sync, `${OUT_NAME}-${MODE}.json`);
writeFileSync(dest, JSON.stringify(out) + '\n');
console.log(`[page] wrote ${dest}`);
await browser.close();
