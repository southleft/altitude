#!/usr/bin/env node
/**
 * measure-components.mjs — the measurement driver the Button repair ran by hand.
 *
 * Boots the harness, drives a headless Chromium over it in BOTH modes, and calls
 * `window.__spec(state)` for all five interaction states. The output is the raw
 * material for build-component-ops.mjs: per case, per state, the full shadow-DOM
 * node tree with AUTHORED token provenance (see measure-lib.js for why authored
 * beats computed).
 *
 * Usage:
 *   node scripts/figma-atoms/measure-components.mjs [--port 7345] [--no-bundle]
 *
 * Writes (all under .altitude/figma-sync/, which is gitignored):
 *   spec-light.json / spec-dark.json    { state: [ {tag, case, state, root} ] }
 *   geometry-light.json / geometry-dark.json   window.__measure() summaries
 */
import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { scope, projectArg } from './project-scope.mjs';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SC = scope(projectArg());
const OUT = SC.dirs.sync;
const STATES = ['default', 'hover', 'focus', 'active', 'disabled'];

const portArg = process.argv.indexOf('--port');
const PORT = portArg > -1 ? Number(process.argv[portArg + 1]) : 7345;
const NO_BUNDLE = process.argv.includes('--no-bundle');

mkdirSync(OUT, { recursive: true });

/* ---------- 1. bundle (dist/ ships bare `lit` specifiers) ----------------- */
const BUNDLE = join(OUT, 'atoms-bundle.js');
if (!NO_BUNDLE) {
  let esbuildBin = null;
  try {
    esbuildBin = join(dirname(require.resolve('esbuild/package.json')), 'bin', 'esbuild');
  } catch {
    /* not hoisted where resolve can see it */
  }
  // pnpm does not hoist esbuild into node_modules/, so require.resolve misses it.
  // Fall back to scanning the store the way the README's by-hand command does.
  if (!esbuildBin || !existsSync(esbuildBin)) {
    const store = join(ROOT, 'node_modules/.pnpm');
    if (existsSync(store)) {
      const dirs = readdirSync(store).filter((d) => /^esbuild@/.test(d)).sort().reverse();
      for (const d of dirs) {
        const cand = join(store, d, 'node_modules/esbuild/bin/esbuild');
        if (existsSync(cand)) { esbuildBin = cand; break; }
      }
    }
  }
  if (esbuildBin && existsSync(esbuildBin)) {
    // Tag-collision order is LOAD-BEARING. al-card / al-header / al-footer exist in
    // BOTH packages and each guards with `customElements.get(tag) === undefined`, so
    // FIRST definition wins. The brand layer must therefore be imported FIRST — that
    // is what `brandLibrary.supersedes` in the registry asks for.
    const entries = [];
    if (SC.brandLibrary) {
      const b = join(SC.brandLibrary.root, 'dist/components/bundle/bundle.js');
      if (existsSync(b)) entries.push(b);
      else console.warn('[measure] brand bundle missing (build it first):', b);
    }
    entries.push(join(SC.libRoots[0], 'dist/components/bundle/bundle.js'));
    const entryFile = join(OUT, 'entry.js');
    writeFileSync(entryFile, entries.map((e) => `import '${e.replace(/\\/g, '/')}';`).join('\n') + '\n');
    execFileSync(process.execPath, [
      esbuildBin, entryFile,
      '--bundle', '--format=esm', `--outfile=${BUNDLE}`,
    ], { stdio: 'inherit' });
  } else if (!existsSync(BUNDLE)) {
    console.error('esbuild not resolvable and no existing bundle — run the esbuild step from the README first.');
    process.exit(1);
  } else {
    console.warn('[measure] esbuild not resolvable; reusing existing atoms-bundle.js');
  }
}

/* ---------- 2. harness --------------------------------------------------- */
const harness = spawn(process.execPath, [join(ROOT, 'scripts/figma-atoms/harness.mjs'), '--port', String(PORT), '--project', SC.id], {
  stdio: ['ignore', 'pipe', 'inherit'],
});
harness.stdout.on('data', (d) => process.stdout.write(`[harness] ${d}`));
const kill = () => { try { harness.kill(); } catch { /* already gone */ } };
process.on('exit', kill);

async function waitForHarness() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/?mode=dark`);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('harness did not come up');
}

/* ---------- 3. measure --------------------------------------------------- */
async function loadChromium() {
  for (const pkg of ['playwright', 'playwright-core', '@playwright/test']) {
    try { return (await import(pkg)).chromium; } catch { /* try next */ }
  }
  throw new Error('no playwright package resolvable');
}

try {
  await waitForHarness();
  const chromium = await loadChromium();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 4000 } });

  for (const mode of ['light', 'dark']) {
    await page.goto(`http://localhost:${PORT}/?mode=${mode}`, { waitUntil: 'networkidle' });
    await page.waitForFunction('window.__ATOMS_READY__ === true', null, { timeout: 30000 });

    const geometry = await page.evaluate('window.__measure()');
    writeFileSync(join(OUT, `geometry-${mode}.json`), JSON.stringify(geometry) + '\n');

    const byState = {};
    for (const state of STATES) {
      byState[state] = await page.evaluate(`window.__spec(${JSON.stringify(state)})`);
      console.log(`[measure] ${mode}/${state}: ${byState[state].length} cases`);
    }
    writeFileSync(join(OUT, `spec-${mode}.json`), JSON.stringify(byState) + '\n');
  }

  await browser.close();
  console.log(`[measure] done → ${OUT}\\spec-{light,dark}.json`);
} finally {
  kill();
}
