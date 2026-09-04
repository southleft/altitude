#!/usr/bin/env node
/**
 * Altitude — design-system usage validator (shippable CLI)
 *
 * A fresh, dependency-free validator that checks how code USES Altitude — both the web components
 * (`<al-*>` custom elements) and the @southleft/al-react JSX wrappers (`<ALButton/>` from `@southleft/al-react`) — against
 * the library's own Custom Elements Manifest, and returns actionable, self-heal-oriented feedback
 * so an agent can fix invalid usage on its own.
 *
 *   npx altitude-validate <file-or-dir>          # human report, non-zero exit on any ERROR
 *   npx altitude-validate --json <file-or-dir>   # one JSON envelope on stdout (for agents)
 *   npx altitude-validate --strict <file-or-dir> # warnings fail too
 *   pnpm --filter @southleft/al-web-components validate:usage <file-or-dir>   # in-repo
 *
 * The contract source is the shipped `custom-elements.json` (CEM) — the same manifest the
 * analyzer generates from the components. This CLI is a READER of that manifest, never a second
 * source of truth, so it cannot drift from the real component API. Union attribute types in the
 * CEM (e.g. `'secondary' | 'tertiary' | 'bare' | 'danger'`) become the allowed enum values.
 * The token contract comes from the shipped token set the same way: `dist/css/tokens.json` when
 * the package has been built, otherwise the tracked DTCG source under `styles/tokens-dtcg/`.
 * No token, slot or attribute name is ever hardcoded here.
 *
 * It is intentionally framework-agnostic: it scans `<al-*>` tags out of any markup surface Altitude
 * is consumed from — plain HTML, Svelte, Astro, Angular/Vue templates, or Lit `html` templates —
 * plus `<AL*>` @southleft/al-react wrappers in JSX/TSX (resolved via each file's `@southleft/al-react` imports). It is
 * tolerant of binding syntax (`[x]=`, `:x=`, `?x=`, `.x=`, `bind:x`, `{expr}`, `${expr}`) and JSX
 * `{...spread}`, which it marks dynamic and skips for value checks (still counted as present).
 *
 * Checks (each maps to a numbered rule in the repo-root `llms.txt`):
 *   unknown-component / unknown-attribute / invalid-enum / type-mismatch  — rule 3
 *   unknown-slot                                                          — rule 3
 *   phantom-token                                                         — rule 2
 *   raw-value            (warning)                                        — rule 1
 *   handrolled-layout    (warning)                                        — rule 5
 *   missing-theme-host                                                    — rule 4
 *   mixed-registration   (warning)                                        — rule 6
 *   a11y-name            (warning)                                        — component guidance
 *
 * Each violation carries a STABLE machine code, a did-you-mean suggestion where useful, and a
 * concrete `fix` sourced from cli/repair-map.json. Prose guide: cli/REPAIR.md.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join, dirname } from 'node:path';

const HERE = fileURLToPath(new URL('.', import.meta.url));

/**
 * Stable error codes — the machine contract. APPEND-ONLY: a code's meaning never changes, a code
 * is never renumbered, repurposed or removed. Add new rules at the bottom.
 */
const CODES = Object.freeze({
  'unknown-component': 'ERR_UNKNOWN_COMPONENT',
  'unknown-attribute': 'ERR_UNKNOWN_ATTRIBUTE',
  'invalid-enum': 'ERR_INVALID_ENUM',
  'type-mismatch': 'ERR_TYPE_MISMATCH',
  'unknown-slot': 'ERR_UNKNOWN_SLOT',
  'phantom-token': 'ERR_PHANTOM_TOKEN',
  'raw-value': 'WARN_RAW_VALUE',
  'handrolled-layout': 'WARN_HANDROLLED_LAYOUT',
  'missing-theme-host': 'ERR_MISSING_THEME_HOST',
  'mixed-registration': 'WARN_MIXED_REGISTRATION',
  'a11y-name': 'ERR_A11Y_NAME',
});

/** A code beginning `WARN_` is advisory: it never fails the build unless `--strict` is passed. */
const severityOf = (code) => (String(code).startsWith('WARN_') ? 'warning' : 'error');

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

// HTML void elements — they never open a nesting scope.
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
  'meta', 'param', 'source', 'track', 'wbr']);

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

/**
 * The CEM's `slots` array is DOCUMENTATION (`@slot` JSDoc), and it is demonstrably incomplete:
 * `al-drawer` renders `header` / `footer` / `trigger` slots but documents only the default one,
 * and `al-select` renders `before` but documents only `field-note` / `error`. Checking slot names
 * against the CEM alone therefore reports correct, shipped markup as wrong — 15 false positives
 * across apps/react, apps/svelte and apps/astro when measured.
 *
 * So the slot contract is read from the shipped compiled component instead (`dist/<module>.js`,
 * in the package `files` list), and unioned with the CEM's documented names. When that evidence
 * is unavailable, or the component builds a slot name dynamically, slot checking is SKIPPED for
 * that element rather than guessed at.
 */
function readSlotEvidence(modulePath, pkgRoot) {
  if (!modulePath) return null;
  const rel = String(modulePath).replace(/\.ts$/, '.js');
  const js = [
    pkgRoot ? join(pkgRoot, 'dist', rel) : null,
    pkgRoot ? join(pkgRoot, rel) : null,
    fileURLToPath(new URL(`../dist/${rel}`, import.meta.url)),
  ].filter(Boolean).find((p) => existsSync(p));
  if (!js) return null;
  let src;
  try { src = readFileSync(js, 'utf8'); } catch { return null; }
  if (/<slot\b[^>]*\bname\s*=\s*[^"'\s>]/.test(src)) return null; // dynamic slot name — unknowable
  return new Set([...src.matchAll(/<slot\b[^>]*\bname\s*=\s*["']([^"']+)["']/g)].map((x) => x[1]));
}

/**
 * MERGES SEVERAL MANIFESTS, later ones winning.
 *
 * A design system can ship a brand layer that supersedes base components under the
 * SAME tag: @southleft/sl-web-components redefines al-card, al-header and al-footer
 * for Southleft, and adds al-hero, al-cta-band, al-marquee, al-page-hero,
 * al-logo-wall and al-section-header. Reading only the base manifest reported all of
 * that correct, shipped markup as wrong — measured on apps/southleft, 15 unknown
 * components and 19 unknown al-card attributes, every one of which the brand layer
 * declares (`featured`, `href`, `image`, `heading`, `excerpt`, `fallback`, `target`,
 * `command`, `dashed`, ...).
 *
 * Order is the contract: pass base first, brand second, and the brand's definition
 * replaces the base's for any tag they share. That is the same precedence
 * `.altitude/ds-projects.json` states with `brandLibrary.supersedes`.
 */
function loadContracts(cemPaths) {
  const paths = Array.isArray(cemPaths) ? cemPaths : [cemPaths];
  const components = new Map();  // tagName   -> spec  (for `<al-*>` custom-element usage)
  const byClassName = new Map(); // className -> spec  (for @southleft/al-react wrappers: `<ALButton/>` -> ALButton)
  for (const cemPath of paths) loadOneCem(cemPath, components, byClassName);
  return { components, byClassName };
}

function loadOneCem(cemPath, components, byClassName) {
  const cem = JSON.parse(readFileSync(cemPath, 'utf8'));
  // Slot evidence is the compiled component NEXT TO ITS OWN manifest, not next to the
  // CLI — otherwise a brand module resolves against the base package and silently
  // reports `slotsKnown: false` for every brand component.
  const pkgRoot = dirname(cemPath);
  for (const mod of cem.modules ?? []) {
    for (const d of mod.declarations ?? []) {
      if (!d.customElement || !d.tagName) continue;
      const attrs = new Map();
      // HTML attribute names are case-INSENSITIVE, so the lookup index is lower-cased while the
      // entry keeps the canonical (authored) spelling for messages and did-you-mean output.
      for (const a of d.attributes ?? []) {
        attrs.set(String(a.name).toLowerCase(), { name: a.name, type: parseType(a.type?.text), typeText: a.type?.text });
      }
      // Declared slots. `""` is the default slot; only NAMED slots can appear in `slot="…"`.
      const documented = (d.slots ?? []).map((s) => s.name).filter((n) => typeof n === 'string' && n);
      const rendered = readSlotEvidence(mod.path, pkgRoot);
      const namedSlots = new Set([...documented, ...(rendered ?? [])]);
      const spec = {
        tag: d.tagName,
        className: d.name,
        attrs,
        attrNames: (d.attributes ?? []).map((a) => a.name),
        namedSlots,
        // Only the rendered template is authoritative about what slots EXIST.
        slotsKnown: rendered !== null,
      };
      components.set(d.tagName, spec);
      if (d.name) byClassName.set(d.name, spec);
    }
  }
}

// ── contract (tokens) ──────────────────────────────────────────────────────────────────────────
// Rules 1 and 2 need two facts, both derived from shipped artifacts and never hardcoded:
//   • which `--al-*` custom properties actually exist  (rule 2 — phantom tokens)
//   • which CSS properties a token covers, by kind     (rule 1 — raw values)
// The exact name set is `dist/css/tokens.json` (built, and in the package `files` list). The
// tracked DTCG source (`styles/tokens-dtcg/`, also shipped) is the fallback and is where the
// per-token `cssType` + `cssProperties` metadata lives either way.

function resolveTokensPath(override) {
  const candidates = [
    override,
    process.env.ALTITUDE_TOKENS,
    fileURLToPath(new URL('../dist/css/tokens.json', import.meta.url)),
    fileURLToPath(new URL('../styles/dist/tokens.json', import.meta.url)),
    fileURLToPath(new URL('../tokens.json', import.meta.url)),
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}

function resolveDtcgDir(override) {
  const candidates = [
    override,
    process.env.ALTITUDE_TOKENS_DTCG,
    fileURLToPath(new URL('../styles/tokens-dtcg', import.meta.url)),
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}

const kebab = (s) => String(s).replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();

/**
 * Walk the DTCG tree once, collecting:
 *  - every leaf token's `--al-…` name, plus the shorthand/sub-property names a COMPOSITE token
 *    (a `$value` object, e.g. a typography preset) expands into,
 *  - group prefixes (used only as a tolerance when there is no exact built token set),
 *  - cssType -> the CSS properties that kind of token is authored for
 *    (`$extensions["com.salesforce.styling"].cssProperties`).
 */
function readDtcg(dir) {
  const names = new Set();
  const groupPrefixes = new Set();
  const compositeGroups = new Set();
  const propsByCssType = new Map();

  const addProps = (cssType, props) => {
    if (!cssType || !props?.length) return;
    if (!propsByCssType.has(cssType)) propsByCssType.set(cssType, new Set());
    for (const p of props) propsByCssType.get(cssType).add(String(p).toLowerCase());
  };

  const collect = (node, path) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    if ('$value' in node) {
      const leaf = '--al-' + path.map(kebab).join('-');
      names.add(leaf);
      for (let i = 1; i < path.length; i++) groupPrefixes.add('--al-' + path.slice(0, i).map(kebab).join('-'));
      const ext = node.$extensions ?? {};
      const cssType = ext['org.altitude.token']?.cssType ?? node.$type;
      addProps(cssType, ext['com.salesforce.styling']?.cssProperties);
      const parent = '--al-' + path.slice(0, -1).map(kebab).join('-');
      const v = node.$value;
      // A composite token (typography preset, shadow object, or an alias to one) is emitted as a
      // shorthand on the PARENT plus one custom property per sub-property. Register that shape so
      // a perfectly real `--al-…-letter-spacing` is never reported as phantom.
      if ((v && typeof v === 'object' && !Array.isArray(v)) || node.$type === 'typography') {
        compositeGroups.add(parent);
        names.add(parent);
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          for (const k of Object.keys(v)) { names.add(`${parent}-${kebab(k)}`); names.add(`${leaf}-${kebab(k)}`); }
        }
      }
      return;
    }
    for (const k of Object.keys(node)) {
      if (k.startsWith('$')) continue;
      collect(node[k], path.concat(k));
    }
  };

  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.json')) {
        try { collect(JSON.parse(readFileSync(p, 'utf8')), []); } catch { /* unreadable token file — skip */ }
      }
    }
  };
  walk(dir);
  return { names, groupPrefixes, compositeGroups, propsByCssType };
}

// CSS properties whose px values are GEOMETRY, not design-token spacing: a one-off column width, a
// positioned offset, a hairline border. Rule 1 stays quiet on these deliberately — a validator an
// agent cannot satisfy is worse than one that misses a case. Derived-set minus this list, never
// an allowlist of token names.
const GEOMETRY_CSS_TYPES = new Set(['sizing', 'borderWidth', 'opacity', 'other', 'letterSpacing', 'lineHeights']);
const GEOMETRY_PROPS = new Set(['top', 'right', 'bottom', 'left', 'inset', 'width', 'height',
  'min-width', 'min-height', 'max-width', 'max-height', 'flex-basis', 'border', 'outline',
  // A shadow's offsets/blur are internal geometry of a composite value; the token covers the
  // whole shadow, and `box-shadow` is still checked for a raw COLOUR on the colour branch.
  'box-shadow']);

function loadTokenContract(opts = {}) {
  const tokensPath = resolveTokensPath(opts.tokensPath);
  const dtcgDir = resolveDtcgDir(opts.dtcgDir);
  const names = new Set();
  let exact = false;
  if (tokensPath) {
    try {
      const raw = JSON.parse(readFileSync(tokensPath, 'utf8'));
      for (const k of Object.keys(raw)) names.add(k.startsWith('--') ? k : `--${k}`);
      exact = names.size > 0;
    } catch { /* unreadable built token set — fall through to DTCG */ }
  }
  let groupPrefixes = new Set();
  let compositeGroups = new Set();
  let propsByCssType = new Map();
  if (dtcgDir) {
    const d = readDtcg(dtcgDir);
    for (const n of d.names) names.add(n);
    groupPrefixes = d.groupPrefixes;
    compositeGroups = d.compositeGroups;
    propsByCssType = d.propsByCssType;
  }
  if (!names.size) return null; // no token contract available — rules 1 and 2 stay silent

  // Which CSS properties a colour token covers, and which a *spacing-like* token covers.
  const colorProps = new Set(propsByCssType.get('color') ?? []);
  const dimensionProps = new Set();
  for (const [cssType, props] of propsByCssType) {
    if (cssType === 'color' || GEOMETRY_CSS_TYPES.has(cssType)) continue;
    for (const p of props) if (!GEOMETRY_PROPS.has(p)) dimensionProps.add(p);
  }

  return {
    source: tokensPath ?? dtcgDir,
    exact,
    has(name) {
      if (names.has(name)) return true;
      for (const g of compositeGroups) if (name.startsWith(`${g}-`)) return true;
      // Without an exact built token set the derived names are missing the emitter's group
      // shorthands, so a real group prefix is accepted rather than reported as a phantom.
      if (!exact && (groupPrefixes.has(name) || compositeGroups.has(name))) return true;
      return false;
    },
    names,
    colorProps,
    dimensionProps,
  };
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

const BASE_ATTRS_LC = new Set([...ALTITUDE_BASE_ATTRS].map((a) => a.toLowerCase()));

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

// ── shared helpers for the document-level rules ──────────────────────────────────────────────
/** Replace every character of the matched regions with a space, preserving offsets. */
function maskRegions(text, re) {
  let out = text;
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(text))) {
    out = out.slice(0, m.index) + ' '.repeat(m[0].length) + out.slice(m.index + m[0].length);
  }
  return out;
}

const COMMENT_RE = /<!--[\s\S]*?-->/g;
/**
 * CSS/JS block comments. Masked before any style rule is parsed: a rule's "selector" is whatever
 * sits between the previous `}` and its `{`, which swallows the comment above it — and a comment
 * reading "48px is off al-layout's gap scale" then made an unrelated rule look Altitude-scoped
 * (measured, apps/docs/src/components/pages/FoundationsPage.astro).
 */
const BLOCK_COMMENT_RE = /\/\*[\s\S]*?\*\//g;
const STYLE_BLOCK_RE = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
/**
 * Documentation surfaces QUOTE code — a fenced block, a `<pre>`/`<code>` element, or a
 * single-backtick span in prose. A README sentence containing `window.alAutoRegistry = true` is
 * describing a path, not taking it, and a blog post's `padding: 10px` sample is not this page's
 * stylesheet. Measured: masking these removes 11 of 11 false positives across apps/southleft's
 * insight posts and apps/mfe/README.md.
 */
const CODE_SAMPLE_RE = /```[\s\S]*?```|<pre\b[\s\S]*?<\/pre>|<code\b[\s\S]*?<\/code>|`[^`\n]*`/gi;

/** `<style>` bodies with their absolute offsets in the source. */
function styleBlocks(text) {
  const out = [];
  let m;
  STYLE_BLOCK_RE.lastIndex = 0;
  while ((m = STYLE_BLOCK_RE.exec(text))) out.push({ css: m[1], offset: m.index + m[0].indexOf(m[1]) });
  return out;
}

/** Split a CSS/inline-style body into `{ prop, value, offset }` declarations. */
function declarations(css, base = 0) {
  const out = [];
  const re = /(^|[;{}])\s*(-{0,2}[A-Za-z][\w-]*)\s*:\s*([^;{}]*)/g;
  let m;
  while ((m = re.exec(css))) {
    const propIdx = m.index + m[0].indexOf(m[2], m[1].length);
    out.push({ prop: m[2].toLowerCase(), value: m[3].trim(), offset: base + propIdx });
  }
  return out;
}

/** Class names in this file's own `<style>` blocks whose rule sets `display: flex|grid`. */
function flexGridClasses(text) {
  const set = new Set();
  for (const { css } of styleBlocks(text)) {
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(css))) {
      if (!/display\s*:\s*(inline-)?(flex|grid)\b/i.test(m[2])) continue;
      for (const c of m[1].matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) set.add(c[1]);
    }
  }
  return set;
}

const HEX_RE = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;
const PX_RE = /(?<![\w-])(\d*\.?\d+)px\b/g;

// ── per-file validation ──────────────────────────────────────────────────────────────────────
function validateSource(filePath, text, ctx, sink) {
  const { components, byClassName } = ctx.contracts;
  const tokens = ctx.tokens;
  // @southleft/al-react wrappers are only in scope for files that import them; web components are always global.
  const reactMap = text.includes('@southleft/al-react') ? parseReactImports(text) : new Map();

  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1);
  const at = (index) => lineColAt(lineStarts, index);

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

  /** Push a violation not attributable to a single component usage (does not move the pass rate). */
  const pushFree = (rule, component, index, detail, extra = {}) => {
    const code = CODES[rule];
    const { line, column } = at(index);
    sink.violations.push({
      file: filePath, line, column, component, rule, code, severity: severityOf(code), detail,
      ...(extra.suggestion ? { suggestion: extra.suggestion } : {}),
      fix: buildFix(code, extra),
    });
  };

  let firstAltitudeUsage = null; // { tag, index } — for the theme-host check

  // Opening tags only. The attribute region allows quoted strings and {…}/${…} expressions
  // (incl. one level of nested braces) so a '>' inside them doesn't prematurely end the tag.
  const re = /<([A-Za-z][A-Za-z0-9-]*)((?:"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\}|`[^`]*`|[^>])*?)\/?>/g;
  let m;
  while ((m = re.exec(text))) {
    const r = resolve(m[1]);
    if (!r) continue;
    const attrsRaw = m[2] ?? '';
    const { line, column } = at(m.index);
    const noun = r.mode === 'react' ? 'prop' : 'attribute';
    sink.totalUsages++;
    if (!firstAltitudeUsage) firstAltitudeUsage = { tag: r.display, index: m.index };
    const before = sink.violations.length;
    const bc = (sink.byComponent[r.display] ??= { usages: 0, errors: 0 });
    bc.usages++;

    const push = (rule, detail, extra = {}) => {
      const code = CODES[rule];
      sink.violations.push({
        file: filePath, line, column, component: r.display, rule, code, severity: severityOf(code), detail,
        ...(extra.suggestion ? { suggestion: extra.suggestion } : {}),
        fix: buildFix(code, extra),
      });
    };

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
    const seen = new Map(); // lower-cased attr name -> { value, kind, dynamic }
    for (const { rawName, value, kind } of parseAttrs(attrsRaw)) {
      if (kind === 'spread') continue; // {...props} — suppresses nothing checkable here
      const c = classifyAttr(rawName);
      if (c.skip) continue;
      const name = c.name;
      const lower = name.toLowerCase();
      seen.set(lower, { value, kind, dynamic: c.dynamic });
      if (isGlobalAttr(name) || BASE_ATTRS_LC.has(lower)) continue;
      // HTML attribute names are case-insensitive: `isDisabled`, `isdisabled` and `ISDISABLED`
      // are the same attribute. Look up case-folded, but always SPEAK the canonical spelling.
      const attr = spec.attrs.get(lower);
      if (!attr) {
        push('unknown-attribute', `<${r.display}> has no ${noun} "${name}" (allowed: ${spec.attrNames.join(', ') || 'none'})`,
          { allowed: spec.attrNames, suggestion: didYouMean(name, spec.attrNames) });
        continue;
      }
      if (kind !== 'static' || c.dynamic) continue; // dynamic/bound/boolean-presence → not value-checkable
      const bad = checkValue(value, attr.type);
      if (bad) {
        const suggestion = bad.rule === 'invalid-enum' ? didYouMean(value, attr.type.literals) : undefined;
        push(bad.rule, `${noun} "${attr.name}"="${value}" ${bad.rule === 'invalid-enum' ? 'is not one of the allowed values' : `must be ${attr.typeText}`}`,
          { allowed: bad.allowed, suggestion });
      }
    }

    // ── WARN_A11Y_NAME (component guidance) ──────────────────────────────────────────────────
    // Evidence: apps/docs/src/content/guidance/button.yaml — "With `hideText` set and no `label`,
    // the button ships with no accessible name at all." Deliberately a SMALL, cited rule set.
    //
    // DEFAULT-SLOT TEXT COUNTS AS A NAME. `hideText` puts `al-u-is-vishidden` on the text span
    // (button.ts, the `al-c-button__text` branch) — VISUALLY hidden, clipped to 1px, still in the
    // accessibility tree. The guidance says so in as many words ("the text node is only visually
    // hidden — it stays in the layout and in the accessibility tree"), and this rule used to
    // contradict it, asserting the button "has no name at all" whenever the naming ATTRIBUTES were
    // absent. Measured 2026-09-03: that misfired on three story usages that name themselves exactly
    // this way (drawer's "Toggle Drawer", popover's "Menu" twice) while the eight real defects in
    // the example apps carry only a slotted icon and no default-slot text at all.
    //
    // So: look past the tag at what the element actually contains. Children carrying `slot=` name
    // some other region and are dropped whole; whatever text is left is the default slot, which is
    // what the hidden span renders.
    if (spec.tag === 'al-button' && seen.has('hidetext')) {
      const hide = seen.get('hidetext');
      const hidden = hide.kind === 'boolean' || hide.dynamic || hide.kind === 'dynamic' || String(hide.value).toLowerCase() !== 'false';
      const named = ['label', 'aria-label', 'aria-labelledby'].some((k) => seen.has(k));
      let slotText = '';
      if (hidden && !named) {
        const rest = text.slice(re.lastIndex);
        const close = rest.search(new RegExp(`</${m[1]}\s*>`, 'i'));
        const innerRaw = close === -1 ? '' : rest.slice(0, close);
        slotText = innerRaw
          // a slotted child names another region — drop it and everything inside it
          .replace(/<([A-Za-z][\w.-]*)([^>]*slot\s*=[^>]*)>[\s\S]*?<\/\s*>/gi, '')
          .replace(/<[A-Za-z][\w.-]*[^>]*slot\s*=[^>]*\/>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          // an interpolated expression is a name we cannot read but must not call absent
          .replace(/\$\{[^}]*\}/g, 'x')
          .replace(/\{[^}]*\}/g, 'x')
          .trim();
      }
      if (hidden && !named && !slotText) {
        push('a11y-name', `<${r.display}> sets hideText and has neither a label nor any default-slot text — nothing names it, so a screen reader announces only "button"`);
      }
    }

    if (sink.violations.length > before && sink.violations.slice(before).some((v) => v.severity === 'error')) {
      bc.errors++; sink.failingUsages++;
    }
  }

  const usesAltitude = sink.totalUsages > 0 || /--al-/.test(text);
  if (!usesAltitude) return;

  // Prose that QUOTES code, blanked out but offset-preserving, so line numbers stay true. Used by
  // every rule that reads styles or registration statements — never by the element/attribute scan,
  // whose long-standing behaviour is to check the samples too.
  const codeMasked = maskRegions(maskRegions(maskRegions(text, COMMENT_RE), BLOCK_COMMENT_RE), CODE_SAMPLE_RE);
  // Stylesheets too, for the rules that ask "is this file a document root?" — a CSS comment
  // reading `* on <html> is the same value …` is not a `<html>` element (measured: that exact
  // line in apps/docs/src/components/Sidebar.astro was the rule-4 check's only false positive).
  const structureMasked = maskRegions(codeMasked, STYLE_BLOCK_RE);

  // ── nesting-aware pass: ERR_UNKNOWN_SLOT (rule 3) + WARN_HANDROLLED_LAYOUT (rule 5) ────────
  // `<style>` bodies and comments are masked so CSS braces and prose can't corrupt the stack —
  // JSDoc included: `<span slot="trigger">` written INSIDE a doc comment is prose about markup,
  // not markup (measured: dialog.ts and drawer.ts both explain the pattern that way).
  const walkText = maskRegions(maskRegions(maskRegions(text, COMMENT_RE), BLOCK_COMMENT_RE), STYLE_BLOCK_RE);
  const flexClasses = flexGridClasses(codeMasked);
  const TAG_RE = /<(\/?)([A-Za-z][A-Za-z0-9.-]*)((?:"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\}|`[^`]*`|[^>])*?)\/?>/g;
  const stack = [];
  let t;
  while ((t = TAG_RE.exec(walkText))) {
    const closing = t[1] === '/';
    const name = t[2];
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].name === name) { const dropped = stack.splice(i); finishLayout(dropped[0]); break; }
      }
      continue;
    }
    const selfClosing = /\/\s*$/.test(t[3] ?? '') || VOID_TAGS.has(name.toLowerCase());
    const attrs = parseAttrs(t[3] ?? '');
    const attrMap = new Map();
    for (const a of attrs) if (a.rawName) attrMap.set(a.rawName.toLowerCase(), a);
    const spec = resolve(name);
    const parent = stack[stack.length - 1];

    // ERR_UNKNOWN_SLOT — `slot="x"` names a slot on the PARENT, not on the element carrying it.
    const slotAttr = attrMap.get('slot');
    if (slotAttr && slotAttr.kind === 'static' && slotAttr.value && parent?.spec?.spec?.slotsKnown) {
      const owner = parent.spec.spec;
      if (!owner.namedSlots.has(slotAttr.value)) {
        const allowed = [...owner.namedSlots];
        pushFree('unknown-slot', parent.spec.display, t.index,
          `<${name} slot="${slotAttr.value}"> targets a slot <${parent.spec.display}> does not declare${allowed.length ? ` (declared: ${allowed.join(', ')})` : ' (it declares only a default slot)'}`,
          { allowed, suggestion: didYouMean(slotAttr.value, allowed) });
      }
    }

    // Any Altitude element (or React wrapper) directly inside a frame counts as an arranged sibling.
    if (parent && spec) parent.alChildren = (parent.alChildren ?? 0) + 1;

    if (selfClosing) continue;

    const styleAttr = attrMap.get('style');
    const classAttr = attrMap.get('class') ?? attrMap.get('classname');
    const inlineFlex = styleAttr?.kind === 'static' && /display\s*:\s*(inline-)?(flex|grid)\b/i.test(styleAttr.value ?? '');
    const classFlex = classAttr?.kind === 'static' && String(classAttr.value ?? '').split(/\s+/).some((c) => flexClasses.has(c));
    stack.push({
      name,
      spec,
      index: t.index,
      alChildren: 0,
      // `<al-layout>` IS the sanctioned arrangement primitive — it is never hand-rolled layout.
      flexy: (inlineFlex || classFlex) && !/^al-/.test(name),
      how: inlineFlex ? 'an inline `display` declaration' : 'a class that sets `display: flex|grid`',
    });
  }
  while (stack.length) finishLayout(stack.pop());

  function finishLayout(frame) {
    if (!frame?.flexy) return;
    if ((frame.alChildren ?? 0) < 2) return;
    pushFree('handrolled-layout', frame.name, frame.index,
      `<${frame.name}> arranges ${frame.alChildren} sibling Altitude components with ${frame.how}`);
  }

  // ── ERR_PHANTOM_TOKEN (rule 2) + WARN_RAW_VALUE (rule 1) ─────────────────────────────────
  if (tokens) {
    // A `--al-*` this file DEFINES is legitimately readable in the same file (theme overrides).
    const declaredHere = new Set();
    for (const d of text.matchAll(/(--al-[\w-]+)\s*:/g)) declaredHere.add(d[1]);

    const regions = [];
    // rule 2 scans WHOLE stylesheets — an invented `--al-*` is wrong wherever it is read.
    for (const b of styleBlocks(codeMasked)) regions.push({ css: b.css, offset: b.offset, where: '(style block)' });
    // Inline `style="…"` on any element (JSX object styles are dynamic and skipped by parseAttrs).
    const STYLE_ATTR_RE = /\bstyle\s*=\s*"([^"]*)"/gi;
    let s;
    while ((s = STYLE_ATTR_RE.exec(codeMasked))) {
      const owner = /<([A-Za-z][A-Za-z0-9-]*)[^<>]*$/.exec(text.slice(Math.max(0, s.index - 400), s.index));
      const tag = owner ? owner[1] : null;
      regions.push({
        css: s[1], offset: s.index + s[0].indexOf(s[1]), where: tag ?? 'inline style',
        // Only an inline style on an ALTITUDE element is design-system surface. A consuming
        // page's own `<span style="font-size:14px">` is that page's business.
        altitude: Boolean(tag && resolve(tag)),
      });
    }

    // rule 1 is narrower on purpose. A consuming app's own chrome — the docs site's header, its
    // code panels — is not design-system surface, and warning on it produced 241 warnings against
    // apps/docs alone, which is how a validator teaches an agent to ignore it. So a raw value is
    // reported only where the declaration actually styles Altitude: an inline `style=` attribute,
    // or a stylesheet rule whose SELECTOR names an `al-*` element.
    const rawValueRegions = [];
    for (const b of styleBlocks(codeMasked)) {
      const RULE_RE = /([^{}]+)\{([^{}]*)\}/g;
      let ruleMatch;
      while ((ruleMatch = RULE_RE.exec(b.css))) {
        if (!/(^|[\s,>+~([:])al-[a-z][a-z0-9-]*/.test(ruleMatch[1])) continue;
        const bodyOffset = b.offset + ruleMatch.index + ruleMatch[0].indexOf(ruleMatch[2]);
        rawValueRegions.push({ css: ruleMatch[2], offset: bodyOffset, where: ruleMatch[1].trim().slice(0, 60) });
      }
    }
    for (const r2 of regions) if (r2.altitude) rawValueRegions.push(r2);

    for (const region of regions) {
      // rule 2 — every `--al-*` READ through var() must exist.
      for (const v of region.css.matchAll(/var\(\s*(--al-[\w-]+)/g)) {
        const name = v[1];
        if (tokens.has(name) || declaredHere.has(name)) continue;
        pushFree('phantom-token', region.where, region.offset + v.index,
          `\`${name}\` is not a token in the shipped set — CSS falls back silently, so this renders and is wrong`,
          { suggestion: didYouMean(name, tokens.names) });
      }
    }
    for (const region of rawValueRegions) {
      // rule 1 — a raw value where a token covers that property.
      for (const d of declarations(region.css, region.offset)) {
        if (d.prop.startsWith('--')) continue;          // defining a custom property, not consuming one
        if (/var\(\s*--al-/.test(d.value)) continue;    // already token-driven
        const base = d.prop.replace(/^(margin|padding)-(top|right|bottom|left|block|inline)(-(start|end))?$/, '$1');
        const radius = /^border(-[a-z]+)*-radius$/.test(d.prop);
        const colorish = tokens.colorProps.has(d.prop) || tokens.colorProps.has(base) || /-color$/.test(d.prop);
        if (colorish && HEX_RE.test(d.value)) {
          pushFree('raw-value', region.where, d.offset,
            `\`${d.prop}: ${d.value}\` hard-codes a colour; a token covers ${d.prop}, and a raw hex will not follow brand, mode or contrast`);
          continue;
        }
        const dimensional = tokens.dimensionProps.has(d.prop) || tokens.dimensionProps.has(base) || radius;
        if (!dimensional) continue;
        // Conservative: ignore 0, and ignore hairlines (<= 2px) — those are geometry, not spacing.
        const pxs = [...d.value.matchAll(PX_RE)].map((x) => Number(x[1])).filter((n) => n > 2);
        if (pxs.length) {
          pushFree('raw-value', region.where, d.offset,
            `\`${d.prop}: ${d.value}\` hard-codes a length; a token covers ${d.prop}, and a raw px will not follow the density setting`);
        }
      }
    }
  }

  // ── ERR_MISSING_THEME_HOST (rule 4) ───────────────────────────────────────────────────────
  // Fires only when the source plausibly IS the document root: it carries a document marker, or
  // it owns registration (which only a root does). An inner fragment — the usual MCP snippet —
  // never trips it, because an inner fragment's `<al-theme>` lives in a file it cannot see.
  if (firstAltitudeUsage) {
    // A document marker must be a real ELEMENT, opened and closed. Prose says `<body>` — a
    // dialog.test.ts comment reading "dropped focus to <body>" is not a document (measured).
    const paired = (tag) => new RegExp(`<${tag}[\\s>]`, 'i').test(structureMasked) && new RegExp(`</${tag}>`, 'i').test(structureMasked);
    const rootLike = /<!doctype\s+html/i.test(structureMasked) || paired('html') || paired('body')
      // Owning registration is a root's job — but only SETTING the flag counts. Component source
      // READS it (`globalThis.alAutoRegistry === true`) to pick a sub-component suffix, and
      // treating that read as "this is a document" reported 59 library modules as unthemed.
      || /\balAutoRegistry\s*=\s*(?:true|!0)\b/.test(structureMasked)
      || /\bregisterAltitude\s*\(\s*\{/.test(structureMasked);
    const themed = /\bal-theme\b/i.test(text) || /\bALTheme\b/.test(text);
    if (rootLike && !themed) {
      pushFree('missing-theme-host', firstAltitudeUsage.tag, firstAltitudeUsage.index,
        `this document renders <${firstAltitudeUsage.tag}> with no <al-theme> ancestor — tokens are set on that host, not on :root, so nothing is themed`);
    }
  }

  // ── WARN_MIXED_REGISTRATION (rule 6) ──────────────────────────────────────────────────────
  // Quoted code samples are masked first: a page that DOCUMENTS both paths is not using both.
  {
    const code = structureMasked;
    const flag = /\balAutoRegistry\s*=\s*(?:true|!0)\b/.exec(code);
    if (flag) {
      const reactImport = /^[^\S\n]*import\s[^\n]*from\s*['"]@southleft\/al-react(?:\/[^'"]*)?['"]/m.test(code);
      const versioned = /registerAltitude\s*\(\s*\{[^}]*mode\s*:\s*['"]versioned['"]/.test(code);
      if (reactImport || versioned) {
        pushFree('mixed-registration', 'al-theme', flag.index,
          `this document sets window.alAutoRegistry = true AND ${reactImport ? 'imports @southleft/al-react wrappers' : 'calls registerAltitude({ mode: "versioned" })'} — two registration paths in one document`);
      }
    }
  }
}

/*
 * This CLI's own documentation and fixtures EXIST to contain violations:
 * REPAIR.md prints a "Before:" for every code it explains, and __fixtures__
 * holds deliberate bad markup for the test suite. A directory walk that
 * includes them reports the checker's own teaching material as defects — and
 * once ERR_A11Y_NAME became an error, that turned a green scan of the library
 * into a failing one over a documented example.
 *
 * Skipped only when WALKING a directory. An explicit path still scans, which is
 * how the test suite points at the fixtures on purpose.
 */
const SELF_EXCLUDED = /(^|[\\/])cli[\\/](REPAIR\.md|__fixtures__)([\\/]|$)/;

function gatherFiles(target) {
  if (!existsSync(target)) return [];
  if (statSync(target).isFile()) return SCAN_EXT.test(target) ? [target] : [];
  const out = [];
  for (const e of readdirSync(target)) {
    if (e === 'node_modules' || e === 'dist' || e.startsWith('.')) continue;
    const child = join(target, e);
    if (SELF_EXCLUDED.test(child)) continue;
    out.push(...gatherFiles(child));
  }
  return out;
}

export function validateApp(target, opts = {}) {
  const cemPath = resolveCemPath(opts.cemPath);
  if (!cemPath) throw new Error('could not locate custom-elements.json (the Altitude CEM). Pass --cem <path> or set ALTITUDE_CEM.');
  /*
   * Extra manifests layer ON TOP, in order, and the last definition of a tag wins.
   * That is how a brand layer that supersedes base components under the same tag
   * gets checked against its own API instead of the base one.
   */
  const extraCems = (opts.extraCems ?? [])
    .concat((process.env.ALTITUDE_CEM_EXTRA ?? '').split(',').map((x) => x.trim()).filter(Boolean))
    .map((p) => resolve(p));
  for (const e of extraCems) {
    if (!existsSync(e)) throw new Error(`--cem-extra manifest not found: ${e}`);
  }
  const cemPaths = [cemPath, ...extraCems];
  const contracts = loadContracts(cemPaths);
  const tokens = opts.tokens === false ? null : loadTokenContract(opts);
  const ctx = { contracts, tokens };
  const sink = { violations: [], byComponent: {}, totalUsages: 0, failingUsages: 0 };
  for (const f of gatherFiles(target)) validateSource(f, readFileSync(f, 'utf8'), ctx, sink);
  const errorCount = sink.violations.filter((v) => v.severity === 'error').length;
  return {
    passRate: sink.totalUsages === 0 ? 1 : (sink.totalUsages - sink.failingUsages) / sink.totalUsages,
    totalUsages: sink.totalUsages,
    passingUsages: sink.totalUsages - sink.failingUsages,
    violations: sink.violations,
    errorCount,
    warningCount: sink.violations.length - errorCount,
    byComponent: sink.byComponent,
    contractSource: cemPaths.length > 1 ? cemPaths : cemPath,
    tokenSource: tokens?.source ?? null,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────────────────────
const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  let argv = process.argv.slice(2);
  if (argv[0] === 'validate') argv = argv.slice(1); // allow `npx @southleft/al-web-components validate <path>`
  const asJson = argv.includes('--json');
  const strict = argv.includes('--strict');
  const ci = argv.indexOf('--cem');
  const cemPath = ci >= 0 ? argv[ci + 1] : undefined;
  // repeatable: --cem-extra <path> --cem-extra <path>
  const extraCems = argv.reduce((acc, a, i) => (a === '--cem-extra' && argv[i + 1] ? acc.concat(argv[i + 1]) : acc), []);
  const ti = argv.indexOf('--tokens');
  const tokensPath = ti >= 0 ? argv[ti + 1] : undefined;
  const flagValues = new Set(['--cem', '--cem-extra', '--tokens']);
  const target = argv.find((a, i) => !a.startsWith('--') && !flagValues.has(argv[i - 1]));

  if (!target) { console.error('usage: altitude-validate [--json] [--strict] [--cem <path>] [--cem-extra <path>]... [--tokens <path>] <file-or-dir>'); process.exit(2); }

  try {
    const r = validateApp(resolve(target), { cemPath, extraCems, tokensPath });
    if (asJson) {
      process.stdout.write(JSON.stringify({ apiVersion: 1, type: 'validation.result', data: r }) + '\n');
    } else {
      // passRate scores per-usage checks only; document- and nesting-level codes are counted in
      // errorCount/warningCount instead — say so, so a 100% line is never read as "clean".
      console.log(`\nAltitude usage: ${r.passingUsages}/${r.totalUsages} <al-*> usages valid (${(r.passRate * 100).toFixed(1)}%) — element/attribute/value checks`);
      for (const [c, s] of Object.entries(r.byComponent)) console.log(`  ${c}: ${s.usages - s.errors}/${s.usages} ok`);
      if (r.violations.length) {
        console.log(`\n${r.violations.length} violation(s) — ${r.errorCount} error(s), ${r.warningCount} warning(s):`);
        for (const v of r.violations) {
          console.log(`\n  ${shortPath(v.file)}:${v.line}:${v.column}  [${v.severity}] [${v.rule}] ${v.code}`);
          console.log(`    ${v.component} — ${v.detail}`);
          if (v.fix) console.log(`    → fix: ${v.fix}`);
        }
        console.log(`\nRepair guide: cli/REPAIR.md (keyed by the CODE above).`);
        if (!strict && r.errorCount === 0) console.log('Warnings only — exit 0. Pass --strict to fail on warnings too.');
      } else {
        console.log('\n  no violations — all Altitude usage matches the component contracts. ✓');
      }
    }
    process.exit(strict ? (r.violations.length ? 1 : 0) : (r.errorCount ? 1 : 0));
  } catch (e) {
    const msg = String(e?.message || e).slice(0, 500);
    if (asJson) process.stdout.write(JSON.stringify({ apiVersion: 1, error: msg, code: 'ERR_VALIDATOR_FAILURE' }) + '\n');
    else console.error(`validator error: ${msg}`);
    process.exit(2);
  }
}

function shortPath(p) { const i = p.indexOf('/altitude/'); return i >= 0 ? p.slice(i + 1) : p; }
