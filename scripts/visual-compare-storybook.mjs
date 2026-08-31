#!/usr/bin/env node
// T2.4 acceptance — side-by-side Storybook 10 (this branch) vs production
// Storybook 7 for the same set of stories.
//
// Writes pairs to `.altitude/visual-compare/storybook/`:
//   <pilot>.local-wc.png    — Storybook 10 @southleft/al-web-components
//   <pilot>.prod-wc.png     — production @southleft/al-web-components
//   <pilot>.local-react.png — Storybook 10 @southleft/al-react
//   <pilot>.prod-react.png  — production @southleft/al-react

import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const OUT = resolve(ROOT, '.altitude/visual-compare/storybook');

const STORIES = [
  'atoms-button--default',
  'molecules-input--default',
  'molecules-select--default',
  'molecules-dialog--default',
];

async function snap(p, url) {
  try {
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(2000);
    return p.screenshot({ fullPage: false });
  } catch (err) {
    console.error('[snap] failed for', url, err.message);
    return null;
  }
}

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });

for (const id of STORIES) {
  const pilot = id.split('--')[0].split('-').pop();
  const local_wc = await snap(page, 'http://localhost:6006/iframe.html?id=' + id + '&viewMode=story');
  if (local_wc) await writeFile(resolve(OUT, pilot + '.local-wc.png'), local_wc);
  const prod_wc = await snap(page, 'https://altitude.pages.dev/storybook/web-components/iframe.html?id=' + id + '&viewMode=story');
  if (prod_wc) await writeFile(resolve(OUT, pilot + '.prod-wc.png'), prod_wc);
  const local_react = await snap(page, 'http://localhost:9009/iframe.html?id=' + id + '&viewMode=story');
  if (local_react) await writeFile(resolve(OUT, pilot + '.local-react.png'), local_react);
  const prod_react = await snap(page, 'https://altitude.pages.dev/storybook/react/iframe.html?id=' + id + '&viewMode=story');
  if (prod_react) await writeFile(resolve(OUT, pilot + '.prod-react.png'), prod_react);
  console.log('[snap]', pilot, 'done');
}

await browser.close();
console.log('[snap] wrote pairs to', OUT);
