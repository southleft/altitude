#!/usr/bin/env node
/**
 * check-sl-scope.mjs — keep a design system's component allowlist honest.
 *
 * A scoped design system (`library.components` in `.altitude/ds-projects.json`)
 * claims to be the subset of the shared library that a real product actually
 * ships. That claim rots the moment someone adds a component to the product and
 * forgets the registry: the DS then documents 21 components while the site uses
 * 22, and the parity build-list quietly misses one.
 *
 * This gate re-derives the truth from the consuming app's source and compares.
 *
 * Asserts, per scoped project that declares a `consumer` app:
 *   S1  every `<al-*>` element used in the consumer's source is allowlisted
 *       (or is a known non-component: an icon element, or absent from the CEM)
 *   S2  every allowlisted tag actually exists in the library's CEM
 *   S3  every allowlisted tag is still used by the consumer (stale entries)
 *
 * S3 is a WARNING, not a failure — a component can be legitimately kept in the
 * DS ahead of the site adopting it. S1 and S2 fail the build.
 *
 * Usage:
 *   node scripts/check-sl-scope.mjs                # every scoped project
 *   node scripts/check-sl-scope.mjs --project southleft
 *   node scripts/check-sl-scope.mjs --fix-hint     # print a ready-to-paste array
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

import { REPO_ROOT } from '../libs/altitude-mcp/src/lib/paths.mjs';
import { listProjectIds, resolveProject, projectFromArgv } from '../libs/altitude-mcp/src/lib/ds-project.mjs';
import { loadComponents } from '../libs/altitude-mcp/src/lib/cem.mjs';

// Which app is the source of truth for each scoped project's usage. Kept here
// rather than in the registry because it is a property of THIS CHECK, not of the
// design system — the registry stays about what the DS is, not how it is audited.
const CONSUMERS = {
  southleft: { dir: 'apps/southleft/src', extensions: ['.astro', '.html', '.ts', '.tsx'] },
};

/**
 * Tags that are GENERATED, not authored components, and so are never
 * allowlisted individually.
 *
 * The icon runtime emits one custom element per glyph (`al-icon-star`,
 * `al-icon-check`, … 1,512 of them). They are in the CEM, so without this they
 * read as "used by the site but missing from the design system" — but a design
 * system documents the icon SYSTEM once (`al-icon` + the catalog page), not
 * every glyph as its own component. Parity already excludes `al-icon` for the
 * same reason: "icons resolve by name, not as a component set".
 *
 * `al-icon` itself is a real component and is deliberately NOT matched here.
 */
const GENERATED_TAG_PATTERNS = [/^al-icon-.+$/];
const isGenerated = (tag) => GENERATED_TAG_PATTERNS.some((re) => re.test(tag));

const wantFixHint = process.argv.includes('--fix-hint');
const only = projectFromArgv();

function walk(dir, extensions, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, extensions, out);
    else if (extensions.includes(extname(name))) out.push(full);
  }
  return out;
}

/**
 * Custom-element tags used in real markup.
 *
 * Comments are stripped FIRST. `apps/southleft` documents at length why it does
 * NOT use certain components ("Was a thin `<al-hero>` wrapper; al-hero …"), and
 * a naive grep reads those explanations as usage — which is exactly the false
 * positive that would push a non-existent component into the allowlist.
 */
function usedTags(file, prefix) {
  const src = readFileSync(file, 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '') // HTML comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1'); // line comments (not `https://`)
  const found = new Set();
  const re = new RegExp(`<(${prefix}[a-z0-9-]+)[\\s/>]`, 'g');
  let m;
  while ((m = re.exec(src))) found.add(m[1]);
  return found;
}

const cemTags = new Set(loadComponents().map((c) => c.tag));
let failed = false;

const ids = (only ? [only] : listProjectIds()).filter((id) => {
  const p = resolveProject(id);
  return p.library.components?.length && CONSUMERS[id];
});

if (ids.length === 0) {
  console.log('No scoped projects with a declared consumer app — nothing to check.');
  process.exit(0);
}

for (const id of ids) {
  const project = resolveProject(id);
  const consumer = CONSUMERS[id];
  const prefix = project.library.tagPrefix;
  const allowlist = new Set(project.library.components);

  const dir = join(REPO_ROOT, consumer.dir);
  if (!existsSync(dir)) {
    console.error(`[${id}] consumer source not found: ${consumer.dir}`);
    failed = true;
    continue;
  }

  const files = walk(dir, consumer.extensions);
  const used = new Set();
  for (const f of files) for (const t of usedTags(f, prefix)) used.add(t);

  // S1 — used but not allowlisted. Tags absent from the CEM are not real
  // components (icon elements are generated per-glyph, and a tag the library
  // does not export cannot be documented) — report them separately.
  const missing = [...used].filter((t) => !allowlist.has(t) && cemTags.has(t) && !isGenerated(t)).sort();
  const generated = [...used].filter((t) => !allowlist.has(t) && isGenerated(t)).sort();
  const notComponents = [...used].filter((t) => !allowlist.has(t) && !cemTags.has(t) && !isGenerated(t)).sort();

  // S2 — allowlisted but not a real component.
  const bogus = [...allowlist].filter((t) => !cemTags.has(t)).sort();

  // S3 — allowlisted but unused (warning only). A generated glyph element counts
  // as using its parent component: `<al-icon-star>` means the site uses `al-icon`.
  const usedIncludingGenerated = new Set(used);
  if ([...used].some(isGenerated)) usedIncludingGenerated.add('al-icon');
  const unused = [...allowlist].filter((t) => !usedIncludingGenerated.has(t)).sort();

  console.log(
    `\n[${id}] ${consumer.dir}: ${files.length} files, ${used.size} ${prefix}* tags used, ` +
      `${allowlist.size} allowlisted (library has ${cemTags.size}).`,
  );

  if (missing.length) {
    failed = true;
    console.error(`  S1 FAIL — used by the site but NOT in library.components:`);
    for (const t of missing) console.error(`    ${t}`);
    console.error(`    Fix: add them to projects.${id}.library.components in .altitude/ds-projects.json,`);
    console.error(`         then: node scripts/figma-parity/seed-manifest.mjs --project ${id}`);
  }
  if (bogus.length) {
    failed = true;
    console.error(`  S2 FAIL — allowlisted but not exported by the library (typo, or removed component):`);
    for (const t of bogus) console.error(`    ${t}`);
  }
  if (generated.length) {
    console.log(`  note — generated per-glyph icon elements (documented via al-icon + the catalog, not individually):`);
    console.log(`    ${generated.join(', ')}`);
  }
  if (notComponents.length) {
    console.log(`  note — used but not exported by the library, correctly not allowlisted:`);
    console.log(`    ${notComponents.join(', ')}`);
  }
  if (unused.length) {
    console.log(`  S3 warn — allowlisted but not currently used by the site (fine if deliberate):`);
    console.log(`    ${unused.join(', ')}`);
  }
  if (!missing.length && !bogus.length) console.log('  scope OK.');

  if (wantFixHint) {
    const suggested = [...new Set([...used].filter((t) => cemTags.has(t)))].sort();
    console.log(`\n  --fix-hint: components actually used, as a JSON array:`);
    console.log('  ' + JSON.stringify(suggested, null, 2).replace(/\n/g, '\n  '));
  }
}

console.log('');
process.exit(failed ? 1 : 0);
