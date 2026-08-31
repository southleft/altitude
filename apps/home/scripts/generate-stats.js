#!/usr/bin/env node
/**
 * AI Showcase Homepage (2026-08-20-ai-showcase-homepage) — computes the
 * "what's under the hood" KPI numbers from the repo itself, rather than
 * hardcoding them into the page. Every number on the homepage must stay true
 * as the library grows; this script is the single place that reads the real
 * sources so the page can't drift into a false claim.
 *
 * Run before `vite`/`vite build` (wired via package.json "start"/"build").
 * Requires libs/al-web-components to already be built (dist/css/tokens.json,
 * custom-elements analysis) — true whenever this app builds as part of
 * `build:all`, since `pnpm run build` (the libraries) runs first.
 *
 * Writes: apps/home/src/generated/stats.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const AL_WEB_COMPONENTS = path.join(REPO_ROOT, 'libs/al-web-components');
const OUT_DIR = path.join(__dirname, '../src/generated');
const OUT_FILE = path.join(OUT_DIR, 'stats.json');

/** Components — count directories under components/ whose `<name>.ts` file
 *  declares `static el = …` (the same registerable-component signal
 *  libs/al-web-components/vite.config.mjs's findComponentEntries uses), so
 *  the count matches what's actually shipped as a custom element family. */
function countComponents() {
  const componentsRoot = path.join(AL_WEB_COMPONENTS, 'components');
  let count = 0;
  for (const name of fs.readdirSync(componentsRoot)) {
    if (name.startsWith('.')) continue;
    const dir = path.join(componentsRoot, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    const tsFile = path.join(dir, `${name}.ts`);
    try {
      const src = fs.readFileSync(tsFile, 'utf8');
      if (/static\s+el\s*=/.test(src)) count++;
    } catch {
      /* no `<name>.ts` in this directory — not a component entry */
    }
  }
  return count;
}

/** Brands — the `brands` array in tokens-config.v5.mjs is the single source
 *  of truth for which brand identities the token pipeline actually emits
 *  (styles/tokens-config.v5.mjs; see PresetBundle in .storybook/presets.ts
 *  for the same list hand-mirrored for compile-time checking). Parsed via
 *  regex rather than imported — the file is an ESM build script with
 *  Node-only side effects, not a data module safe to `import()` here. */
function countBrands() {
  const configPath = path.join(AL_WEB_COMPONENTS, 'styles/tokens-config.v5.mjs');
  const src = fs.readFileSync(configPath, 'utf8');
  const brandsBlockMatch = src.match(/const brands = \[([\s\S]*?)\n\s*\];/);
  if (!brandsBlockMatch) throw new Error('generate-stats: could not find `brands` array in tokens-config.v5.mjs');
  const ids = new Set();
  const brandRe = /brand:\s*'([a-z]+)'/g;
  let m;
  while ((m = brandRe.exec(brandsBlockMatch[1]))) ids.add(m[1]);
  return ids.size;
}

/** Presets — the curated `PRESETS` array in `.storybook/presets.ts` (spec
 *  2026-08-20-brand-pruning-and-storybook-de-bloat swapped the homepage's
 *  "brands shipped" KPI for this one: with only two brands, "brands" reads
 *  as a weak number, but the brand+mode+density+contrast+shape+motion
 *  RECIPE system it demonstrates is the actual story — presets is the
 *  count of shipped recipes, same generate-don't-hardcode principle).
 *  Parsed via regex, not imported — the module is TypeScript, and this
 *  script runs on bare Node without a TS loader. */
function countPresets() {
  const presetsPath = path.join(AL_WEB_COMPONENTS, 'theme-presets.ts');
  const src = fs.readFileSync(presetsPath, 'utf8');
  const block = src.match(/export const PRESETS: Preset\[\] = \[([\s\S]*?)\n\];/);
  if (!block) throw new Error('generate-stats: could not find `PRESETS` array in theme-presets.ts');
  const matches = block[1].match(/\{\s*id:\s*'[^']+'/g);
  if (!matches) throw new Error('generate-stats: parsed 0 presets from theme-presets.ts');
  return matches.length;
}

/** Icons — the generated Phosphor icon catalog. */
function countIcons() {
  const catalogPath = path.join(AL_WEB_COMPONENTS, 'components/icon/catalog.ts');
  const src = fs.readFileSync(catalogPath, 'utf8');
  const namesMatch = src.match(/ICON_NAMES: readonly string\[\] = (\[[^\]]*\])/);
  if (!namesMatch) throw new Error('generate-stats: could not find ICON_NAMES in icon/catalog.ts');
  return JSON.parse(namesMatch[1]).length;
}

/** Design tokens — the flat `--al-*` token -> value map Style Dictionary
 *  ships to consumers (`@southleft/al-web-components/tokens.json`, the same file
 *  `@southleft/al-web-components` exports as `./tokens.json`). This is the resolved,
 *  shipped surface — the number a consumer of the package actually sees —
 *  rather than an editorial count of DTCG source entries across all three
 *  tiers x 8 brands, which double-counts the same semantic token once per
 *  brand bundle. */
function countTokens() {
  const tokensJsonPath = path.join(AL_WEB_COMPONENTS, 'dist/css/tokens.json');
  if (!fs.existsSync(tokensJsonPath)) {
    throw new Error(
      'generate-stats: libs/al-web-components/dist/css/tokens.json is missing — run `pnpm --filter @southleft/al-web-components build` first.'
    );
  }
  const tokens = JSON.parse(fs.readFileSync(tokensJsonPath, 'utf8'));
  return Object.keys(tokens).length;
}

function main() {
  const stats = {
    components: countComponents(),
    brands: countBrands(),
    presets: countPresets(),
    icons: countIcons(),
    tokens: countTokens(),
    generated: new Date().toISOString(),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(stats, null, 2) + '\n');
  console.log('[generate-stats] wrote', path.relative(REPO_ROOT, OUT_FILE), stats);
}

main();
