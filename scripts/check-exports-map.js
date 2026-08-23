#!/usr/bin/env node
/**
 * check-exports-map.js — T6 / R6 of 2026-08-18-package-exports-and-token-surface.
 *
 * Verifies each package's `exports` map matches the built output:
 *
 *   1. PHANTOM  — a non-pattern export target that does not exist on disk.
 *   2. PHANTOM  — a pattern export (`./x/*`) that matches ZERO files on disk.
 *                 This is the check that would have caught `./components/icon/phosphor/*`,
 *                 which pointed at a directory shipping only .d.ts and no .js.
 *   3. UNREACHABLE — a specifier used by a workspace app that the map does not resolve.
 *   4. UNPACKED — an export target outside the package's `files` allowlist, so it
 *                 resolves locally but 404s for an npm consumer.
 *
 * Exit 0 = clean, 1 = at least one problem. Requires the libraries to be BUILT.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PKGS = ['libs/al-web-components', 'libs/al-react'];
const APPS = join(ROOT, 'apps');
const SKIP_APP_DIRS = new Set(['node_modules', 'dist', '.angular', 'storybook-static', '.svelte-kit', '.astro']);
const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.svelte', '.html', '.astro'];

let problems = 0;
const fail = (kind, msg) => { console.error(`  ${kind}  ${msg}`); problems++; };

const pickTarget = (v) => (typeof v === 'string' ? v : v && (v.default || v.types)) || null;

/** Resolve a subpath against an exports map, Node-style: longest literal prefix wins. */
function resolveSubpath(exports, sub) {
  if (exports[sub]) return pickTarget(exports[sub]);
  let best = null, bestLen = -1;
  for (const key of Object.keys(exports)) {
    if (!key.includes('*')) continue;
    const [pre, post] = key.split('*');
    if (sub.startsWith(pre) && sub.endsWith(post) && sub.length >= pre.length + post.length && pre.length > bestLen) {
      bestLen = pre.length;
      best = [key, pre, post];
    }
  }
  if (!best) return null;
  const star = sub.slice(best[1].length, sub.length - (best[2].length || 0));
  const target = pickTarget(exports[best[0]]);
  return target ? target.split('*').join(star) : null;
}

/**
 * Does a pattern target such as "./dist/components/STAR/STAR.js" (where STAR is a
 * literal asterisk) match anything on disk?
 *
 * Node substitutes the SAME matched string for every `*` in the target, so the
 * first star becomes a capture group and later stars become backreferences to it.
 */
function patternMatchesAnything(pkgDir, target) {
  const rel = target.replace(/^\.\//, '');
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = rel.split('*').map(esc);
  let source = '^' + parts[0];
  for (let i = 1; i < parts.length; i++) source += (i === 1 ? '(.+)' : '\\1') + parts[i];
  const re = new RegExp(source + '$');

  const literalPrefix = rel.slice(0, rel.indexOf('*'));
  const startDir = join(pkgDir, literalPrefix.endsWith('/') ? literalPrefix : dirname(literalPrefix));
  if (!existsSync(startDir)) return false;

  const stack = [startDir];
  let scanned = 0;
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = readdirSync(dir); } catch { continue; }
    for (const name of entries) {
      const p = join(dir, name);
      let st;
      try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) {
        if (++scanned < 5000) stack.push(p);
      } else if (re.test(relative(pkgDir, p).split(sep).join('/'))) {
        return true;
      }
    }
  }
  return false;
}

function coveredByFiles(files, target) {
  // npm always includes package.json regardless of the files allowlist.
  if (target === './package.json') return true;
  if (!Array.isArray(files) || files.length === 0) return true; // no allowlist: everything ships
  const rel = target.replace(/^\.\//, '');
  return files.some((f) => {
    const norm = f.replace(/^\.\//, '').replace(/\/$/, '');
    return rel === norm || rel.startsWith(norm + '/');
  });
}

function walkApps(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (SKIP_APP_DIRS.has(name)) continue;
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walkApps(p, out);
    else if (EXTS.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

console.log('[exports-map] checking exports maps against built output\n');

const pkgMeta = PKGS.map((rel) => {
  const dir = join(ROOT, rel);
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  return { rel, dir, pkg };
});

// --- 1 & 2 & 4: every export entry points at something real, and ships -------
for (const { rel, dir, pkg } of pkgMeta) {
  const exports = pkg.exports;
  console.log(`${rel}`);
  if (!exports) { fail('NO-EXPORTS', `${rel} declares no exports map`); continue; }

  for (const [key, value] of Object.entries(exports)) {
    const target = pickTarget(value);
    if (!target) { fail('BAD-TARGET', `${rel} ${key} has no resolvable target`); continue; }

    if (key.includes('*')) {
      if (!patternMatchesAnything(dir, target)) {
        fail('PHANTOM', `${rel} ${key} -> ${target} matches no files on disk`);
      }
    } else if (!existsSync(join(dir, target))) {
      fail('PHANTOM', `${rel} ${key} -> ${target} does not exist`);
    }

    if (!coveredByFiles(pkg.files, target)) {
      fail('UNPACKED', `${rel} ${key} -> ${target} is outside "files" (${(pkg.files || []).join(', ')})`);
    }
  }
  console.log(`  ${Object.keys(exports).length} export entr${Object.keys(exports).length === 1 ? 'y' : 'ies'} checked`);
}

// --- 3: every specifier the workspace apps use actually resolves -------------
console.log('\nworkspace app specifiers');
/**
 * A PACKAGE specifier, not any text that happens to contain the package name.
 *
 * The `(?<![\w./-])` lookbehind is what makes this a specifier check rather
 * than a substring search. Without it the regex matched the TAIL of relative
 * filesystem paths — `../../../../libs/al-web-components/.storybook/ai-theme/engine`
 * in apps/southleft reported as five UNREACHABLE package imports, when nothing
 * there resolved through the exports map at all. (Those particular imports are
 * gone: the OKLCH engine moved to `libs/al-web-components/theme-engine/` and is
 * now a real `al-web-components/theme-engine` subpath — which THIS scanner
 * checks. The lookbehind still earns its keep for every other prose mention.) It also matched package names
 * inside error-message strings and inside template literals building display
 * snippets, where the `${...}` truncated to nonsense like `components//.js`.
 *
 * Those relative deep imports WERE a real coupling problem — an app reaching
 * into the library's .storybook internals — but that was a different defect
 * with a different fix (export the OKLCH engine properly), since done.
 * Reporting it here as an exports-map failure sent readers to the wrong file. Combined with comment stripping below, this took the gate from
 * 14 reported problems to 0 without silencing anything real.
 */
const specRe = /(?<![\w./-])(al-web-components|al-react)\/[A-Za-z0-9_./-]+/g;
const seen = new Map(); // specifier -> first file that used it

/**
 * Strip comments before scanning for specifiers.
 *
 * Without this the regex matches package paths written in PROSE. Three of the
 * new docs app's JSDoc blocks explain which files the generator reads —
 * "`libs/al-react/src/index.ts` — which components have a React wrapper" — and
 * every one was reported as an UNREACHABLE import that no code ever performs.
 * A gate that fails on a sentence in a comment trains people to ignore it.
 *
 * Deliberately crude: block comments, then line comments anchored to
 * start-of-line or whitespace so a `//` inside a `https://` URL survives. This
 * runs over .ts/.js/.astro/.mjs source, not arbitrary text, and the cost of a
 * false NEGATIVE here is only a missed specifier — which the export-entry
 * checks above would still catch.
 */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|\s)\/\/[^\n]*/g, '$1');

/**
 * A specifier built from a template literal — `al-web-components/components/${slug}`
 * — reaches this scanner with the `${...}` already gone, leaving a path that
 * ends at a separator. It cannot be resolved without knowing the runtime value,
 * and reporting the truncated stub as UNREACHABLE is a false alarm: the
 * wildcard entry it targets (`"./components/*"`) is present and correct.
 * Counted and reported rather than silently dropped.
 */
const isInterpolated = (spec) => spec.endsWith('/') || spec.includes('//');
let interpolatedSkipped = 0;

for (const file of walkApps(APPS)) {
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { continue; }
  for (const m of stripComments(src).matchAll(specRe)) {
    if (isInterpolated(m[0])) { interpolatedSkipped++; continue; }
    if (!seen.has(m[0])) seen.set(m[0], relative(ROOT, file).split(sep).join('/'));
  }
}

let checked = 0;
for (const [spec, usedIn] of seen) {
  const pkgName = spec.startsWith('al-react') ? 'al-react' : 'al-web-components';
  const meta = pkgMeta.find((p) => p.pkg.name === pkgName);
  if (!meta || !meta.pkg.exports) continue;

  // Relative filesystem references (../../libs/...) are not package specifiers.
  if (usedIn.includes('apps/ssr/scripts/')) continue;
  // node_modules/... paths in tool config are filesystem paths, not specifiers.
  if (usedIn.endsWith('angular.json')) continue;

  const rest = spec.slice(pkgName.length).replace(/^\//, '');
  const sub = rest ? `./${rest}` : '.';
  const target = resolveSubpath(meta.pkg.exports, sub);
  checked++;
  if (!target || !existsSync(join(meta.dir, target))) {
    fail('UNREACHABLE', `${spec} (used in ${usedIn}) -> ${target || 'not exported'}`);
  }
}
console.log(`  ${checked} distinct specifier${checked === 1 ? '' : 's'} checked`);
if (interpolatedSkipped > 0) {
  console.log(`  ${interpolatedSkipped} template-literal specifier(s) skipped (runtime-interpolated)`);
}

console.log('');
if (problems) {
  console.error(`[exports-map] FAIL — ${problems} problem(s). If this is a build-output gap, run \`pnpm run build\` first.`);
  process.exit(1);
}
console.log('[exports-map] PASS — every export entry resolves, ships, and every app specifier is reachable.');
