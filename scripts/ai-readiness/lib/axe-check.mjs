// Axe accessibility check per trial (R6, axe half).
//
// WHY THIS IS HARD, AND WHAT WAS ACTUALLY TRIED: the three (now four) tasks
// emit different, mostly non-renderable output shapes:
//   - Task A (composition): `template` is a Lit html`` template BODY with
//     JS interpolations (`${user.avatarUrl}`) and event bindings
//     (`@onMenuItemSelect=${...}`) — not itself valid, executable Lit, but
//     ITS al-* CUSTOM ELEMENTS ARE REAL and can be rendered if the real
//     component library is registered in a real browser. This module does
//     exactly that (see renderAndCheck) rather than recording a fake 0.
//   - Task B (scaffold): output is raw .ts/.scss/.stories.ts SOURCE FILES,
//     not markup — rendering would require transpiling TypeScript and
//     invoking Lit's render() with no real DOM host. Not attempted; null +
//     reason.
//   - Task C (violation): output is a findings array, no markup at all.
//     null + reason.
//   - Task G (llms-docs): output is prose/citations about doc routes, no
//     markup. null + reason.
//
// HOW TASK A RENDERING WORKS (proven against the real recorded
// A-composition-claude-1 attempt, 2026-08-25, local-compute only — no LLM
// spend):
//   1. `libs/al-web-components/dist/components/bundle/bundle.js` externalizes
//      `lit`/`lit-html`/`@lit/*`/`date-fns`/`nanoid` (vite.config.mjs's
//      `external` list) — it is NOT a self-contained browser bundle. esbuild
//      re-bundles a one-line entry (`import '<bundle.js>'`) with
//      `absWorkingDir` set to libs/al-web-components so those bare
//      specifiers resolve against ITS node_modules, producing one
//      self-contained ESM file.
//   2. Setting `globalThis.alAutoRegistry = true` must happen in an INLINE
//      (non-module) `<script>` that executes BEFORE the bundle's `<script
//      type="module">` tag — ES module imports always evaluate before a
//      module's own top-level statements, so doing this inside the
//      esbuild-bundled entry file itself (tried first) silently no-ops:
//      every component module's own `if (alAutoRegistry === true) { … }`
//      registration guard already ran before the assignment executed. This
//      is the documented "template frameworks set window.alAutoRegistry =
//      true inline in <head>" consumer path (CLAUDE.md > Registry).
//   3. `file://` origin blocks both `<link rel=stylesheet>` (XHR) and
//      `<script type=module src=...>` (CORS) cross-file loads even when
//      both files are same-directory — a same-origin HTTP server (a tiny
//      one, in-process, ephemeral port) is required; this mirrors
//      scripts/build-a11y-report.mjs's own documented MEASUREMENT HAZARD
//      comment about never trusting a bare file load.
//   4. The (Lit-template-syntax) `template` string can be assigned directly
//      to `Element.innerHTML` with NO sanitization — `${expr}` and
//      `@handler=${expr}` parse as inert literal text / a harmless custom
//      attribute under the HTML parser; they do not execute as JS. Verified
//      by injecting a deliberate `<img src="x.png">` (no alt) + `<a
//      href="#"></a>` (no name) ahead of the real template and confirming
//      axe caught BOTH (`image-alt` critical, `link-name` serious) — this
//      pipeline is not silently a no-op.
//
// Icon glyphs: al-icon lazily resolves glyph SVGs via a runtime registry
// that is not wired up outside a real app shell, so rendering logs (and
// this module tolerates) a console warning per icon name — the SHADOW DOM
// structure (and its accessibility tree) is still real and still checked.

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolvePkg } from '../lib.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const AL_WC_DIR = resolve(ROOT, 'libs/al-web-components');
const BUNDLE_PATH = resolve(AL_WC_DIR, 'dist/components/bundle/bundle.js');
const CSS_PATH = resolve(AL_WC_DIR, 'dist/css/main.css');

/**
 * Builds a reusable renderer: bundles the component library once (esbuild),
 * launches one Playwright browser + one static HTTP server for its
 * lifetime, and exposes `renderAndCheck(html)` for each Task A attempt.
 * Returns `{ available: false, reason }` instead of throwing when the dist
 * build (or Playwright/esbuild/axe-core) isn't present — e.g. a fresh
 * clone that hasn't run `pnpm run build` yet — so a missing local build
 * artifact degrades to "not measured", never a crashed harness run.
 */
export async function createAxeRenderer() {
  if (!existsSync(BUNDLE_PATH) || !existsSync(CSS_PATH)) {
    return {
      available: false,
      reason: `libs/al-web-components/dist is not built (expected ${BUNDLE_PATH}). Run "pnpm --filter @southleft/al-web-components build" first.`,
      async renderAndCheck() { return { violationCount: null, reason: this.reason }; },
      async close() {},
    };
  }

  let chromium, axeSrc, esbuild;
  try {
    chromium = (await import(pathToFileURL(resolvePkg('playwright', 'index.mjs', ROOT)).href)).chromium;
    axeSrc = readFileSync(resolvePkg('axe-core', 'axe.min.js', ROOT), 'utf8');
    esbuild = (await import(pathToFileURL(resolvePkg('esbuild', 'lib/main.js', ROOT)).href)).default;
  } catch (err) {
    const reason = `axe rendering dependencies unavailable: ${err.message}`;
    return {
      available: false,
      reason,
      async renderAndCheck() { return { violationCount: null, reason }; },
      async close() {},
    };
  }

  const tmpDir = mktempSafe();
  const entryPath = join(tmpDir, 'entry.mjs');
  writeFileSync(entryPath, `import ${JSON.stringify(BUNDLE_PATH)};\n`);

  const built = await esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    absWorkingDir: AL_WC_DIR,
    write: false,
    logLevel: 'silent',
  });
  const bundledJs = built.outputFiles[0].text;
  const cssText = readFileSync(CSS_PATH, 'utf8');

  const server = createServer((req, res) => {
    if (req.url === '/bundle.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(bundledJs); return; }
    if (req.url === '/main.css') { res.writeHead(200, { 'Content-Type': 'text/css' }); res.end(cssText); return; }
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        '<!DOCTYPE html><html><head><link rel="stylesheet" href="/main.css">' +
        '<script>window.alAutoRegistry = true;</script></head>' +
        '<body><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>',
      );
      return;
    }
    res.writeHead(404); res.end();
  });
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;

  const browser = await chromium.launch();

  async function renderAndCheck(html, { timeoutMs = 15000 } = {}) {
    const tags = [...new Set([...html.matchAll(/<(al-[a-z0-9-]+)/gi)].map((m) => m[1].toLowerCase()))];
    const page = await browser.newPage();
    try {
      await page.goto(`http://localhost:${port}/`, { waitUntil: 'load', timeout: timeoutMs });
      const inject = await page.evaluate((tpl) => {
        const root = document.getElementById('root');
        try {
          root.innerHTML = tpl;
          return { ok: true };
        } catch (e) {
          return { ok: false, error: String(e) };
        }
      }, html);
      if (!inject.ok) {
        return { violationCount: null, reason: `template could not be injected as HTML: ${inject.error}` };
      }
      await page.evaluate(async (tagNames) => {
        await Promise.race([
          Promise.all(tagNames.map((t) => customElements.whenDefined(t).catch(() => {}))),
          new Promise((r) => setTimeout(r, 3000)),
        ]);
      }, tags);
      await page.waitForTimeout(300);

      await page.addScriptTag({ content: axeSrc });
      const results = await page.evaluate(async () => window.axe.run(document.getElementById('root')));
      return {
        violationCount: results.violations.length,
        violations: results.violations.map((v) => ({ id: v.id, impact: v.impact, nodeCount: v.nodes.length })),
        passCount: results.passes.length,
        renderedTags: tags,
        reason: null,
      };
    } catch (err) {
      return { violationCount: null, reason: `axe render failed: ${err.message}` };
    } finally {
      await page.close().catch(() => {});
    }
  }

  return {
    available: true,
    reason: null,
    renderAndCheck,
    async close() {
      await browser.close().catch(() => {});
      server.close();
    },
  };
}

function mktempSafe() {
  return mkdtempSync(join(tmpdir(), 'ai-readiness-axe-'));
}

/**
 * Task-aware dispatcher. `renderer` is a createAxeRenderer() result (or
 * null, if the caller decided not to build one at all — e.g. --dry-run).
 * Only Task A attempts get a real render attempt; every other task records
 * a documented null.
 */
export async function computeAxeForAttempt({ taskShortKey, axeRenderable, parsed }, renderer) {
  if (!axeRenderable) {
    return { violationCount: null, reason: `Task ${taskShortKey} output is not renderable markup (see lib/axe-check.mjs header comment)` };
  }
  if (!parsed || typeof parsed.template !== 'string' || !parsed.template.trim()) {
    return { violationCount: null, reason: 'no template field in parsed output to render' };
  }
  if (!renderer || !renderer.available) {
    return { violationCount: null, reason: renderer?.reason || 'axe renderer not initialized' };
  }
  return renderer.renderAndCheck(parsed.template);
}
