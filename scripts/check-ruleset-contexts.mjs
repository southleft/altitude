#!/usr/bin/env node
/**
 * The `main` ruleset's required checks must name jobs that actually exist.
 *
 * WHY THIS IS ITS OWN GATE. GitHub required status checks are matched by the
 * check-run NAME, which for this workflow is each job's `name:` — not its yaml
 * key. Nothing in GitHub validates that a required context corresponds to a job
 * that will ever report. So:
 *
 *   - Rename a job's `name:` and the old context is still required. It never
 *     reports, the PR waits forever, and the only symptom is a merge button
 *     that stays grey with every visible check green.
 *   - Add a job and forget the ruleset, and a red job blocks nothing — which is
 *     precisely the gap the ruleset was created to close on 2026-09-02, when
 *     `main` had no protection at all and 18 commits had gone straight in.
 *
 * Both directions are silent failures in opposite ways, so both are checked.
 * `.github/rulesets/README.md` states the rule in prose; this enforces it.
 *
 * NETWORK. This reads the live ruleset through `gh`, so it cannot be an offline
 * gate — it is `live` tier in `.altitude/gates.json`. When `gh` is missing, not
 * authenticated, or the repo has no ruleset, it prints a NAMED not-verified line
 * and exits 0. A check that cannot run must say so rather than pass quietly;
 * `--strict` turns that into a failure for a caller that knows the network is
 * meant to be there.
 *
 * Usage:
 *   node scripts/check-ruleset-contexts.mjs [--repo owner/name] [--strict] [--json]
 *
 * Exit codes: 0 pass or not-verified · 1 mismatch · 2 could not read the workflow.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW = join(REPO_ROOT, '.github', 'workflows', 'v2-checks.yml');
const RULESET_FILE = join(REPO_ROOT, '.github', 'rulesets', 'main.json');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valueOf = (f) => {
  const i = argv.indexOf(f);
  return i > -1 ? argv[i + 1] : null;
};

const STRICT = has('--strict');
const JSON_OUT = has('--json');
const REPO = valueOf('--repo') ?? 'southleft/altitude';

function notVerified(reason) {
  const line = `check-ruleset-contexts: NOT VERIFIED — ${reason}. This gate did not run; it did not pass.`;
  if (JSON_OUT) console.log(JSON.stringify({ status: 'not-verified', reason }, null, 2));
  else console.log(line);
  process.exit(STRICT ? 1 : 0);
}

if (!existsSync(WORKFLOW)) {
  console.error(`check-ruleset-contexts: no workflow at ${WORKFLOW}`);
  process.exit(2);
}

/**
 * Job display names, which ARE the check contexts. Four-space indent is the job
 * level in this workflow; a `name:` at any other depth belongs to a step.
 */
const workflowNames = [...readFileSync(WORKFLOW, 'utf8').matchAll(/^ {4}name: (.+)$/gm)]
  .map((m) => m[1].trim().replace(/^['"]|['"]$/g, ''));

if (workflowNames.length === 0) {
  console.error('check-ruleset-contexts: parsed zero job names — the workflow shape changed.');
  process.exit(2);
}

let required = null;
let source = null;

try {
  const raw = execFileSync('gh', ['api', `repos/${REPO}/rulesets`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 20000,
    shell: process.platform === 'win32',
  });
  const rulesets = JSON.parse(raw);
  if (!Array.isArray(rulesets) || rulesets.length === 0) {
    notVerified(`${REPO} has no rulesets — main is unprotected`);
  }
  for (const summary of rulesets) {
    const detail = JSON.parse(
      execFileSync('gh', ['api', `repos/${REPO}/rulesets/${summary.id}`], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 20000,
        shell: process.platform === 'win32',
      }),
    );
    const rule = (detail.rules ?? []).find((r) => r.type === 'required_status_checks');
    if (rule) {
      required = rule.parameters.required_status_checks.map((c) => c.context);
      source = `live ruleset "${detail.name}" (id ${detail.id})`;
      break;
    }
  }
  if (!required) notVerified('no ruleset on this repo declares required status checks');
} catch (error) {
  // Fall back to the checked-in copy so the gate still says something useful
  // offline. It is the file the live ruleset is applied FROM, so a mismatch
  // here is a real finding even when the API is unreachable.
  if (existsSync(RULESET_FILE)) {
    try {
      const local = JSON.parse(readFileSync(RULESET_FILE, 'utf8'));
      const rule = (local.rules ?? []).find((r) => r.type === 'required_status_checks');
      if (rule) {
        required = rule.parameters.required_status_checks.map((c) => c.context);
        source = '.github/rulesets/main.json (checked-in copy — the LIVE ruleset was not reachable)';
      }
    } catch {
      /* fall through */
    }
  }
  if (!required) {
    notVerified(`could not read the ruleset (${String(error.message).split('\n')[0].slice(0, 120)})`);
  }
}

const missing = workflowNames.filter((n) => !required.includes(n));
const orphaned = required.filter((c) => !workflowNames.includes(c));

if (JSON_OUT) {
  console.log(JSON.stringify({ source, jobs: workflowNames.length, required: required.length, missing, orphaned }, null, 2));
} else {
  console.log('Altitude — ruleset required checks vs workflow jobs');
  console.log(`  source        : ${source}`);
  console.log(`  workflow jobs : ${workflowNames.length}`);
  console.log(`  required      : ${required.length}`);
}

const failures = [];
if (orphaned.length) {
  failures.push(
    `${orphaned.length} required check(s) name no job in the workflow. A PR can NEVER satisfy these — ` +
      `the merge button stays grey with every visible check green:\n      ${orphaned.join('\n      ')}`,
  );
}
if (missing.length) {
  failures.push(
    `${missing.length} job(s) run but are NOT required, so they can go red without blocking a merge:\n      ${missing.join('\n      ')}`,
  );
}

if (failures.length) {
  console.error('\ncheck-ruleset-contexts: FAIL');
  for (const f of failures) console.error(`  - ${f}`);
  console.error(
    '\n  Fix: regenerate the context list from a real run, then push it —\n' +
      "    gh run view <id> --json jobs --jq '.jobs[].name'\n" +
      '    gh api -X PUT repos/' + REPO + '/rulesets/<id> --input .github/rulesets/main.json\n' +
      '  See .github/rulesets/README.md. Never hand-type a context string.',
  );
  process.exit(1);
}

if (!JSON_OUT) console.log('\nOK — every job is required, and every required check names a real job.');
