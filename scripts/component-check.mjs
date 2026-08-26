#!/usr/bin/env node
/**
 * component-check.mjs — T10 of 2026-08-23-process-audit-and-dev-workflow-coherence.
 *
 * The "add/change a component" checklist is fragmented across three places
 * that never cross-reference each other: plop's console output
 * (libs/al-web-components/plop/plop-config.js), AGENTS.md's "New component
 * deliverable checklist", and a handful of steps written down NOWHERE
 * (parity:seed, guidance YAML, llms:build, a11y:report, a changeset). This
 * script is the single mechanical check over that checklist for ONE
 * component (or every component, with --all), so a dev — or an agent — can
 * ask "am I done?" and get a straight answer instead of re-deriving the list
 * from three files.
 *
 * Companion: .claude/skills/altitude-component-authoring/SKILL.md walks the
 * end-to-end flow in prose; this script is the pass/fail check at the end
 * of it.
 *
 * Checklist items, and why each is a BLOCKER or a WARNING:
 *
 *   BLOCKERS (exit 1) — AGENTS.md grades these `blocker` or `high`; a
 *   missing one ships a broken or incomplete component:
 *     - bundle.ts re-exports the component (mirrors check-bundle-completeness.js)
 *     - .altitude/migration.json has an entry for it
 *     - custom-elements.json (the CEM) lists the tag, and was regenerated
 *       AFTER the component's last edit (a staleness heuristic — an
 *       out-of-date CEM silently breaks the docs site, parity, and llms.txt,
 *       all of which read it as ground truth)
 *     - the component directory has its .ts + .scss + .stories.ts
 *
 *   WARNINGS (listed, exit 0 unless --strict) — AGENTS.md grades these
 *   `medium`, or they are steps the checklist omits entirely today:
 *     - a parity manifest entry (.altitude/figma-sync/parity-manifest.json)
 *     - a component contract (.altitude/contracts/altitude/<tag>.contract.json —
 *       T15/T16, spec 2026-08-25-contract-backed-figma-parity-and-generation)
 *     - a generated reference doc (.altitude/contracts/docs/altitude/<tag>.md —
 *       T20, same spec)
 *     - a React wrapper (libs/al-react/src/components/<Pascal>/)
 *     - guidance YAML (apps/docs/src/content/guidance/<slug>.yaml)
 *     - the tag appears in the generated root llms.txt
 *     - a changeset in .changeset/ that mentions the component (heuristic —
 *       changesets are per-PR, not per-component, so this can never be a
 *       hard blocker; it is a nudge, not proof)
 *
 * Usage:
 *   node scripts/component-check.mjs <al-tag>       # e.g. al-button, or bare "button"
 *   node scripts/component-check.mjs --all           # every CEM component
 *   node scripts/component-check.mjs <al-tag> --json
 *   node scripts/component-check.mjs <al-tag> --strict   # warnings also fail the gate
 *
 * Exit codes:
 *   0 — all blockers pass (warnings may remain, unless --strict)
 *   1 — at least one blocker failed (or, with --strict, a warning)
 *   2 — internal/usage error
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMPONENTS_DIR = join(REPO, 'libs/al-web-components/components');
const BUNDLE = join(COMPONENTS_DIR, 'bundle.ts');
const MIGRATION = join(REPO, '.altitude/migration.json');
const CEM = join(REPO, 'libs/al-web-components/custom-elements.json');
const PARITY_MANIFEST = join(REPO, '.altitude/figma-sync/parity-manifest.json');
const CONTRACTS_DIR = join(REPO, '.altitude/contracts/altitude');
const CONTRACT_DOCS_DIR = join(REPO, '.altitude/contracts/docs/altitude');
const REACT_COMPONENTS_DIR = join(REPO, 'libs/al-react/src/components');
const GUIDANCE_DIR = join(REPO, 'apps/docs/src/content/guidance');
const LLMS_TXT = join(REPO, 'llms.txt');
const CHANGESET_DIR = join(REPO, '.changeset');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Same "extends ALElement" discovery as check-bundle-completeness.js — this
 * is the library's own definition of "a component", not a guess. */
function discoverComponents() {
  const out = [];
  for (const name of readdirSync(COMPONENTS_DIR)) {
    if (name.startsWith('.') || name === 'ALElement.ts' || name === 'bundle.ts') continue;
    const dir = join(COMPONENTS_DIR, name);
    if (!statSync(dir).isDirectory()) continue;
    const ts = join(dir, `${name}.ts`);
    try {
      const src = readFileSync(ts, 'utf8');
      if (src.includes('extends ALElement')) out.push(name);
    } catch {
      /* not a component dir */
    }
  }
  return out.sort();
}

/** al-toggle-button-group -> ToggleButtonGroup — same algorithm as
 * apps/docs/src/lib/registry.mjs `pascal()`, kept in step deliberately. */
function pascalCase(name) {
  return name
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');
}

function normalizeName(input) {
  const trimmed = String(input).trim().toLowerCase();
  return trimmed.startsWith('al-') ? trimmed.slice(3) : trimmed;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// ---------------------------------------------------------------------------
// Checklist — one item = { key, severity, label, pass, detail, fix }
// ---------------------------------------------------------------------------

function checkComponent(name) {
  const tag = `al-${name}`;
  const pascal = pascalCase(name);
  const dir = join(COMPONENTS_DIR, name);
  const items = [];

  // --- BLOCKER: bundle.ts export --------------------------------------
  {
    let pass = false;
    let detail = 'bundle.ts not found';
    if (existsSync(BUNDLE)) {
      const src = readFileSync(BUNDLE, 'utf8');
      pass = src.includes(`'./${name}/${name}'`);
      detail = pass ? `re-exported from bundle.ts` : `no export line for './${name}/${name}'`;
    }
    items.push({
      key: 'bundle',
      severity: 'blocker',
      label: 'bundle.ts export',
      pass,
      detail,
      fix: `Add \`export { AL${pascal} } from './${name}/${name}';\` alphabetically to libs/al-web-components/components/bundle.ts`,
    });
  }

  // --- BLOCKER: migration.json entry ----------------------------------
  {
    let pass = false;
    let detail = '.altitude/migration.json not found';
    if (existsSync(MIGRATION)) {
      try {
        const migration = readJson(MIGRATION);
        pass = Object.prototype.hasOwnProperty.call(migration.components ?? {}, name);
        detail = pass ? `entry present (state: ${migration.components[name].state})` : `no "${name}" key`;
      } catch (e) {
        detail = `could not parse migration.json: ${e.message}`;
      }
    }
    items.push({
      key: 'migration',
      severity: 'blocker',
      label: '.altitude/migration.json entry',
      pass,
      detail,
      fix: `Add "${name}" to .altitude/migration.json (alphabetical, state: "scoped-complete" for a net-new component, react19/headless/ssr reflecting the real surface)`,
    });
  }

  // --- BLOCKER: CEM present + not stale --------------------------------
  {
    let pass = false;
    let detail = 'custom-elements.json not found';
    if (existsSync(CEM)) {
      try {
        const cem = readJson(CEM);
        let found = false;
        for (const mod of cem.modules ?? []) {
          for (const decl of mod.declarations ?? []) {
            if (decl.customElement && decl.tagName === tag) found = true;
          }
        }
        if (!found) {
          detail = `tag "${tag}" not in custom-elements.json`;
        } else {
          const cemMtime = statSync(CEM).mtimeMs;
          const tsPath = join(dir, `${name}.ts`);
          if (existsSync(tsPath)) {
            const tsMtime = statSync(tsPath).mtimeMs;
            if (cemMtime < tsMtime) {
              detail = `custom-elements.json is older than ${name}.ts — manifest is stale`;
            } else {
              pass = true;
              detail = 'present and not stale';
            }
          } else {
            // component.ts missing is caught by the "component files" check;
            // treat CEM presence alone as a pass here to avoid double-failing.
            pass = true;
            detail = 'present in CEM (component .ts missing — see below)';
          }
        }
      } catch (e) {
        detail = `could not parse custom-elements.json: ${e.message}`;
      }
    }
    items.push({
      key: 'cem',
      severity: 'blocker',
      label: 'custom-elements.json (CEM) up to date',
      pass,
      detail,
      fix: `Run: pnpm --filter @southleft/al-web-components build:custom-elements.json`,
    });
  }

  // --- BLOCKER: component source files ---------------------------------
  {
    const required = [`${name}.ts`, `${name}.scss`, `${name}.stories.ts`];
    const missing = required.filter((f) => !existsSync(join(dir, f)));
    items.push({
      key: 'files',
      severity: 'blocker',
      label: 'component source files (.ts, .scss, .stories.ts)',
      pass: missing.length === 0,
      detail: missing.length === 0 ? 'all present' : `missing: ${missing.join(', ')}`,
      fix: `Scaffold via \`pnpm --filter @southleft/al-web-components plop\`, or hand-author the missing file(s) in libs/al-web-components/components/${name}/`,
    });
  }

  // --- WARNING: parity manifest entry -----------------------------------
  {
    let pass = false;
    let detail = 'parity manifest not found';
    if (existsSync(PARITY_MANIFEST)) {
      try {
        const manifest = readJson(PARITY_MANIFEST);
        pass = Object.prototype.hasOwnProperty.call(manifest.components ?? {}, tag);
        detail = pass ? 'entry present' : `no "${tag}" key in parity manifest`;
      } catch (e) {
        detail = `could not parse parity manifest: ${e.message}`;
      }
    }
    items.push({
      key: 'parity',
      severity: 'warning',
      label: 'Figma parity manifest entry',
      pass,
      detail,
      fix: `Run: pnpm run parity:seed (merges new components into .altitude/figma-sync/parity-manifest.json — it will NOT mark it in-sync; that needs a deliberate \`pnpm run parity:synced ${tag}\` once Figma actually matches)`,
    });
  }

  // --- WARNING: contract file (T15/T16, spec 2026-08-25-contract-backed- --
  // --- figma-parity-and-generation) --------------------------------------
  // Same severity as the parity manifest entry above: a contract can only be
  // seeded for a PARITY-TRACKED tag (emit-contracts.mjs --seed reads the
  // manifest's key list), so a missing parity entry already implies a
  // missing contract — this check just makes that specific gap nameable on
  // its own, rather than folded silently into the parity item above.
  {
    const contractPath = join(CONTRACTS_DIR, `${tag}.contract.json`);
    const pass = existsSync(contractPath);
    items.push({
      key: 'contract',
      severity: 'warning',
      label: 'component contract (.altitude/contracts/altitude)',
      pass,
      detail: pass ? `.altitude/contracts/altitude/${tag}.contract.json present` : `no .altitude/contracts/altitude/${tag}.contract.json`,
      fix: `Run: node scripts/contracts/emit-contracts.mjs --seed --component ${tag} (needs a CEM entry and a parity-manifest entry for "${tag}" first). Gated in CI by \`pnpm run gate:contracts\`.`,
    });
  }

  // --- WARNING: generated reference doc (T20, spec 2026-08-25-contract- --
  // --- backed-figma-parity-and-generation) -------------------------------
  // Sibling to the contract check above, same severity: a doc can only be
  // BUILT from a contract that already exists (build-component-docs.mjs
  // skips a tracked tag with no contract file, same as emit-contracts.mjs's
  // --seed skips a tag with no CEM record), so a missing contract already
  // implies a missing doc — this makes that specific gap nameable on its
  // own, mirroring the contract item's own rationale.
  {
    const docPath = join(CONTRACT_DOCS_DIR, `${tag}.md`);
    const pass = existsSync(docPath);
    items.push({
      key: 'contract-doc',
      severity: 'warning',
      label: 'generated reference doc (.altitude/contracts/docs/altitude)',
      pass,
      detail: pass ? `.altitude/contracts/docs/altitude/${tag}.md present` : `no .altitude/contracts/docs/altitude/${tag}.md`,
      fix: `Run: pnpm run contracts:docs (regenerates every tracked component's doc from its contract; needs the contract from the item above first). Gated in CI by \`pnpm run gate:contracts\` (check:contract-docs).`,
    });
  }

  // --- WARNING: React wrapper --------------------------------------------
  {
    const wrapperDir = join(REACT_COMPONENTS_DIR, pascal);
    const wrapperFile = join(wrapperDir, `${pascal}.tsx`);
    const pass = existsSync(wrapperFile);
    items.push({
      key: 'react',
      severity: 'warning',
      label: 'React wrapper',
      pass,
      detail: pass ? `libs/al-react/src/components/${pascal}/${pascal}.tsx present` : 'no React wrapper found',
      fix: `Run: pnpm --filter @southleft/al-react plop`,
    });
  }

  // --- WARNING: guidance YAML --------------------------------------------
  {
    const guidancePath = join(GUIDANCE_DIR, `${name}.yaml`);
    const pass = existsSync(guidancePath);
    items.push({
      key: 'guidance',
      severity: 'warning',
      label: 'docs guidance YAML',
      pass,
      detail: pass
        ? `apps/docs/src/content/guidance/${name}.yaml present`
        : `no apps/docs/src/content/guidance/${name}.yaml`,
      fix: `Author apps/docs/src/content/guidance/${name}.yaml with purpose, whenToUse, whenNotToUse (>=2, each with optional \`instead:\`), dos, donts, accessibility, content, and sources[] (schema: apps/docs/src/content.config.ts)`,
    });
  }

  // --- WARNING: llms.txt mention -----------------------------------------
  {
    let pass = false;
    let detail = 'llms.txt not found';
    if (existsSync(LLMS_TXT)) {
      const src = readFileSync(LLMS_TXT, 'utf8');
      pass = src.includes(tag);
      detail = pass ? 'tag present' : `"${tag}" not found in llms.txt`;
    }
    items.push({
      key: 'llms',
      severity: 'warning',
      label: 'llms.txt (generated)',
      pass,
      detail,
      fix: `Run: pnpm run llms:build (regenerates root llms.txt from the CEM and other committed artifacts)`,
    });
  }

  // --- WARNING: changeset mentions the component --------------------------
  {
    let pass = false;
    let detail = 'no .changeset entries mention this component';
    if (existsSync(CHANGESET_DIR)) {
      const files = readdirSync(CHANGESET_DIR).filter((f) => f.endsWith('.md') && f !== 'README.md');
      const hit = files.find((f) => readFileSync(join(CHANGESET_DIR, f), 'utf8').includes(tag));
      pass = Boolean(hit);
      detail = pass ? `mentioned in .changeset/${hit}` : detail;
    }
    items.push({
      key: 'changeset',
      severity: 'warning',
      label: 'changeset mentions this component (heuristic)',
      pass,
      detail,
      fix: `Run: pnpm dlx changeset — describe "${tag}" in the summary (required for any public-API or token change, per CONTRIBUTING.md)`,
    });
  }

  return { name, tag, items };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function printReport(result, { strict }) {
  const { tag, items } = result;
  console.log(`\n[component-check] ${tag}`);
  for (const item of items) {
    const icon = item.pass ? 'PASS' : item.severity === 'blocker' ? 'FAIL' : 'WARN';
    console.log(`  [${icon}] (${item.severity}) ${item.label} — ${item.detail}`);
    if (!item.pass) console.log(`         fix: ${item.fix}`);
  }
  const blockerFails = items.filter((i) => i.severity === 'blocker' && !i.pass);
  const warnFails = items.filter((i) => i.severity === 'warning' && !i.pass);
  const failed = blockerFails.length > 0 || (strict && warnFails.length > 0);
  console.log(
    `  -> ${blockerFails.length} blocker(s) failed, ${warnFails.length} warning(s)` +
      (strict ? ' [--strict: warnings count toward failure]' : ''),
  );
  return failed;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function usage() {
  console.error(
    [
      'Usage:',
      '  node scripts/component-check.mjs <al-tag> [--json] [--strict]',
      '  node scripts/component-check.mjs --all [--json] [--strict]',
      '',
      'Examples:',
      '  node scripts/component-check.mjs al-button',
      '  node scripts/component-check.mjs button --strict',
      '  node scripts/component-check.mjs --all --json',
    ].join('\n'),
  );
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const strict = args.includes('--strict');
  const all = args.includes('--all');
  const positional = args.filter((a) => !a.startsWith('--'));

  if (!all && positional.length !== 1) {
    usage();
    process.exit(2);
  }

  if (!existsSync(COMPONENTS_DIR)) {
    console.error(`[component-check] ERROR — components directory not found: ${COMPONENTS_DIR}`);
    process.exit(2);
  }

  const names = all ? discoverComponents() : [normalizeName(positional[0])];

  // A single-tag run does NOT require the component directory to exist —
  // a fabricated/not-yet-scaffolded tag is exactly the case this script
  // must report as failing BLOCKERS (exit 1), not a usage error. Only warn
  // once, up front, so the per-item "missing" detail isn't a mystery.
  if (!all && !existsSync(join(COMPONENTS_DIR, names[0]))) {
    console.error(
      `[component-check] note — no component directory at libs/al-web-components/components/${names[0]} ` +
        `(checking "al-${names[0]}" anyway; every file/registry check below will fail). ` +
        `Known components: ${discoverComponents().join(', ')}`,
    );
  }

  const results = names.map(checkComponent);

  if (json) {
    const payload = results.map((r) => ({
      tag: r.tag,
      items: r.items.map(({ key, severity, label, pass, detail }) => ({ key, severity, label, pass, detail })),
      ok: r.items.every((i) => i.severity !== 'blocker' || i.pass) && (!strict || r.items.every((i) => i.pass)),
    }));
    console.log(JSON.stringify(all ? payload : payload[0], null, 2));
    const anyFailed = payload.some((p) => !p.ok);
    process.exit(anyFailed ? 1 : 0);
  }

  let anyFailed = false;
  for (const result of results) {
    const failed = printReport(result, { strict });
    if (failed) anyFailed = true;
  }
  if (all) {
    console.log(`\n[component-check] checked ${results.length} component(s).`);
  }
  process.exit(anyFailed ? 1 : 0);
}

main();
