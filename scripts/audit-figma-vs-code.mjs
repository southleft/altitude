#!/usr/bin/env node
/**
 * audit-figma-vs-code.mjs — diff the live Figma variables in
 * `Altitude Design System` (y83n4o9LOGs74oAoguFcGS) against `styles/tokens-dtcg/**`.
 *
 * Input:  .altitude/figma-sync/figma-live-vars.json  (POSTed out of the plugin)
 * Output: .altitude/figma-sync/figma-audit.json + a console summary
 *
 * The two systems do NOT share a naming scheme, so a raw name diff is noise.
 * ALIASES below encodes every known rename; anything left over is real drift.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isTokenLeaf, normalizeLeaf } from './lib/dtcg-token.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS = join(ROOT, 'libs/al-web-components/styles/tokens-dtcg');
const live = JSON.parse(readFileSync(join(ROOT, '.altitude/figma-sync/figma-live-vars.json'), 'utf8'));

/** Figma name prefix -> code token prefix. Longest match wins. */
const ALIASES = [
  ['typography/font-size/', 'font-size.'],
  ['typography/line-height/', 'line-height.'],
  ['typography/font-family/', 'font-family.'],
  ['typography/font-weight/', 'font-weight.'],
  ['typography/letter-spacing/', 'letter-spacing.'],
  ['typography/text-decoration/', 'text-decoration.'],
  ['animation/distance/', 'animation.distance.'],
  ['color/neutral/paper/', 'color.brand.paper.'],
  ['color/neutral/ink/', 'color.brand.ink.'],
];

const figmaToCode = (n) => {
  const dotted = n.replace(/\//g, '.');
  for (const [f, c] of ALIASES) {
    const fd = f.replace(/\//g, '.');
    if (dotted.startsWith(fd)) return c + dotted.slice(fd.length);
  }
  return dotted;
};

/* ---------- flatten the code token source ------------------------------- */
const readJson = (p) => JSON.parse(readFileSync(join(TOKENS, p), 'utf8'));
const FILES = [
  'tier-1/animations.json', 'tier-1/base.json', 'tier-1/borders.json', 'tier-1/breakpoints.json',
  'tier-1/colors.json', 'tier-1/icons.json', 'tier-1/layout.json', 'tier-1/opacity.json',
  'tier-1/shadows.json', 'tier-1/spacing.json', 'tier-1/typography.json', 'tier-1/z-index.json',
  'tier-2/animations.json', 'tier-2/borders.json', 'tier-2/icons.json', 'tier-2/layout.json',
  'tier-2/opacity.json', 'tier-2/shadows.json', 'tier-2/spacing.json', 'tier-2/typography.json',
];
const THEME = {
  Light: ['tier-2/theme/light/colors.json', 'tier-3/theme/light/colors.json'],
  Dark: ['tier-2/theme/dark/colors.json', 'tier-3/theme/dark/colors.json'],
};

function flatten(node, prefix, out) {
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('$')) continue;
    const p = prefix ? `${prefix}.${k}` : k;
    if (isTokenLeaf(v)) out[p] = normalizeLeaf(v);
    else if (v && typeof v === 'object') flatten(v, p, out);
  }
  return out;
}

const codeFlat = {};
for (const f of FILES) flatten(readJson(f), '', codeFlat);
const codeTheme = { Light: {}, Dark: {} };
for (const [mode, files] of Object.entries(THEME)) for (const f of files) flatten(readJson(f), '', codeTheme[mode]);

/* ---------- value normalisation ----------------------------------------- */
const REM = 16;
function num(v) {
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if (s.endsWith('rem')) return parseFloat(s) * REM;
  if (s.endsWith('px')) return parseFloat(s);
  if (s.endsWith('%')) return { pct: parseFloat(s) };
  const n = Number(s);
  return Number.isNaN(n) ? s : n;
}
const normHex = (h) => {
  let s = String(h).replace('#', '').toUpperCase();
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  if (s.length === 8 && s.slice(6) === 'FF') s = s.slice(0, 6);
  return '#' + s;
};
function rgbaToHex(s) {
  const m = String(s).match(/^rgba?\(([^)]+)\)$/i);
  if (!m) return null;
  const p = m[1].split(',').map((x) => parseFloat(x.trim()));
  const h = (n) => Math.round(n).toString(16).padStart(2, '0').toUpperCase();
  const a = p.length > 3 ? p[3] : 1;
  return '#' + h(p[0]) + h(p[1]) + h(p[2]) + (a < 1 ? h(a * 255) : '');
}
/** Code value -> comparable form. Aliases become `{dotted.path}`. */
function codeVal(raw) {
  if (typeof raw === 'string' && raw.startsWith('{')) return { alias: raw.slice(1, -1) };
  if (typeof raw === 'string' && /^#|^rgba?\(/i.test(raw)) {
    return { hex: raw.startsWith('#') ? normHex(raw) : normHex(rgbaToHex(raw)) };
  }
  const n = num(raw);
  return typeof n === 'number' ? { num: n } : { other: n };
}
/**
 * Figma value -> comparable form.
 *
 * The dump's per-mode cell is an OBJECT — `{alias: "space/4"}` for a
 * VARIABLE_ALIAS, `{value: <raw>}` otherwise — never the `"{space/4}"` STRING
 * this function used to test for. Every aliased variable therefore fell through
 * to `{other: <the object>}`, which `same()` can never match against the code's
 * `{alias: "space.4"}`, so all 300-odd aliased tokens reported as VALUE
 * MISMATCH and the audit printed `matching: 5` out of 492. That is noise dense
 * enough to hide the real drift completely, which is the only reason this
 * function is worth this comment.
 *
 * COLOR literals arrive as {r,g,b,a} floats in 0..1, not as a hex string.
 */
function figVal(raw) {
  if (raw == null) return null;

  // Dump cell shapes.
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    if (typeof raw.alias === 'string') return { alias: figmaToCode(raw.alias) };
    if ('value' in raw) return figVal(raw.value);
    if (typeof raw.r === 'number' && typeof raw.g === 'number' && typeof raw.b === 'number') {
      const ch = (n) => Math.round(n * 255).toString(16).padStart(2, '0').toUpperCase();
      const a = typeof raw.a === 'number' ? raw.a : 1;
      return { hex: normHex('#' + ch(raw.r) + ch(raw.g) + ch(raw.b) + (a < 1 ? ch(a) : '')) };
    }
  }

  // Legacy/flat shapes.
  if (typeof raw === 'string' && raw.startsWith('{')) return { alias: figmaToCode(raw.slice(1, -1)) };
  if (typeof raw === 'string' && /^#|^rgba?\(/i.test(raw)) {
    return { hex: raw.startsWith('#') ? normHex(raw) : normHex(rgbaToHex(raw)) };
  }
  if (typeof raw === 'number') return { num: raw };
  const n = num(raw);
  return typeof n === 'number' ? { num: n } : { other: n };
}
function same(a, b) {
  if (!a || !b) return false;
  if (a.alias && b.alias) return a.alias === b.alias;
  if (a.hex && b.hex) return a.hex === b.hex;
  if ('num' in a && 'num' in b) return Math.abs(a.num - b.num) < 0.001;
  if (a.other !== undefined && b.other !== undefined) return String(a.other) === String(b.other);
  return false;
}
const show = (v) => (v == null ? 'ABSENT' : v.alias ? `{${v.alias}}` : v.hex || (('num' in v) ? v.num : v.other));

/* ---------- diff -------------------------------------------------------- */
const report = {
  figmaOnly: [], codeOnly: [], valueMismatch: [], modeGap: [], brandModes: {}, ok: 0,
};

const seenCode = new Set();

/**
 * Collection names have been observed with AND without the pipe separator —
 * `Tier 2 Theme` (2026-08-20) vs `Tier 2 | Theme` (live-read 2026-08-26 and
 * again 2026-08-31). Matching one spelling literally meant that against the
 * live file NEITHER the theme branch nor the brand branch below ever ran: every
 * theme variable skipped its per-mode Light/Dark comparison and fell through to
 * the generic name diff, every brand override was audited as if it were a plain
 * variable, and the summary line at the bottom dereferenced `.modes` on the
 * `undefined` returned by `.find()` — a TypeError that took the whole audit down
 * before it printed anything. Normalise instead of matching a spelling.
 */
const collKey = (n) => String(n).replace(/\s*\|\s*/g, ' ').trim();
const isTheme = (n) => collKey(n) === 'Tier 2 Theme';
const isBrand = (n) => collKey(n) === 'Tier 2 Brand';
const themeCollections = { has: (n) => isTheme(n) };

for (const v of live.variables) {
  const codeName = figmaToCode(v.name);

  if (isBrand(v.collection)) {
    (report.brandModes[v.name] = report.brandModes[v.name] || []).push(v.values);
    continue; // brand overrides are audited separately below
  }

  if (themeCollections.has(v.collection)) {
    seenCode.add(codeName);
    for (const mode of ['Light', 'Dark']) {
      const cdef = codeTheme[mode][codeName];
      const f = figVal(v.values[mode]);
      if (!cdef) {
        report.modeGap.push({ name: v.name, mode, figma: show(f), code: 'ABSENT in code' });
        continue;
      }
      const c = codeVal(cdef.value);
      if (!same(f, c)) report.valueMismatch.push({ name: v.name, mode, figma: show(f), code: show(c) });
      else report.ok++;
    }
    continue;
  }

  const cdef = codeFlat[codeName];
  if (!cdef) { report.figmaOnly.push({ name: v.name, collection: v.collection, value: show(figVal(v.values.Default)) }); continue; }
  seenCode.add(codeName);
  const f = figVal(v.values.Default);
  const c = codeVal(cdef.value);
  if (!same(f, c)) report.valueMismatch.push({ name: v.name, figma: show(f), code: show(c) });
  else report.ok++;
}

// code-only: things the code defines that Figma has no variable for
const SKIP_CODE = [/^animation\.duration/, /^animation\.timing/, /^theme\.animation/, /^z-index/,
                   /^typography\.preset/, /^box-shadow/, /^theme\.box-shadow/, /^theme\.shadow/];
for (const name of Object.keys(codeFlat)) {
  if (seenCode.has(name)) continue;
  if (SKIP_CODE.some((r) => r.test(name))) continue;
  report.codeOnly.push({ name, value: show(codeVal(codeFlat[name].value)) });
}
for (const mode of ['Light', 'Dark']) {
  for (const name of Object.keys(codeTheme[mode])) {
    if (seenCode.has(name)) continue;
    if (SKIP_CODE.some((r) => r.test(name))) continue;
    report.codeOnly.push({ name, mode, value: show(codeVal(codeTheme[mode][name].value)) });
  }
}

writeFileSync(join(ROOT, '.altitude/figma-sync/figma-audit.json'), JSON.stringify(report, null, 1) + '\n');

const p = (label, arr) => { console.log(`\n${label} (${arr.length})`); for (const x of arr.slice(0, 40)) console.log('  ' + JSON.stringify(x)); if (arr.length > 40) console.log(`  ... +${arr.length - 40} more`); };
console.log(`matching:        ${report.ok}`);
p('VALUE MISMATCH', report.valueMismatch);
p('IN FIGMA, NOT IN CODE', report.figmaOnly);
p('IN CODE, NOT IN FIGMA', report.codeOnly);
p('THEME MODE GAPS', report.modeGap);
console.log(`\nTier 2 Brand overrides: ${Object.keys(report.brandModes).length} variables x modes ${(live.collections.find(c => isBrand(c.name))?.modes ?? []).map((m) => (typeof m === 'string' ? m : m.name)).join(', ')}`);
