#!/usr/bin/env node
/**
 * mark-synced.mjs — stamp components as "code and Figma confirmed matching".
 *
 * IT NOW REQUIRES THAT VERIFICATION (T1, spec
 * 2026-08-29-parity-judgement-gates-and-evals). The line below used to read
 * "Run AFTER a verified sync (check-parity.mjs passing, or a deliberate human
 * confirmation)" and that was a COMMENT, not a check: check-parity.mjs
 * returned 0 whatever it found, and this script stamped whatever it was
 * given. `in-sync` — the state `altitude_check_parity`, `GET /parity.json`
 * and the docs-site ParityPanel all report — was therefore agent-asserted,
 * never verified. It is now gated on a fresh, passing check-parity RECEIPT
 * (scripts/lib/parity-receipt.mjs) per component. The escape hatch is
 * `--human-verified "<reason>"`, which stamps anyway and RECORDS that it was
 * a human call, in `lastSync.verifiedBy`, so the manifest never loses the
 * distinction between "measured" and "somebody said so".
 *
 * Run AFTER a verified sync. It sets lastSync.codeHash to the CURRENT source hash and
 * lastSync.figmaDigest to the last observed Figma digest (or the ops digest as
 * the code-derived stand-in when Figma has not been read), which flips the
 * component to `in-sync` for `altitude_check_parity` / GET /parity.json / the
 * docs-site ParityPanel (Storybook, the surface this line used to name, was
 * retired 2026-08-25).
 *
 * MULTI-PROJECT: the target design system comes from `--project <id>` /
 * `DS_PROJECT` / the registry default in `.altitude/ds-projects.json`, which
 * selects the manifest and ops dir this stamps into.
 *
 * THE BRAND LAYER (T7 follow-up, spec
 * 2026-08-23-process-audit-and-dev-workflow-coherence): a project may declare
 * `brandLibrary` — page-section components in a separate workspace/CEM on top
 * of the shared library (Southleft's @southleft/sl-web-components), with tags
 * it SUPERSEDES (al-header/al-footer) replacing the base component under the
 * same tag. Looking a tag up via `resolveComponentRoster()` — the same roster
 * `computeParity()` and `seed-manifest.mjs` use — instead of the base CEM
 * directly means (a) a superseded tag hashes the BRAND source, not the base
 * one, and (b) a brand-only tag (e.g. al-hero) is found at all instead of
 * being rejected as "not in the CEM".
 *
 * Usage:
 *   node scripts/figma-parity/mark-synced.mjs al-button al-badge
 *   node scripts/figma-parity/mark-synced.mjs --all                    # every mapped component
 *   node scripts/figma-parity/mark-synced.mjs --project southleft al-button
 *   node scripts/figma-parity/mark-synced.mjs --project southleft al-hero  # brand-only tag
 *   node scripts/figma-parity/mark-synced.mjs al-button --human-verified "checked the set by hand, ops are stale"
 *   node scripts/figma-parity/mark-synced.mjs --all --max-receipt-age-hours 4
 */
import { resolveProject } from '../../libs/altitude-mcp/src/lib/ds-project.mjs';
import {
  readManifest,
  writeManifest,
  hashComponentSource,
  contractDigest,
  resolveComponentRoster,
  opsDigestFor,
  contractFileHash,
  readCodeContract,
} from '../../libs/altitude-mcp/src/lib/parity.mjs';
import { argOf, hasFlag, positionals } from '../lib/argv.mjs';
import {
  MAX_AGE_HOURS,
  readReceipt,
  receiptAuthorises,
  receiptPath,
  sourceKeyFor,
} from '../lib/parity-receipt.mjs';

const project = resolveProject();
const projectFlag = project.isDefault ? '' : ` --project ${project.id}`;

// Tag -> { component, origin, view }, joining base scope + brand supersessions
// + brand-only additions exactly as `computeParity()` sees them.
const rosterByTag = new Map(resolveComponentRoster(project).roster.map((r) => [r.component.tag, r]));

// Positional tags only. This used to be a hand-rolled loop that skipped only
// `--all` and `--project`, so ANY other flag (and any flag's value) fell
// through as a "tag" and surfaced as a bogus "not in manifest" warning. Now it
// goes through the shared parser, which also knows the `--flag=value` spelling.
const args = positionals(process.argv, {
  valueFlags: ['--project', '--human-verified', '--max-receipt-age-hours'],
});
const all = hasFlag('--all');

// The escape hatch. A REASON is mandatory: an unexplained override is exactly
// the "somebody said so" this gate exists to stop being invisible.
const humanVerified = hasFlag('--human-verified') ? argOf('--human-verified') : null;
if (hasFlag('--human-verified') && !humanVerified) {
  console.error('--human-verified requires a reason: --human-verified "why you are confident this is reconciled"');
  process.exit(1);
}
const maxAgeHours = Number(argOf('--max-receipt-age-hours') ?? MAX_AGE_HOURS);
if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) {
  console.error(`--max-receipt-age-hours must be a positive number (got "${argOf('--max-receipt-age-hours')}")`);
  process.exit(1);
}

const manifest = readManifest(project);
if (!manifest) {
  console.error(`No parity manifest for "${project.id}". Run: node scripts/figma-parity/seed-manifest.mjs${projectFlag}`);
  process.exit(1);
}

const tags = all ? Object.keys(manifest.components) : args;
if (tags.length === 0) {
  console.error('Usage: node scripts/figma-parity/mark-synced.mjs [--project <id>] <tag...> | --all');
  process.exit(1);
}

// opsDigestFor — shared from parity.mjs since 2026-08-27 (R4).
const opsDigest = (tag) => opsDigestFor(project, tag);

// THE GATE (T1). One receipt per project, written by the last check-parity
// run. Read once — a per-tag read would let the file change under a long
// `--all` pass, which is the sort of thing that only ever fails in production.
const receipt = readReceipt(project);
if (!receipt && !humanVerified) {
  console.error(`No check-parity receipt for "${project.id}" at ${receiptPath(project)}.`);
  console.error(`Verify first:  node scripts/figma-atoms/check-parity.mjs${projectFlag} ${all ? '<tag...>' : tags.join(' ')}`);
  console.error('Or, if you verified it yourself:  --human-verified "<reason>"');
  process.exit(1);
}

const now = new Date().toISOString();
let stamped = 0;
let refused = 0;
for (const tag of tags) {
  const entry = manifest.components[tag];
  if (!entry) {
    console.warn(`skip ${tag}: not in manifest (run seed-manifest.mjs)`);
    continue;
  }
  if (!entry.figma) {
    console.warn(`skip ${tag}: no Figma mapping in "${project.figma.fileName}" — map it first (instance-map.mjs / seed-manifest.mjs)`);
    continue;
  }
  const rosterEntry = rosterByTag.get(tag);
  if (!rosterEntry) {
    console.warn(`skip ${tag}: not in the CEM (base library or brand layer)`);
    continue;
  }
  const { component, view } = rosterEntry;

  // Is this component's reconciliation actually verified? `sourceKeyFor` is
  // the SAME function check-parity called when it wrote the receipt, so a
  // source edit between the check and the stamp cannot slip through.
  const auth = receiptAuthorises(receipt, tag, sourceKeyFor(rosterByTag, tag), { maxAgeHours });
  if (!auth.ok && !humanVerified) {
    console.error(`REFUSED ${tag}: ${auth.reason}`);
    console.error(`         verify:  node scripts/figma-atoms/check-parity.mjs${projectFlag} ${tag}`);
    refused += 1;
    continue;
  }

  // T11 (spec 2026-08-25-contract-backed-figma-parity-and-generation): stamp
  // the TRACKED contract's own state alongside the code/Figma digests, so a
  // later hand edit to .altitude/contracts/<project>/<tag>.contract.json with
  // nobody re-running mark-synced shows up as `contractDrifted` on the parity
  // report (libs/altitude-mcp/src/lib/parity.mjs). A tag with no contract
  // file yet (not seeded — see `pnpm run contracts:seed`) is NOT an error
  // here: the stamp still proceeds on codeHash/contractDigest/figmaDigest as
  // before, it just warns and stamps no contractHash/contractVersion.
  const trackedContractHash = contractFileHash(project, tag);
  if (!trackedContractHash) {
    console.warn(
      `warn ${tag}: no tracked contract at .altitude/contracts/${project.id}/${tag}.contract.json — stamping without contractHash/contractVersion. Run: pnpm run contracts:seed${projectFlag}`,
    );
  }
  const trackedContract = trackedContractHash ? readCodeContract(project, tag) : null;

  entry.lastSync = {
    date: now,
    // `view` is the ROSTER's project record for this tag — the real project
    // with `resolved.libraryRoot` swapped for the brand root when `origin` is
    // 'brand', so a superseded tag (al-header/al-footer) hashes the brand
    // source instead of silently re-hashing the base component underneath it.
    codeHash: hashComponentSource(component.modulePath, view),
    // The PUBLIC-SURFACE digest, which is what the parity engine now compares
    // (libs/altitude-mcp/src/lib/parity.mjs, "the contract"). `codeHash` is
    // still written beside it so an older reader keeps working, but a JSDoc
    // edit moves only the hash and no longer flips the badge.
    contractDigest: contractDigest(component),
    figmaDigest: entry.figmaCurrentDigest ?? entry.lastSync?.figmaDigest ?? opsDigest(tag),
    // OPTIONAL (T11) — omitted entirely (not written as null) when no
    // tracked contract file exists yet, so a manifest entry for a tag never
    // seeded stays exactly as small as it was before this existed.
    ...(trackedContractHash ? { contractHash: trackedContractHash, contractVersion: trackedContract?.version ?? null } : {}),
    // HOW this stamp was authorised (T1). Without it the manifest records
    // that a component is in-sync but not whether anything measured it —
    // which is the whole distinction this gate exists to preserve. `human`
    // entries are the ones to audit.
    verifiedBy: (!auth.ok && humanVerified)
      ? { how: 'human', reason: humanVerified, at: now, refusalOverridden: auth.reason }
      : { how: 'check-parity', at: auth.checkedAt, tolerancePx: receipt?.tolerancePx ?? null },
  };
  stamped += 1;
}

writeManifest(manifest, project);
console.log(`[${project.id}] Stamped ${stamped}/${tags.length} component(s) as synced at ${now}.`);
if (refused > 0) {
  console.error(`[${project.id}] REFUSED ${refused}/${tags.length} — unverified components were left as they were, not stamped.`);
  process.exit(1);
}
