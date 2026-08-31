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
 *   3. NO PARTIAL PANELS. A page that claims guidance must carry all eight
 *      sections — purpose, when to use, when NOT to use, do, don't,
 *      accessibility, content, sources. The collection schema already requires them at
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
 * The coverage floor, counted in PAGES that render a panel — not in files.
 *
 * One base guidance file serves every project site that documents that
 * component, and a brand layer's file serves exactly one, so pages is the unit
 * that reflects what a reader can actually reach. 25 is where it stands after
 * the nine Southleft brand components were authored.
 *
 * Raise it when guidance is written for more components; never lower it to make
 * a red gate green.
 */
const DEFAULT_MIN = 25;
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
  /*
   * ONE LEVEL DEEP, because guidance for a BRAND LAYER lives in a subdirectory.
   *
   * A layer may override a base component, so a slug no longer identifies one
   * component: `header.yaml` is Altitude's and `southleft/header.yaml` is
   * Southleft's (see apps/docs/src/content.config.ts). A flat readdir missed
   * every layer file, which showed up as "12 files on disk, 25 pages rendered a
   * panel" — the scan silently not validating the files it could not see.
   */
  const walkGuidance = (dir, prefix = '') => {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        out.push(...walkGuidance(path.join(dir, entry.name), `${prefix}${entry.name}/`));
      } else if (/\.ya?ml$/.test(entry.name)) {
        out.push(prefix + entry.name);
      }
    }
    return out;
  };
  sourceFiles = walkGuidance(GUIDANCE_DIR);

  for (const file of sourceFiles) {
    const id = file.replace(/\.ya?ml$/, '');
    const slug = id.split('/').pop();
    // A layer's slug is not in the base CEM (al-hero ships in the layer, not in
    // Altitude), so a nested file is validated by the content config's own
    // resolver at build time; here it is enough that the base ones resolve.
    if (!id.includes('/') && !slugs.has(slug)) {
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
  /*
   * EVERY PAGE IS CHECKED ON ITS OWN, and it used to be otherwise.
   *
   * This loop joined every published copy of a slug into one document, on the
   * reasoning that "every published copy must agree". That held while a slug
   * named exactly one component. It stopped holding when a BRAND LAYER could
   * override a base component: `/components/header` is Altitude's bare landmark
   * and `/southleft/components/header` is Southleft's navigation bar — two
   * different components sharing a slug, with correctly different guidance.
   * Joined, they read as one page carrying both an authored panel and a "not
   * authored" note, which the invariant below rejects.
   *
   * So each FILE is its own subject, and a page is identified in a message by
   * its url path — the tag is no longer unique either.
   */
  for (const component of COMPONENTS) {
    if (!pagesBySlug.has(component.slug)) {
      failures.push(`No built page for ${component.tag} anywhere under ${DIST}.`);
    }
  }

  const pageList = [];
  for (const [slug, files] of pagesBySlug) {
    for (const file of files) pageList.push({ slug, file });
  }

  for (const page of pageList) {
    const where = page.file
      .slice(DIST.length)
      .replace(/\\/g, '/')
      .replace(/\/index\.html$/, '');
    const component = { slug: page.slug, tag: where };
    const html = fs.readFileSync(page.file, 'utf8');
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
      missing.push(where);
      continue;
    }
    authored.push(where);

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

/*
 * A guidance FILE and a rendered PAGE stopped being one-to-one: a base file is
 * shown on every project site that documents that component, and a brand
 * layer's file on exactly one. Comparing the two counts now reports a
 * discrepancy that is simply how the site works. What still matters is that
 * every file reaches SOME page — a file the site never shows is real drift.
 */
const renderedSlugs = new Set([...citations.values()].map((citation) => citation.slug));
const unusedFiles = sourceFiles.filter(
  (file) => !renderedSlugs.has(file.replace(/\.ya?ml$/, '').split('/').pop()),
);
if (unusedFiles.length) {
  notes.push(`guidance file(s) never rendered on any page: ${unusedFiles.join(', ')}.`);
}

/* -------------------------------------------------------------- report */

console.log('Altitude docs — component guidance');
console.log(`  components          : ${COMPONENTS.length}`);
console.log(`  pages with guidance : ${authored.length} (floor ${MIN})`);
console.log(`  pages not authored  : ${missing.length}`);
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
