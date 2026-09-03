#!/usr/bin/env node
/**
 * component-check.mjs — T10 of 2026-08-23-process-audit-and-dev-workflow-coherence.
 *
 * The "add/change a component" checklist is fragmented across three places
 * that never cross-reference each other: plop's console output
 * (libs/al-web-components/plop/plop-config.cjs), AGENTS.md's "New component
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
 * Evidence mode (contract: .altitude/VERIFICATION.md):
 *   node scripts/component-check.mjs <al-tag> --evidence  # write a run file under .altitude/verification/<tag>/
 *   node scripts/component-check.mjs <al-tag> --verdict   # derive a verdict from the newest run file
 *
 * Exit codes:
 *   0 — all blockers pass (warnings may remain, unless --strict); or, in
 *       --evidence mode, the bundle was written; or, in --verdict mode, the
 *       derived verdict is `verified` / `verified-with-caveats`
 *   1 — at least one blocker failed (or, with --strict, a warning); in
 *       --verdict mode, `gaps-remain` / `insufficient-evidence`
 *   2 — internal/usage error
 *   3 — --evidence/--verdict REFUSED: a run file already exists, no bundle
 *       exists yet, or the newest bundle is older than the source it describes
 */

import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, existsSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
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

/** al-checkbox-group -> CheckboxGroup — same algorithm as
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

/** Repo-relative, forward-slashed. Citations must be quotable into a PR
 * comment or an agent transcript from any machine, so they never carry
 * `D:\Southleft\...`. */
function rel(abs) {
  return String(abs).slice(REPO.length + 1).replace(/\\/g, '/');
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
    let reads = rel(BUNDLE);
    let evidence = null;
    if (existsSync(BUNDLE)) {
      const lines = readFileSync(BUNDLE, 'utf8').split(/\r?\n/);
      const idx = lines.findIndex((l) => l.includes(`'./${name}/${name}'`));
      pass = idx !== -1;
      detail = pass ? `re-exported from bundle.ts` : `no export line for './${name}/${name}'`;
      if (pass) {
        reads = `${rel(BUNDLE)}:${idx + 1}`;
        evidence = lines[idx].trim();
      }
    }
    items.push({
      key: 'bundle',
      severity: 'blocker',
      label: 'bundle.ts export',
      pass,
      detail,
      reads,
      evidence,
      fix: `Add \`export { AL${pascal} } from './${name}/${name}';\` alphabetically to libs/al-web-components/components/bundle.ts`,
    });
  }

  // --- BLOCKER: migration.json entry ----------------------------------
  {
    let pass = false;
    let detail = '.altitude/migration.json not found';
    let evidence = null;
    if (existsSync(MIGRATION)) {
      try {
        const migration = readJson(MIGRATION);
        pass = Object.prototype.hasOwnProperty.call(migration.components ?? {}, name);
        detail = pass ? `entry present (state: ${migration.components[name].state})` : `no "${name}" key`;
        if (pass) evidence = migration.components[name].state ?? null;
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
      reads: `${rel(MIGRATION)} -> components["${name}"]`,
      evidence,
      fix: `Add "${name}" to .altitude/migration.json (alphabetical, state: "scoped-complete" for a net-new component, react19/headless/ssr reflecting the real surface)`,
    });
  }

  // --- BLOCKER: CEM present + not stale --------------------------------
  {
    let pass = false;
    let detail = 'custom-elements.json not found';
    let evidence = null;
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
            evidence = `cem mtime ${new Date(cemMtime).toISOString()}, source mtime ${new Date(tsMtime).toISOString()}`;
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
      reads: `${rel(CEM)} -> tagName "${tag}"`,
      evidence,
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
      reads: `${rel(dir)}/`,
      evidence: required.filter((f) => existsSync(join(dir, f))).join(', ') || 'none present',
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
      reads: `${rel(PARITY_MANIFEST)} -> components["${tag}"]`,
      evidence: pass ? `tracked in ${rel(PARITY_MANIFEST)}` : null,
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
      reads: rel(contractPath),
      evidence: pass ? `${statSync(contractPath).size} bytes` : null,
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
      reads: rel(docPath),
      evidence: pass ? `${statSync(docPath).size} bytes` : null,
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
      reads: rel(wrapperFile),
      evidence: pass ? `${pascal}.tsx` : null,
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
      reads: rel(guidancePath),
      evidence: pass ? `${statSync(guidancePath).size} bytes` : null,
      fix: `Author apps/docs/src/content/guidance/${name}.yaml with purpose, whenToUse, whenNotToUse (>=2, each with optional \`instead:\`), dos, donts, accessibility, content, and sources[] (schema: apps/docs/src/content.config.ts)`,
    });
  }

  // --- WARNING: llms.txt mention -----------------------------------------
  {
    let pass = false;
    let detail = 'llms.txt not found';
    let reads = rel(LLMS_TXT);
    let evidence = null;
    if (existsSync(LLMS_TXT)) {
      const lines = readFileSync(LLMS_TXT, 'utf8').split(/\r?\n/);
      const idx = lines.findIndex((l) => l.includes(tag));
      pass = idx !== -1;
      detail = pass ? 'tag present' : `"${tag}" not found in llms.txt`;
      if (pass) {
        reads = `${rel(LLMS_TXT)}:${idx + 1}`;
        evidence = lines[idx].trim().slice(0, 120);
      }
    }
    items.push({
      key: 'llms',
      severity: 'warning',
      label: 'llms.txt (generated)',
      pass,
      detail,
      reads,
      evidence,
      fix: `Run: pnpm run llms:build (regenerates root llms.txt from the CEM and other committed artifacts)`,
    });
  }

  // --- WARNING: changeset mentions the component --------------------------
  {
    let pass = false;
    let detail = 'no .changeset entries mention this component';
    let hitFile = null;
    if (existsSync(CHANGESET_DIR)) {
      const files = readdirSync(CHANGESET_DIR).filter((f) => f.endsWith('.md') && f !== 'README.md');
      hitFile = files.find((f) => readFileSync(join(CHANGESET_DIR, f), 'utf8').includes(tag)) ?? null;
      pass = Boolean(hitFile);
      detail = pass ? `mentioned in .changeset/${hitFile}` : detail;
    }
    items.push({
      key: 'changeset',
      severity: 'warning',
      label: 'changeset mentions this component (heuristic)',
      pass,
      detail,
      reads: `${rel(CHANGESET_DIR)}/*.md`,
      evidence: pass ? `.changeset/${hitFile}` : null,
      fix: `Run: pnpm dlx changeset — describe "${tag}" in the summary (required for any public-API or token change, per CONTRIBUTING.md)`,
    });
  }

  return { name, tag, items };
}

// ---------------------------------------------------------------------------
// Evidence bundles (--evidence) and derived verdicts (--verdict)
// ---------------------------------------------------------------------------
//
// WHY THIS EXISTS. Everything above answers "am I done?" with a boolean the
// caller has to trust. A bundle answers it with the READINGS: one row per
// claim, each carrying the command that produced it, the file/line or artifact
// it read, and the measured value. The verdict is then DERIVED from those rows
// by `deriveVerdict()` — nothing in this pipeline asserts a verdict, and no
// agent gets to hand one in.
//
// THE THIRD STATUS IS THE POINT. A claim is `pass`, `fail`, or `unobserved` —
// never a silent skip. `unobserved` is the repo's existing word for it
// (scripts/ai-readiness/lib/grader.mjs:195: an agent that read neither side has
// not performed the comparison, and scoring that 0 is a lie about the model).
// The same argument holds here in the other direction: a check that could not
// run is not a pass, and a bundle that is mostly `unobserved` must LOOK mostly
// unobserved. Silence is the only forbidden failure.
//
// TWO KINDS OF STALENESS, and they resolve differently:
//   - A DERIVED artifact older than its source is WRONG, so it is a `fail`.
//     That is the existing `cem` blocker: an out-of-date manifest actively
//     misinforms the docs site, parity and llms.txt.
//   - An OBSERVATION older than its subject describes something else, so it is
//     `unobserved`. An axe run from before the component changed is not
//     evidence about the component as it stands, and a Figma parity receipt
//     recorded yesterday says nothing about today's source. Same reasoning as
//     scripts/lib/parity-receipt.mjs, which refuses a receipt whose recorded
//     source hashes no longer match.

const EVIDENCE_DIR = join(REPO, '.altitude/verification');
const A11Y_REPORT = join(REPO, '.altitude/a11y/report.json');
const PARITY_RECEIPT = join(REPO, '.altitude/figma-sync/verify/check-parity.json');
const DIST_COMPONENTS = join(REPO, 'libs/al-web-components/dist/components');

/** The three statuses a claim row may carry. There is no fourth, and there is
 * no absence: every claim the bundle declares appears in it. */
export const CLAIM_STATUS = Object.freeze({ PASS: 'pass', FAIL: 'fail', UNOBSERVED: 'unobserved' });

/**
 * The artifact each checklist claim READS. When it is missing or unparseable
 * the instrument is gone, not the fact — so the claim degrades to `unobserved`
 * rather than to `fail`. A fresh clone with no built CEM must not read as "the
 * component is missing from the manifest".
 *
 * Keys absent from this table are claims whose subject IS a file's existence
 * (the contract, the doc, the React wrapper, the guidance YAML, the component's
 * own sources) — for those, absence is the measurement, so they never degrade.
 */
const CLAIM_INSTRUMENT = {
  bundle: BUNDLE,
  migration: MIGRATION,
  cem: CEM,
  parity: PARITY_MANIFEST,
  llms: LLMS_TXT,
  changeset: CHANGESET_DIR,
};

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

/**
 * What the bundle claims to describe: every `.ts`/`.scss` under the component
 * directory, by content hash and mtime. `--verdict` recomputes this and refuses
 * to compute a verdict when it has moved — the same refusal
 * `mm_verify({phase:"promote"})` makes for a summary older than the spec it
 * read, and `receiptAuthorises()` makes for a receipt whose source hashes have
 * changed. A verdict is evidence about the content it read, not a credential.
 */
export function sourceFingerprint(name) {
  const dir = join(COMPONENTS_DIR, name);
  const files = [];
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).sort()) {
      if (!/\.(ts|scss)$/.test(f)) continue;
      const abs = join(dir, f);
      if (!statSync(abs).isFile()) continue;
      files.push({
        path: rel(abs),
        sha256: sha256(readFileSync(abs)),
        mtime: new Date(statSync(abs).mtimeMs).toISOString(),
      });
    }
  }
  return {
    dir: rel(dir),
    exists: existsSync(dir),
    files,
    digest: sha256(files.map((f) => `${f.path}:${f.sha256}`).join('\n')),
    newestMtime: files.length ? files.map((f) => f.mtime).sort().at(-1) : null,
  };
}

/**
 * The claims that are NOT answerable from the tracked source tree alone: an
 * axe measurement, a build output, and a Figma parity receipt. They live here
 * rather than in `checkComponent()` on purpose — that function is the CI gate's
 * checklist and its item set is asserted by
 * scripts/__tests__/component-check.test.mjs; these three are evidence rows,
 * and two of the three read gitignored artifacts that simply do not exist on a
 * clean clone. Folding them into the gate would turn "nobody has built this
 * checkout yet" into a red build.
 */
function observationClaims(name, tag, fingerprint) {
  const claims = [];
  const newest = fingerprint.newestMtime ? Date.parse(fingerprint.newestMtime) : null;

  // --- a11y: measured, therefore stale-means-unobserved -------------------
  {
    let status = CLAIM_STATUS.UNOBSERVED;
    let detail = `${rel(A11Y_REPORT)} not present — no axe run to read`;
    let evidence = null;
    if (existsSync(A11Y_REPORT)) {
      try {
        const report = readJson(A11Y_REPORT);
        const entry = report.components?.[name];
        const generated = report.generated ?? null;
        if (!entry) {
          detail = `no "${name}" entry in the a11y report`;
        } else if (newest !== null && generated && Date.parse(generated) < newest) {
          detail = `report generated ${generated}, component last edited ${fingerprint.newestMtime} — the measurement predates the source`;
          evidence = `generated ${generated} < source ${fingerprint.newestMtime}`;
        } else {
          const violations = (entry.violations ?? []).length;
          const contrast = (entry.contrastViolations ?? []).length;
          status = entry.clean === true && violations === 0 ? CLAIM_STATUS.PASS : CLAIM_STATUS.FAIL;
          detail = `axe ${axeVersionOf(report)} over ${entry.storyCount ?? 0} story/stories`;
          evidence = `violations ${violations}, contrastViolations ${contrast}, clean ${entry.clean === true}`;
        }
      } catch (e) {
        detail = `could not parse the a11y report: ${e.message}`;
      }
    }
    claims.push({
      key: 'a11y',
      severity: 'warning',
      requires: 'measurement',
      label: 'axe measurement is clean and describes the current source',
      status,
      detail,
      reads: `${rel(A11Y_REPORT)} -> components["${name}"]`,
      evidence,
      fix: 'Run: pnpm run a11y:report:fixture (builds the story fixture, then measures it with axe)',
    });
  }

  // --- built module: a DERIVED artifact, therefore stale-means-fail -------
  {
    const built = join(DIST_COMPONENTS, name, `${name}.js`);
    let status = CLAIM_STATUS.UNOBSERVED;
    let detail = `${rel(DIST_COMPONENTS)} not present — this checkout has not been built`;
    let evidence = null;
    if (existsSync(DIST_COMPONENTS)) {
      if (!existsSync(built)) {
        status = CLAIM_STATUS.FAIL;
        detail = `${rel(built)} missing though the library has been built`;
      } else {
        const builtMtime = statSync(built).mtimeMs;
        evidence = `built ${new Date(builtMtime).toISOString()}` + (fingerprint.newestMtime ? `, source ${fingerprint.newestMtime}` : '');
        if (newest !== null && builtMtime < newest) {
          status = CLAIM_STATUS.FAIL;
          detail = 'the built module is older than the component source — the build is stale';
        } else {
          status = CLAIM_STATUS.PASS;
          detail = 'built module present and newer than the source';
        }
      }
    }
    claims.push({
      key: 'built',
      severity: 'warning',
      requires: 'build',
      label: 'built module reflects the current source',
      status,
      detail,
      reads: rel(built),
      evidence,
      fix: 'Run: pnpm --filter @southleft/al-web-components build',
    });
  }

  // --- Figma parity: measured against a live canvas, therefore -----------
  // --- absent-or-stale means unobserved ----------------------------------
  {
    let status = CLAIM_STATUS.UNOBSERVED;
    let detail = `${rel(PARITY_RECEIPT)} not present — no parity check has been run here (the receipt is gitignored per-machine state)`;
    let evidence = null;
    if (existsSync(PARITY_RECEIPT)) {
      try {
        const receipt = readJson(PARITY_RECEIPT);
        const entry = receipt.components?.[tag];
        if (!entry) {
          detail = `receipt from ${receipt.checkedAt} carries no "${tag}" entry`;
        } else if (newest !== null && receipt.checkedAt && Date.parse(receipt.checkedAt) < newest) {
          detail = `receipt checked ${receipt.checkedAt}, component last edited ${fingerprint.newestMtime} — the observation predates the source`;
          evidence = `checkedAt ${receipt.checkedAt} < source ${fingerprint.newestMtime}`;
        } else {
          status = entry.ok === true ? CLAIM_STATUS.PASS : CLAIM_STATUS.FAIL;
          detail = `receipt from ${receipt.checkedAt} against ${receipt.observedFileName ?? receipt.figmaFile ?? 'an unnamed file'}`;
          evidence = `ok ${entry.ok === true}, checked ${entry.checked ?? 0}, off ${entry.off ?? 0}, missing ${entry.missing ?? 0}`;
        }
      } catch (e) {
        detail = `could not parse the parity receipt: ${e.message}`;
      }
    }
    claims.push({
      key: 'figma-parity',
      severity: 'warning',
      requires: 'figma',
      label: 'Figma parity receipt passes for the current source',
      status,
      detail,
      reads: `${rel(PARITY_RECEIPT)} -> components["${tag}"]`,
      evidence,
      fix: 'Run the parity check for this project (see .altitude/PARITY.md) — it writes the receipt scripts/lib/parity-receipt.mjs reads.',
    });
  }

  return claims;
}

function axeVersionOf(report) {
  return report.source?.axeVersion ? `v${report.source.axeVersion}` : '(version unrecorded)';
}

/** Turn one checklist item into a claim row, degrading to `unobserved` when
 * the artifact it reads is missing or unparseable. */
function claimFromChecklistItem(item, command) {
  const instrument = CLAIM_INSTRUMENT[item.key];
  const instrumentGone = instrument !== undefined && !existsSync(instrument);
  const unparseable = /^could not parse/.test(item.detail ?? '');
  const status = item.pass
    ? CLAIM_STATUS.PASS
    : instrumentGone || unparseable
      ? CLAIM_STATUS.UNOBSERVED
      : CLAIM_STATUS.FAIL;
  return {
    claim: item.key,
    severity: item.severity,
    requires: 'offline',
    label: item.label,
    status,
    citation: { command, reads: item.reads ?? null },
    evidence: item.evidence ?? null,
    detail: item.detail,
    fix: item.pass ? null : item.fix,
  };
}

/** Every claim row for one component, checklist first, observations after. */
function claimRows(name, fingerprint) {
  const tag = `al-${name}`;
  const checklistCommand = `node scripts/component-check.mjs ${tag} --json`;
  const rows = checkComponent(name).items.map((i) => claimFromChecklistItem(i, checklistCommand));
  for (const c of observationClaims(name, tag, fingerprint)) {
    rows.push({
      claim: c.key,
      severity: c.severity,
      requires: c.requires,
      label: c.label,
      status: c.status,
      citation: { command: `node scripts/component-check.mjs ${tag} --evidence`, reads: c.reads },
      evidence: c.evidence,
      detail: c.detail,
      fix: c.status === CLAIM_STATUS.PASS ? null : c.fix,
    });
  }
  return rows;
}

/**
 * THE VERDICT IS COMPUTED, NEVER ASSERTED. Pure over the rows — same bundle,
 * same verdict, on any machine, with no model in the path.
 *
 *   gaps-remain           a blocker was measured and it failed
 *   insufficient-evidence a blocker could not be measured at all
 *   verified-with-caveats every blocker passed; some warning failed or could
 *                         not be measured
 *   verified              every claim in the bundle passed
 *
 * `unobserved` never contributes to `passed`. That is the whole reason the
 * status exists: a bundle that could measure nothing must not read as a
 * clean bill of health.
 */
export function deriveVerdict(rows, { strict = false } = {}) {
  const by = (sev, st) => rows.filter((r) => r.severity === sev && r.status === st);
  const counts = {
    total: rows.length,
    pass: rows.filter((r) => r.status === CLAIM_STATUS.PASS).length,
    fail: rows.filter((r) => r.status === CLAIM_STATUS.FAIL).length,
    unobserved: rows.filter((r) => r.status === CLAIM_STATUS.UNOBSERVED).length,
    blockerFail: by('blocker', CLAIM_STATUS.FAIL).length,
    blockerUnobserved: by('blocker', CLAIM_STATUS.UNOBSERVED).length,
    warningFail: by('warning', CLAIM_STATUS.FAIL).length,
    warningUnobserved: by('warning', CLAIM_STATUS.UNOBSERVED).length,
  };
  const reasons = [];
  let verdict;
  if (counts.blockerFail > 0) {
    verdict = 'gaps-remain';
    for (const r of by('blocker', CLAIM_STATUS.FAIL)) reasons.push(`blocker "${r.claim}" failed: ${r.detail}`);
  } else if (counts.blockerUnobserved > 0) {
    verdict = 'insufficient-evidence';
    for (const r of by('blocker', CLAIM_STATUS.UNOBSERVED)) reasons.push(`blocker "${r.claim}" unobserved: ${r.detail}`);
  } else if (strict && counts.warningFail + counts.warningUnobserved > 0) {
    verdict = 'gaps-remain';
    for (const r of [...by('warning', CLAIM_STATUS.FAIL), ...by('warning', CLAIM_STATUS.UNOBSERVED)]) {
      reasons.push(`--strict: warning "${r.claim}" is ${r.status}: ${r.detail}`);
    }
  } else if (counts.warningFail + counts.warningUnobserved > 0) {
    verdict = 'verified-with-caveats';
    for (const r of by('warning', CLAIM_STATUS.FAIL)) reasons.push(`warning "${r.claim}" failed: ${r.detail}`);
    for (const r of by('warning', CLAIM_STATUS.UNOBSERVED)) reasons.push(`warning "${r.claim}" unobserved: ${r.detail}`);
  } else {
    verdict = 'verified';
    reasons.push(`all ${counts.total} claims measured and passing`);
  }
  return { verdict, counts, reasons, strict };
}

/** `20260903T014500Z-a3f19c` — sortable, and collision-resistant enough that a
 * collision means something is genuinely wrong. */
function newRunId(now = new Date()) {
  return `${now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}-${randomBytes(3).toString('hex')}`;
}

export function bundleDirFor(tag) {
  return join(EVIDENCE_DIR, tag);
}

/** Newest bundle for a tag by filename (run ids sort chronologically), or null. */
export function newestBundlePath(tag) {
  const dir = bundleDirFor(tag);
  if (!existsSync(dir)) return null;
  const runs = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  return runs.length ? join(dir, runs.at(-1)) : null;
}

/**
 * Write one bundle. A run file is NEVER overwritten: a collision is a refusal,
 * not a silent clobber, because the whole value of a run file is that it is a
 * fixed record of what was true at one moment.
 */
export function writeEvidence(name, { strict = false, runId = newRunId() } = {}) {
  const tag = `al-${name}`;
  const fingerprint = sourceFingerprint(name);
  const rows = claimRows(name, fingerprint);
  const dir = bundleDirFor(tag);
  const path = join(dir, `${runId}.json`);
  if (existsSync(path)) {
    return { ok: false, reason: `run file already exists: ${rel(path)} — refusing to overwrite a run record`, path };
  }
  const bundle = {
    schemaVersion: 1,
    runId,
    tag,
    component: name,
    generatedAt: new Date().toISOString(),
    tool: 'scripts/component-check.mjs --evidence',
    source: fingerprint,
    claims: rows,
    // The verdict is DERIVED at read time by --verdict, from these rows. It is
    // recorded here too so a bundle is self-describing — but --verdict never
    // trusts this copy: it recomputes from `claims` and refuses outright when
    // `source` no longer matches the tree.
    derivedVerdict: deriveVerdict(rows, { strict }),
  };
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
  return { ok: true, path, bundle };
}

/**
 * Read the newest bundle for a tag and compute its verdict — or REFUSE.
 *
 * Refusals (exit 3), each of which is a result, not an error to work around:
 *   - no bundle at all;
 *   - the component's sources hash differently than the bundle recorded;
 *   - a source file was touched after the bundle was written.
 * The second and third are the same rule `mm_verify`'s promote step applies to
 * a verification summary older than the spec it describes.
 */
function computeVerdict(name, { strict }) {
  const tag = `al-${name}`;
  const path = newestBundlePath(tag);
  if (!path) {
    return { ok: false, reason: `no evidence bundle under ${rel(bundleDirFor(tag))} — run \`node scripts/component-check.mjs ${tag} --evidence\` first` };
  }
  let bundle;
  try {
    bundle = readJson(path);
  } catch (e) {
    return { ok: false, reason: `could not parse ${rel(path)}: ${e.message}`, path };
  }
  const now = sourceFingerprint(name);
  if (now.digest !== bundle.source?.digest) {
    return {
      ok: false,
      path,
      reason:
        `stale bundle: ${rel(path)} describes source digest ${String(bundle.source?.digest).slice(0, 12)}, ` +
        `the tree is now ${now.digest.slice(0, 12)} — the component changed after the evidence was gathered`,
    };
  }
  if (now.newestMtime && bundle.generatedAt && Date.parse(now.newestMtime) > Date.parse(bundle.generatedAt)) {
    return {
      ok: false,
      path,
      reason:
        `stale bundle: ${rel(path)} was written ${bundle.generatedAt}, but a source file was modified ` +
        `${now.newestMtime} — re-run --evidence rather than reasoning over an older reading`,
    };
  }
  return { ok: true, path, bundle, result: deriveVerdict(bundle.claims ?? [], { strict }) };
}

function printVerdict(name, res) {
  const tag = `al-${name}`;
  if (!res.ok) {
    console.log(`\n[component-check] ${tag} — VERDICT REFUSED`);
    console.log(`  ${res.reason}`);
    return 3;
  }
  const { verdict, counts, reasons } = res.result;
  console.log(`\n[component-check] ${tag} — verdict: ${verdict.toUpperCase()}`);
  console.log(`  bundle: ${rel(res.path)} (run ${res.bundle.runId}, written ${res.bundle.generatedAt})`);
  console.log(`  source: ${res.bundle.source.files.length} file(s), digest ${res.bundle.source.digest.slice(0, 12)} — matches the tree`);
  console.log(
    `  claims: ${counts.pass} pass, ${counts.fail} fail, ${counts.unobserved} unobserved (of ${counts.total})` +
      (res.result.strict ? ' [--strict]' : ''),
  );
  console.log('  inputs:');
  for (const row of res.bundle.claims ?? []) {
    console.log(`    [${row.status.padEnd(10)}] (${row.severity}/${row.requires}) ${row.claim} — ${row.detail}`);
    console.log(`                 read: ${row.citation?.reads ?? '(none)'}`);
    if (row.evidence) console.log(`                 evidence: ${row.evidence}`);
  }
  console.log('  derivation:');
  for (const r of reasons) console.log(`    - ${r}`);
  return verdict === 'verified' || verdict === 'verified-with-caveats' ? 0 : 1;
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
      '  node scripts/component-check.mjs <al-tag> --evidence [--json] [--strict]',
      '  node scripts/component-check.mjs <al-tag> --verdict [--json] [--strict]',
      '',
      'Examples:',
      '  node scripts/component-check.mjs al-button',
      '  node scripts/component-check.mjs button --strict',
      '  node scripts/component-check.mjs --all --json',
      '  node scripts/component-check.mjs al-button --evidence   # write .altitude/verification/al-button/<run>.json',
      '  node scripts/component-check.mjs al-button --verdict    # derive a verdict from the newest bundle',
      '',
      'See .altitude/VERIFICATION.md for the claim vocabulary and how a verdict is derived.',
    ].join('\n'),
  );
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const strict = args.includes('--strict');
  const all = args.includes('--all');
  const evidence = args.includes('--evidence');
  const verdict = args.includes('--verdict');
  const positional = args.filter((a) => !a.startsWith('--'));

  if (!all && positional.length !== 1) {
    usage();
    process.exit(2);
  }

  if (!existsSync(COMPONENTS_DIR)) {
    console.error(`[component-check] ERROR — components directory not found: ${COMPONENTS_DIR}`);
    process.exit(2);
  }

  // The evidence modes are per-component by construction: a bundle is a record
  // about ONE component's sources, and its staleness rule is a digest of those
  // sources. `--all` has no coherent meaning here, so say so instead of
  // inventing one.
  if ((evidence || verdict) && all) {
    console.error('[component-check] ERROR — --evidence/--verdict take one component tag, not --all');
    process.exit(2);
  }
  if (evidence && verdict) {
    console.error('[component-check] ERROR — pass --evidence or --verdict, not both (gather, then derive)');
    process.exit(2);
  }

  if (evidence) {
    const name = normalizeName(positional[0]);
    const res = writeEvidence(name, { strict });
    if (!res.ok) {
      console.error(`[component-check] REFUSED — ${res.reason}`);
      process.exitCode = 3;
      return;
    }
    if (json) {
      console.log(JSON.stringify(res.bundle, null, 2));
    } else {
      const c = res.bundle.derivedVerdict.counts;
      console.log(`\n[component-check] al-${name} — evidence bundle written`);
      console.log(`  ${rel(res.path)}`);
      console.log(`  run ${res.bundle.runId} · ${c.total} claims: ${c.pass} pass, ${c.fail} fail, ${c.unobserved} unobserved`);
      for (const row of res.bundle.claims) {
        console.log(`    [${row.status.padEnd(10)}] (${row.severity}/${row.requires}) ${row.claim} — ${row.detail}`);
        console.log(`                 read: ${row.citation.reads ?? '(none)'}`);
        if (row.evidence) console.log(`                 evidence: ${row.evidence}`);
      }
      console.log(`  -> derive the verdict with: node scripts/component-check.mjs al-${name} --verdict`);
    }
    // Writing evidence is not a gate. It succeeds when the readings were taken
    // and recorded; whether they are GOOD is --verdict's question.
    process.exitCode = 0;
    return;
  }

  if (verdict) {
    const name = normalizeName(positional[0]);
    const res = computeVerdict(name, { strict });
    if (json) {
      console.log(
        JSON.stringify(
          res.ok
            ? { tag: `al-${name}`, runId: res.bundle.runId, bundle: rel(res.path), ...res.result }
            : { tag: `al-${name}`, refused: true, reason: res.reason },
          null,
          2,
        ),
      );
      process.exitCode = res.ok ? (res.result.verdict === 'verified' || res.result.verdict === 'verified-with-caveats' ? 0 : 1) : 3;
      return;
    }
    process.exitCode = printVerdict(name, res);
    return;
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
    /**
     * `process.exitCode`, NOT `process.exit()`.
     *
     * On Linux a write to a PIPE goes async once the 64KB pipe buffer fills,
     * and process.exit() discards whatever is still queued. `--all --json` is
     * ~146KB, so a caller reading stdout through a pipe got the JSON chopped
     * mid-string while the process still reported a clean exit code.
     *
     * Invisible on Windows, where those writes complete synchronously, and
     * invisible for a single component, whose payload never reaches the buffer
     * limit — so it presented as "CI-only, --all-only, cannot reproduce
     * locally" (2026-08-31, scripts/__tests__/component-check.test.mjs).
     *
     * Setting exitCode lets Node drain stdout and exit with the same status.
     */
    process.exitCode = anyFailed ? 1 : 0;
    return;
  }

  let anyFailed = false;
  for (const result of results) {
    const failed = printReport(result, { strict });
    if (failed) anyFailed = true;
  }
  if (all) {
    console.log(`\n[component-check] checked ${results.length} component(s).`);
  }
  // Same reasoning as the JSON branch above: let stdout drain.
  process.exitCode = anyFailed ? 1 : 0;
}

/**
 * CLI only. The evidence helpers above are `export`ed so
 * scripts/__tests__/component-evidence.test.mjs can exercise the write
 * refusal and the pure verdict function directly — the same argument
 * scripts/__tests__/parity-receipt.test.mjs makes for `receiptAuthorises()`.
 * Without this guard, importing the module would run the CLI and exit 2.
 */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
