#!/usr/bin/env node
/**
 * build-spec.mjs — turn measured atom styles into a Figma node spec with real
 * variable bindings.
 *
 * The hard part is not geometry, it is provenance: a computed style gives you
 * `rgb(67, 117, 255)`, not `theme.color.background.primary-default`. Matching a
 * single colour back to a token is ambiguous — dozens of tokens share a hex.
 *
 * The trick: measure the SAME case in Light and Dark and match the PAIR.
 * `(#E9E7E2, #181818)` identifies `theme/color/background/neutral-default` uniquely, where
 * either half alone would not. Mode-invariant pairs fall through to Primitives.
 *
 * Usage:
 *   node scripts/figma-atoms/build-spec.mjs
 * Reads:  atoms-light.json, atoms-dark.json (from measure step)
 *         .altitude/figma-sync/altitude-figma-payload.json (token values)
 * Writes: .altitude/figma-sync/atoms-figma-spec.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAN } from './plan.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const payload = read('.altitude/figma-sync/altitude-figma-payload.json');
const light = read('atoms-light.json');
const dark = read('atoms-dark.json');

/* ---------- token value resolution -------------------------------------- */

const prim = payload.collections.find((c) => c.name === 'Primitives').variables.Default;
const theme = payload.collections.find((c) => c.name === 'Theme').variables;

const norm = (hex) => {
  let h = String(hex).replace('#', '').toUpperCase();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length === 8 && h.slice(6) === 'FF') h = h.slice(0, 6);
  return '#' + h;
};

/** Resolve a token path (dotted) to a hex string in a given theme mode. */
function resolveToken(name, mode, depth = 0) {
  if (depth > 8) return null;
  const key = name.replace(/\./g, '/');
  const def = (theme[mode] && theme[mode][key]) || prim[key];
  if (!def) return null;
  const v = def.value;
  if (typeof v === 'string' && v.startsWith('{')) return resolveToken(v.slice(1, -1), mode, depth + 1);
  return typeof v === 'string' && v.startsWith('#') ? norm(v) : null;
}

// (lightHex|darkHex) -> variable name. Theme first: it is the meaningful binding.
const pairIndex = new Map();
for (const key of Object.keys(theme.Light)) {
  if (!(key in theme.Dark)) continue;
  const l = resolveToken(key, 'Light');
  const d = resolveToken(key, 'Dark');
  if (!l || !d) continue;
  const k = `${l}|${d}`;
  if (!pairIndex.has(k)) pairIndex.set(k, key);
}
// Mode-invariant fallback: raw primitives.
const primIndex = new Map();
for (const [key, def] of Object.entries(prim)) {
  if (def.resolvedType !== 'COLOR') continue;
  const h = norm(def.value);
  if (!primIndex.has(h)) primIndex.set(h, key);
}

const FLOAT_TOKENS = Object.entries(prim)
  .filter(([, d]) => d.resolvedType === 'FLOAT')
  .map(([k, d]) => [k, d.value]);
const semantic = payload.collections.find((c) => c.name === 'Semantic').variables.Default;
const SEM_FLOATS = Object.entries(semantic).map(([k, d]) => {
  let v = d.value;
  if (typeof v === 'string' && v.startsWith('{')) {
    const t = prim[v.slice(1, -1).replace(/\./g, '/')];
    v = t ? t.value : null;
  }
  return [k, v];
}).filter(([, v]) => typeof v === 'number');

/* ---------- colour + number matching ------------------------------------ */

function cssToHex(css) {
  if (!css || css === 'transparent') return null;
  const m = String(css).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
  const [r, g, b] = parts;
  const a = parts.length > 3 ? parts[3] : 1;
  if (a === 0) return 'TRANSPARENT';
  const h = (n) => Math.round(n).toString(16).padStart(2, '0').toUpperCase();
  return '#' + h(r) + h(g) + h(b) + (a < 1 ? h(a * 255) : '');
}

/** Bind a light/dark colour pair to a variable name, or fall back to a literal. */
function bindColor(lCss, dCss) {
  const l = cssToHex(lCss);
  const d = cssToHex(dCss);
  if (!l || !d) return null;
  if (l === 'TRANSPARENT' && d === 'TRANSPARENT') return { kind: 'none' };
  const pair = pairIndex.get(`${norm(l)}|${norm(d)}`);
  if (pair) return { kind: 'var', name: pair, resolved: { light: l, dark: d } };
  if (norm(l) === norm(d)) {
    const p = primIndex.get(norm(l));
    if (p) return { kind: 'var', name: p, resolved: { light: l, dark: d } };
  }
  return { kind: 'literal', light: l, dark: d };
}

/**
 * Bind a px number to a token — CATEGORY-AWARE.
 *
 * Value-only matching is wrong here: 16 is simultaneously `theme/space/@`,
 * `space/16`, `font-size/16`, `line-height/16` and `base/font`. Matching by value
 * alone bound a button's font-size to a SPACING token. Each call site says what
 * kind of number it is, and only same-kind tokens are candidates.
 */
const CANDIDATES = {
  space: [...SEM_FLOATS.filter(([k]) => k.startsWith('theme/space')),
          ...FLOAT_TOKENS.filter(([k]) => k.startsWith('space/'))],
  radius: [...SEM_FLOATS.filter(([k]) => k.startsWith('theme/border/radius')),
           ...FLOAT_TOKENS.filter(([k]) => k.startsWith('border/radius'))],
  strokeWidth: [...SEM_FLOATS.filter(([k]) => k.startsWith('theme/border/width')),
                ...FLOAT_TOKENS.filter(([k]) => k.startsWith('border/width'))],
  fontSize: FLOAT_TOKENS.filter(([k]) => k.startsWith('font-size/')),
  lineHeight: FLOAT_TOKENS.filter(([k]) => k.startsWith('line-height/')),
};

function bindNumber(n, kind) {
  if (typeof n !== 'number' || Number.isNaN(n)) return null;
  if (n === 0) return { kind: 'literal', value: 0 };
  const pool = CANDIDATES[kind] || [];
  const hit = pool.find(([, v]) => v === n);
  if (hit) return { kind: 'var', name: hit[0], value: n };
  return { kind: 'literal', value: n };
}

/* ---------- build ------------------------------------------------------- */

const keyOf = (r) => `${r.tag}::${r.case}`;
const darkBy = new Map(dark.map((r) => [keyOf(r), r]));

const stats = { cases: 0, colorSlots: 0, boundVar: 0, boundTheme: 0, literal: 0, numbers: 0, numbersBound: 0 };
const unmatched = [];

const atoms = PLAN.map((a) => {
  const cases = a.cases.map((c) => {
    const l = light.find((r) => r.tag === a.tag && r.case === c.id);
    const d = darkBy.get(`${a.tag}::${c.id}`);
    if (!l || !d) return null;
    stats.cases++;

    const colors = {
      fill: bindColor(l.bg, d.bg),
      stroke: l.bw[0] > 0 ? bindColor(l.bc, d.bc) : { kind: 'none' },
      text: bindColor(l.fc, d.fc),
    };
    for (const [slot, b] of Object.entries(colors)) {
      if (!b || b.kind === 'none') continue;
      stats.colorSlots++;
      if (b.kind === 'var') {
        stats.boundVar++;
        if (b.name.startsWith('theme/')) stats.boundTheme++;
      } else {
        stats.literal++;
        unmatched.push({ tag: a.tag, case: c.id, slot, light: b.light, dark: b.dark });
      }
    }

    const nums = {
      radius: l.r.map((v) => bindNumber(v, 'radius')),
      padding: l.pad.map((v) => bindNumber(v, 'space')),
      gap: bindNumber(l.gap, 'space'),
      strokeWidth: bindNumber(l.bw[0], 'strokeWidth'),
      fontSize: bindNumber(l.fs, 'fontSize'),
      lineHeight: bindNumber(l.lh, 'lineHeight'),
    };
    for (const v of [...nums.radius, ...nums.padding, nums.gap, nums.strokeWidth, nums.fontSize, nums.lineHeight]) {
      if (!v) continue;
      stats.numbers++;
      if (v.kind === 'var') stats.numbersBound++;
    }

    return {
      variant: c.axisValues,
      variantName: Object.entries(c.axisValues).map(([k, v]) => `${k}=${v}`).join(', '),
      size: { w: l.w, h: l.h },
      layout: {
        display: l.display, dir: l.dir, align: l.align, justify: l.justify,
        fill: !!c.fill,
      },
      colors, nums,
      opacity: l.op,
      shadow: l.shadow,
      text: l.txt
        ? { content: l.txt, fontFamily: l.ff.split(',')[0].replace(/["']/g, '').trim(),
            fontWeight: l.fw, letterSpacing: l.ls, decoration: l.td, transform: l.tt }
        : null,
    };
  }).filter(Boolean);

  return { tag: a.tag, name: a.figmaName, axisNames: a.axisNames, note: a.note, cases };
});

const out = { stats, atoms, unmatched };
writeFileSync(join(ROOT, '.altitude/figma-sync/atoms-figma-spec.json'), JSON.stringify(out, null, 1) + '\n');

console.log(`cases            ${stats.cases}`);
console.log(`colour slots     ${stats.colorSlots}`);
console.log(`  bound to var   ${stats.boundVar} (${stats.boundTheme} to Theme, mode-aware)`);
console.log(`  literal        ${stats.literal}`);
console.log(`numbers          ${stats.numbers} (${stats.numbersBound} bound to a token)`);
if (unmatched.length) {
  const byPair = new Map();
  for (const u of unmatched) {
    const k = `${u.light}|${u.dark}`;
    byPair.set(k, (byPair.get(k) || 0) + 1);
  }
  console.log(`\nunmatched colour pairs (${byPair.size} distinct):`);
  for (const [k, n] of [...byPair].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${k}  x${n}`);
}
