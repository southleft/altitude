#!/usr/bin/env node
// Side-by-side visual comparison: production Storybook vs this-branch fixture.
//
// Takes screenshots of the same 5 pilot components from:
//   1. Production:    https://altitude.pages.dev/storybook/web-components/
//   2. This branch:   http://localhost:5174/ (the apps/web-components fixture)
//
// Writes paired pngs to `.altitude/visual-compare/` named:
//   <pilot>.prod.png       — production
//   <pilot>.local.png      — this branch
//   <pilot>.compare.png    — side-by-side composite

import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const OUT = resolve(ROOT, '.altitude/visual-compare');

const PILOTS = [
  { id: 'button', storyId: 'atoms-button--default' },
  { id: 'input', storyId: 'molecules-input--default' },
  { id: 'select', storyId: 'molecules-select--default' },
  { id: 'dialog', storyId: 'molecules-dialog--default' },
  { id: 'theme-switcher', storyId: 'modules-theme-switcher--default' },
];

const PROD = 'https://altitude.pages.dev/storybook/web-components/iframe.html';
const LOCAL = 'http://localhost:5174/';

async function screenshotProd(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Wait until Storybook's "preparing story" overlay is gone OR a real
  // custom element shows up.
  await page.waitForFunction(
    () => {
      const overlay = document.querySelector('.sb-preparing-story:not([hidden])');
      const hasComponent = document.querySelector('[id*="al-"], [class*="al-c-"]');
      return (!overlay || overlay.style.display === 'none') && (hasComponent || document.body.children.length > 1);
    },
    { timeout: 30000 }
  ).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  return page.screenshot({ fullPage: false });
}

async function screenshotLocal(page, url, selector) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
  const el = page.locator(selector).first();
  await el.waitFor({ timeout: 10000 });
  return el.screenshot();
}

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
await page.emulateMedia({ colorScheme: 'dark' });

for (const pilot of PILOTS) {
  try {
    console.log('[compare] capturing prod', pilot.id);
    const prod = await screenshotProd(page, `${PROD}?id=${pilot.storyId}&viewMode=story`);
    await writeFile(resolve(OUT, `${pilot.id}.prod.png`), prod);
  } catch (err) {
    console.error('[compare] prod', pilot.id, 'failed:', err.message);
  }
  try {
    console.log('[compare] capturing local', pilot.id);
    const local = await screenshotLocal(page, LOCAL, `section:has(h2:text-is("${pilot.id}"))`);
    await writeFile(resolve(OUT, `${pilot.id}.local.png`), local);
  } catch (err) {
    console.error('[compare] local', pilot.id, 'failed:', err.message);
  }
}

await browser.close();
console.log(`[compare] wrote pairs to ${OUT}`);
