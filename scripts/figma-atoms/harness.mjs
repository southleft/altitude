#!/usr/bin/env node
/**
 * harness.mjs — render Altitude atoms from `dist/` and serve them for measurement.
 *
 * Why not Storybook: `storybook dev` needs a TTY and boots slowly; we only need the
 * rendered DOM + computed styles. This serves a single page that imports the same
 * built bundle Storybook does, so the pixels are the real component's pixels.
 *
 * Usage:
 *   node scripts/figma-atoms/harness.mjs            # serve on :7331
 *   node scripts/figma-atoms/harness.mjs --port 8080
 *
 * The page renders one instance per CASE from plan.mjs, each wrapped in
 * `<div data-case="...">`, in both Light and Dark. measure.mjs drives a browser
 * against it and dumps computed styles to atoms-measured.json.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAN } from './plan.mjs';
import { scope, scopePlan, brandCssHref, projectArg } from './project-scope.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SC = scope(projectArg());
// Serving roots: the shared library, plus the brand layer package when the
// project has one. Both are needed or the brand components cannot load.
const LIB_ROOTS = SC.libRoots.map((r) => join(r, 'dist'));
const LIB = LIB_ROOTS[0];
const ATOMS = scopePlan(PLAN, SC);

const portArg = process.argv.indexOf('--port');
const PORT = portArg > -1 ? Number(process.argv[portArg + 1]) : 7331;

const MIME = {
  '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.map': 'application/json',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.html': 'text/html',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function renderCase(tag, c) {
  const attrs = Object.entries(c.attrs || {})
    .map(([k, v]) => (v === true ? ` ${k}` : v === false || v == null ? '' : ` ${k}="${esc(v)}"`))
    .join('');
  const slots = (c.slots || [])
    .map((s) => (s.name ? `<${s.el || 'span'} slot="${s.name}">${s.html}</${s.el || 'span'}>` : s.html))
    .join('');
  const fill = c.fill ? ' data-fill="1"' : '';
  // A filling case may declare its own width; 320px (the CSS default) is mobile.
  const fw = c.fill && c.fillWidth ? ` style="width:${Number(c.fillWidth)}px"` : '';
  // Array/object inputs (table columns+data, command-palette actions, combobox items)
  // are JS PROPERTIES, not attributes. Without them these components render their empty
  // state and the measurement is of nothing. Ship them as JSON and assign after upgrade.
  const props = c.props && Object.keys(c.props).length
    ? ` data-alprops="${esc(JSON.stringify(c.props))}"`
    : '';
  return `<div class="case" data-case="${esc(c.id)}"${fill}${fw}><${tag}${attrs}${props}>${slots}</${tag}></div>`;
}

// main.css bakes DARK into :root. A branded project overrides BOTH modes with its
// own complete brand bundle; an unbranded one only needs the light override.
const TOKENS_HREF = {
  light: brandCssHref(SC, 'light', SC.libRoots[0]),
  dark: brandCssHref(SC, 'dark', SC.libRoots[0]),
};

function page(mode) {
  const blocks = ATOMS
    .map((a) => `<section data-atom="${a.key || a.tag}">${a.cases.map((c) => renderCase(a.tag, c)).join('\n')}</section>`)
    .join('\n');

  // alAutoRegistry must be set INLINE IN <head> before any deep import evaluates —
  // composites read it at module-eval time to pick their sub-component tag suffix.
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<script>window.alAutoRegistry = true;</script>
<link rel="stylesheet" href="/css/main.css">
${TOKENS_HREF[mode] ? `<link rel="stylesheet" href="${TOKENS_HREF[mode]}">` : ''}
<style>
  html, body { margin: 0; padding: 0; }
  body { background: var(--al-theme-color-background-default, #fff); }
  section { display: block; padding: 0; }
  .case { display: inline-block; margin: 0; padding: 0; }
  /* fullWidth is width:100% on the inner element - it needs a sized block parent,
     otherwise an inline-block wrapper shrink-wraps it and the case measures as hug. */
  .case[data-fill="1"] { display: block; width: 320px; }
  #root { padding: 24px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
</style>
</head>
<body>
<div id="root">
${blocks}
</div>
<script src="/__measure-lib.js"></script>
<script>window.FIRST_TAG = ${JSON.stringify(ATOMS[0] ? ATOMS[0].tag : 'al-button')};</script>
<script type="module">
  import '/__bundle.js';
  await customElements.whenDefined(FIRST_TAG);
  // Assign JS properties BEFORE the settle frames, then await each element's own
  // updateComplete — a Lit render triggered by a property is asynchronous, and measuring
  // between the assignment and the re-render captures the pre-render layout.
  for (const el of document.querySelectorAll('[data-alprops]')) {
    let bag;
    try { bag = JSON.parse(el.dataset.alprops); } catch (e) { console.warn('bad data-alprops', e); continue; }
    for (const k of Object.keys(bag)) {
      try { el[k] = bag[k]; } catch (e) { console.warn('prop ' + k + ' failed', e); }
    }
  }
  for (const el of document.querySelectorAll('[data-alprops]')) {
    if (el.updateComplete) { try { await el.updateComplete; } catch (e) { /* keep going */ } }
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  // Exposed so the measurement step is a one-line evaluate() instead of shipping
  // this whole extractor over the wire on every iteration.
  window.__measure = () => {
    const px = (v) => (typeof v === 'string' && v.endsWith('px') ? parseFloat(v) : v);
    // Slotted light-DOM text is invisible to shadowRoot.textContent, and it inherits
    // typography from its FLATTENED-tree parent (the slot's parent inside the shadow
    // tree), not from the host. Resolve slots first, style from slot.parentElement.
    const pickText = (rootEl) => {
      for (const sl of rootEl.querySelectorAll('slot')) {
        const t = sl.assignedNodes({ flatten: true }).map((n) => n.textContent || '').join('').trim();
        if (t) return { content: t, styleEl: sl.parentElement || rootEl };
      }
      let el = null;
      const walk = (n) => {
        if (el) return;
        for (const ch of (n.children || [])) {
          if (ch.tagName === 'STYLE') continue;
          if ((ch.textContent || '').trim() && ch.children.length === 0) { el = ch; return; }
          walk(ch);
        }
      };
      walk(rootEl);
      if (el) return { content: el.textContent.trim(), styleEl: el };
      const own = (rootEl.textContent || '').trim();
      return own ? { content: own, styleEl: rootEl } : null;
    };
    const out = [];
    for (const section of document.querySelectorAll('section[data-atom]')) {
      for (const wrap of section.querySelectorAll('.case')) {
        const host = wrap.firstElementChild;
        if (!host) continue;
        const root = host.shadowRoot ? [...host.shadowRoot.children].find((n) => n.tagName !== 'STYLE') : null;
        const t = root || host;
        const cs = getComputedStyle(t);
        const b = t.getBoundingClientRect();
        const pt = pickText(t);
        const tcs = pt ? getComputedStyle(pt.styleEl) : cs;
        out.push({
          tag: section.dataset.atom, case: wrap.dataset.case,
          w: Math.round(b.width * 100) / 100, h: Math.round(b.height * 100) / 100,
          display: cs.display, dir: cs.flexDirection, align: cs.alignItems, justify: cs.justifyContent,
          gap: cs.columnGap === 'normal' ? 0 : px(cs.columnGap),
          pad: [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)],
          bg: cs.backgroundColor,
          bw: [px(cs.borderTopWidth), px(cs.borderRightWidth), px(cs.borderBottomWidth), px(cs.borderLeftWidth)],
          bc: cs.borderTopColor, bstyle: cs.borderTopStyle,
          r: [px(cs.borderTopLeftRadius), px(cs.borderTopRightRadius), px(cs.borderBottomRightRadius), px(cs.borderBottomLeftRadius)],
          op: parseFloat(cs.opacity),
          shadow: cs.boxShadow === 'none' ? null : cs.boxShadow,
          txt: pt ? pt.content.slice(0, 60) : '',
          ff: tcs.fontFamily, fs: px(tcs.fontSize), fw: tcs.fontWeight,
          lh: px(tcs.lineHeight), ls: tcs.letterSpacing === 'normal' ? 0 : px(tcs.letterSpacing),
          fc: tcs.color, td: tcs.textDecorationLine, tt: tcs.textTransform,
        });
      }
    }
    return out;
  };
  window.__ATOMS_READY__ = true;
</script>
</body>
</html>`;
}

createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/' || url === '/index.html') {
    const mode = /[?&]mode=light/.test(req.url) ? 'light' : 'dark';
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    return res.end(page(mode));
  }
  if (url === '/__bundle.js') {
    // dist/ ships bare `lit` specifiers the browser cannot resolve; serve the
    // esbuild-bundled copy instead (see README in this folder).
    const b = join(SC.dirs.sync, 'atoms-bundle.js');
    if (!existsSync(b)) { res.writeHead(500); return res.end('run the esbuild step first'); }
    res.writeHead(200, { 'content-type': 'text/javascript' });
    return res.end(readFileSync(b));
  }
  if (url === '/__measure-lib.js') {
    // no-store: this file changes between measurement runs and a cached copy silently
    // produces stale results that look like logic bugs.
    res.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'no-store, must-revalidate' });
    return res.end(readFileSync(join(ROOT, 'scripts/figma-atoms/measure-lib.js')));
  }
  if (url === '/favicon.ico') { res.writeHead(204); return res.end(); }
  // Try each package root in turn; the brand layer's dist/ is a second root.
  let file = null;
  for (const root of LIB_ROOTS) {
    const cand = join(root, url);
    if (cand.startsWith(root) && existsSync(cand)) { file = cand; break; }
  }
  if (!file) {
    res.writeHead(404);
    return res.end('not found: ' + url);
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(PORT, () => console.log(`harness on http://localhost:${PORT}`));
