#!/usr/bin/env node
/**
 * Altitude — design-system usage validator (shippable CLI)
 *
 * A fresh, dependency-free validator that checks how code USES Altitude — both the web components
 * (`<al-*>` custom elements) and the @southleft/al-react JSX wrappers (`<ALButton/>` from `@southleft/al-react`) — against
 * the library's own Custom Elements Manifest, and returns actionable, self-heal-oriented feedback
 * so an agent can fix invalid usage on its own.
 *
 *   npx altitude-validate <file-or-dir>          # human report, non-zero exit on any error
 *   npx altitude-validate --json <file-or-dir>   # one JSON envelope on stdout (for agents)
 *   pnpm --filter @southleft/al-web-components validate:usage <file-or-dir>   # in-repo
 *
 * The contract source is the shipped `custom-elements.json` (CEM) — the same manifest the
 * analyzer generates from the components. This CLI is a READER of that manifest, never a second
 * source of truth, so it cannot drift from the real component API. Union attribute types in the
 * CEM (e.g. `'secondary' | 'tertiary' | 'bare' | 'danger'`) become the allowed enum values.
 *
 * It is intentionally framework-agnostic: it scans `<al-*>` tags out of any markup surface Altitude
 * is consumed from — plain HTML, Svelte, Astro, Angular/Vue templates, or Lit `html` templates —
 * plus `<AL*>` @southleft/al-react wrappers in JSX/TSX (resolved via each file's `@southleft/al-react` imports). It is
 * tolerant of binding syntax (`[x]=`, `:x=`, `?x=`, `.x=`, `bind:x`, `{expr}`, `${expr}`) and JSX
 * `{...spread}`, which it marks dynamic and skips for value checks (still counted as present).
 *
 * Checks: unknown-component, unknown-attribute, invalid-enum, type-mismatch. Each violation carries
 * a STABLE machine code, a did-you-mean suggestion where useful, and a concrete `fix` sourced from
 * cli/repair-map.json. Prose guide: cli/REPAIR.md.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';

const HERE = fileURLToPath(new URL('.', import.meta.url));

/** Stable error codes — the machine contract. APPEND-ONLY: a code's meaning never changes. */
const CODES = Object.freeze({
  'unknown-component': 'ERR_UNKNOWN_COMPONENT',
  'unknown-attribute': 'ERR_UNKNOWN_ATTRIBUTE',
  'invalid-enum': 'ERR_INVALID_ENUM',
  'type-mismatch': 'ERR_TYPE_MISMATCH',
});

const REPAIR = JSON.parse(readFileSync(new URL('./repair-map.json', import.meta.url), 'utf8'));

// Attributes valid on any element — never flagged unknown-attribute.
const GLOBAL_ATTRS = new Set([
  'slot', 'id', 'class', 'classname', 'style', 'part', 'exportparts', 'title', 'hidden', 'dir',
  'lang', 'role', 'tabindex', 'is', 'contenteditable', 'draggable', 'spellcheck', 'translate',
  'inert', 'popover', 'autofocus', 'key', 'ref', 'itemprop', 'itemscope', 'itemtype', 'accesskey',
  'children', 'dangerouslysetinnerhtml', // React-only, harmless on any element
]);

// Props on the `ALElement` base class, inherited by every Altitude component. The CEM analyzer
// does not surface inherited base-class attributes per element, so they'd otherwise read as
// unknown on every component. Keep in sync with components/ALElement.ts.
const ALTITUDE_BASE_ATTRS = new Set(['styleModifier']);

// Extensions worth scanning for Altitude usage across every framework surface.
const SCAN_EXT = /\.(html?|svelte|astro|vue|[jt]sx?|mjs|cjs|md|mdx|liquid|hbs|handlebars|erb|php)$/i;

// ── contract (CEM) ─────────────────────────────────────────────────────────────────────────────
function resolveCemPath(override) {
  const candidates = [
    override,
    process.env.ALTITUDE_CEM,
    fileURLToPath(new URL('../custom-elements.json', import.meta.url)), // package root, sibling of cli/
    fileURLToPath(new URL('../dist/custom-elements.json', import.meta.url)),
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}

/** Parse a CEM `type.text` union into what values an attribute legally accepts. */
function parseType(text) {
  const t = { literals: [], booleanOk: false, numberOk: false, stringOk: false, freeform: false };
  if (!text) { t.freeform = true; return t; }
  for (let part of String(text).split('|')) {
    part = part.trim();
    const lit = /^'(.*)'$/.exec(part) || /^"(.*)"$/.exec(part);
    if (lit) t.literals.push(lit[1]);
    else if (part === 'boolean') t.booleanOk = true;
    else if (part === 'number') t.numberOk = true;
    else if (part === 'string') t.stringOk = true;
    else if (part === 'null' || part === 'undefined') continue;
    else t.freeform = true; // object/array/complex — don't enum-check
  }
  return t;
}

function loadContracts(cemPath) {
  const cem = JSON.parse(readFileSync(cemPath, 'utf8'));
  const components = new Map();  // tagName   -> spec  (for `<al-*>` custom-element usage)
  const byClassName = new Map(); // className -> spec  (for @southleft/al-react wrappers: `<ALButton/>` -> ALButton)
  for (const mod of cem.modules ?? []) {
    for (const d of mod.declarations ?? []) {
      if (!d.customElement || !d.tagName) continue;
      const attrs = new Map();
      for (const a of d.attributes ?? []) {
        attrs.set(a.name, { name: a.name, type: parseType(a.type?.text), typeText: a.type?.text });
      }
      const spec = { tag: d.tagName, className: d.name, attrs };
      components.set(d.tagName, spec);
      if (d.name) byClassName.set(d.name, spec);
    }
  }
  return { components, byClassName };
}

/** Map local import name -> exported name for `@southleft/al-react` wrappers used in a file (named imports). */
function parseReactImports(text) {
  const map = new Map();
  const re = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]@southleft\/al-react(?:\/[^'"]*)?['"]/g;
  let m;
  while ((m = re.exec(text))) {
    for (const raw of m[1].split(',')) {
      const mm = /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/.exec(raw.trim());
      if (mm) map.set(mm[2] || mm[1], mm[1]); // local -> imported
    }
  }
  return map;
}

// ── did-you-mean ─────────────────────────────────────────────────────────────────────────────
function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = curr;
  }
  return prev[n];
}
function didYouMean(input, candidates) {
  let best, bestDist = 3;
  const needle = String(input).toLowerCase();
  for (const c of candidates) {
    if (c === input) continue;
    const d = levenshtein(needle, String(c).toLowerCase());
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best;
}

// ── markup scanning ──────────────────────────────────────────────────────────────────────────
/** Line/column (1-based) for a character offset. */
function lineColAt(lineStarts, index) {
  let lo = 0, hi = lineStarts.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= index) lo = mid; else hi = mid - 1; }
  return { line: lo + 1, column: index - lineStarts[lo] + 1 };
}

/** Parse the raw attribute region of a tag into { rawName, value, kind } tokens. */
function parseAttrs(s) {
  const out = [];
  let i = 0;
  const n = s.length;
  const isWs = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f';
  while (i < n) {
    while (i < n && (isWs(s[i]) || s[i] === '/')) i++;
    if (i >= n) break;
    if (s[i] === '{') { // JSX spread / expression container: {...props}
      let depth = 0;
      while (i < n) { const c = s[i++]; if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) break; } }
      out.push({ rawName: null, value: undefined, kind: 'spread' });
      continue;
    }
    let name = '';
    while (i < n && !isWs(s[i]) && s[i] !== '=' && s[i] !== '/' && s[i] !== '>') name += s[i++];
    if (!name) { i++; continue; }
    while (i < n && isWs(s[i])) i++;
    if (s[i] === '=') {
      i++;
      while (i < n && isWs(s[i])) i++;
      const q = s[i];
      if (q === '"' || q === "'") {
        i++; let v = '';
        while (i < n && s[i] !== q) v += s[i++];
        i++; // closing quote
        // A quoted value that is purely a framework/template expression is dynamic, not a literal.
        const dyn = /^\s*(\{\{[\s\S]*\}\}|\$?\{[\s\S]*\}|`[\s\S]*`)\s*$/.test(v);
        out.push({ rawName: name, value: dyn ? undefined : v, kind: dyn ? 'dynamic' : 'static' });
      } else if (q === '{') {
        let depth = 0; let v = '';
        while (i < n) { const c = s[i++]; v += c; if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) break; } }
        out.push({ rawName: name, value: undefined, kind: 'dynamic' });
      } else {
        let v = '';
        while (i < n && !isWs(s[i]) && s[i] !== '>') v += s[i++];
        const dyn = /[${}`]/.test(v);
        out.push({ rawName: name, value: dyn ? undefined : v, kind: dyn ? 'dynamic' : 'static' });
      }
    } else {
      out.push({ rawName: name, value: undefined, kind: 'boolean' }); // bare attribute (presence)
    }
  }
  return out;
}

/**
 * Reduce a framework-decorated attribute name to its base DS attribute + whether it's a
 * non-DS attribute we should skip (events, structural directives, refs).
 */
function classifyAttr(rawName) {
  let name = rawName;
  // events / structural / refs — not DS attributes.
  if (name[0] === '(' || name[0] === '@' || name[0] === '*' || name[0] === '#') return { skip: true };
  if (/^on:/.test(name) || /^v-on:/.test(name)) return { skip: true };
  if (/^on[A-Z]/.test(name)) return { skip: true }; // React-style handler
  // binding prefixes → strip to base name, value is dynamic.
  let dynamic = false;
  if (name[0] === '[' && name.endsWith(']')) { name = name.slice(1, -1); dynamic = true; } // Angular [x]
  else if (name.startsWith('bind:')) { name = name.slice(5); dynamic = true; }               // Svelte bind:x
  else if (name[0] === ':') { name = name.slice(1); dynamic = true; }                          // Vue :x
  else if (name[0] === '?') { name = name.slice(1); dynamic = true; }                          // Lit ?x
  else if (name[0] === '.') { name = name.slice(1); dynamic = true; }                          // Lit .x property
  // Angular/Vue namespaced non-DS bindings.
  if (/^(attr|class|style)\./.test(name)) return { skip: true };
  return { name, dynamic };
}

function isGlobalAttr(name) {
  const lower = name.toLowerCase();
  return GLOBAL_ATTRS.has(lower) || /^(aria-|data-)/.test(lower);
}

// ── validation ───────────────────────────────────────────────────────────────────────────────
function buildFix(code, extra = {}) {
  const base = REPAIR[code]?.fix ?? '';
  const bits = [];
  if (extra.allowed?.length) bits.push(`Allowed: ${extra.allowed.join(', ')}.`);
  if (extra.suggestion) bits.push(`Did you mean \`${extra.suggestion}\`?`);
  return [base, ...bits].join(' ').trim();
}

function checkValue(value, type) {
  // returns null if ok, else { rule, allowed? }
  if (type.freeform || type.stringOk) return null; // string/complex attr — any literal is fine
  const literals = type.literals;
  const lower = String(value).toLowerCase();
  if (literals.includes(value)) return null;
  if (type.booleanOk && (lower === 'true' || lower === 'false' || value === '')) return null;
  if (type.numberOk && /^-?\d+(?:\.\d+)?$/.test(value)) return null;
  if (literals.length) return { rule: 'invalid-enum', allowed: literals };
  return { rule: 'type-mismatch', allowed: type.booleanOk ? ['true', 'false'] : type.numberOk ? ['<number>'] : [] };
}

function validateSource(filePath, text, contracts, sink) {
  const { components, byClassName } = contracts;
  // @southleft/al-react wrappers are only in scope for files that import them; web components are always global.
  const reactMap = text.includes('@southleft/al-react') ? parseReactImports(text) : new Map();

  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1);

  // Resolve a JSX/markup tag name to a contract: `<al-*>` web components (always), or `<AL*>`
  // @southleft/al-react wrappers imported in this file. Everything else (div, user components) → ignored.
  const resolve = (name) => {
    if (/^al-[a-z]/.test(name)) {
      const spec = components.get(name);
      return spec ? { spec, display: name, mode: 'wc' } : { unknown: name, display: name, mode: 'wc' };
    }
    if (/^[A-Z]/.test(name) && reactMap.has(name)) {
      const imported = reactMap.get(name);
      const spec = byClassName.get(imported);
      return spec ? { spec, display: name, mode: 'react' } : { unknown: imported, display: name, mode: 'react' };
    }
    return null;
  };

  // Opening tags only. The attribute region allows quoted strings and {…}/${…} expressions
  // (incl. one level of nested braces) so a '>' inside them doesn't prematurely end the tag.
  const re = /<([A-Za-z][A-Za-z0-9-]*)((?:"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\}|`[^`]*`|[^>])*?)\/?>/g;
  let m;
  while ((m = re.exec(text))) {
    const r = resolve(m[1]);
    if (!r) continue;
    const attrsRaw = m[2] ?? '';
    const { line, column } = lineColAt(lineStarts, m.index);
    const noun = r.mode === 'react' ? 'prop' : 'attribute';
    sink.totalUsages++;
    const before = sink.violations.length;
    const bc = (sink.byComponent[r.display] ??= { usages: 0, errors: 0 });
    bc.usages++;

    const push = (rule, detail, extra = {}) => sink.violations.push({
      file: filePath, line, column, component: r.display, rule, code: CODES[rule], severity: 'error', detail,
      ...(extra.suggestion ? { suggestion: extra.suggestion } : {}),
      fix: buildFix(CODES[rule], extra),
    });

    if (r.unknown) {
      const pool = r.mode === 'react' ? byClassName.keys() : components.keys();
      push('unknown-component', r.mode === 'react'
        ? `<${r.display}> is imported from @southleft/al-react but maps to no registered Altitude component (typo or hallucination)`
        : `<${r.display}> is not a registered Altitude element (typo or hallucination)`,
        { suggestion: didYouMean(r.unknown, pool) });
      bc.errors++; sink.failingUsages++;
      continue;
    }

    const spec = r.spec;
    for (const { rawName, value, kind } of parseAttrs(attrsRaw)) {
      if (kind === 'spread') continue; // {...props} — suppresses nothing checkable here
      const c = classifyAttr(rawName);
      if (c.skip) continue;
      const name = c.name;
      if (isGlobalAttr(name) || ALTITUDE_BASE_ATTRS.has(name)) continue;
      const attr = spec.attrs.get(name);
      if (!attr) {
        push('unknown-attribute', `<${r.display}> has no ${noun} "${name}" (allowed: ${[...spec.attrs.keys()].join(', ') || 'none'})`,
          { allowed: [...spec.attrs.keys()], suggestion: didYouMean(name, spec.attrs.keys()) });
        continue;
      }
      if (kind !== 'static' || c.dynamic) continue; // dynamic/bound/boolean-presence → not value-checkable
      const bad = checkValue(value, attr.type);
      if (bad) {
        const suggestion = bad.rule === 'invalid-enum' ? didYouMean(value, attr.type.literals) : undefined;
        push(bad.rule, `${noun} "${name}"="${value}" ${bad.rule === 'invalid-enum' ? 'is not one of the allowed values' : `must be ${attr.typeText}`}`,
          { allowed: bad.allowed, suggestion });
      }
    }

    if (sink.violations.length > before) { bc.errors++; sink.failingUsages++; }
  }
}

function gatherFiles(target) {
  if (!existsSync(target)) return [];
  if (statSync(target).isFile()) return SCAN_EXT.test(target) ? [target] : [];
  const out = [];
  for (const e of readdirSync(target)) {
    if (e === 'node_modules' || e === 'dist' || e.startsWith('.')) continue;
    out.push(...gatherFiles(join(target, e)));
  }
  return out;
}

export function validateApp(target, opts = {}) {
  const cemPath = resolveCemPath(opts.cemPath);
  if (!cemPath) throw new Error('could not locate custom-elements.json (the Altitude CEM). Pass --cem <path> or set ALTITUDE_CEM.');
  const contracts = loadContracts(cemPath);
  const sink = { violations: [], byComponent: {}, totalUsages: 0, failingUsages: 0 };
  for (const f of gatherFiles(target)) validateSource(f, readFileSync(f, 'utf8'), contracts, sink);
  return {
    passRate: sink.totalUsages === 0 ? 1 : (sink.totalUsages - sink.failingUsages) / sink.totalUsages,
    totalUsages: sink.totalUsages,
    passingUsages: sink.totalUsages - sink.failingUsages,
    violations: sink.violations,
    byComponent: sink.byComponent,
    contractSource: cemPath,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────────────────────
const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  let argv = process.argv.slice(2);
  if (argv[0] === 'validate') argv = argv.slice(1); // allow `npx @southleft/al-web-components validate <path>`
  const asJson = argv.includes('--json');
  const ci = argv.indexOf('--cem');
  const cemPath = ci >= 0 ? argv[ci + 1] : undefined;
  const target = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--cem');

  if (!target) { console.error('usage: altitude-validate [--json] [--cem <path>] <file-or-dir>'); process.exit(2); }

  try {
    const r = validateApp(resolve(target), { cemPath });
    if (asJson) {
      process.stdout.write(JSON.stringify({ apiVersion: 1, type: 'validation.result', data: r }) + '\n');
    } else {
      console.log(`\nAltitude usage: ${r.passingUsages}/${r.totalUsages} <al-*> usages valid (${(r.passRate * 100).toFixed(1)}%)`);
      for (const [c, s] of Object.entries(r.byComponent)) console.log(`  ${c}: ${s.usages - s.errors}/${s.usages} ok`);
      if (r.violations.length) {
        console.log(`\n${r.violations.length} violation(s):`);
        for (const v of r.violations) {
          console.log(`\n  ${shortPath(v.file)}:${v.line}:${v.column}  [${v.rule}] ${v.code}`);
          console.log(`    ${v.component} — ${v.detail}`);
          if (v.fix) console.log(`    → fix: ${v.fix}`);
        }
        console.log(`\nRepair guide: cli/REPAIR.md (keyed by the CODE above).`);
      } else {
        console.log('\n  no violations — all Altitude usage matches the component contracts. ✓');
      }
    }
    process.exit(r.violations.some((v) => v.severity === 'error') ? 1 : 0);
  } catch (e) {
    const msg = String(e?.message || e).slice(0, 500);
    if (asJson) process.stdout.write(JSON.stringify({ apiVersion: 1, error: msg, code: 'ERR_VALIDATOR_FAILURE' }) + '\n');
    else console.error(`validator error: ${msg}`);
    process.exit(2);
  }
}

function shortPath(p) { const i = p.indexOf('/altitude/'); return i >= 0 ? p.slice(i + 1) : p; }
