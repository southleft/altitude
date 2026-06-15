#!/usr/bin/env node
// Visual parity sweep: one representative story per component title.
// Compares local static SB10 build to production SB7, writes a JSON
// report + diff PNGs into .altitude/visual-parity/.
//
// Usage:
//   1. pnpm --filter al-web-components build:storybook --output-dir ../../dist/storybook/web-components
//   2. npx serve dist/storybook/web-components -l 5050 &   # any static server
//   3. node scripts/visual-parity-sweep.mjs

import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const OUT = resolve(ROOT, '.altitude/visual-parity');
const LOCAL = process.env.LOCAL_SB || 'http://localhost:5050';
const PROD = 'https://altitude.pages.dev/storybook/web-components';
const INDEX = resolve(ROOT, 'dist/storybook/web-components/index.json');

const VIEWPORT = { width: 1200, height: 800 };

const idx = JSON.parse(await readFile(INDEX, 'utf8'));
const entries = Object.values(idx.entries).filter((x) => x.type === 'story');
const byTitle = {};
for (const x of entries) (byTitle[x.title] ??= []).push(x);

// pick one representative story per title — prefer "Default", else first
const picks = [];
for (const [title, list] of Object.entries(byTitle)) {
  const pick = list.find((x) => x.name === 'Default') ?? list[0];
  picks.push({ title, id: pick.id, name: pick.name });
}
picks.sort((a, b) => a.title.localeCompare(b.title));
console.log(`Comparing ${picks.length} representative stories…`);

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });
await mkdir(resolve(OUT, 'diffs'), { recursive: true });

const page = await browser.newPage({ viewport: VIEWPORT });

async function snap(url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(2500);
    return page.screenshot({ fullPage: false, type: 'png' });
  } catch (err) {
    console.error('[snap] failed', url, err.message);
    return null;
  }
}

function decode(buf) {
  return PNG.sync.read(buf);
}

const report = [];
for (const p of picks) {
  const slug = p.id.replace(/[^\w-]/g, '_');
  const localUrl = `${LOCAL}/iframe.html?id=${p.id}&viewMode=story`;
  const prodUrl = `${PROD}/iframe.html?id=${p.id}&viewMode=story`;
  const local = await snap(localUrl);
  const prod = await snap(prodUrl);
  if (!local || !prod) {
    report.push({ ...p, status: 'snap_failed', diffPx: null, diffRatio: null });
    console.log('FAIL', p.title);
    continue;
  }
  const a = decode(local);
  const b = decode(prod);
  const { width, height } = a;
  const out = new PNG({ width, height });
  let diffPx = 0;
  if (a.width === b.width && a.height === b.height) {
    diffPx = pixelmatch(a.data, b.data, out.data, width, height, {
      threshold: 0.15,
      includeAA: false,
    });
  } else {
    diffPx = -1; // size mismatch
  }
  const ratio = diffPx >= 0 ? diffPx / (width * height) : null;
  const status = diffPx === -1 ? 'size_mismatch' : ratio < 0.02 ? 'match' : ratio < 0.10 ? 'minor' : 'regression';
  report.push({ ...p, status, diffPx, diffRatio: ratio, size: `${width}x${height}`, prodSize: `${b.width}x${b.height}` });
  if (status !== 'match') {
    await writeFile(resolve(OUT, 'diffs', `${slug}.local.png`), local);
    await writeFile(resolve(OUT, 'diffs', `${slug}.prod.png`), prod);
    if (diffPx > 0) await writeFile(resolve(OUT, 'diffs', `${slug}.diff.png`), PNG.sync.write(out));
  }
  console.log(`${status.padEnd(13)} ${p.title}  diff=${diffPx} ratio=${ratio?.toFixed(4) ?? 'n/a'}`);
}

await browser.close();
await writeFile(resolve(OUT, 'report.json'), JSON.stringify(report, null, 2));

const summary = report.reduce((m, r) => ((m[r.status] = (m[r.status] || 0) + 1), m), {});
console.log('\n=== summary ===');
for (const [k, v] of Object.entries(summary)) console.log(`${k}: ${v}`);
console.log(`Report written to ${resolve(OUT, 'report.json')}`);
