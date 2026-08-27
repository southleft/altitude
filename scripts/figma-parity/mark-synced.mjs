#!/usr/bin/env node
/**
 * mark-synced.mjs — stamp components as "code and Figma confirmed matching".
 *
 * Run AFTER a verified sync (check-parity.mjs passing, or a deliberate human
 * confirmation). It sets lastSync.codeHash to the CURRENT source hash and
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

const project = resolveProject();
const projectFlag = project.isDefault ? '' : ` --project ${project.id}`;

// Tag -> { component, origin, view }, joining base scope + brand supersessions
// + brand-only additions exactly as `computeParity()` sees them.
const rosterByTag = new Map(resolveComponentRoster(project).roster.map((r) => [r.component.tag, r]));

// Positional tags only: drop `--all`, `--project` and the id that follows it.
const raw = process.argv.slice(2);
const args = [];
for (let i = 0; i < raw.length; i += 1) {
  const a = raw[i];
  if (a === '--all') continue;
  if (a === '--project') { i += 1; continue; }
  if (a.startsWith('--project=')) continue;
  args.push(a);
}
const all = raw.includes('--all');

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

const now = new Date().toISOString();
let stamped = 0;
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
  };
  stamped += 1;
}

writeManifest(manifest, project);
console.log(`[${project.id}] Stamped ${stamped}/${tags.length} component(s) as synced at ${now}.`);
