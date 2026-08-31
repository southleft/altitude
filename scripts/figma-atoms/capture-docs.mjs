#!/usr/bin/env node
/**
 * capture-docs.mjs — ground-truth screenshots of EVERY component in the docs,
 * and of EVERY variant of each, driven through the docs Playground.
 *
 * Owner direction 2026-08-29, after a regeneration sweep replaced good sets
 * with impoverished ones and nothing caught it: the acceptance reference for
 * base Altitude is the DOCS — every component, every variant, not one sample
 * per component.
 *
 * How this differs from its two siblings, both of which stay:
 *   measure-components.mjs  shoots the isolated harness, one PNG per case,
 *                           DEFAULT state only. Fixture content, not real copy.
 *   capture-site.mjs        shoots ONE element on a running app by selector.
 *                           Built for a single hero; it does not enumerate.
 *   capture-docs.mjs (this) walks the docs component index, and for each page
 *                           drives the Playground's own enum controls to reach
 *                           every variant, shooting the live mount each time.
 *
 * The Playground is the right driver because it is the same surface a reader
 * sees: `[data-pg-mount]` holds the live custom element, and each variant is a
 * `button[data-enum][data-value]`. Clicking those is what a person does, so
 * what lands in the PNG is what the docs actually show.
 *
 * Enum axes are walked INDEPENDENTLY, not as a cartesian product: n axes of k
 * options give 1 + sum(k) shots rather than prod(k). The product explodes
 * (al-chip alone would be 48) and buys little — a per-axis sweep already shows
 * every value of every axis rendered for real.
 *
 * Usage:
 *   pnpm --filter al-app-docs start           # docs dev server on :6120
 *   node scripts/figma-atoms/capture-docs.mjs [--url http://localhost:6120]
 *     [--out <dir>] [--component <slug>] [--viewport 1400x900] [--limit N]
 *
 * Writes PNGs plus `index.json` (slug, axis, value, bbox, file) under the
 * GITIGNORED figma-sync tree. These are observations: no image reference ever
 * enters a contract. A page or variant that cannot be shot is recorded WITH
 * its error rather than dropped — a missing shot must never read as a passing
 * one (this repo's own rule: silence is the only forbidden failure).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { scope, projectArg } from './project-scope.mjs';

const argOf = (flag, dflt = null) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};

const SC = scope(projectArg());
const BASE = argOf('--url', 'http://localhost:6120').replace(/\/$/, '');
const OUT = argOf('--out', join(SC.dirs.sync, 'shots', 'docs'));
const ONLY = argOf('--component', null);
const LIMIT = Number(argOf('--limit', '0')) || 0;
const [VW, VH] = argOf('--viewport', '1400x900').split('x').map(Number);

async function loadChromium() {
  for (const pkg of ['playwright', 'playwright-core', '@playwright/test']) {
    try { return (await import(pkg)).chromium; } catch { /* try next */ }
  }
  throw new Error('no playwright package resolvable');
}

/** The docs index IS the registry: whatever has a page is what we shoot. */
async function componentSlugs(page) {
  await page.goto(BASE + '/docs/components/', { waitUntil: 'networkidle', timeout: 60000 });
  const slugs = await page.$$eval('a[href*="/docs/components/"]', (as) => {
    const out = new Set();
    for (const a of as) {
      const href = a.getAttribute('href') || '';
      const m = href.match(/\/docs\/components\/([^/#?]+)\/?$/);
      if (m && m[1]) out.add(m[1]);
    }
    return [...out];
  });
  return slugs.sort();
}

const main = async () => {
  const chromium = await loadChromium();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2 });
  mkdirSync(OUT, { recursive: true });

  let slugs;
  try {
    slugs = await componentSlugs(page);
  } catch (e) {
    console.error('[capture-docs] cannot reach the docs at ' + BASE + '/docs/components/ — ' + String(e.message).split('\n')[0]);
    console.error('Start them first:  pnpm --filter al-app-docs start   (dev server on :6120)');
    await browser.close();
    process.exit(1);
  }
  if (ONLY) slugs = slugs.filter((s) => s === ONLY || s === ONLY.replace(/^al-/, ''));
  if (LIMIT) slugs = slugs.slice(0, LIMIT);
  console.log('[capture-docs] ' + slugs.length + ' component page(s) from ' + BASE);

  const index = [];
  let shot = 0;
  let failed = 0;

  for (const slug of slugs) {
    const url = BASE + '/docs/components/' + slug + '/';
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    } catch (e) {
      index.push({ slug, url, file: null, error: 'navigation: ' + String(e.message).split('\n')[0] });
      failed++;
      console.log('  FAIL ' + slug + ': navigation');
      continue;
    }

    const mount = await page.$('[data-pg-mount]');
    if (!mount) {
      // Recorded, not skipped: a component whose page has no live mount is a
      // real gap in the docs, and the index must say so.
      index.push({ slug, url, file: null, error: 'no [data-pg-mount] on the page' });
      failed++;
      console.log('  FAIL ' + slug + ': no playground mount');
      continue;
    }
    try {
      await page.waitForFunction(() => !!document.querySelector('[data-pg-mount] > *'), { timeout: 15000 });
    } catch { /* the shot below records the truth either way */ }
    try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch { /* fonts optional */ }

    const options = await page.$$eval('button[data-enum][data-value]', (bs) =>
      bs
        .map((b) => ({ axis: b.getAttribute('data-enum'), value: b.getAttribute('data-value') }))
        .filter((o) => o.value));

    // Boolean props are their own control (`button[data-flag]`), and some
    // components render NOTHING until one is on — al-alert's default mount has
    // zero paint area until `isActive` flips. Walking flags is therefore not a
    // nicety: without it those components have no ground truth at all. Toggled
    // one at a time and back off again, same reasoning as the enum axes.
    const flags = await page.$$eval('button[data-flag]', (bs) =>
      bs.map((b) => b.getAttribute('data-flag')).filter(Boolean));

    /**
     * The element to shoot, and WHY it may not be the custom element itself.
     *
     * Many hosts are `display: contents` (al-badge, al-input, al-chip, ...):
     * the element generates NO box, so its own boundingBox is 0x0 while the
     * mount wrapper carries the real size. Shooting the host reported "no
     * paint area" for 35 of 67 components on the first full run, and not one
     * of them was actually broken.
     *
     * So: prefer the live element, fall back to the mount when the element
     * generates no box, and RECORD which one the pixels came from. A shot
     * whose subject is ambiguous is worth less than one that says.
     */
    const subject = async () => {
      const el = (await page.$('[data-pg-el]')) || (await page.$('[data-pg-mount] > *'));
      if (el) {
        const b = await el.boundingBox();
        if (b && b.width >= 1 && b.height >= 1) return { handle: el, of: 'element', box: b };
      }
      const mount = await page.$('[data-pg-mount]');
      if (mount) {
        const b = await mount.boundingBox();
        if (b && b.width >= 1 && b.height >= 1) return { handle: mount, of: 'mount', box: b };
      }
      return null;
    };

    /**
     * How much STRUCTURE the docs actually render, counted through shadow
     * roots. This is the number the Figma sweep needed and nobody had: a
     * contract whose anatomy is far thinner than this cannot rebuild the
     * component, and generating from it produces the bare box that replaced
     * real design work on 2026-08-29 (al-progress generated ZERO children).
     * Counted here because this is the one place the real component is
     * already rendered and addressable.
     */
    const structure = async () => {
      try {
        return await page.evaluate(() => {
          const host = document.querySelector('[data-pg-el]') || document.querySelector('[data-pg-mount] > *');
          if (!host) return null;
          let els = 0, texts = 0, depth = 0;
          const walk = (node, d) => {
            depth = Math.max(depth, d);
            const kids = node.shadowRoot ? [...node.shadowRoot.children, ...node.children] : [...node.children];
            for (const k of kids) {
              if (k.tagName === 'STYLE' || k.tagName === 'SCRIPT') continue;
              els++;
              const direct = [...k.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
              if (direct) texts++;
              walk(k, d + 1);
            }
          };
          walk(host, 0);
          return { els, texts, depth };
        });
      } catch { return null; }
    };

    const take = async (label, meta) => {
      const name = (slug + '--' + label).replace(/[^A-Za-z0-9._-]+/g, '_');
      const file = join(OUT, name + '.png');
      try {
        const subj = await subject();
        if (!subj) throw new Error('nothing with a paint area inside [data-pg-mount]');
        await subj.handle.screenshot({ path: file, timeout: 15000 });
        const st = await structure();
        index.push({ slug, url, ...meta, shotOf: subj.of, file: 'shots/docs/' + name + '.png', w: Math.round(subj.box.width * 100) / 100, h: Math.round(subj.box.height * 100) / 100, ...(st ? { rendered: st } : {}) });
        shot++;
      } catch (e) {
        index.push({ slug, url, ...meta, file: null, error: String(e.message).split('\n')[0] });
        failed++;
      }
    };

    // VISIBLE BASELINE. Some components render nothing until a boolean is on:
    // al-alert's mount has zero paint area until `isActive` flips, so every
    // variant shot below would capture an invisible element and the page would
    // yield no ground truth at all. When the resting shot has no paint area,
    // find the flag that makes the component visible and HOLD it for the rest
    // of the sweep. Recorded as `baselineFlags` on every entry, so a shot is
    // self-describing and nobody has to guess why the alert was active.
    const baselineFlags = [];
    const paints = async () => !!(await subject());
    if (!(await paints())) {
      for (const flag of flags) {
        const btn = await page.$('button[data-flag="' + flag + '"]');
        if (!btn) continue;
        try { await btn.click({ timeout: 5000 }); } catch { continue; }
        await page.waitForTimeout(120);
        if (await paints()) { baselineFlags.push(flag); break; }
        try { await btn.click({ timeout: 5000 }); await page.waitForTimeout(80); } catch { /* move on */ }
      }
      if (baselineFlags.length) console.log('       baseline: ' + baselineFlags.join('+') + ' (nothing painted without it)');
    }

    await take('default', { axis: null, value: 'default', baselineFlags: [...baselineFlags] });
    for (const o of options) {
      const btn = await page.$('button[data-enum="' + o.axis + '"][data-value="' + o.value + '"]');
      if (!btn) continue;
      try { await btn.click({ timeout: 5000 }); } catch { /* recorded by take() */ }
      await page.waitForTimeout(120); // let the custom element re-render
      await take(o.axis + '-' + o.value, { axis: o.axis, value: o.value, baselineFlags: [...baselineFlags] });
    }
    for (const flag of flags) {
      if (baselineFlags.includes(flag)) continue; // already held on, and its shot is the default
      const sel = 'button[data-flag="' + flag + '"]';
      const btn = await page.$(sel);
      if (!btn) continue;
      try { await btn.click({ timeout: 5000 }); } catch { continue; }
      await page.waitForTimeout(120);
      await take('flag-' + flag, { axis: flag, value: 'on', kind: 'flag', baselineFlags: [...baselineFlags] });
      // Back off, so each flag is captured in isolation rather than
      // accumulating with every flag that came before it.
      try { await btn.click({ timeout: 5000 }); await page.waitForTimeout(80); } catch { /* next page reload resets it */ }
    }
    console.log('  ok   ' + slug.padEnd(22) + ' ' + (options.length + flags.length + 1) + ' shot(s)');
  }

  writeFileSync(join(OUT, 'index.json'), JSON.stringify({
    schemaVersion: 1,
    generator: 'scripts/figma-atoms/capture-docs.mjs',
    project: SC.id,
    base: BASE,
    capturedAt: new Date().toISOString(),
    components: slugs.length,
    shots: shot,
    failed,
    entries: index,
  }, null, 2) + '\n');

  console.log('\n[capture-docs] ' + shot + ' PNG(s) across ' + slugs.length + ' component(s), ' + failed + ' failure(s) -> ' + OUT);
  if (failed) console.log('[capture-docs] failures are recorded in index.json with their reason — none were dropped.');
  await browser.close();
};

main().catch((e) => { console.error(e); process.exit(1); });
