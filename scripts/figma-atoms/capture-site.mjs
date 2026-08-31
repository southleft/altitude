#!/usr/bin/env node
/**
 * capture-site.mjs — system-owned ground-truth capture from a RUNNING app
 * (spec 2026-08-28-visual-bookends-for-generation; the site-side START
 * bookend the hero benchmark demanded — the harness measures a component in
 * isolation with fixture content, but the acceptance reference is the real
 * page: real slot content, real width, real theme).
 *
 * Usage:
 *   node scripts/figma-atoms/capture-site.mjs --url http://localhost:4188/ \
 *     --selector sl-hero --out .altitude/figma-sync/southleft/shots/site/hero.png \
 *     [--viewport 1440x900] [--wait-ms 1500]
 *
 * Screenshots the FIRST element matching --selector (element handle, so it
 * scrolls into view and captures full element bounds), after network idle,
 * fonts, and custom-element upgrade. Also writes a sidecar
 * `<out>.meta.json` with the element's bounding box and the capture inputs,
 * so a verify pass can diff generated Figma node bounds against the same
 * numbers the image shows. PNGs are observations: keep them under the
 * gitignored figma-sync tree, never in contracts.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
};
const url = arg('url', null);
const selector = arg('selector', null);
const out = arg('out', null);
if (!url || !selector || !out) {
  console.error('usage: capture-site.mjs --url <url> --selector <css> --out <png> [--viewport WxH] [--wait-ms N]');
  process.exit(1);
}
const [vw, vh] = (arg('viewport', '1440x900')).split('x').map(Number);
const settleMs = Number(arg('wait-ms', '1500'));

async function loadChromium() {
  for (const pkg of ['playwright', 'playwright-core', '@playwright/test']) {
    try { return (await import(pkg)).chromium; } catch { /* try next */ }
  }
  throw new Error('no playwright package resolvable');
}

const chromium = await loadChromium();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: vw, height: vh } });
  // Same wall-clock pin as measure-components.mjs: date-dependent renders
  // (al-calendar's al-is-today) must land identically on every capture.
  await page.clock.setFixedTime(new Date('2026-06-15T12:00:00Z'));
  // 'load', NOT 'networkidle': a dev server's HMR websocket and any
  // animated canvas keep the network permanently busy — networkidle never
  // fires and the capture times out. The selector/definition/fonts waits
  // below are the real readiness signal.
  await page.goto(url, { waitUntil: 'load' });
  // Custom-element upgrade: wait until the target selector exists AND, when
  // it is a custom element, its definition has registered.
  await page.waitForSelector(selector, { state: 'attached', timeout: 30000 });
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const tag = el && el.tagName ? el.tagName.toLowerCase() : '';
    return tag.includes('-') ? customElements.whenDefined(tag) : Promise.resolve();
  }, selector);
  await page.evaluate(() => document.fonts.ready);
  // Settle animations/murmur canvases; deterministic-enough for an
  // observation (the pinned clock stops date drift, not rAF drift).
  await page.waitForTimeout(settleMs);
  const handle = await page.$(selector);
  if (!handle) throw new Error(`selector matched nothing after wait: ${selector}`);
  const box = await handle.boundingBox();
  const outPath = resolve(out);
  mkdirSync(dirname(outPath), { recursive: true });
  await handle.screenshot({ path: outPath, timeout: 15000 });
  const meta = {
    url, selector,
    viewport: { width: vw, height: vh },
    box: box ? { x: Math.round(box.x * 100) / 100, y: Math.round(box.y * 100) / 100, w: Math.round(box.width * 100) / 100, h: Math.round(box.height * 100) / 100 } : null,
  };
  writeFileSync(`${outPath}.meta.json`, JSON.stringify(meta, null, 2) + '\n');
  console.log(`[capture-site] ${selector} @ ${url} -> ${outPath} (${meta.box ? meta.box.w + 'x' + meta.box.h : 'no box'})`);
} finally {
  await browser.close();
}
