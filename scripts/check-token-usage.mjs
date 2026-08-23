#!/usr/bin/env node
/**
 * check-token-usage.mjs — find emitted design tokens that nothing consumes.
 *
 * Every token in `dist/css/tokens.json` is emitted into `:root` on every page
 * that loads main.css, and every one of them is locked into the sha256 token
 * baseline that the G8 gate compares against. A token nobody reads is dead
 * weight in both places — and a dead SEMANTIC token is worse than dead weight,
 * because it means the state it names (disabled, secondary, …) is being
 * hardcoded somewhere else instead.
 *
 * The inverse case matters more: a token that is CONSUMED via var() but never
 * emitted silently falls back, so the design system is not actually in control
 * of that value. Those are reported as PHANTOM and are always a defect.
 *
 * This is a REPORT by default and exits 0, because "dead" is a judgement call
 * for tier-1 primitives — a palette deliberately ships a reserve. Pass
 * `--fail-on-phantom` to make phantom tokens fatal (they are never intentional),
 * and `--fail-on-dead-semantic` once the semantic layer has been cleaned up.
 *
 * Usage:
 *   node scripts/check-token-usage.mjs                    # full report
 *   node scripts/check-token-usage.mjs --fail-on-phantom  # gate mode
 *   node scripts/check-token-usage.mjs --json             # machine-readable
 *
 * Requires `pnpm run build` first (it reads dist/css/tokens.json).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The emitted `:root` token map, in preference order.
 *
 * `dist/css/tokens.json` is the full library build's copy. `styles/dist/` is
 * written by `build:tokens` ALONE (via `copy-tokens-to-legacy-dist.js`) and is
 * byte-identical to it — which is what lets CI run this as a gate after the
 * cheap token build instead of a full Vite build.
 */
const TOKENS_JSON_CANDIDATES = [
  'libs/al-web-components/dist/css/tokens.json',
  'libs/al-web-components/styles/dist/tokens.json',
];
const TOKENS_JSON =
  TOKENS_JSON_CANDIDATES.map((p) => join(REPO_ROOT, p)).find((p) => existsSync(p)) ??
  join(REPO_ROOT, TOKENS_JSON_CANDIDATES[0]);

/** Where a var() consumer could legitimately live. */
const SOURCE_ROOTS = [
  'libs/al-web-components/components',
  'libs/al-web-components/styles',
  'libs/al-web-components/directives',
  'libs/al-web-components/controllers',
  'libs/al-web-components/motion',
  'libs/al-react/src',
  'libs/sl-web-components',
  'apps',
];
const SOURCE_EXTS = new Set(['.scss', '.css', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.astro', '.svelte', '.html', '.vue']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-vite', 'dist-v5', 'storybook-static', '.astro', '.angular', '.svelte-kit', 'build', 'tokens-dtcg']);

if (!existsSync(TOKENS_JSON)) {
  console.error(
    `check-token-usage: none of ${TOKENS_JSON_CANDIDATES.join(', ')} found — run \`pnpm --filter al-web-components build:tokens\` first.`,
  );
  process.exit(1);
}

const emitted = Object.keys(JSON.parse(readFileSync(TOKENS_JSON, 'utf8')));

// ------------------------------------------------------------ scan sources
function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.storybook') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      yield* walk(full);
    } else if (SOURCE_EXTS.has(extname(e.name))) {
      yield full;
    }
  }
}

/** token name -> Set of files that read it through var(--name) */
const consumers = new Map();
/** every --al-* name referenced by a var(), whether or not it is emitted */
const referenced = new Set();
/**
 * Every --al-* name DECLARED anywhere in source (`--name: value`).
 *
 * tokens.json alone is not the emitted set. It is the DEFAULT `:root` build
 * (altitude brand, light mode). The scoped `<al-theme>` host and the per-brand
 * partials declare more: the shape axis (--al-theme-border-radius-role-*) and
 * the motion axis (--al-theme-animation-*-role-*) live in components/theme/
 * theme.scss and styles/dist/**\/brand/*.css, never in the :root bundle.
 * Judging "emitted" by tokens.json membership alone reported all nine of those
 * as phantom when they are simply scoped — which would have sent a reader
 * chasing a bug that does not exist.
 */
const declared = new Set();

const VAR_RE = /var\(\s*(--al-[a-zA-Z0-9-]+)/g;
const DECL_RE = /(--al-[a-zA-Z0-9-]+)\s*:/g;

let filesScanned = 0;
for (const root of SOURCE_ROOTS) {
  const abs = join(REPO_ROOT, root);
  if (!existsSync(abs) || !statSync(abs).isDirectory()) continue;
  for (const file of walk(abs)) {
    filesScanned++;
    const text = readFileSync(file, 'utf8');
    if (!text.includes('--al-')) continue;
    for (const m of text.matchAll(VAR_RE)) {
      const name = m[1].slice(2); // strip leading --
      referenced.add(name);
      if (!consumers.has(name)) consumers.set(name, new Set());
      consumers.get(name).add(relative(REPO_ROOT, file));
    }
    // Only the TOKEN layer counts as declaring a token. `styles/**` is the
    // token pipeline's output (including the per-brand partials) and
    // `components/theme/theme.scss` is the scoped <al-theme> host that owns the
    // density/contrast/motion/shape axes.
    //
    // An arbitrary component declaring the same custom property is an OVERRIDE,
    // not an emission, and must not count. Concretely:
    // tooltip.scss sets `--al-theme-color-focus-ring: transparent` to suppress
    // its own focus ring. Treating that as "the token exists" hid the fact that
    // the focus-ring colour is never emitted by the pipeline at all — every
    // other component reads it with a hardcoded fallback, so the focus ring is
    // not under design-system control.
    const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
    const isTokenLayer =
      rel.startsWith('libs/al-web-components/styles/') ||
      rel === 'libs/al-web-components/components/theme/theme.scss';
    if (isTokenLayer) {
      for (const m of text.matchAll(DECL_RE)) declared.add(m[1].slice(2));
    }
  }
}

// ------------------------------------------------------------ classify
//
// Three namespaces share the `--al-` prefix and only the first two are tokens:
//
//   al-theme-*   tier-2/3 SEMANTIC tokens. Emitted into :root. A var() read of
//                one that is not emitted is a real defect — it falls back
//                silently and the value leaves design-system control.
//   <emitted>    tier-1 PRIMITIVES, identified by being in tokens.json at all.
//   everything   COMPONENT THEMING HOOKS (--al-button-padding, --al-dialog-width).
//   else         These are deliberately NOT emitted: they are the public knobs a
//                consumer sets to restyle a component, and they are supposed to
//                be undefined until someone sets one. Counting them as phantoms
//                inflated the number from 19 to 118 and hid the real signal.
const isSemantic = (name) => name.startsWith('al-theme-');

// `var(--al-theme-animation-duration-role-${role})` leaves a truncated name
// ending in `-`. Those are interpolation artifacts of this regex, not tokens.
const isInterpolationArtifact = (name) => name.endsWith('-');

const dead = emitted.filter((t) => !consumers.has(t));
const deadSemantic = dead.filter(isSemantic);
const deadPrimitive = dead.filter((t) => !isSemantic(t));

// A token counts as emitted if the default :root bundle carries it OR any
// source file declares it (scoped <al-theme> host, per-brand partial, …).
const isEmitted = (t) => emitted.includes(t) || declared.has(t);

const phantom = [...referenced]
  .filter((t) => !isEmitted(t) && isSemantic(t) && !isInterpolationArtifact(t))
  .sort();
const scopedOnly = [...referenced]
  .filter((t) => !emitted.includes(t) && declared.has(t) && isSemantic(t))
  .sort();
const componentHooks = [...referenced].filter(
  (t) => !isEmitted(t) && !isSemantic(t) && !isInterpolationArtifact(t),
);

// ------------------------------------------------------------ report
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ emitted: emitted.length, filesScanned, dead, deadSemantic, deadPrimitive, phantom, scopedOnly, componentHooks }, null, 2));
} else {
  console.log(`check-token-usage — scanned ${filesScanned} source files\n`);
  console.log(`emitted tokens:        ${emitted.length}`);
  console.log(`consumed at least once: ${emitted.length - dead.length}`);
  console.log(`DEAD (0 var() readers): ${dead.length}  (${deadSemantic.length} semantic, ${deadPrimitive.length} primitive)`);
  console.log(`PHANTOM semantic (read, never declared by the token layer): ${phantom.length}`);
  console.log(`scoped-only semantic (declared by <al-theme>/brand, absent from :root): ${scopedOnly.length}`);
  console.log(`component theming hooks (unemitted by design): ${componentHooks.length}\n`);

  if (phantom.length) {
    console.log('PHANTOM — semantic tokens read via var() but DECLARED NOWHERE, so these silently fall back:');
    for (const t of phantom) {
      const where = [...(consumers.get(t) ?? [])].slice(0, 3).join(', ');
      console.log(`  --${t}\n      read in: ${where}`);
    }
    console.log('');
  }

  if (deadSemantic.length) {
    console.log('DEAD SEMANTIC — a semantic token nobody reads means that state is hardcoded elsewhere:');
    // Group by family so the shape of the debt is visible rather than a flat list.
    const families = new Map();
    for (const t of deadSemantic) {
      const fam = t.split('-').slice(0, 4).join('-');
      if (!families.has(fam)) families.set(fam, []);
      families.get(fam).push(t);
    }
    for (const [fam, members] of [...families].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${fam}-* — ${members.length}`);
      if (members.length <= 4) members.forEach((m) => console.log(`      --${m}`));
    }
    console.log('');
  }

  console.log(`DEAD PRIMITIVE: ${deadPrimitive.length} (a palette reserve is legitimate here — judge per family)`);
}

// ------------------------------------------------------------ verdict
const failures = [];
if (process.argv.includes('--fail-on-phantom') && phantom.length) {
  failures.push(`${phantom.length} phantom token(s): consumed via var() but never emitted`);
}
if (process.argv.includes('--fail-on-dead-semantic') && deadSemantic.length) {
  failures.push(`${deadSemantic.length} dead semantic token(s)`);
}

if (failures.length) {
  console.error(`\ncheck-token-usage: FAIL\n${failures.map((f) => `  ${f}`).join('\n')}`);
  process.exit(1);
}
process.exit(0);
