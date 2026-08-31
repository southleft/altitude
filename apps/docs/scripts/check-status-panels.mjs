#!/usr/bin/env node
/**
 * The status panels need a gate, for the same reason the CEM coverage does.
 *
 * `check-docs-coverage.mjs` (its sibling) proves every component in the
 * manifest has a page. This proves the two STATUS panels on that page are
 * honest, which is a different claim and fails in different ways:
 *
 *   1. NO LEAKS. The parity engine's full report embeds an `aiPrompt` per
 *      component naming the Figma FILE KEY, the component's NODE ID, every
 *      `scripts/figma-*` path and the `.claude/skills` path. `publicParityReport()`
 *      is an allowlist that drops all of it — but an allowlist is a promise, and
 *      this checks the BUILT OUTPUT, so a future field that reintroduces one of
 *      those strings fails here rather than shipping to altitude.pages.dev.
 *
 *   2. NO SILENT SUCCESS. The Storybook parity path swallows every error
 *      (`parity-emitter.mjs:92-95` warns and returns null; `figma-parity.tsx:57-59`
 *      catches to null), so a broken report renders as no badge, which is
 *      indistinguishable from "everything is in sync". A page that cannot get
 *      parity or accessibility data must SAY so, and this asserts the panels
 *      rendered one of their two honest shapes — data, or a stated reason.
 *
 *   3. THE NUMBERS ARE GENERATED. Every panel value must be traceable to the
 *      artifact it came from. This re-reads the parity report and the axe
 *      report and checks the built pages agree with them, so a hand-typed
 *      status or count cannot survive.
 *
 *   4. EVERY DESIGN SYSTEM, NOT JUST THE ONE AT THE ROOT. The site now builds
 *      one documentation site per project in `.altitude/ds-projects.json`, each
 *      scoped to its own components and showing its own parity rows. All four
 *      claims above are checked per project, against that project's own pages —
 *      otherwise a scoped site could ship blank panels and the gate at the root
 *      would still pass.
 *
 *   node apps/docs/scripts/check-status-panels.mjs [--dist <dir>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PARITY_PROJECTS, PARITY_AVAILABLE, PARITY_FAILURES, parityForProject } from '../src/lib/parity.mjs';
import { A11Y_REPORT, a11yFor } from '../src/lib/a11y.mjs';
import { CONTEXTS } from '../src/lib/context.mjs';

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url));
const argOf = (flag) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : null;
};
const DIST = path.resolve(argOf('--dist') ?? path.join(APP_ROOT, '..', '..', 'dist', 'docs'));

const failures = [];
const notes = [];

/* ------------------------------------------------------- 1. leak patterns */

/**
 * Strings that are internal tooling geometry, not documentation. Each is
 * derived from the live config rather than typed, so rotating a Figma file key
 * in `.altitude/ds-projects.json` keeps this gate correct.
 */
const registry = JSON.parse(
  fs.readFileSync(path.join(APP_ROOT, '..', '..', '.altitude', 'ds-projects.json'), 'utf8'),
);
const leakPatterns = [
  ...Object.values(registry.projects).flatMap((project) => [
    { what: `Figma file key for ${project.id}`, needle: project.figma.fileKey },
    ...(project.figma.decoys ?? []).map((d) => ({ what: `decoy file key (${d.fileName})`, needle: d.fileKey })),
    { what: `ops directory for ${project.id}`, needle: project.paths.opsDir },
    { what: `figma scripts dir for ${project.id}`, needle: project.prompts.atomsScriptsDir },
    { what: `parity scripts dir for ${project.id}`, needle: project.prompts.parityScriptsDir },
    { what: `skill path for ${project.id}`, needle: project.prompts.skillPath },
  ]),
  { what: 'a Figma deep link', needle: 'figma.com/design/' },
  { what: 'the AI reconciliation prompt field', needle: 'aiPrompt' },
];

/**
 * The leak scan covers the WHOLE published output, not only the component
 * pages: `status.json`, `llms-full.txt` and the Markdown twins carry the same
 * parity projection, so a field that leaked would leak there first.
 */
const PUBLISHED = new Set(['.html', '.json', '.txt', '.md', '.xml']);
const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (PUBLISHED.has(path.extname(entry.name))) out.push(full);
  }
  return out;
};

const published = walk(DIST);
if (published.length === 0) {
  failures.push(
    `No built output at ${DIST}. Run \`pnpm --filter al-app-docs build\` before this gate.`,
  );
} else {
  let leaks = 0;
  for (const file of published) {
    const text = fs.readFileSync(file, 'utf8');
    for (const { what, needle } of leakPatterns) {
      if (needle && text.includes(needle)) {
        failures.push(`${path.relative(DIST, file)} ships ${what}: "${needle}"`);
        leaks += 1;
      }
    }
  }
  notes.push(
    `  files scanned     : ${published.length} published files, ${leakPatterns.length} leak patterns, ${leaks} hit(s)`,
  );
}

/* ------------------------- 2. per design system: panels rendered, and agree */

for (const { project, registry: scoped } of CONTEXTS) {
  const pagesDir = path.join(DIST, ...project.routePrefix.split('/').filter(Boolean), 'components');
  if (!fs.existsSync(pagesDir)) {
    failures.push(`${project.id}: no built component pages at ${path.relative(DIST, pagesDir)}.`);
    continue;
  }

  let panelsPresent = 0;
  let checksPresent = 0;
  let statusesChecked = 0;
  let foreignRows = 0;

  for (const component of scoped.components) {
    const file = path.join(pagesDir, `${component.slug}.html`);
    const alt = path.join(pagesDir, component.slug, 'index.html');
    const target = fs.existsSync(file) ? file : fs.existsSync(alt) ? alt : null;
    if (!target) {
      failures.push(
        `${project.id}/${component.tag}: no built page (looked for ${path.relative(DIST, file)}).`,
      );
      continue;
    }
    const html = fs.readFileSync(target, 'utf8');

    // The parity panel rendered EITHER data or a stated reason — never nothing.
    const hasParity = html.includes('data-parity-panel');
    const hasParityReason =
      html.includes('data-parity-unavailable') || html.includes('NO DESIGN-SYSTEM PROJECT');
    if (!hasParity && !hasParityReason) {
      failures.push(
        `${project.id}/${component.tag}: neither a parity panel nor a stated reason for its absence.`,
      );
    }
    if (hasParity) panelsPresent += 1;

    // Same contract for the accessibility panel.
    const hasChecks = html.includes('data-a11y-panel');
    const hasChecksReason =
      html.includes('data-a11y-unavailable') || html.includes('data-a11y-unmeasured');
    if (!hasChecks && !hasChecksReason) {
      failures.push(
        `${project.id}/${component.tag}: neither an accessibility panel nor a stated reason for its absence.`,
      );
    }
    if (hasChecks) checksPresent += 1;

    // Every status the page shows must be the status the engine computes for
    // THIS project's site — and no other project's row may appear on it.
    for (const row of parityForProject(component.tag, project)) {
      if (!html.includes(`data-parity-status="${row.status}"`)) {
        failures.push(
          `${project.id}/${component.tag}: the engine reports "${row.status}" for ${row.project}, and the page does not render it.`,
        );
      }
      statusesChecked += 1;
    }
    if (!project.isDefault) {
      for (const other of CONTEXTS) {
        if (other.project.id === project.id) continue;
        if (html.includes(`data-parity-project="${other.project.id}"`)) {
          failures.push(
            `${project.id}/${component.tag}: renders ${other.project.id}'s parity row — a scoped site must show only its own design system's Figma status.`,
          );
          foreignRows += 1;
        }
      }
    }

    // And every contrast violation count must match the axe report.
    //
    // Pass the FULL component record, not a bare slug. a11yFor accepts both, but
    // a bare slug carries no `libraryRoot`, so `fromMeasuredLibrary()` reads
    // false and the lookup silently degrades to the DOCS report while the page
    // itself — which passes the whole record — reads the STORYBOOK one. The two
    // surfaces then disagree and the gate blames the page for the mismatch it
    // introduced. a11y.mjs calls this out at its own `a11yFor` doc comment:
    // accepting a bare slug exists so a stale call site degrades instead of
    // throwing, and this was the stale call site.
    //
    // Latent until 2026-08-31: it only surfaces when the two reports disagree
    // about a component. The v2 restyle made altitude/al-header CLEAN in the
    // Storybook report while the docs report (2026-08-23) still recorded one
    // contrast violation, and the gate failed an improvement.
    const checks = a11yFor(component);
    if (checks.measured) {
      const expected = checks.contrastViolations.length ? 'violations' : 'clean';
      if (!html.includes(`data-a11y-contrast="${expected}"`)) {
        failures.push(
          `${project.id}/${component.tag}: axe reports ${checks.contrastViolations.length} contrast rule(s) failing; the page does not render the matching state.`,
        );
      }
    }

    // The brand host must actually be on the page, carrying THIS project's
    // brand. Without it every preview renders under the base token bundle and
    // the site is branded in name only.
    if (!html.includes(`<al-theme brand="${project.brand}"`)) {
      failures.push(
        `${project.id}/${component.tag}: no <al-theme brand="${project.brand}"> host — its previews would render under the base bundle, not this brand.`,
      );
    }
  }

  notes.push(
    `  ${project.id.padEnd(12)}: ${panelsPresent}/${scoped.count} parity, ${checksPresent}/${scoped.count} a11y, ` +
      `${statusesChecked} status(es) verified, ${foreignRows} foreign row(s), brand=${project.brand}`,
  );
}

/* -------------------------------------------- 3. the sources themselves */

if (!PARITY_AVAILABLE) {
  // Not a failure — a parity outage must not block a docs deploy — but it must
  // never pass silently either.
  notes.push(`  parity            : UNAVAILABLE (${PARITY_FAILURES.map((f) => f.reason).join('; ')})`);
} else {
  for (const project of PARITY_PROJECTS) {
    const o = project.observation;
    notes.push(
      `  parity/${project.project.padEnd(11)}: ${o.observedComponents}/${o.mappedComponents} Figma sets observed` +
        (o.everObserved ? ` (last ${o.figmaLastRefreshed.slice(0, 10)})` : ' — NEVER OBSERVED') +
        `; basis ${Object.entries(o.driftBasis).map(([k, v]) => `${k}=${v}`).join(' ')}`,
    );
  }
}

notes.push(
  A11Y_REPORT.available
    ? `  a11y              : axe ${A11Y_REPORT.source.axeVersion}, ${A11Y_REPORT.totals.stories} stories, ` +
        `${A11Y_REPORT.totals.structuralViolations} structural + ${A11Y_REPORT.totals.contrastViolations} contrast rule(s) failing, ` +
        `${A11Y_REPORT.totals.storiesErrored} unmeasured`
    : `  a11y              : NOT MEASURED (${A11Y_REPORT.reason})`,
);

/* ------------------------------------------------------------- verdict */

console.log('Altitude docs — status panel honesty');
for (const note of notes) console.log(note);

if (failures.length) {
  console.error('\nFAIL');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  '\nOK — no internal tooling geometry in the built output, every panel states either data or a reason, and every design system renders under its own brand.',
);
