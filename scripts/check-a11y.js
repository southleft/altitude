#!/usr/bin/env node
/**
 * T6.3 a11y gate — axe-core over the apps/web-components fixture pages.
 *
 * Runs a headless browser, navigates to the al-app-web-components Vite
 * preview, injects axe-core, and asserts no critical/serious violations.
 * The fixture renders all 5 pilots, so this is real component coverage.
 *
 * Run: `node scripts/check-a11y.js`
 *
 * Exit codes:
 *   0 — no critical/serious a11y violations
 *   1 — at least one violation
 *   2 — internal error
 */

'use strict';

const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
// Pull the axe-core script from the node_modules tree if present, otherwise
// CDN-fetch at runtime. The pinned local copy keeps CI hermetic.
const AXE_LOCAL = path.join(REPO, 'node_modules/axe-core/axe.min.js');
const AXE_CDN = 'https://cdn.jsdelivr.net/npm/axe-core@4.10.0/axe.min.js';
const BASE = process.env.BASE_URL || 'http://localhost:5174';

async function loadAxeSource() {
  if (fs.existsSync(AXE_LOCAL)) return fs.readFileSync(AXE_LOCAL, 'utf8');
  const res = await fetch(AXE_CDN);
  if (!res.ok) throw new Error('Cannot fetch axe-core from CDN: ' + res.status);
  return res.text();
}

async function main() {
  const axeSource = await loadAxeSource();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(BASE + '/');
    await page.addScriptTag({ content: axeSource });
    const results = await page.evaluate(async () => {
      const ax = (window).axe;
      return ax.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] });
    });
    const blocking = (results.violations || []).filter((v) =>
      v.impact === 'critical' || v.impact === 'serious'
    );
    for (const v of blocking) {
      console.error('[a11y] ' + v.id + ' (' + v.impact + '): ' + v.help);
      for (const n of v.nodes.slice(0, 3)) console.error('    ' + n.target.join(' '));
    }
    console.log('[a11y] ' + (results.violations || []).length + ' total violation(s); ' + blocking.length + ' blocking (critical/serious).');
    if (blocking.length) {
      process.exit(1);
    }
    console.log('[a11y] PASS — no blocking a11y violations.');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('[a11y] internal error:', err);
  process.exit(2);
});
