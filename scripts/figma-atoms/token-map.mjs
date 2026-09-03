#!/usr/bin/env node
/**
 * token-map.mjs — map a CSS custom-property name to the Figma variable that holds it.
 *
 *   --al-theme-color-background-primary-default -> theme/color/background/primary-default
 *   --al-theme-space                            -> theme/space/@
 *   --al-font-weight-bold                       -> typography/font-weight/bold
 *
 * Three things make this non-trivial, and all three are handled here:
 *
 *   1. Segment boundaries are ambiguous. `theme-color-background-primary-default`
 *      cannot be split on '-' — `primary-default` and `max-width` are single segments.
 *      Solved by indexing FORWARD: every known token path is converted to its CSS name,
 *      so the lookup is exact rather than parsed.
 *   2. `@` means "the default of its group": `theme/space/@` emits `--al-theme-space`.
 *      Dropped when building the CSS name.
 *   3. Figma renamed some Tier 1 groups under `typography/`, so the code path and the
 *      Figma path differ. ALIASES bridges them (same table as audit-figma-vs-code.mjs).
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scope, projectArg } from './project-scope.mjs';
import { isTokenLeaf, normalizeLeaf } from '../lib/dtcg-token.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TOKENS = join(ROOT, 'libs/al-web-components/styles/tokens-dtcg');
// Which brand's overrides count as real tokens. Resolved from the active project.
const BRAND = (() => { try { return scope(projectArg()).brand; } catch { return null; } })();

/** code token prefix -> Figma variable prefix */
const ALIASES = [
  ['font-size.', 'typography/font-size/'],
  ['line-height.', 'typography/line-height/'],
  ['font-family.', 'typography/font-family/'],
  ['font-weight.', 'typography/font-weight/'],
  ['letter-spacing.', 'typography/letter-spacing/'],
  ['text-decoration.', 'typography/text-decoration/'],
  ['animation.distance.', 'animation/distance/'],
  ['color.brand.paper.', 'color/neutral/paper/'],
  ['color.brand.ink.', 'color/neutral/ink/'],
  // Figma nests the role radii as a FOLDER; the code spells them with a dash.
  ['theme.border.radius.role-', 'theme/border/radius/role/'],
];

const readJson = (p) => JSON.parse(readFileSync(join(TOKENS, p), 'utf8'));
/*
 * Discovered, not enumerated. This was a hardcoded list naming every tier-1 and
 * tier-2 file, so deleting tier-1/{base,spacing,icons,layout}.json — after their
 * values were folded into the tier-2 theme tokens to match Figma — made this
 * throw ENOENT and took gate:contracts down with it. A token tree that is
 * allowed to be reorganised must not be mirrored in a literal somewhere else.
 */
const walkJson = (dir) => {
  const abs = join(TOKENS, dir);
  if (!existsSync(abs)) return [];
  const out = [];
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...walkJson(rel));
    else if (e.name.endsWith('.json')) out.push(rel);
  }
  return out;
};
// tier-2/brand is added per-BRAND below, never wholesale
const FILES = [...walkJson('tier-1'), ...walkJson('tier-2'), ...walkJson('tier-3')]
  .filter((f) => !f.startsWith('tier-2/brand/'))
  .sort();

// A BRAND may introduce tokens the base tiers never declare (southleft's
// theme.border.radius.role-surface / role-action are brand-only). Without these the
// component ops report them 'unresolved' and the variant silently loses the binding.
const brandDir = join(TOKENS, 'tier-2/brand', BRAND || '');
if (BRAND && existsSync(brandDir)) {
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name));
      else if (e.name.endsWith('.json')) FILES.push(relative(TOKENS, join(dir, e.name)).split(sep).join('/'));
    }
  };
  walk(brandDir);
}

function flatten(node, prefix, out) {
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('$')) continue;
    const p = prefix ? `${prefix}.${k}` : k;
    if (isTokenLeaf(v)) out[p] = normalizeLeaf(v);
    else if (v && typeof v === 'object') flatten(v, p, out);
  }
  return out;
}

const codePaths = {};
for (const f of FILES) flatten(readJson(f), '', codePaths);

const toFigma = (codePath) => {
  for (const [c, f] of ALIASES) if (codePath.startsWith(c)) return f + codePath.slice(c.length).replace(/\./g, '/');
  return codePath.replace(/\./g, '/');
};

/** CSS custom-property suffix (no `--al-`) -> { code, figma } */
export const CSS_TO_TOKEN = {};
for (const path of Object.keys(codePaths)) {
  const css = path.split('.').filter((s) => s !== '@').join('-');
  if (!CSS_TO_TOKEN[css]) CSS_TO_TOKEN[css] = { code: path, figma: toFigma(path) };
}

/** Resolve a css var suffix (as emitted by measure-lib `tokens`) to a Figma name. */
export function figmaVariableFor(cssSuffix) {
  const hit = CSS_TO_TOKEN[cssSuffix];
  return hit ? hit.figma : null;
}

if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/') || process.argv[1]?.endsWith('token-map.mjs')) {
  const probes = process.argv.slice(2).length
    ? process.argv.slice(2)
    : ['theme-color-background-primary-default', 'theme-color-background-primary-strong',
       'theme-color-content-primary-weak', 'theme-space-xs', 'theme-space',
       'theme-border-radius', 'theme-border-width-md', 'theme-opacity-disabled',
       'font-weight-bold', 'theme-color-background-transparent-default',
       'theme-color-content-neutral-default', 'theme-icon-lg'];
  console.log(`indexed ${Object.keys(CSS_TO_TOKEN).length} css names\n`);
  let miss = 0;
  for (const p of probes) {
    const f = figmaVariableFor(p);
    if (!f) miss++;
    console.log(`  --al-${p.padEnd(44)} -> ${f || '*** UNRESOLVED ***'}`);
  }
  console.log(`\n${probes.length - miss}/${probes.length} resolved`);
}
