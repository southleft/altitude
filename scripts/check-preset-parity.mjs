#!/usr/bin/env node
/**
 * R9 — preset parity between the two Storybooks.
 *
 * Spec: 2026-07-28-react-storybook-preset-switcher. The premise of "web
 * components first, React after" is ONE preset model with two front-ends:
 * `libs/al-web-components/.storybook/presets.ts`, imported by both previews.
 * R3 makes that structural (neither preview declares a preset), and this script
 * is the check that it stayed structural — that no local list, override or
 * stale copy crept into either side.
 *
 * Both Storybooks are driven over HTTP with `?globals=alPreset:<id>`, and for
 * each preset the script reads, from the live preview iframe:
 *
 *   1. the toolbar item list the preview derived from `PRESETS` — asserted
 *      IDENTICAL between the two Storybooks (ids AND labels, in order);
 *   2. the four axis ATTRIBUTES on the rendered theme host — asserted identical
 *      between the two, and identical to the tuple in `presets.ts`. Attributes,
 *      not properties: the `:host([brand='…'])` blocks the tokens live in are
 *      attribute selectors, and a React prop does NOT produce an attribute by
 *      itself (see `libs/al-react/src/components/Theme/Theme.tsx`);
 *   3. the computed `--al-theme-color-background-primary-default` on that host
 *      and the computed `font` on `al-button`'s label INSIDE its shadow root —
 *      asserted identical between the two. An attribute diff proves the DOM
 *      agrees; only a computed style proves the tokens actually landed, which
 *      is the failure mode that let `brand` stay inert for a whole release.
 *
 * It also asserts the legacy global `style#al-tokens-sheet` / the retired
 * `style#al-preset-tokens` are absent from both (R6).
 *
 * Both Storybooks must already be running. Defaults match the ports the
 * packages use; override for a worktree that must not collide with a primary
 * checkout's 6006:
 *
 *   pnpm --filter al-web-components start          # 6006
 *   pnpm --filter al-react start                   # 9009
 *   node scripts/check-preset-parity.mjs
 *   node scripts/check-preset-parity.mjs --wc http://localhost:6007 --react http://localhost:9011
 */

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRESETS_TS = path.join(REPO, 'libs', 'al-web-components', '.storybook', 'presets.ts');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const WC = arg('wc', 'http://localhost:6006').replace(/\/$/, '');
const REACT = arg('react', 'http://localhost:9009').replace(/\/$/, '');

// The story rendered under each preset. Both Storybooks carry a plain Button
// default with no args, and `al-button` reads brand colour, brand radius and
// brand typography — so one story exercises all three token families.
const WC_STORY = 'atoms-button--default';
const REACT_STORY = 'atoms-button--default';

const AXES = ['brand', 'mode', 'density', 'contrast'];

// ---------------------------------------------------------------------------
// The expected tuples. Read from `presets.ts` itself so this script cannot
// drift from the module either — it is a third party to the comparison, not a
// fourth hand-maintained list.
//
// A regex rather than an import because the module is TypeScript and this
// script runs on bare node. The shape it parses is a flat object literal per
// line, which is the shape the module documents and the `PresetBundle` union
// enforces; if that ever changes, the "no presets parsed" guard below fails
// loudly rather than silently checking zero presets.
// ---------------------------------------------------------------------------
function readPresets() {
  const src = fs.readFileSync(PRESETS_TS, 'utf8');
  const block = src.match(/export const PRESETS[^=]*=\s*\[([\s\S]*?)\n\];/);
  if (!block) throw new Error(`could not locate the PRESETS array in ${PRESETS_TS}`);
  const presets = [];
  for (const line of block[1].split('\n')) {
    const entry = line.match(/\{([^}]*)\}/);
    if (!entry) continue;
    const preset = {};
    for (const [, k, v] of entry[1].matchAll(/(\w+)\s*:\s*'([^']*)'/g)) preset[k] = v;
    if (preset.id) presets.push(preset);
  }
  return presets;
}

// ---------------------------------------------------------------------------

// Runs in the preview iframe. Tag selectors carry both spellings because
// al-react registers with `suffix: PackageJson.version` (`al-theme-1-0-0`)
// while al-web-components registers plain — which is itself part of what R6 is
// about.
const PROBE = () => {
  const root = document.querySelector('#storybook-root');
  const host = root && root.querySelector('al-theme, al-theme-1-0-0');
  const btn = document.querySelector('al-button, al-button-1-0-0');
  const label = btn && btn.shadowRoot && btn.shadowRoot.querySelector('.al-c-button__text');
  const surface = btn && btn.shadowRoot && btn.shadowRoot.querySelector('.al-c-button');
  return {
    hostTag: host ? host.tagName.toLowerCase() : null,
    hostCount: root ? root.querySelectorAll('al-theme, al-theme-1-0-0').length : 0,
    attrs: host
      ? Object.fromEntries(['brand', 'mode', 'density', 'contrast'].map((a) => [a, host.getAttribute(a)]))
      : null,
    background: host
      ? getComputedStyle(host).getPropertyValue('--al-theme-color-background-primary-default').trim()
      : null,
    radius: host ? getComputedStyle(host).getPropertyValue('--al-theme-border-radius').trim() : null,
    spaceMd: host ? getComputedStyle(host).getPropertyValue('--al-theme-space-md').trim() : null,
    font: label ? getComputedStyle(label).font : null,
    buttonBackground: surface ? getComputedStyle(surface).backgroundColor : null,
    legacyTokensSheet: !!document.querySelector('style#al-tokens-sheet'),
    retiredPresetSheet: !!document.querySelector('style#al-preset-tokens'),
  };
};

// The toolbar items each preview DERIVED from `PRESETS`, read out of the live
// store rather than re-parsed from source — so a preview that hand-wrote its
// own list would show up here.
const TOOLBAR = () => {
  const items =
    window.__STORYBOOK_PREVIEW__?.storyStoreValue?.projectAnnotations?.globalTypes?.alPreset?.toolbar?.items;
  return Array.isArray(items) ? items.map((i) => `${i.value}|${i.title}`) : null;
};

async function probe(page, base, storyId, presetId) {
  const url = `${base}/iframe.html?id=${storyId}&viewMode=story&globals=alPreset:${presetId}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  // `attached`, not the default `visible`: `<al-theme>` is `display: contents`
  // (`theme.scss`), which Playwright reads as not visible.
  await page.waitForSelector('#storybook-root al-theme, #storybook-root al-theme-1-0-0', {
    state: 'attached',
    timeout: 20000,
  });
  return { url, ...(await page.evaluate(PROBE)) };
}

/**
 * CUSTOM-PROPERTY values come back as literal declaration text, so a minified
 * stylesheet and an unminified one disagree on spelling for identical values —
 * a `storybook build` React preview reports `.5rem` where a `storybook dev`
 * web-components preview reports `0.5rem`. Real computed values (`font`,
 * `backgroundColor`) are normalized by the engine and unaffected. Restore the
 * leading zero and collapse whitespace so the check reports THEMING
 * divergence, which is what it exists for, and not CSS minification.
 */
function norm(value) {
  return typeof value === 'string' ? value.replace(/(^|[\s(,])\.(\d)/g, '$10.$2').replace(/\s+/g, ' ').trim() : value;
}

async function reachable(url) {
  try {
    const res = await fetch(`${url}/index.json`);
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------

const presets = readPresets();
if (presets.length === 0) {
  console.error('[preset-parity] FAIL — parsed 0 presets from presets.ts. Has the module shape changed?');
  process.exit(1);
}

for (const [label, url] of [
  ['al-web-components', WC],
  ['al-react', REACT],
]) {
  if (!(await reachable(url))) {
    console.error(
      `[preset-parity] ${label} Storybook is not answering at ${url}.\n` +
        `  start it first, e.g.  pnpm --filter ${label} start\n` +
        `  or point this check elsewhere:  --wc <url> --react <url>`
    );
    process.exit(1);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
const failures = [];
const rows = [];

// 1. The toolbars themselves.
await page.goto(`${WC}/iframe.html?id=${WC_STORY}&viewMode=story`, { waitUntil: 'networkidle' });
const wcItems = await page.evaluate(TOOLBAR);
await page.goto(`${REACT}/iframe.html?id=${REACT_STORY}&viewMode=story`, { waitUntil: 'networkidle' });
const reactItems = await page.evaluate(TOOLBAR);

if (!wcItems || !reactItems) {
  failures.push(
    `toolbar items unreadable (web-components: ${wcItems ? 'ok' : 'null'}, ` +
      `al-react: ${reactItems ? 'ok' : 'null'}) — globalTypes.alPreset missing from a preview?`
  );
} else if (wcItems.join('\n') !== reactItems.join('\n')) {
  failures.push(
    `toolbar item lists DIFFER\n    web-components: ${wcItems.join(', ')}\n    al-react:       ${reactItems.join(', ')}`
  );
} else {
  const expected = presets.map((p) => `${p.id}|${p.label}`);
  if (wcItems.join('\n') !== expected.join('\n')) {
    failures.push(
      `both toolbars agree but DIFFER from presets.ts\n    toolbars:   ${wcItems.join(', ')}\n    presets.ts: ${expected.join(', ')}`
    );
  }
  console.log(`[preset-parity] toolbar lists identical in both Storybooks — ${wcItems.length} presets`);
}

// 2 + 3. Per preset: attributes, then computed styles.
for (const preset of presets) {
  const wc = await probe(page, WC, WC_STORY, preset.id);
  const react = await probe(page, REACT, REACT_STORY, preset.id);

  for (const [side, got] of [
    ['web-components', wc],
    ['al-react', react],
  ]) {
    if (got.hostCount !== 1) failures.push(`${preset.id} / ${side}: expected exactly 1 theme host, found ${got.hostCount}`);
    if (got.legacyTokensSheet) failures.push(`${preset.id} / ${side}: legacy style#al-tokens-sheet present (R6)`);
    if (got.retiredPresetSheet) failures.push(`${preset.id} / ${side}: retired style#al-preset-tokens present`);
    for (const axis of AXES) {
      const want = preset[axis] ?? null;
      if (got.attrs?.[axis] !== want) {
        failures.push(
          `${preset.id} / ${side}: ${axis} attribute is ${JSON.stringify(got.attrs?.[axis])}, presets.ts says ${JSON.stringify(want)}`
        );
      }
    }
  }

  for (const key of ['background', 'radius', 'spaceMd', 'font', 'buttonBackground']) {
    if (norm(wc[key]) !== norm(react[key])) {
      failures.push(`${preset.id}: computed ${key} DIFFERS\n    web-components: ${wc[key]}\n    al-react:       ${react[key]}`);
    }
  }

  rows.push([preset.id, wc.attrs.brand, wc.attrs.mode, wc.attrs.density ?? '—', wc.attrs.contrast ?? '—', wc.background, wc.radius, wc.font]);
}

await browser.close();

const head = ['preset', 'brand', 'mode', 'density', 'contrast', 'background', 'radius', 'font'];
const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
const line = (cells) => cells.map((c, i) => String(c).padEnd(widths[i])).join('  ');
console.log('');
console.log(line(head));
console.log(widths.map((w) => '-'.repeat(w)).join('  '));
for (const r of rows) console.log(line(r));
console.log('');
console.log('(values identical in both Storybooks — the table is one column because they agree)');
console.log('');

if (failures.length > 0) {
  console.error(`[preset-parity] FAIL — ${failures.length} divergence(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`[preset-parity] PASS — ${presets.length} presets, identical toolbars, attributes and computed styles in both Storybooks.`);
