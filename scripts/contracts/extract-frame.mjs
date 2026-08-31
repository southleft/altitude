#!/usr/bin/env node
/**
 * extract-frame.mjs — DEEP extraction of a Figma frame/set for the REVERSE
 * lane (spec 2026-08-28-figma-to-code-generation T1+T2): Figma → code.
 *
 * Emits everything the code emitter needs to write DS-composition JSX:
 *   - per node: type/name/geometry, auto-layout facts, corner radii,
 *   - paints with BOUND VARIABLE NAMES (fills/strokes) — falling back to the
 *     literal rgba only when unbound (each fall-back is the reverse lane's
 *     equivalent of color-unbound),
 *   - text: characters, font, size, line height, TEXT STYLE NAME when bound,
 *   - INSTANCES: main component + set name + componentProperties (variant
 *     values, booleans, TEXT overrides). Instance INTERIORS are not walked —
 *     the interior belongs to the component; the emitter maps the instance
 *     to a wrapper component + props.
 * Also exports the frame's PNG (bookend START for the reversed verification:
 * render the emitted code in the harness later, diff against this).
 *
 * Usage:
 *   node scripts/contracts/extract-frame.mjs --project southleft \
 *     --page "🛠 Hero" --set-name Hero --out hero
 *   node scripts/contracts/extract-frame.mjs --project southleft --node-id 123:456 --out thing
 *
 * Page/set matching is SUBSTRING-tolerant (em dashes and emoji do not
 * survive every shell; exact match is tried first).
 * Output: <syncDir>/frame-extracts/<out>.extract.json + <out>.png
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import { scope, projectArg } from '../figma-atoms/project-scope.mjs';
import { argOf } from '../lib/argv.mjs';
import { call as shimCall, shimPortFromArgv } from '../lib/figma-shim.mjs';

const PAGE = argOf('--page') || null;
const SET_NAME = argOf('--set-name') || null;
const NODE_ID = argOf('--node-id') || null;
const OUT = argOf('--out') || (SET_NAME ? SET_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'extract');
const SHIM_PORT = shimPortFromArgv();

if (!NODE_ID && !SET_NAME) {
  console.error('usage: extract-frame.mjs [--project id] (--set-name <name> [--page <name>] | --node-id <id>) [--out <name>]');
  process.exit(1);
}

const SC = scope(projectArg());

const code = `
await figma.loadAllPagesAsync();
const SETQ = ${JSON.stringify(SET_NAME)};
const PAGEQ = ${JSON.stringify(PAGE)};
const NODEQ = ${JSON.stringify(NODE_ID)};
let target = null;
if (NODEQ) {
  target = await figma.getNodeByIdAsync(NODEQ);
} else {
  const pages = PAGEQ
    ? figma.root.children.filter((p) => p.name === PAGEQ || p.name.indexOf(PAGEQ) > -1 || PAGEQ.indexOf(p.name) > -1)
    : figma.root.children;
  outer: for (const pg of pages) {
    const q = [pg];
    while (q.length) {
      const n = q.shift();
      if ((n.type === 'COMPONENT_SET' || n.type === 'COMPONENT' || n.type === 'FRAME') && n.name === SETQ) { target = n; break outer; }
      if ('children' in n) for (const c of n.children) q.push(c);
    }
  }
}
if (!target) return JSON.stringify({ error: 'target not found' });
const root = target.type === 'COMPONENT_SET' ? (target.defaultVariant || target.children[0]) : target;

const varName = async (id) => {
  try { const v = await figma.variables.getVariableByIdAsync(id); return v ? v.name : null; } catch (e) { return null; }
};
const paintOut = async (p) => {
  if (!p || p.visible === false) return null;
  const o = { type: p.type };
  if (p.type === 'SOLID') {
    const bv = p.boundVariables && p.boundVariables.color;
    if (bv) o.variable = await varName(bv.id);
    o.color = { r: Math.round(p.color.r * 255), g: Math.round(p.color.g * 255), b: Math.round(p.color.b * 255) };
    o.opacity = p.opacity === undefined ? 1 : Math.round(p.opacity * 100) / 100;
  } else if (p.type === 'IMAGE') { o.imageHash = p.imageHash || null; }
  return o;
};
const styleName = async (id) => {
  if (!id || id === figma.mixed) return null;
  try { const s = await figma.getStyleByIdAsync(id); return s ? s.name : null; } catch (e) { return null; }
};
const rx = root.absoluteTransform[0][2];
const ry = root.absoluteTransform[1][2];
async function dump(n, depth) {
  const o = {
    name: n.name.slice(0, 80),
    type: n.type,
    x: Math.round((n.absoluteTransform[0][2] - rx) * 10) / 10,
    y: Math.round((n.absoluteTransform[1][2] - ry) * 10) / 10,
    w: Math.round(n.width * 10) / 10,
    h: Math.round(n.height * 10) / 10,
  };
  if (n.visible === false) o.hidden = true;
  if (n.layoutMode && n.layoutMode !== 'NONE') {
    o.layout = {
      mode: n.layoutMode,
      gap: n.itemSpacing,
      wrap: n.layoutWrap === 'WRAP' ? true : undefined,
      rowGap: n.layoutWrap === 'WRAP' ? n.counterAxisSpacing : undefined,
      pad: [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft],
      alignItems: n.counterAxisAlignItems,
      justify: n.primaryAxisAlignItems,
      sizingH: n.layoutSizingHorizontal,
      sizingV: n.layoutSizingVertical,
    };
  }
  if (n.layoutPositioning === 'ABSOLUTE') o.absolute = true;
  try { if (Array.isArray(n.fills) && n.fills.length) { const fs = []; for (const p of n.fills) { const po = await paintOut(p); if (po) fs.push(po); } if (fs.length) o.fills = fs; } } catch (e) { /* mixed */ }
  try { if (Array.isArray(n.strokes) && n.strokes.length) { const ss = []; for (const p of n.strokes) { const po = await paintOut(p); if (po) ss.push(po); } if (ss.length) { o.strokes = ss; o.strokeWeight = n.strokeWeight; } } } catch (e) { /* mixed */ }
  if (typeof n.cornerRadius === 'number' && n.cornerRadius > 0) o.radius = n.cornerRadius;
  else if (typeof n.topLeftRadius === 'number' && (n.topLeftRadius || n.topRightRadius || n.bottomRightRadius || n.bottomLeftRadius)) {
    o.radii = [n.topLeftRadius, n.topRightRadius, n.bottomRightRadius, n.bottomLeftRadius];
  }
  if (n.type === 'TEXT') {
    o.text = {
      characters: n.characters,
      textStyle: await styleName(n.textStyleId),
      font: n.fontName === figma.mixed ? 'mixed' : (n.fontName.family + '/' + n.fontName.style),
      fontSize: n.fontSize === figma.mixed ? 'mixed' : n.fontSize,
      lineHeight: (n.lineHeight && n.lineHeight.unit === 'PIXELS') ? n.lineHeight.value : undefined,
    };
  }
  if (n.type === 'INSTANCE') {
    const main = await n.getMainComponentAsync();
    o.instance = {
      main: main ? main.name : null,
      set: main && main.parent && main.parent.type === 'COMPONENT_SET' ? main.parent.name : null,
      remote: main ? main.remote : null,
      props: {},
    };
    try {
      for (const k of Object.keys(n.componentProperties || {})) {
        o.instance.props[k.split('#')[0]] = n.componentProperties[k].value;
      }
    } catch (e) { /* no props */ }
    return o; // instance interiors are the component's business
  }
  if ('children' in n && depth < 14) {
    o.children = [];
    for (const c of n.children) o.children.push(await dump(c, depth + 1));
  }
  return o;
}
const tree = await dump(root, 0);
return JSON.stringify({ rootId: root.id, setId: target.id, setName: target.name, pageName: (function (n) { let c = n; while (c && c.type !== 'PAGE') c = c.parent; return c ? c.name : null; })(target), tree });
`;

const text = await shimCall('figma_execute', { code, fileKey: SC.fileKey, timeout: 90000 }, { port: SHIM_PORT });
const payload = JSON.parse(text);
if (payload.success === false || payload.error) { console.error('[extract-frame] FAILED:', payload.error || text.slice(0, 300)); process.exit(1); }
const inner = typeof payload.result === 'string' ? JSON.parse(payload.result) : payload.result;
if (inner.error) { console.error('[extract-frame]', inner.error); process.exit(1); }

const outDir = join(SC.dirs.sync, 'frame-extracts');
mkdirSync(outDir, { recursive: true });
const jsonPath = join(outDir, `${OUT}.extract.json`);
writeFileSync(jsonPath, `${JSON.stringify(inner, null, 2)}\n`);

// Bookend START: the source frame's own export.
const pngPath = join(outDir, `${OUT}.png`);
let pngOk = false;
try {
  execFileSync(process.execPath, ['scripts/figma-atoms/export-png.mjs', inner.rootId, pngPath, '--scale', '1'], { stdio: 'pipe' });
  pngOk = true;
} catch (e) { console.warn(`[extract-frame] png export failed: ${String(e.message).split('\n')[0]}`); }

// Honest summary: instance coverage + unbound counts drive the emitter's map.
let nodes = 0; let instances = 0; let unboundPaints = 0; let unstyledTexts = 0;
(function walk(n) {
  nodes += 1;
  if (n.instance) instances += 1;
  for (const p of [...(n.fills || []), ...(n.strokes || [])]) if (p.type === 'SOLID' && !p.variable) unboundPaints += 1;
  if (n.text && !n.text.textStyle) unstyledTexts += 1;
  (n.children || []).forEach(walk);
})(inner.tree);
console.log(`[extract-frame] ${inner.setName} (page "${inner.pageName}") -> ${jsonPath}${pngOk ? ` + ${pngPath}` : ''}`);
console.log(`[extract-frame] ${nodes} nodes · ${instances} instances · ${unboundPaints} unbound solid paints · ${unstyledTexts} style-less texts`);
