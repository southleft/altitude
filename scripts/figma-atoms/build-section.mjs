#!/usr/bin/env node
/**
 * build-section.mjs — build a REAL PAGE SECTION into Figma from measure-page.mjs output.
 *
 * Sibling of build-page.mjs, different job. build-page compiles a plan.mjs entry into a
 * COMPONENT SET (variants, states, one component in isolation). This compiles one
 * measured page section into a FRAME that looks like the page: real copy, real
 * composition, the site's own theme.
 *
 *   node scripts/figma-atoms/build-section.mjs hero --project southleft [--mode dark]
 *
 * Binding policy, and it is deliberate:
 *   - Where the authored CSS names a token, BIND to that Figma variable.
 *   - Where it does not, use the measured LITERAL and count it.
 * Site-level classes (`.sl-token-chip`, `.sl-terminal`) carry no tokens at all, so they
 * come out as literals. That is not a shortcut — it is the honest picture, and the
 * unbound count is the size of the `--sl-*` tokenisation gap.
 *
 * Layout is ABSOLUTE, from the measured boxes. Forcing auto-layout onto a page section
 * that is not flex mangles it (skill trap 24), and this is a reference frame, not a
 * component anyone will resize.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { scope, projectArg } from './project-scope.mjs';
import { figmaVariableFor } from './token-map.mjs';
import { shimPortFromArgv } from '../lib/figma-shim.mjs';

const SC = scope(projectArg());
// A nested al-* component should be a real INSTANCE of its set, so fixing the
// component propagates into every page frame that contains it — the same reason
// build-page instances atoms inside molecules. Without this a page frame is a
// lookalike: it matches pixel for pixel and shares nothing.
//
// OFF BY DEFAULT, and this is a finding rather than a preference.
//
// Figma's plugin API does not relayout an INSTANCE after a component-property
// override inside the same plugin run. A Button overridden to "Start a conversation"
// keeps reporting the main component's 83px while RENDERING at 164px. A page section
// is laid out from measured absolute coordinates, so placing a node needs its real
// post-override size — which is precisely what cannot be read back. Instances end up
// positioned at their stale width: they overlap their neighbours and their labels
// wrap into narrow columns.
//
// So a page frame flattens by default and is ACCURATE. `--instances` opts into the
// component link for anyone who will fix up placement by hand in Figma, where the
// relayout does happen.
const USE_INSTANCES = process.argv.includes('--instances');
const { resolveInstance } = SC.instanceMapPath && USE_INSTANCES
  ? await import(pathToFileURL(SC.instanceMapPath).href)
  : { resolveInstance: () => null };
const arg = (f, d = null) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
const SECTION = process.argv[2];
const MODE = arg('--mode', 'dark');
// Normalised the same way measure-page does: Git Bash rewrites a leading "/" in an
// argument into a Windows path, so routes are accepted with or without it.
const ROUTE = (() => {
  const r = (arg('--route', '/') || '/').trim();
  if (r === '/' || r === '') return '/';
  return r.startsWith('/') ? r : '/' + r;
})();
const PAGE = arg('--page', 'Home');
// --page-raw places the frame on an EXISTING page by exact name, rather than on a
// new "page" of our own. A component's reference frame belongs on that component's
// own tools page next to its set, not lumped onto one shared page.
const PAGE_RAW = arg('--page-raw', null);
const PAGE_ICON = String.fromCodePoint(0x1F4C4);
const SHIM = shimPortFromArgv(); // --port canonical, --shim legacy alias
if (!SECTION || SECTION.startsWith('--')) {
  console.error('usage: build-section.mjs <section-id> [--project id] [--mode dark] [--page Home]');
  process.exit(1);
}

// --in selects the measurement source: `page` (the example site) or `docs` (the docs
// previews). They are different subjects and live in separate files.
const IN_NAME = arg('--in', 'page');
const SRC = `${IN_NAME}-${MODE}.json`;
const data = JSON.parse(readFileSync(join(SC.dirs.sync, SRC), 'utf8'));
// A docs run keys by ROUTE with one anonymous section each; the site run keys by
// section id. Accept either: match a route substring, else a section id.
// ORDER MATTERS. A site run keys by route ("/") with many named sections; a docs run
// keys by route-per-component with ONE anonymous section. Matching the route first made
// `data["/"][0]` win for every section id, so all ten example-site sections built as the
// hero. Try the section ID first, and only then fall back to a route whose path ends in
// the requested name.
// Interior routes have no `data-section-id`, so the walker falls back to the class
// list — which repeats within a page ("sl-container sl-section" four times on
// /about). `#N` selects the Nth section of the route positionally, which is the
// only stable handle those pages offer.
let found = null;
if (/^#\d+$/.test(SECTION)) {
  const list = data[ROUTE] || [];
  found = list[Number(SECTION.slice(1))] || null;
  if (!found) {
    console.error(`no section ${SECTION} on route ${ROUTE} (has ${list.length})`);
    process.exit(1);
  }
}
if (!found) found = (data[ROUTE] || []).find((s) => s.id === SECTION) || null;
if (!found) {
  for (const [k, v] of Object.entries(data)) {
    const hit = (v || []).find((s) => s.id === SECTION);
    if (hit) { found = hit; break; }
  }
}
if (!found) {
  const routeHit = Object.keys(data).find((k) => k.endsWith('/' + SECTION));
  if (routeHit && (data[routeHit] || []).length) found = data[routeHit][0];
}
if (!found) {
  console.error(`no section "${SECTION}" in ${SRC}. Keys: ${Object.keys(data).join(', ')}`);
  process.exit(1);
}

/* ---------- colour parsing ------------------------------------------------ */
/** rgb() / rgba() / color(srgb r g b / a) -> {r,g,b,a} in 0..1, or null for transparent. */
function parseColor(str) {
  if (!str || str === 'transparent' || str === 'none') return null;
  let m = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/.exec(str);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  m = /^rgba?\(([^)]+)\)$/.exec(str);
  if (m) {
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    if (p.length < 3 || p.some(Number.isNaN)) return null;
    const a = p.length > 3 ? p[3] : 1;
    if (a === 0) return null;
    return { r: p[0] / 255, g: p[1] / 255, b: p[2] / 255, a };
  }
  return null;
}

const FW = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black', bold: 'Bold', normal: 'Regular' };
const px = (v) => (typeof v === 'number' ? v : parseFloat(v) || 0);

/** Apply CSS text-transform to the literal characters. */
function applyTransform(str, tt) {
  if (tt === 'uppercase') return str.toUpperCase();
  if (tt === 'lowercase') return str.toLowerCase();
  if (tt === 'capitalize') return str.replace(/\p{L}/gu, (ch) => ch.toUpperCase());
  return str;
}

/** authored token name (css suffix) -> Figma variable path, or null. */
const varOf = (tokens, prop) => {
  const t = tokens && tokens[prop];
  return t ? figmaVariableFor(t) : null;
};

let bound = 0, literal = 0;
const unboundProps = {};

/**
 * A repeating hard-stop gradient is a GRID, not a fill Figma can express. `sl-grid-texture`
 * stacks two `linear-gradient(<colour> 1px, transparent 1px)` layers at `72px 72px` — the
 * hero's entire backdrop. Rebuild it as thin rectangles on that pitch.
 */
function latticeOf(n) {
  const c = n.computed || {};
  if (!c.bgImage || c.bgImage.indexOf('linear-gradient') === -1) return null;
  const size = /(\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px/.exec(c.bgSize || '');
  if (!size) return null;
  const line = parseColor((/(rgba?\([^)]*\)|color\(srgb[^)]*\))/.exec(c.bgImage) || [])[1]);
  if (!line) return null;
  return { stepX: +size[1], stepY: +size[2], color: line, thickness: 1 };
}

/**
 * Children worth building, HOISTING through zero-box wrappers.
 *
 * `display: contents` (and some absolutely-positioned wrappers) report a 0x0 rect while
 * their children are laid out normally. Filtering on size alone deleted the wrapper AND
 * its whole subtree: al-card's `__content` is such a wrapper, so the card built as an
 * empty rectangle while its heading, body and list sat measured in the tree. Positions
 * are absolute page coordinates, so lifting the children one level is safe.
 */
function effectiveKids(n) {
  const out = [];
  for (const k of (n.kids || [])) {
    if (isSpacer(k)) continue;
    const hasBox = k.w > 0.5 && k.h > 0.5;
    if (hasBox || k.text) { out.push(k); continue; }
    if ((k.kids || []).length) out.push(...effectiveKids(k));
  }
  return out;
}

/**
 * A node that occupies space and paints NOTHING. The docs header preview appends a
 * 1046x1440 empty div so a reader can scroll and watch the sticky bar — real for the
 * demo, meaningless in Figma, and it made the header frame 1520px tall around an 80px
 * component. Anything with a fill, texture, border, text, canvas or descendants is kept.
 */
const REPLACED = new Set(['img', 'svg', 'canvas', 'video', 'picture', 'iframe']);
function isSpacer(k) {
  const c = k.computed || {};
  // A replaced element paints its own content with no CSS to show for it — treating an
  // <img> as an empty box deleted every mark in the logo wall.
  if (REPLACED.has(String(k.tag || '').toLowerCase())) return false;
  if (k.text || k.ownText || k.canvasPng || k.imgSrc) return false;
  if ((k.kids || []).length) return false;
  if (k.pseudo && k.pseudo.length) return false;
  if (c.bgImage) return false;
  if (parseColor(c.bg)) return false;
  if ((parseFloat(c.bw) || 0) > 0 && c.bstyle !== 'none') return false;
  return true;
}

const instanced = [];
const instanceGaps = [];

function compile(n, parent) {
  const c = n.computed || {};
  // INSTANCE BOUNDARY. Stop here: the instance's internals belong to its own set.
  let instance = null;
  if (n.host) {
    const got = resolveInstance(n.host, n.hostAttrs || {}, n.hostText, n.hostSlots || []);
    if (got && got.id) { instance = got; instanced.push(n.host); }
    else if (n.host !== 'al-layout') instanceGaps.push(n.host);
  }
  const tk = n.tokens || {};
  const rel = parent ? { x: +(n.x - parent.x).toFixed(2), y: +(n.y - parent.y).toFixed(2) } : { x: 0, y: 0 };

  const fillVar = varOf(tk, 'background-color') || varOf(tk, 'background');
  const fillLit = parseColor(c.bg);
  if (fillVar) bound++; else if (fillLit) { literal++; unboundProps.background = (unboundProps.background || 0) + 1; }

  const strokeVar = varOf(tk, 'border-color') || varOf(tk, 'border-top-color');
  const strokeLit = parseColor(c.bc);
  const hasStroke = px(c.bw) > 0 && c.bstyle !== 'none' && !!strokeLit;
  if (hasStroke) { if (strokeVar) bound++; else { literal++; unboundProps.border = (unboundProps.border || 0) + 1; } }

  const textVar = varOf(tk, 'color');
  const textLit = parseColor(c.fc);
  const radiusVar = varOf(tk, 'border-top-left-radius') || varOf(tk, 'border-radius');
  if (radiusVar) bound++;

  const node = {
    name: (n.cls ? String(n.cls).split(' ')[0] : n.tag) || 'node',
    x: rel.x, y: rel.y,
    w: Math.max(+(n.w || 0).toFixed(2), 0.01),
    h: Math.max(+(n.h || 0).toFixed(2), 0.01),
    fill: fillVar ? { varName: fillVar, lit: fillLit } : fillLit ? { lit: fillLit } : null,
    stroke: hasStroke ? { varName: strokeVar, lit: strokeLit, weight: px(c.bw) } : null,
    radius: Array.isArray(c.r) ? c.r.map(px) : [0, 0, 0, 0],
    radiusVar,
    opacity: c.opacityRaw !== undefined && c.opacityRaw !== '1' ? parseFloat(c.opacityRaw) : null,
    text: n.text
      ? {
          // text-transform is a RENDERING rule, not part of the string. Figma has no
          // equivalent, so the characters have to be transformed here or every kicker
          // reads `<cta>` in Figma while the site paints `<CTA>`.
          chars: applyTransform(String(n.text), c.tt),
          family: (c.ff || 'IBM Plex Sans').split(',')[0].replace(/["']/g, '').trim(),
          style: FW[String(c.fw)] || 'Regular',
          size: px(c.fs) || 14,
          lineHeight: px(c.lh) || null,
          colorVar: textVar, colorLit: textLit,
          runs: (n.runs || []).map((r) => ({ start: r.start, end: r.end, lit: parseColor(r.color) })).filter((r) => r.lit),
        }
      : null,
    lattice: latticeOf(n),
    canvasPng: n.canvasPng || null,
    // An INSTANCE keeps the component link; the flattened build beside it keeps the
    // measured layout. Which one wins is decided in Figma, where the component's
    // natural size is knowable: a Button or Chip hugs its label and matches, while a
    // paragraph like Text Block would have to be stretched to a width it cannot wrap
    // to — and a stretched instance is worse than an accurate flat copy.
    instance,
    // Painting ::before/::after, positioned relative to THIS node.
    pseudo: (n.pseudo || []).map((ps) => ({
      name: ps.which,
      x: +ps.x.toFixed(2), y: +ps.y.toFixed(2),
      w: +ps.w.toFixed(2), h: Math.max(+ps.h.toFixed(2), 0.5),
      lit: parseColor(ps.bg),
    })).filter((ps) => ps.lit && ps.w > 0.5),
    kids: effectiveKids(n).map((k) => compile(k, n)),
  };
  // Mixed content: this element owns loose text ALONGSIDE element children. Emit it as
  // a synthetic child so it is not lost, laid out after the last element child.
  if (n.ownText) {
    const after = effectiveKids(n).filter((k) => k.w > 0.5).reduce((m, k) => Math.max(m, (k.x - n.x) + k.w), 0);
    node.kids.push({
      name: 'text', x: +(after + (c.gap || 0)).toFixed(2), y: 0,
      w: Math.max(n.w - after - (c.gap || 0), 1), h: n.h,
      fill: null, stroke: null, radius: [0, 0, 0, 0], radiusVar: null, opacity: null,
      text: {
        chars: applyTransform(n.ownText, c.tt),
        family: (c.ff || 'IBM Plex Sans').split(',')[0].replace(/["']/g, '').trim(),
        style: FW[String(c.fw)] || 'Regular',
        size: px(c.fs) || 14,
        lineHeight: px(c.lh) || null,
        colorVar: textVar, colorLit: textLit,
      },
      kids: [],
    });
  }
  if (node.text && textVar) bound++;
  return node;
}

// A positional pick gets a readable name from its own id, deduped by index.
const FRAME_LABEL = /^#\d+$/.test(SECTION)
  ? `${SECTION.slice(1).padStart(2, '0')} ${String(found.id || 'section').split(' ').slice(-1)[0]}`
  : SECTION;

const root = compile(found.root, null);

// The frame is sized from the MEASURED box, which still includes anything we just
// dropped as a spacer — the header frame stayed 1520px tall around an 80px component.
// Shrink to the real content extent (never grow, and never collapse to nothing).
if ((root.kids || []).length) {
  const extentW = Math.max(...root.kids.map((k) => k.x + k.w));
  const extentH = Math.max(...root.kids.map((k) => k.y + k.h));
  if (extentW > 8 && extentW < root.w) root.w = +extentW.toFixed(2);
  if (extentH > 8 && extentH < root.h) root.h = +extentH.toFixed(2);
}

const PLUGIN = `
if (figma.fileKey !== ${JSON.stringify(SC.fileKey)}) {
  throw new Error('REFUSING TO WRITE: expected ${SC.fileName} (${SC.fileKey}), got "' + figma.root.name + '"');
}
const ROOT = ${JSON.stringify(root)};
const PAGE_NAME = ${JSON.stringify(PAGE_RAW || (PAGE_ICON + ' ' + PAGE))};
const PAGE_MUST_EXIST = ${JSON.stringify(!!PAGE_RAW)};
const FRAME_NAME = ${JSON.stringify(FRAME_LABEL + ' — ' + MODE)};

const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) V[v.name] = v;

// Resolve families ONCE and map a missing style to the nearest available face
// (Agrandir ships Bold, not SemiBold; retrying a miss wedges the plugin).
const FAM = {};
for (const f of await figma.listAvailableFontsAsync()) {
  (FAM[f.fontName.family] = FAM[f.fontName.family] || []).push(f.fontName.style);
}
const NEAR = { SemiBold:['SemiBold','Bold','Medium','Regular'], Bold:['Bold','SemiBold','Black','Medium','Regular'], Medium:['Medium','Regular'], Regular:['Regular','Book','Medium'] };
const subs = [];
function pick(fam, sty) {
  const have = FAM[fam] || [];
  if (!have.length) { subs.push(fam + ' -> IBM Plex Sans (family missing)'); return { family: 'IBM Plex Sans', style: 'Regular' }; }
  if (have.indexOf(sty) > -1) return { family: fam, style: sty };
  const chain = NEAR[sty] || [sty, 'Regular'];
  const out = chain.filter((x) => have.indexOf(x) > -1)[0] || have[0];
  subs.push(fam + ' ' + sty + ' -> ' + out);
  return { family: fam, style: out };
}
const loaded = new Set();
async function font(fam, sty) {
  const f = pick(fam, sty);
  const k = f.family + '|' + f.style;
  if (!loaded.has(k)) { await figma.loadFontAsync(f); loaded.add(k); }
  return f;
}

const misses = [];
const canvasErrors = [];
const instMisses = [];
const instFallbacks = [];
function paintOf(spec) {
  const lit = spec.lit || { r: 0, g: 0, b: 0, a: 1 };
  let p = { type: 'SOLID', color: { r: lit.r, g: lit.g, b: lit.b } };
  if (lit.a !== undefined && lit.a < 1) p.opacity = lit.a;
  if (spec.varName) {
    const vv = V[spec.varName];
    if (vv) return figma.variables.setBoundVariableForPaint(p, 'color', vv);
    misses.push(spec.varName);
  }
  return p;
}

async function buildInstance(spec) {
  const set = await figma.getNodeByIdAsync(spec.instance.id);
  if (!set || set.type !== 'COMPONENT_SET') return null;
  // Pick the variant the resolved props name; fall back to the set's default.
  const want = spec.instance.props || {};
  let comp = set.defaultVariant || set.children[0];
  for (const c of set.children) {
    const got = {};
    for (const p of c.name.split(',')) { const [k, v] = p.split('='); if (k) got[k.trim()] = (v || '').trim(); }
    if (Object.keys(want).every((k) => got[k] === want[k])) { comp = c; break; }
  }
  if (!comp) return null;
  const inst = comp.createInstance();
  // Text overrides go through componentProperties; Figma suffixes the keys.
  if (spec.instance.text) {
    const defs = inst.componentProperties || {};
    const key = Object.keys(defs).find((k) => k.split('#')[0] === 'Text' && defs[k].type === 'TEXT');
    if (key) { try { inst.setProperties({ [key]: spec.instance.text }); } catch (e) { /* ignore */ } }
  }
  return inst;
}

async function build(spec, parent) {
  let node;
  if (spec.instance) {
    const inst = await buildInstance(spec);
    if (inst) {
      parent.appendChild(inst);
      // Judge the fit on HEIGHT, never width.
      //
      // inst.width is STALE after a text override: Figma re-measures the text child
      // and relayouts for rendering, but the plugin API keeps reporting the main
      // component's width. A Button overridden to "Start a conversation" reports 83px
      // and RENDERS at 164px — so a width-based check rejected every instance that was
      // in fact correct.
      //
      // Height is trustworthy, because a longer single-line label does not change it.
      // It is also exactly the signal we need: if the browser laid this content out
      // much taller than the component's natural height, the content WRAPS, and a
      // hugging instance would run it onto one endless line (al-text-block's paragraph
      // hugs to 1644x20 against a measured 640x136). That is when to flatten.
      const fits = spec.h <= inst.height * 1.6 + 8;
      if (fits) {
        inst.x = spec.x; inst.y = spec.y;
        inst.name = spec.name;
        return inst;
      }
      instFallbacks.push(spec.instance.figmaName + ' (content wraps: measured h '
        + Math.round(spec.h) + ' vs component h ' + Math.round(inst.height) + ')');
      inst.remove();
    } else {
      instMisses.push(spec.name);
    }
  }
  if (spec.text) {
    const f = await font(spec.text.family, spec.text.style);
    node = figma.createText();
    node.fontName = f;
    node.characters = spec.text.chars;
    node.fontSize = spec.text.size;
    if (spec.text.lineHeight) node.lineHeight = { value: spec.text.lineHeight, unit: 'PIXELS' };
    if (spec.text.colorLit || spec.text.colorVar) {
      node.fills = [paintOf({ varName: spec.text.colorVar, lit: spec.text.colorLit })];
    }
    node.textAutoResize = 'NONE';
    // Restore syntax colouring lost by flattening the <pre> into one run.
    for (const r of (spec.text.runs || [])) {
      try {
        node.setRangeFills(r.start, r.end, [{ type: 'SOLID', color: { r: r.lit.r, g: r.lit.g, b: r.lit.b }, ...(r.lit.a < 1 ? { opacity: r.lit.a } : {}) }]);
      } catch (e) { /* range outside the node */ }
    }
  } else {
    node = figma.createFrame();
    node.clipsContent = false;
    node.fills = [];
  }
  node.name = spec.name;
  parent.appendChild(node);
  try { node.resize(Math.max(spec.w, 0.01), Math.max(spec.h, 0.01)); } catch (e) { /* text can refuse */ }
  node.x = spec.x; node.y = spec.y;

  if (!spec.text) {
    if (spec.fill) node.fills = [paintOf(spec.fill)];
    if (spec.stroke) {
      node.strokes = [paintOf(spec.stroke)];
      node.strokeWeight = Math.max(spec.stroke.weight, 0.5);
      node.strokeAlign = 'INSIDE';
    }
    const r = spec.radius || [0,0,0,0];
    node.topLeftRadius = r[0]; node.topRightRadius = r[1];
    node.bottomRightRadius = r[2]; node.bottomLeftRadius = r[3];
    if (spec.radiusVar && V[spec.radiusVar]) {
      for (const f of ['topLeftRadius','topRightRadius','bottomRightRadius','bottomLeftRadius']) {
        try { node.setBoundVariable(f, V[spec.radiusVar]); } catch (e) { /* not bindable */ }
      }
    }
  }
  if (spec.opacity !== null && spec.opacity !== undefined) node.opacity = spec.opacity;
  if (spec.canvasPng) {
    // data:image/png;base64,... -> bytes -> Figma image fill.
    const b64 = spec.canvasPng.slice(spec.canvasPng.indexOf(',') + 1);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    try {
      const img = figma.createImage(bytes);
      node.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: img.hash }];
    } catch (e) { canvasErrors.push(spec.name + ': ' + e.message); }
  }
  for (const ps of (spec.pseudo || [])) {
    const r = figma.createRectangle();
    node.appendChild(r);
    r.name = ps.name;
    r.resize(Math.max(ps.w, 0.01), Math.max(ps.h, 0.01));
    r.x = ps.x; r.y = ps.y;
    const paint = { type: 'SOLID', color: { r: ps.lit.r, g: ps.lit.g, b: ps.lit.b } };
    if (ps.lit.a < 1) paint.opacity = ps.lit.a;
    r.fills = [paint];
  }
  if (spec.lattice) {
    const L = spec.lattice;
    const paint = { type: 'SOLID', color: { r: L.color.r, g: L.color.g, b: L.color.b } };
    if (L.color.a < 1) paint.opacity = L.color.a;
    const grid = figma.createFrame();
    grid.name = 'grid-texture'; grid.fills = []; grid.clipsContent = true;
    node.appendChild(grid);
    grid.resize(Math.max(spec.w, 1), Math.max(spec.h, 1)); grid.x = 0; grid.y = 0;
    for (let x = 0; x <= spec.w; x += L.stepX) {
      const r = figma.createRectangle(); grid.appendChild(r);
      r.resize(L.thickness, spec.h); r.x = x; r.y = 0; r.fills = [paint]; r.name = 'v';
    }
    for (let y = 0; y <= spec.h; y += L.stepY) {
      const r = figma.createRectangle(); grid.appendChild(r);
      r.resize(spec.w, L.thickness); r.x = 0; r.y = y; r.fills = [paint]; r.name = 'h';
    }
  }
  for (const k of (spec.kids || [])) await build(k, node);
  return node;
}

await figma.loadAllPagesAsync();
let page = figma.root.children.find((p) => p.name === PAGE_NAME);
if (!page) {
  if (PAGE_MUST_EXIST) throw new Error('No page named ' + PAGE_NAME + ' - refusing to create one.');
  page = figma.createPage(); page.name = PAGE_NAME;
}
await figma.setCurrentPageAsync(page);
for (const old of page.children.filter((n) => n.name === FRAME_NAME)) old.remove();

const frame = figma.createFrame();
frame.name = FRAME_NAME;
page.appendChild(frame);
frame.resize(Math.max(ROOT.w, 1), Math.max(ROOT.h, 1));
frame.clipsContent = true;
// The section is transparent over the page background; paint the body colour under it
// or the whole frame reads as white and nothing matches the site.
const bodyBg = V['theme/color/body/background'];
let base = { type: 'SOLID', color: { r: 0.063, g: 0.059, b: 0.051 } };
if (bodyBg) base = figma.variables.setBoundVariableForPaint(base, 'color', bodyBg);
frame.fills = [base];
// Every colour variable in Tier 2 Theme has a Light and a Dark value, and a node with no
// explicit mode resolves to the collection's DEFAULT -- which is Light. Binding the right
// variables was not enough: the whole frame came back cream instead of near-black. Pin
// the frame to the mode we actually measured so its subtree resolves the same way.
const themeCol = (await figma.variables.getLocalVariableCollectionsAsync())
  .find((c) => c.modes.some((m) => m.name.toLowerCase() === ${JSON.stringify(MODE)}.toLowerCase()) && c.modes.length > 1);
let modeSet = null;
if (themeCol) {
  const m = themeCol.modes.find((x) => x.name.toLowerCase() === ${JSON.stringify(MODE)}.toLowerCase());
  if (m) { frame.setExplicitVariableModeForCollection(themeCol, m.modeId); modeSet = themeCol.name + '=' + m.name; }
}
// Sit clear of whatever the page already holds (a component set, its labels)
// instead of assuming this frame is the only thing on it.
let belowY = 0;
for (const n of page.children) {
  if (n === frame) continue;
  belowY = Math.max(belowY, (n.y || 0) + (n.height || 0));
}
frame.x = 0;
frame.y = belowY ? belowY + 160 : 0;

for (const k of (ROOT.kids || [])) await build(k, frame);

return JSON.stringify({
  page: page.name, frame: frame.name,
  size: Math.round(frame.width) + 'x' + Math.round(frame.height),
  explicitMode: modeSet,
  nodes: (function count(n){ return 1 + (n.children||[]).reduce((a,c)=>a+count(c),0); })(frame),
  missingVars: [...new Set(misses)],
  fontSubstitutions: [...new Set(subs)],
  canvasErrors,
  instanceMisses: [...new Set(instMisses)],
  flattenedBecauseSizeMismatch: [...new Set(instFallbacks)],
});
`;

const res = await fetch(`http://localhost:${SHIM}/call`, {
  method: 'POST',
  body: JSON.stringify({ name: 'figma_execute', arguments: { code: PLUGIN, fileKey: SC.fileKey, timeout: 30000 } }),
});
const out = await res.json();
let payload;
try { payload = JSON.parse(out.text); } catch { console.error(out.text ?? out); process.exit(1); }
if (payload.success === false || payload.error) { console.error('FAILED:', payload.error || payload); process.exit(1); }
const r = typeof payload.result === 'string' ? JSON.parse(payload.result) : payload.result;
console.log(JSON.stringify({ ...r, boundBindings: bound, literalFallbacks: literal, unboundBy: unboundProps,
  instanced: [...new Set(instanced)], notInstanced: [...new Set(instanceGaps)] }, null, 1));
