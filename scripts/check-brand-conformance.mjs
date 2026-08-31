#!/usr/bin/env node
/**
 * check-brand-conformance.mjs — keep a brand layer honest about the base
 * surface it supersedes, and surface base growth the brand hasn't looked at.
 *
 * `brandLibrary.supersedes` (`.altitude/ds-projects.json`) lets a brand
 * package (`@southleft/sl-web-components`) take over a base tag
 * (`@southleft/al-web-components`'s `al-header`, `al-footer`, …) by
 * DEFINE-ORDER, not subclassing: the app imports the brand module instead of
 * the base one, so exactly one `customElements.define('al-header', …)` runs
 * at a time. That means the brand implementation's public surface — slots,
 * `::part()` names, `--custom-properties`, attributes — is the ONLY contract
 * a consumer of `<al-header>` ever sees. Nothing today checks that the brand
 * override still honors what the base component promised, or flags when the
 * base library grows a component the brand scope has never even considered.
 * This script does both.
 *
 * Two independent checks:
 *
 *   1. SUPERSESSION CONFORMANCE (fails the build). For every `supersedes`
 *      pair, diff the base CEM record against the brand CEM record for
 *      slots, cssParts, cssProperties and attributes. Anything present on the
 *      base but missing on the brand is a FAIL — a consumer who only knows
 *      the base contract (Storybook, an older doc, a copy-pasted example)
 *      will slot content into a hole that no longer exists, target a
 *      `::part()` that no longer matches, or set an attribute that silently
 *      does nothing. Extra brand-side surface is fine and reported as info
 *      only — a brand override is allowed to be a superset.
 *
 *      A documented, deliberate divergence can be silenced with a repeatable
 *      `--allow <tag>.<kind>.<name>` flag (see --help). There is no registry
 *      field for this today — `excluded` in ds-projects.json is Figma-parity
 *      scope, a different concern — so this stays a CLI escape hatch rather
 *      than growing the schema for one caller.
 *
 *   2. NEW-BASE-COMPONENT REPORT (never fails). Base CEM components that are
 *      in none of: `library.components` (the project's base allowlist),
 *      `brandLibrary.supersedes` values (already accounted for), or
 *      `excluded` (documented out of scope). These are components the base
 *      library shipped that nobody has decided whether this brand DS cares
 *      about yet — worth a human glance, not a gate failure.
 *
 * Usage:
 *   node scripts/check-brand-conformance.mjs                  # every project with a brandLibrary
 *   node scripts/check-brand-conformance.mjs --project southleft
 *   node scripts/check-brand-conformance.mjs --json
 *   node scripts/check-brand-conformance.mjs --allow al-header.slot.default --allow al-footer.attribute.copyright
 *
 * Exit codes: 1 only on a supersession-conformance FAIL. The new-component
 * report never affects the exit code.
 */
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative } from 'node:path';

import { REPO_ROOT } from '../libs/altitude-mcp/src/lib/paths.mjs';
import { listProjectIds, resolveProject, projectFromArgv } from '../libs/altitude-mcp/src/lib/ds-project.mjs';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`check-brand-conformance.mjs — supersession conformance + new-base-component report.

Usage:
  node scripts/check-brand-conformance.mjs                  Every project with a brandLibrary
  node scripts/check-brand-conformance.mjs --project <id>   One project
  node scripts/check-brand-conformance.mjs --json           Machine-readable output
  node scripts/check-brand-conformance.mjs --allow <tag>.<kind>.<name>
                                                              Silence one expected divergence (repeatable).
                                                              <kind> is one of: slot, csspart, cssproperty, attribute
                                                              <name> is the exact CEM name; use "default" for a
                                                              component's unnamed default slot (CEM name "").
                                                              Example: --allow al-header.slot.default

Exit codes:
  0  no supersession-conformance failures (new-component report never affects this)
  1  at least one base surface (slot/cssPart/cssProperty/attribute) is missing from a brand override
`);
  process.exit(0);
}

const wantJson = process.argv.includes('--json');
const only = projectFromArgv();

/* --------------------------------------------------------- --allow parsing */

/** `--allow al-header.slot.default` -> repeatable flag values, in argv order. */
function parseAllowFlags(argv) {
  const values = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--allow' && typeof argv[i + 1] === 'string') values.push(argv[i + 1]);
    else if (argv[i].startsWith('--allow=')) values.push(argv[i].slice('--allow='.length));
  }
  return values;
}

const KIND_ALIASES = { slot: 'slot', csspart: 'cssPart', cssproperty: 'cssProperty', attribute: 'attribute' };

/** `tag.kind.name` -> `{ tag, kind, name }`, with `default` mapped to the CEM's empty slot name. */
function parseAllowEntry(raw) {
  const parts = raw.split('.');
  if (parts.length < 3) return null;
  const [tag, kindRaw, ...nameParts] = parts;
  const kind = KIND_ALIASES[kindRaw.toLowerCase()];
  if (!kind) return null;
  let name = nameParts.join('.');
  if (kind === 'slot' && name.toLowerCase() === 'default') name = '';
  return { tag, kind, name };
}

const allowRaw = parseAllowFlags(process.argv);
const allowList = [];
for (const raw of allowRaw) {
  const entry = parseAllowEntry(raw);
  if (!entry) {
    console.error(`--allow "${raw}" is not "<tag>.<kind>.<name>" (kind: slot, csspart, cssproperty, attribute) — ignoring.`);
    continue;
  }
  allowList.push(entry);
}
const isAllowed = (tag, kind, name) => allowList.some((a) => a.tag === tag && a.kind === kind && a.name === name);

/* ------------------------------------------------------------- CEM reading */

/**
 * Read `<absRoot>/custom-elements.json` into flat component records.
 *
 * Deliberately NOT `libs/altitude-mcp/src/lib/cem.mjs#loadComponents` — that
 * reader is hardcoded to the base library's path (`WC_ROOT` in `paths.mjs`).
 * This script needs the SAME shape for an arbitrary root, because it reads
 * both `library.root` (base) and `brandLibrary.root` (brand) per project.
 */
function loadCemFromRoot(absRoot) {
  const cemPath = join(absRoot, 'custom-elements.json');
  if (!existsSync(cemPath)) return null;
  const cem = JSON.parse(readFileSync(cemPath, 'utf8'));
  const out = [];
  for (const mod of cem.modules ?? []) {
    for (const d of mod.declarations ?? []) {
      if (!d.customElement || !d.tagName) continue;
      out.push({
        tag: d.tagName,
        modulePath: mod.path,
        slots: d.slots ?? [],
        cssParts: d.cssParts ?? [],
        cssProperties: d.cssProperties ?? [],
        attributes: d.attributes ?? [],
      });
    }
  }
  return out;
}

/** `components/<slug>/<slug>.ts` — the one module that declares a real component (excludes icon glyphs etc). */
const CANONICAL_MODULE = /^components\/([a-z0-9-]+)\/\1\.ts$/;

/* ----------------------------------------------------- supersession diff */

const SURFACES = [
  {
    key: 'slots',
    kind: 'slot',
    label: 'slot',
    display: (name) => (name === '' ? '(default)' : `'${name}'`),
    reason: 'content slotted there by consumers will vanish',
  },
  {
    key: 'cssParts',
    kind: 'cssPart',
    label: 'cssPart',
    display: (name) => `'${name}'`,
    reason: 'consumers targeting it via ::part() will no longer match anything',
  },
  {
    key: 'cssProperties',
    kind: 'cssProperty',
    label: 'cssProperty',
    display: (name) => `'${name}'`,
    reason: 'consumers customizing it via CSS will have no effect',
  },
  {
    key: 'attributes',
    kind: 'attribute',
    label: 'attribute',
    display: (name) => `'${name}'`,
    reason: 'consumers setting it will silently do nothing',
  },
];

function namesOf(component, key) {
  return new Set((component[key] ?? []).map((item) => item.name ?? ''));
}

/**
 * Diff one supersession pair. Returns `{ failures: [], allowed: [], extra: [] }`
 * — `failures` are base surface missing on the brand override, `allowed` is
 * the same but silenced via `--allow`, `extra` is brand-only surface (info).
 */
function diffPair(baseTag, brandTag, baseComponent, brandComponent) {
  const failures = [];
  const allowed = [];
  const extra = [];

  for (const surface of SURFACES) {
    const baseNames = namesOf(baseComponent, surface.key);
    const brandNames = namesOf(brandComponent, surface.key);

    for (const name of baseNames) {
      if (brandNames.has(name)) continue;
      const entry = { kind: surface.kind, name, display: surface.display(name) };
      if (isAllowed(brandTag, surface.kind, name)) allowed.push(entry);
      else failures.push({ ...entry, message: `base ${baseTag} ${surface.label} ${surface.display(name)} missing from brand override — ${surface.reason}` });
    }
    for (const name of brandNames) {
      if (baseNames.has(name)) continue;
      extra.push({ kind: surface.kind, name, display: surface.display(name) });
    }
  }

  return { failures, allowed, extra };
}

/* -------------------------------------------------- new-base-component report */

/**
 * Best-effort "add" timestamp for a base component module, so the report can
 * put newer components last. Falls back to `null` (caller sorts alphabetically
 * instead) when git history isn't available for the path — this repo is
 * always a git checkout in practice, but a shallow clone or a moved file can
 * still leave `git log` with nothing to say.
 */
function firstCommitTimestamp(absRoot, modulePath) {
  try {
    const out = execFileSync(
      'git',
      ['log', '--diff-filter=A', '--follow', '--format=%ct', '--', modulePath],
      { cwd: absRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    if (!out) return null;
    const lines = out.split('\n').filter(Boolean);
    return Number(lines[lines.length - 1]); // oldest line = the add commit
  } catch {
    return null;
  }
}

function newBaseComponentReport(project, baseComponents) {
  const allowlist = new Set(project.library.components ?? []);
  // `library.components` absent means the project documents the WHOLE base
  // library (Altitude's case) — nothing is "unconsidered" by definition.
  if (!project.library.components) return { scoped: false, tags: [] };

  const superseded = new Set(Object.values(project.brandLibrary?.supersedes ?? {}));
  const excluded = new Set(Object.keys(project.excluded ?? {}));

  const canonical = baseComponents.filter((c) => CANONICAL_MODULE.test(c.modulePath));
  const unconsidered = canonical.filter(
    (c) => !allowlist.has(c.tag) && !superseded.has(c.tag) && !excluded.has(c.tag),
  );

  const withTimestamp = unconsidered.map((c) => ({
    tag: c.tag,
    modulePath: c.modulePath,
    addedAt: firstCommitTimestamp(project.resolved.libraryRoot, c.modulePath),
  }));

  const sortable = withTimestamp.every((c) => c.addedAt !== null);
  const sorted = sortable
    ? withTimestamp.sort((a, b) => a.addedAt - b.addedAt || a.tag.localeCompare(b.tag))
    : withTimestamp.sort((a, b) => a.tag.localeCompare(b.tag));

  return { scoped: true, sortedByAge: sortable, tags: sorted };
}

/* ------------------------------------------------------------------ main */

const ids = (only ? [only] : listProjectIds()).filter((id) => Boolean(resolveProject(id).brandLibrary));

if (ids.length === 0) {
  if (only) {
    console.log(`[${only}] declares no brandLibrary — nothing to check.`);
  } else {
    console.log('No projects declare a brandLibrary — nothing to check.');
  }
  process.exit(0);
}

let failed = false;
const jsonReport = { projects: [] };

for (const id of ids) {
  const project = resolveProject(id);
  const baseRoot = project.resolved.libraryRoot;
  const brandRoot = join(REPO_ROOT, project.brandLibrary.root);

  const baseComponents = loadCemFromRoot(baseRoot);
  const brandComponents = loadCemFromRoot(brandRoot);

  const projectReport = { id, pairs: [], newBaseComponents: [] };

  if (!baseComponents) {
    console.error(`[${id}] base CEM not found at ${relative(REPO_ROOT, join(baseRoot, 'custom-elements.json'))} — run the library's build:custom-elements.json.`);
    failed = true;
    jsonReport.projects.push({ ...projectReport, error: 'missing base CEM' });
    continue;
  }
  if (!brandComponents) {
    console.error(`[${id}] brand CEM not found at ${relative(REPO_ROOT, join(brandRoot, 'custom-elements.json'))} — run the brand layer's build:custom-elements.json.`);
    failed = true;
    jsonReport.projects.push({ ...projectReport, error: 'missing brand CEM' });
    continue;
  }

  console.log(`\n[${id}] brandLibrary ${project.brandLibrary.workspace} supersedes ${Object.keys(project.brandLibrary.supersedes ?? {}).length} base component(s):`);

  const supersedes = project.brandLibrary.supersedes ?? {};
  for (const [brandTag, baseTag] of Object.entries(supersedes)) {
    const baseComponent = baseComponents.find((c) => c.tag === baseTag);
    const brandComponent = brandComponents.find((c) => c.tag === brandTag);

    if (!baseComponent) {
      console.error(`  FAIL — supersedes["${brandTag}"] = "${baseTag}", but ${project.library.workspace} declares no <${baseTag}> component.`);
      failed = true;
      projectReport.pairs.push({ brandTag, baseTag, error: 'base component not found' });
      continue;
    }
    if (!brandComponent) {
      console.error(`  FAIL — supersedes["${brandTag}"] = "${baseTag}", but ${project.brandLibrary.workspace} declares no <${brandTag}> component.`);
      failed = true;
      projectReport.pairs.push({ brandTag, baseTag, error: 'brand component not found' });
      continue;
    }

    const { failures, allowed, extra } = diffPair(baseTag, brandTag, baseComponent, brandComponent);
    console.log(`\n  ${baseTag} -> ${brandTag}:`);
    if (failures.length) {
      failed = true;
      for (const f of failures) console.error(`    FAIL — ${f.message}`);
    }
    if (allowed.length) {
      for (const a of allowed) console.log(`    ignored (--allow) — base ${a.kind} ${a.display} missing from brand override`);
    }
    if (extra.length) {
      console.log(`    info — brand-only surface (fine, superset): ${extra.map((e) => `${e.kind} ${e.display}`).join(', ')}`);
    }
    if (!failures.length && !allowed.length && !extra.length) console.log('    conforms — no surface drift.');
    else if (!failures.length) console.log('    conforms — no un-allowed surface drift.');

    projectReport.pairs.push({
      brandTag,
      baseTag,
      failures: failures.map(({ kind, name }) => ({ kind, name })),
      allowed: allowed.map(({ kind, name }) => ({ kind, name })),
      extra: extra.map(({ kind, name }) => ({ kind, name })),
    });
  }

  const report = newBaseComponentReport(project, baseComponents);
  if (report.scoped) {
    console.log(`\n  new/unconsidered base components for project ${id} (in the library, not allowlisted, not superseded, not excluded)${report.sortedByAge ? ' — oldest first, newest last' : ' — alphabetical (git history unavailable)'}:`);
    if (report.tags.length === 0) {
      console.log('    none — every base component is accounted for.');
    } else {
      for (const c of report.tags) console.log(`    ${c.tag}`);
    }
    projectReport.newBaseComponents = report.tags.map((c) => c.tag);
  }

  jsonReport.projects.push(projectReport);
}

jsonReport.failed = failed;

if (wantJson) {
  console.log('\n' + JSON.stringify(jsonReport, null, 2));
} else {
  console.log('');
}

process.exit(failed ? 1 : 0);
