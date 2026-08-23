#!/usr/bin/env node
/**
 * build-page.mjs — compile one ops file into a Figma page-build script and run it
 * through the mcp-shim (figma_execute).
 *
 *   node scripts/figma-atoms/build-page.mjs al-divider [--dry] [--shim 9401]
 *
 * Build policy (recorded in the spec):
 *   - Variants = Default + interaction states that ACTUALLY differ from Default
 *     (pixel-identical Hover/Active bloat is not replicated onto new sets).
 *   - Hybrid layout: auto-layout where the measured source is flex, absolute otherwise.
 *   - Every colour/number binds to the variable the authored CSS names; literals only
 *     where the code itself is literal (e.g. size(2.5) = 20).
 *   - New page `🛠 <Name>` inserted before the ----- MOLECULES ----- divider.
 *   - Aborts if a page or component set with that name already exists.
 */
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveInstance, MISSING_IN_FIGMA } from './instance-map.mjs';
import { isMolecule } from './tiers.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const key = process.argv[2];
if (!key) { console.error('usage: build-page.mjs <ops-key> [--dry]'); process.exit(1); }
const DRY = process.argv.includes('--dry');
const shimArg = process.argv.indexOf('--shim');
const SHIM = shimArg > -1 ? Number(process.argv[shimArg + 1]) : 9401;

const ops = JSON.parse(readFileSync(join(ROOT, '.altitude/figma-sync/ops', `${key}.json`), 'utf8'));

/* ---------- select rows to build ---------------------------------------- */
const rows = ops.rows.filter((r) => r.state === 'Default' || r.differsFromDefault);
if (!rows.length) { console.error('no rows'); process.exit(1); }

/* ---------- compile a row into a node spec ------------------------------ */
const FW = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black', bold: 'Bold', normal: 'Regular' };
const fontStyle = (w) => FW[String(w)] || 'Regular';

/** Node carries nothing visible and is out of flow — a hit-area/native input. Skip it. */
function invisible(k) {
  const abs = k.layout && k.layout.pos === 'absolute';
  const noPaint = !k.fill && !k.stroke && !k.text && !(k.kids || []).length;
  const vishidden = (k.cls || '').includes('al-u-is-vishidden') || (k.cls || '').includes('visually-hidden');
  // The 1px-CLIP form of visually-hidden. Several components hide a label/legend by
  // clipping it to a 1x1 box (checkbox-group's .al-has-hidden-legend legend measures
  // 1x1) instead of using the al-u-is-vishidden utility. The text node survived the
  // class check, kept its full-size glyphs, and overflowed across the component --
  // the Legend=Hidden variants rendered their legend on top of the first checkbox.
  // No real text fits in a 2x2 box, so this is safe.
  const clipped = !!k.text && k.box.w <= 2 && k.box.h <= 2;
  return vishidden || clipped || (abs && noPaint);
}

/** Nested al-* components that could NOT be instanced, with the reason. */
const instanceGaps = [];

function nodeSpec(k, parentBox) {
  // INSTANCE BOUNDARY — a nested al-* component becomes a real Figma instance so that
  // fixing the atom propagates into every molecule that contains it. We stop here: the
  // instance's internals belong to the atom's own component set, not to this molecule.
  if (k.host) {
    const inst = resolveInstance(k.host, k.hostAttrs || {}, k.hostText, k.hostSlots || []);
    const hb = k.hostBox || k.box;
    const rel = parentBox ? { x: +(hb.x - parentBox.x).toFixed(2), y: +(hb.y - parentBox.y).toFixed(2) } : { x: 0, y: 0 };
    if (inst) {
      return {
        name: inst.figmaName,
        x: rel.x, y: rel.y, w: +hb.w.toFixed(2), h: +hb.h.toFixed(2),
        absolute: !!(k.layout && k.layout.pos === 'absolute'),
        instance: inst,
        kids: [],
      };
    }
    // Not in Figma yet (or not mapped) -> fall through to a flattened build, but SAY SO.
    // A silently flattened child looks identical in a screenshot and is a lie about
    // whether the library actually composes.
    instanceGaps.push({
      tag: k.host,
      reason: MISSING_IN_FIGMA.has(k.host) ? 'component set does not exist in Figma yet' : 'not in INSTANCE_MAP',
    });
  }
  const isFlex = k.layout && (k.layout.display === 'flex' || k.layout.display === 'inline-flex');
  const rel = parentBox ? { x: +(k.box.x - parentBox.x).toFixed(2), y: +(k.box.y - parentBox.y).toFixed(2) } : { x: 0, y: 0 };
  return {
    name: k.cls ? k.cls.split(' ')[0] : k.tag,
    x: rel.x, y: rel.y, w: +k.box.w.toFixed(2), h: +k.box.h.toFixed(2),
    absolute: !!(k.layout && k.layout.pos === 'absolute'),
    flex: isFlex ? {
      dir: k.layout.dir === 'column' ? 'VERTICAL' : 'HORIZONTAL',
      gap: k.layout.gap || 0,
      pad: k.layout.pad || [0, 0, 0, 0],
      align: k.layout.align, justify: k.layout.justify,
    } : null,
    fill: k.fill || null,
    textColor: k.textColor || null,
    stroke: k.stroke || null,
    radius: k.radius || null,
    opacity: k.opacity || null,
    text: k.text ? {
      chars: k.text,
      family: k.font ? k.font.ff : 'IBM Plex Sans',
      style: k.font ? fontStyle(k.font.fw) : 'Regular',
      size: k.font ? k.font.fs : 14,
      lineHeight: k.font ? k.font.lh : null,
    } : null,
    kids: (k.kids || [])
      .filter((c) => (c.box.w > 0.5 || c.box.h > 0.5 || c.text) && !invisible(c))
      .map((c) => nodeSpec(c, k.box)),
  };
}

const variants = rows.map((r) => {
  const size = r.expected ? { w: r.expected.w, h: r.expected.h } : null;
  return {
    name: r.variant,
    state: r.state,
    axes: r.axes,
    size,
    layout: r.layout && (r.layout.display === 'flex' || r.layout.display === 'inline-flex')
      ? { dir: r.layout.dir === 'column' ? 'VERTICAL' : 'HORIZONTAL', align: r.layout.align, justify: r.layout.justify }
      : null,
    fill: r.fill, textColor: r.textColor, opacity: r.opacity,
    stroke: r.stroke, padding: r.padding, radius: r.radius, gap: r.gap,
    focusRing: r.focusRing,
    text: r.text ? { chars: r.text.content, family: r.text.family, style: fontStyle(r.text.weight), size: r.text.size, lineHeight: r.text.lineHeight, colorToken: r.text.colorToken } : null,
    children: (r.children || [])
      .filter((c) => (c.box.w > 0.5 || c.box.h > 0.5 || c.text) && !invisible(c))
      .map((c) => nodeSpec(c, { x: 0, y: 0 })),
  };
});

// grid layout: columns = distinct semantic-axis combos, rows = states
const stateOrder = ['Default', 'Hover', 'Focus', 'Active', 'Disabled', 'Error'];
const semKey = (r) => JSON.stringify(r.axes);
const cols = [...new Set(rows.map(semKey))];
const states = [...new Set(rows.map((r) => r.state))].sort((a, b) => stateOrder.indexOf(a) - stateOrder.indexOf(b));
const maxW = Math.max(...variants.map((v) => (v.size ? v.size.w : 100)), 60);
const maxH = Math.max(...variants.map((v) => (v.size ? v.size.h : 40)), 24);
const pitchX = Math.ceil((maxW + 48) / 2) * 2;
const pitchY = Math.ceil((maxH + 48) / 2) * 2;
for (const v of variants) {
  v.gx = cols.indexOf(JSON.stringify(v.axes));
  v.gy = states.indexOf(v.state);
}

const plan = {
  key: ops.key, name: ops.name, note: ops.note || null,
  pitchX, pitchY, variants,
  colLabels: cols.map((c) => Object.entries(JSON.parse(c)).map(([a, b]) => `${a}=${b}`).join(', ') || '—'),
  rowLabels: states.map((s) => `State=${s}`),
};

if (instanceGaps.length) {
  const byTag = new Map();
  for (const g of instanceGaps) byTag.set(g.tag, g.reason);
  console.error('[instance gaps] these nested components were FLATTENED, not instanced:');
  for (const [tag, reason] of byTag) console.error(`  ${tag} — ${reason}`);
}

if (DRY) {
  console.log(JSON.stringify(plan, null, 1).slice(0, 4000));
  console.log(`variants: ${variants.length}, grid ${cols.length}x${states.length}, pitch ${pitchX}x${pitchY}`);
  process.exit(0);
}

/* ---------- plugin-side builder ------------------------------------------ */
const PLUGIN = String.raw`
const PLAN = __PLAN__;
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) V[v.name] = v;

async function rawOf(v) {
  const c = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
  let val = v.valuesByMode[c.defaultModeId];
  let g = 0;
  while (val && val.type === 'VARIABLE_ALIAS' && g++ < 8) {
    const nv = await figma.variables.getVariableByIdAsync(val.id);
    const nc = await figma.variables.getVariableCollectionByIdAsync(nv.variableCollectionId);
    val = nv.valuesByMode[nc.defaultModeId];
  }
  return val;
}
const misses = new Set();
async function boundSolid(name) {
  const vv = V[name];
  if (!vv) { misses.add(name); return null; }
  const val = await rawOf(vv);
  const color = val && val.r !== undefined ? { r: val.r, g: val.g, b: val.b } : { r: 0, g: 0, b: 0 };
  let paint = { type: 'SOLID', color };
  if (val && val.a !== undefined && val.a < 1) paint.opacity = val.a;
  return figma.variables.setBoundVariableForPaint(paint, 'color', vv);
}
function bindNum(node, field, name) {
  if (!name) return false;
  // { lit: n } — a value Figma cannot express as a variable (a calc() multiple of a
  // token). Set the number directly rather than binding the unmultiplied token.
  if (typeof name === 'object') {
    if (name.lit === undefined) return false;
    try { node[field] = name.lit; return true; } catch (e) { return false; }
  }
  const vv = V[name];
  if (!vv) { misses.add(name); return false; }
  try { node.setBoundVariable(field, vv); return true; } catch (e) { return false; }
}
const loaded = new Set();
async function font(family, style) {
  const k = family + '/' + style;
  if (!loaded.has(k)) {
    try { await figma.loadFontAsync({ family, style }); loaded.add(k); }
    catch (e) { await figma.loadFontAsync({ family, style: 'Regular' }); loaded.add(family + '/Regular'); return { family, style: 'Regular' }; }
  }
  return { family, style };
}

// page must not already exist
await figma.loadAllPagesAsync();
const pageName = '\u{1F6E0} ' + PLAN.name;
if (figma.root.children.some((p) => p.name === pageName)) return 'PAGE EXISTS: ' + pageName;
const page = figma.createPage();
page.name = pageName;
// An ATOM page goes just BEFORE the MOLECULES divider (i.e. at the end of ATOMS); a
// MOLECULE page goes just AFTER it. Using the atom rule for molecules is silent — the
// page builds correctly and lands in the wrong section.
const molIdx = figma.root.children.findIndex((p) => p.name.indexOf('MOLECULES') !== -1);
const IS_MOL = __IS_MOL__;
if (molIdx > -1) figma.root.insertChild(IS_MOL ? molIdx + 1 : molIdx, page);
await figma.setCurrentPageAsync(page);

const instMisses = [];

// Component sets by name, across every page. Cached: the scan is a full tree walk.
let SETS = null;
async function setByName(name) {
  if (!SETS) {
    SETS = {};
    for (const pg of figma.root.children) {
      await pg.loadAsync();
      const walk = (n, d) => {
        if (n.type === 'COMPONENT_SET') { if (!SETS[n.name]) SETS[n.name] = n; return; }
        if ('children' in n && d < 3) for (const c of n.children) walk(c, d + 1);
      };
      for (const c of pg.children) walk(c, 0);
    }
  }
  return SETS[name] || null;
}

// The Icons page holds 71 flat components; cache them by name on first use.
let ICONS = null;
async function iconByName(name) {
  if (!ICONS) {
    ICONS = {};
    const ip = figma.root.children.find((x) => x.name.indexOf('Icons') !== -1);
    if (ip) {
      await ip.loadAsync();
      const walk = (n, d) => {
        if (n.type === 'COMPONENT') { ICONS[n.name] = n; return; }
        if ('children' in n && d < 4) for (const c of n.children) walk(c, d + 1);
      };
      for (const c of ip.children) walk(c, 0);
    }
  }
  return ICONS[name] || null;
}

async function buildInstance(spec) {
  if (spec.instance.icon) {
    const ic = await iconByName(spec.instance.icon);
    if (!ic) { instMisses.push('icon not on Icons page: ' + spec.instance.icon); return null; }
    const ii = ic.createInstance();
    if (spec.w > 0.5 && spec.h > 0.5) { try { ii.resize(spec.w, spec.h); } catch (e) { /* fixed */ } }
    return ii;
  }
  // id === null -> resolve by NAME. Molecule sets are rebuilt (new id each time), so
  // only the repaired-in-place atom sets can be addressed by id.
  const setNode = spec.instance.id
    ? await figma.getNodeByIdAsync(spec.instance.id)
    : await setByName(spec.instance.figmaName);
  if (!setNode) { instMisses.push(spec.instance.figmaName + ': node ' + spec.instance.id + ' not found'); return null; }
  const base = setNode.type === 'COMPONENT_SET' ? setNode.defaultVariant : setNode;
  if (!base) { instMisses.push(spec.instance.figmaName + ': no default variant'); return null; }
  const defs = (setNode.componentPropertyDefinitions) || {};
  const apply = {};
  // Variant axes: only send values this set actually offers. An unknown value throws and
  // would abort the whole build, so it is recorded and dropped instead.
  for (const k in spec.instance.props || {}) {
    const want = spec.instance.props[k];
    const d = defs[k];
    if (d && d.variantOptions && d.variantOptions.indexOf(want) !== -1) apply[k] = want;
    else instMisses.push(spec.instance.figmaName + ': no ' + k + '=' + want);
  }
  // TEXT / BOOLEAN keys carry a per-set '#id' suffix — match on the part before '#'.
  for (const key in defs) {
    const d = defs[key];
    const pre = key.split('#')[0];
    if (d.type === 'TEXT' && spec.instance.text != null && pre === 'Text') apply[key] = String(spec.instance.text);
    if (d.type === 'BOOLEAN' && spec.instance.bools && pre in spec.instance.bools) apply[key] = !!spec.instance.bools[pre];
  }
  const inst = base.createInstance();
  if (Object.keys(apply).length) {
    try { inst.setProperties(apply); }
    catch (e) { instMisses.push(spec.instance.figmaName + ': setProperties ' + e.message); }
  }
  // An instance is born at the MAIN component's size, which is not the size the browser
  // gave this occurrence (a Tab inside a stretch Tabs, a full-width Button). Resize to
  // the measured host box. Best-effort: a hugging auto-layout main can refuse one axis.
  if (spec.w > 0.5 && spec.h > 0.5) {
    try { inst.resize(spec.w, spec.h); } catch (e) { /* main component controls its size */ }
  }
  return inst;
}

async function buildNode(spec, parentFlex) {
  let node;
  if (spec.instance) {
    const inst = await buildInstance(spec);
    if (inst) return inst;
    // fall through to a plain frame if the instance could not be made
  }
  if (spec.text && (!spec.kids || !spec.kids.length)) {
    const f = await font(spec.text.family || 'IBM Plex Sans', spec.text.style || 'Regular');
    node = figma.createText();
    node.fontName = f;
    node.characters = spec.text.chars;
    if (spec.text.size) node.fontSize = spec.text.size;
    if (spec.text.lineHeight) node.lineHeight = { value: spec.text.lineHeight, unit: 'PIXELS' };
    if (spec.textColor) { const p = await boundSolid(spec.textColor); if (p) node.fills = [p]; }
    // A text node auto-resizes to its glyphs, which throws away a measured box that is
    // deliberately TALLER than one line — al-range's label is a 64px block containing a
    // single line, and letting it hug made the whole component 40px short. Only pin the
    // size when the measurement really is bigger than the type, so ordinary labels still
    // hug and stay resilient to font substitution.
    const lh = (spec.text.lineHeight || (spec.text.size || 14) * 1.4);
    // ...and CAP it at ~3 lines. Some nodes carry text while their box is really a
    // layout container: file-upload's dropzone wrapper is 180px tall around a 24px line
    // (7.5x) because its icon and button are hoisted out as siblings. Pinning that made
    // the component 156px too tall. al-range's genuine tall label is 64px on a 24px line
    // (2.7x), so 3x separates the two cleanly.
    if (spec.h > lh + 4 && spec.h <= lh * 3 && spec.w > 0.5) {
      try { node.textAutoResize = 'NONE'; node.resize(spec.w, spec.h); } catch (e) { /* keep hugging */ }
    }
  } else {
    node = figma.createFrame();
    node.name = spec.name;
    node.resize(Math.max(spec.w, 0.01), Math.max(spec.h, 0.01));
    node.fills = [];
    if (spec.flex) {
      node.layoutMode = spec.flex.dir;
      node.itemSpacing = spec.flex.gap;
      node.paddingTop = spec.flex.pad[0]; node.paddingRight = spec.flex.pad[1];
      node.paddingBottom = spec.flex.pad[2]; node.paddingLeft = spec.flex.pad[3];
      node.counterAxisAlignItems = spec.flex.align === 'center' ? 'CENTER' : spec.flex.align === 'flex-end' ? 'MAX' : 'MIN';
      node.primaryAxisAlignItems = spec.flex.justify === 'center' ? 'CENTER' : spec.flex.justify === 'flex-end' ? 'MAX' : spec.flex.justify === 'space-between' ? 'SPACE_BETWEEN' : 'MIN';
    }
    node.clipsContent = false;
    if (spec.fill) { const p = await boundSolid(spec.fill); if (p) node.fills = [p]; }
    if (spec.stroke && spec.stroke.color) {
      const p = await boundSolid(spec.stroke.color);
      if (p) { node.strokes = [p]; node.strokeWeight = 1; if (spec.stroke.width) bindNum(node, 'strokeWeight', spec.stroke.width); }
    }
    if (spec.radius) {
      for (const f of ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius']) bindNum(node, f, spec.radius);
    }
    if (spec.opacity) bindNum(node, 'opacity', spec.opacity);
    for (const c of spec.kids || []) {
      const ch = await buildNode(c, !!spec.flex);
      node.appendChild(ch);
      if (spec.flex && c.absolute) { ch.layoutPositioning = 'ABSOLUTE'; ch.x = c.x; ch.y = c.y; }
      else if (!spec.flex) { ch.x = c.x; ch.y = c.y; }
    }
  }
  return node;
}

const comps = [];
for (const v of PLAN.variants) {
  const comp = figma.createComponent();
  comp.name = v.name;
  page.appendChild(comp);
  comp.x = 40 + v.gx * PLAN.pitchX;
  comp.y = 40 + v.gy * PLAN.pitchY;
  comp.fills = [];

  const isFlexRoot = v.children.length > 0;
  if (v.size) comp.resize(Math.max(v.size.w || 100, 1), Math.max(v.size.h || 24, 1));

  if (v.fill) { const p = await boundSolid(v.fill); if (p) comp.fills = [p]; }
  if (v.stroke && v.stroke.color) {
    const p = await boundSolid(v.stroke.color);
    if (p) { comp.strokes = [p]; comp.strokeWeight = 1; if (v.stroke.width) bindNum(comp, 'strokeWeight', v.stroke.width); }
  }
  if (v.opacity) bindNum(comp, 'opacity', v.opacity);

  // padding + autolayout when the row carries them
  const hasPad = v.padding && (v.padding.top || v.padding.left);
  // A root that is NOT flex in the browser must not be given an auto-layout. Defaulting
  // to HORIZONTAL laid al-tabs' tablist and its tab-panel side by side, giving 557x40
  // where the browser renders 291x79. Non-flex roots keep their measured absolute
  // geometry instead, which is what nodeSpec already recorded.
  const autoLayout = !!v.layout || !v.children.length;
  if (autoLayout && (hasPad || v.text || v.gap || v.children.length)) {
    comp.layoutMode = v.layout ? v.layout.dir : 'HORIZONTAL';
    comp.primaryAxisSizingMode = 'AUTO';
    comp.counterAxisSizingMode = 'AUTO';
    const al = v.layout ? v.layout.align : 'center';
    const ju = v.layout ? v.layout.justify : 'center';
    comp.counterAxisAlignItems = al === 'center' ? 'CENTER' : al === 'flex-end' ? 'MAX' : al === 'normal' || al === 'stretch' ? 'MIN' : 'MIN';
    comp.primaryAxisAlignItems = ju === 'center' ? 'CENTER' : ju === 'flex-end' ? 'MAX' : ju === 'space-between' ? 'SPACE_BETWEEN' : 'MIN';
    if (!v.layout) { comp.counterAxisAlignItems = 'CENTER'; comp.primaryAxisAlignItems = 'CENTER'; }
    if (v.padding) {
      bindNum(comp, 'paddingTop', v.padding.top);
      bindNum(comp, 'paddingBottom', v.padding.bottom);
      bindNum(comp, 'paddingLeft', v.padding.left);
      bindNum(comp, 'paddingRight', v.padding.right);
    }
    if (v.gap) bindNum(comp, 'itemSpacing', v.gap);
  }
  if (v.radius) {
    for (const f of ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius']) {
      const rr = v.radius[{topLeftRadius:'tl',topRightRadius:'tr',bottomRightRadius:'br',bottomLeftRadius:'bl'}[f]];
      if (rr) bindNum(comp, f, rr);
    }
  }

  if (v.children.length) {
    // the tree includes the label text node — do not also append v.text
    for (const c of v.children) {
      const ch = await buildNode(c, comp.layoutMode !== 'NONE');
      comp.appendChild(ch);
      if (comp.layoutMode !== 'NONE') {
        if (c.absolute) { ch.layoutPositioning = 'ABSOLUTE'; ch.x = c.x; ch.y = c.y; }
      } else {
        ch.x = c.x; ch.y = c.y;
      }
    }
  } else if (v.text) {
    const f = await font(v.text.family || 'IBM Plex Sans', v.text.style);
    const t = figma.createText();
    t.fontName = f;
    t.characters = v.text.chars;
    t.fontSize = v.text.size || 14;
    if (v.text.lineHeight) t.lineHeight = { value: v.text.lineHeight, unit: 'PIXELS' };
    const ct = v.text.colorToken || v.textColor;
    if (ct) { const p = await boundSolid(ct); if (p) t.fills = [p]; }
    comp.appendChild(t);
  } else if (v.size) {
    comp.resize(Math.max(v.size.w || 100, 1), Math.max(v.size.h || 24, 1));
  }

  // focus ring as an outside stroke rectangle, library convention
  if (v.focusRing) {
    const ring = figma.createRectangle();
    ring.name = 'Focus Outline';
    ring.fills = [];
    const p = await boundSolid(v.focusRing.color);
    if (p) ring.strokes = [p];
    ring.strokeWeight = 2;
    ring.cornerRadius = 6;
    comp.appendChild(ring);
    ring.layoutPositioning = comp.layoutMode !== 'NONE' ? 'ABSOLUTE' : ring.layoutPositioning;
    ring.resize(comp.width + 8, comp.height + 8);
    ring.x = -4; ring.y = -4;
  }
  comps.push(comp);
}

const set = figma.combineAsVariants(comps, page);
set.name = PLAN.name;
if (PLAN.note) set.description = PLAN.note;
set.x = 300; set.y = 120;

const sizes = {};
for (const c of set.children) sizes[c.name] = Math.round(c.width) + 'x' + Math.round(c.height);
// instMisses must be REPORTED. A child that failed to instance falls back to a
// flattened frame that looks identical in a screenshot, so silence here reads as
// "the library composes" when it does not.
return JSON.stringify({
  page: page.name, set: set.id, variants: set.children.length, sizes,
  missingVars: [...misses],
  instanceMisses: [...new Set(instMisses)],
});
`;

const code = PLUGIN.replace('__PLAN__', JSON.stringify(plan)).replace('__IS_MOL__', String(isMolecule(key)));
const res = await fetch(`http://localhost:${SHIM}/call`, {
  method: 'POST',
  body: JSON.stringify({ name: 'figma_execute', arguments: { code } }),
});
const out = await res.json();
try {
  const t = JSON.parse(out.text);
  const r = typeof t.result === 'string' ? (() => { try { return JSON.parse(t.result); } catch { return t.result; } })() : t.result;
  console.log(JSON.stringify(r, null, 1));
} catch {
  console.log(out.text ? out.text.slice(0, 1500) : out);
}
