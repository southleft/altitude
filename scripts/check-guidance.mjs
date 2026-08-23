#!/usr/bin/env node
/**
 * Component guidance needs a gate, because guidance is the only thing on the
 * docs site that a machine did not write.
 *
 * `apps/docs/scripts/check-docs-coverage.mjs` proves every component in the
 * manifest has a page. `check-status-panels.mjs` proves the generated status
 * panels on that page are honest. Neither can say anything about the authored
 * half — what a component is FOR, and when reaching for it is wrong — because
 * that half has no generator behind it. Prose with no gate is the failure mode
 * this whole spec exists to fix: a "when NOT to use" section that silently
 * disappears for 40 components is worse than never having had one.
 *
 * So this checks four things, three of them against the BUILT pages:
 *
 *   1. NO GUIDANCE FOR NON-COMPONENTS. Every file in
 *      `apps/docs/src/content/guidance/` must be named for a slug the CEM
 *      knows. This is what stops someone writing a page for `al-stat-card` or
 *      `al-tag` — which are AI-eval fixtures in
 *      `scripts/ai-readiness/fixtures/canonical-contracts.md`, duplicating
 *      `al-stat` and `al-chip`, and are not elements the library ships.
 *
 *   2. EVERY PAGE SAYS SOMETHING. A component page must render either a
 *      guidance panel or an explicit "not yet authored" note. Rendering
 *      neither is the shape that lets a section quietly vanish, so it fails.
 *
 *   3. NO PARTIAL PANELS. A page that claims guidance must carry all seven
 *      sections — purpose, when to use, when NOT to use, do, don't,
 *      accessibility, content. The collection schema already requires them at
 *      build time; this re-checks the rendered output, because the schema
 *      cannot see a template that stopped rendering a section.
 *
 *   4. EVERY CITATION STILL RESOLVES. Each guidance claim names a repo file and
 *      a literal string that must still appear in it. Both are re-read here. A
 *      renamed file or a deleted anchor fails the gate — which is the whole
 *      anti-drift mechanism: guidance that has stopped being true breaks a
 *      check instead of misleading a reader.
 *
 * Coverage is reported, and floored. `--min N` fails when fewer than N
 * components carry guidance, so authored coverage can ratchet up but never
 * silently regress. The default floor is the number authored today.
 *
 *   node scripts/check-guidance.mjs [--dist <dir>] [--min <n>]
 *
 * Run AFTER `pnpm --filter al-app-docs build`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPONENTS } from '../apps/docs/src/lib/registry.mjs';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const GUIDANCE_DIR = path.join(REPO_ROOT, 'apps', 'docs', 'src', 'content', 'guidance');

const argOf = (flag) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : null;
};
const DIST = path.resolve(argOf('--dist') ?? path.join(REPO_ROOT, 'dist', 'docs'));

/**
 * The coverage floor. Raise it when guidance is authored for more components;
 * never lower it to make a red gate green.
 */
const DEFAULT_MIN = 12;
const MIN = Number(argOf('--min') ?? DEFAULT_MIN);

/** Every section the panel must render when it claims to have guidance. */
const REQUIRED_SECTIONS = [
  'purpose',
  'when-to-use',
  'when-not-to-use',
  'dos',
  'donts',
  'accessibility',
  'content',
  'sources',
];

const failures = [];
const notes = [];

/* --------------------------------------- 1. guidance names real components */

const slugs = new Set(COMPONENTS.map((c) => c.slug));

let sourceFiles = [];
if (!fs.existsSync(GUIDANCE_DIR)) {
  failures.push(`No guidance directory at ${GUIDANCE_DIR}.`);
} else {
  sourceFiles = fs
    .readdirSync(GUIDANCE_DIR)
    .filter((name) => name.endsWith('.yaml') || name.endsWith('.yml'));
  for (const file of sourceFiles) {
    const slug = file.replace(/\.ya?ml$/, '');
    if (!slugs.has(slug)) {
      failures.push(
        `guidance/${file} describes "${slug}", which is not a component in the CEM. ` +
          `Guidance may only be written for elements the library actually ships.`,
      );
    }
  }
}

/* ------------------------------------------------- 2-4. the built pages */

const authored = [];
const missing = [];
/** Every distinct citation seen in the built HTML: `${path}::${anchor}`. */
const citations = new Map();

/**
 * Component pages are located by SHAPE — `.../components/<slug>/index.html` —
 * anywhere under the built site, rather than at one fixed path. The docs app is
 * gaining a per-project route prefix, so the same component can be published at
 * more than one url; every copy of a page has to satisfy this gate, and a gate
 * that hard-coded one directory would silently stop checking the others.
 */
function findComponentPages(root) {
  const byslug = new Map();
  if (!fs.existsSync(root)) return byslug;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === 'index.html') {
        const slug = path.basename(dir);
        if (path.basename(path.dirname(dir)) === 'components') {
          if (!byslug.has(slug)) byslug.set(slug, []);
          byslug.get(slug).push(full);
        }
      }
    }
  };
  walk(root);
  return byslug;
}

const pagesBySlug = findComponentPages(DIST);

if (pagesBySlug.size === 0) {
  failures.push(
    `No built component pages under ${DIST}. Run \`pnpm --filter al-app-docs build\` before this gate.`,
  );
} else {
  for (const component of COMPONENTS) {
    const files = pagesBySlug.get(component.slug) ?? [];
    if (files.length === 0) {
      failures.push(`No built page for ${component.tag} anywhere under ${DIST}.`);
      continue;
    }
    // Every published copy must agree, so they are checked as one document.
    const html = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
    const hasPanel = html.includes('data-guidance-panel');
    const hasMissingNote = html.includes('data-guidance-missing');

    /* 2 — one of the two honest shapes, never neither and never both. */
    if (!hasPanel && !hasMissingNote) {
      failures.push(
        `${component.tag} renders no guidance panel AND no "not authored" note. ` +
          `A page must state which of the two it is.`,
      );
      continue;
    }
    if (hasPanel && hasMissingNote) {
      failures.push(`${component.tag} renders both a guidance panel and a "not authored" note.`);
      continue;
    }
    if (!hasPanel) {
      missing.push(component.slug);
      continue;
    }
    authored.push(component.slug);

    /* 3 — no partial panels. */
    for (const section of REQUIRED_SECTIONS) {
      if (!html.includes(`data-guidance-section="${section}"`)) {
        failures.push(
          `${component.tag} has guidance but its "${section}" section did not render. ` +
            `The panel template dropped a required section.`,
        );
      }
    }

    /* 4 — collect citations for the drift check below. */
    const pattern = /data-guidance-source="([^"]+)"\s+data-guidance-contains="([^"]+)"/g;
    let match;
    let found = 0;
    while ((match = pattern.exec(html)) !== null) {
      found += 1;
      citations.set(`${match[1]}::${match[2]}`, {
        path: match[1],
        contains: match[2],
        slug: component.slug,
      });
    }
    if (found === 0) {
      failures.push(`${component.tag} has a guidance panel but cited no source files.`);
    }
  }
}

/* ------------------------------------------------ 4. citations still hold */

let checkedCitations = 0;
for (const citation of citations.values()) {
  const target = path.join(REPO_ROOT, citation.path);
  if (!fs.existsSync(target)) {
    failures.push(
      `guidance/${citation.slug}: cited file "${citation.path}" does not exist. ` +
        `The guidance on that page is describing code that moved or was deleted.`,
    );
    continue;
  }
  const text = fs.readFileSync(target, 'utf8');
  if (!text.includes(citation.contains)) {
    failures.push(
      `guidance/${citation.slug}: "${citation.path}" no longer contains "${citation.contains}". ` +
        `Re-read that file and correct the guidance, or update the anchor.`,
    );
    continue;
  }
  checkedCitations += 1;
}

/* --------------------------------------------------- 5. coverage does not regress */

if (Number.isNaN(MIN)) {
  failures.push(`--min was given a non-numeric value.`);
} else if (authored.length < MIN) {
  failures.push(
    `Guidance coverage regressed: ${authored.length} components carry guidance, floor is ${MIN}. ` +
      `Restore the missing files rather than lowering the floor.`,
  );
}

if (sourceFiles.length && authored.length && sourceFiles.length !== authored.length) {
  notes.push(
    `${sourceFiles.length} guidance files on disk but ${authored.length} pages rendered a panel — ` +
      `a file is present that the site is not showing.`,
  );
}

/* -------------------------------------------------------------- report */

console.log('Altitude docs — component guidance');
console.log(`  components          : ${COMPONENTS.length}`);
console.log(`  guidance authored   : ${authored.length} (floor ${MIN})`);
console.log(`  not yet authored    : ${missing.length}`);
console.log(`  citations verified  : ${checkedCitations} of ${citations.size}`);
if (authored.length) console.log(`  covered             : ${authored.join(', ')}`);

for (const note of notes) console.log(`  note              : ${note}`);

if (failures.length) {
  console.error('\nFAIL');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  '\nOK — every page states its guidance status, no panel is partial, and every citation still resolves.',
);
