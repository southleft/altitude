#!/usr/bin/env node
/**
 * check-token-metadata.mjs — the drift gate for the `$extensions` metadata
 * written by scripts/generate-token-metadata.mjs (R7/R8/R9 of
 * 2026-08-22-token-debt-and-machine-readable-metadata).
 *
 * A generated artifact with no drift gate is exactly the failure this spec
 * keeps fixing (see its R6 finding about tokens-dtcg/). This is that gate
 * for the metadata layer specifically. It asserts, over
 * `libs/al-web-components/styles/tokens-dtcg/**.json`:
 *
 *   1. UUID COVERAGE — every token leaf carries a `com.adobe.id.uuid`.
 *   2. UUID UNIQUENESS — no two token leaves (anywhere in the tree) share one.
 *   3. UUID STABILITY — for every (file, dot-path) that exists both in the
 *      current working tree AND in the last commit (`git show HEAD:<file>`),
 *      the uuid must be byte-identical. A uuid that changed, or that
 *      disappeared while its token still exists, is the ONE failure mode
 *      that defeats R9's entire point (an identifier that isn't stable
 *      isn't an identifier) and is always a bug, never a legitimate edit.
 *      Comparing against HEAD (rather than a separate checked-in baseline
 *      file) means there is nothing extra to rebaseline — the git history
 *      the pipeline already trusts (see the `introduced` derivation in
 *      generate-token-metadata.mjs) is the baseline.
 *   4. REPLACEMENT INTEGRITY — every `com.atlassian.token.replacement`
 *      dot-path resolves to a REAL token leaf somewhere in the tree. A
 *      replacement pointing at nothing is worse than no replacement: it
 *      would send a codemod (scripts/codemod-deprecated-tokens.mjs) at a
 *      target that doesn't exist.
 *
 * Exit codes: 0 pass, 1 violation(s) found, 2 internal error (git/parse).
 *
 * Usage: node scripts/check-token-metadata.mjs [--json]
 */
'use strict';

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS_DIR = join(REPO, 'libs/al-web-components/styles/tokens-dtcg');
const JSON_OUT = process.argv.includes('--json');

function isTokenLeaf(node) {
  return node !== null && typeof node === 'object' && '$value' in node;
}

function walkJsonFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('$')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkJsonFiles(p));
    else if (name.endsWith('.json')) out.push(p);
  }
  return out;
}

function collectLeaves(node, segs, relFile, out) {
  if (Array.isArray(node) || node === null || typeof node !== 'object') return out;
  if (isTokenLeaf(node)) {
    out.push({ relFile, path: segs.join('.'), node });
    return out;
  }
  for (const [k, v] of Object.entries(node)) collectLeaves(v, [...segs, k], relFile, out);
  return out;
}

function headContent(repoRelFile) {
  try {
    return execFileSync('git', ['show', `HEAD:${repoRelFile}`], {
      cwd: REPO,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null; // new file, not yet committed — nothing to compare against
  }
}

function main() {
  const failures = [];
  const warnings = [];

  const allFiles = walkJsonFiles(TOKENS_DIR).map((f) => ({
    abs: f,
    rel: relative(TOKENS_DIR, f).replace(/\\/g, '/'),
  }));

  const allLeaves = [];
  for (const { abs, rel } of allFiles) {
    let raw;
    try {
      raw = JSON.parse(readFileSync(abs, 'utf8'));
    } catch (err) {
      failures.push(`${rel}: failed to parse — ${err.message}`);
      continue;
    }
    collectLeaves(raw, [], rel, allLeaves);
  }

  // ---- 1. UUID COVERAGE + 2. UUID UNIQUENESS ----
  const uuidOwners = new Map(); // uuid -> [{relFile, path}]
  let missingUuid = 0;
  for (const leaf of allLeaves) {
    const uuid = leaf.node.$extensions?.['com.adobe.id']?.uuid;
    if (!uuid) {
      missingUuid++;
      failures.push(`missing uuid: ${leaf.relFile}#${leaf.path}`);
      continue;
    }
    if (!uuidOwners.has(uuid)) uuidOwners.set(uuid, []);
    uuidOwners.get(uuid).push(leaf);
  }
  for (const [uuid, owners] of uuidOwners) {
    if (owners.length > 1) {
      failures.push(
        `duplicate uuid ${uuid}: ${owners.map((o) => `${o.relFile}#${o.path}`).join(', ')}`
      );
    }
  }

  // ---- 3. UUID STABILITY vs HEAD ----
  // Renames are tracked apart from failures: a token whose uuid moved to a new
  // key kept its identity, which is a pass. They are still PRINTED, because a
  // silent rename is exactly how a real removal would hide.
  const renames = [];
  /**
   * Deliberate deletions, recorded by uuid in `.altitude/token-removals.json`.
   * Without this the gate makes the token tree append-only: every other
   * exception in this repo is a dated record with a reason, so this is one too.
   * Keyed by uuid because that is the one identifier a rename cannot forge.
   */
  const removed = [];
  const removals = new Map();
  {
    const removalsPath = join(REPO, '.altitude', 'token-removals.json');
    if (existsSync(removalsPath)) {
      try {
        const doc = JSON.parse(readFileSync(removalsPath, 'utf8'));
        for (const r of doc.removed ?? []) {
          if (r && r.uuid) {
            removals.set(r.uuid, { reason: r.reason ?? '(no reason given)', date: r.date ?? 'undated' });
          }
        }
      } catch (e) {
        failures.push(`.altitude/token-removals.json is not valid JSON: ${e.message}`);
      }
    }
  }
  let comparedAgainstHead = 0;
  for (const { abs, rel } of allFiles) {
    const repoRel = relative(REPO, abs).replace(/\\/g, '/');
    const headText = headContent(repoRel);
    if (headText === null) continue; // untracked / new file this run
    let headRaw;
    try {
      headRaw = JSON.parse(headText);
    } catch {
      continue; // HEAD version didn't parse (shouldn't happen); skip rather than false-fail
    }
    const headLeaves = collectLeaves(headRaw, [], rel, []);
    const headByPath = new Map(headLeaves.map((l) => [l.path, l.node.$extensions?.['com.adobe.id']?.uuid]));
    const curRaw = JSON.parse(readFileSync(abs, 'utf8'));
    const curLeaves = collectLeaves(curRaw, [], rel, []);
    const curByPath = new Map(curLeaves.map((l) => [l.path, l.node.$extensions?.['com.adobe.id']?.uuid]));

    for (const [path, headUuid] of headByPath) {
      if (!headUuid) continue; // HEAD predates this metadata layer for this token
      comparedAgainstHead++;
      const curUuid = curByPath.get(path);
      if (curUuid === undefined) {
        /**
         * A KEY that vanished is not the same as an IDENTITY that vanished, and
         * conflating them is what a stable uuid exists to prevent. `uuidOwners`
         * is the whole current tree keyed by uuid, so if this uuid is still
         * somewhere the token was RENAMED — the identity survived, which is a
         * pass, and the gate should say which name it moved to.
         *
         * Measured on the 2026-09-02 colour rename (`theme.color.*.default*` ->
         * `*.neutral-*`): 38 tokens tripped "uuid removed", and all 38 still
         * held their original uuid at the new key. Zero identities were lost.
         * The gate was reporting a successful rename as data loss and would have
         * failed `repo-hygiene` on a branch where nothing was wrong.
         *
         * A uuid absent from the ENTIRE tree is still a real removal and still
         * fails below.
         */
        const movedTo = uuidOwners.get(headUuid);
        if (movedTo && movedTo.length > 0) {
          renames.push(`uuid moved: ${rel}#${path} -> ${movedTo[0].relFile}#${movedTo[0].path} (uuid ${headUuid} preserved)`);
        } else if (removals.has(headUuid)) {
          /**
           * DELETING A TOKEN ON PURPOSE has to be expressible, or the gate
           * makes the tree append-only. Every other exception in this repo is
           * a dated record with a reason (audit-allowlist, doc-anchors,
           * judgement-ledger), so this is one too:
           * `.altitude/token-removals.json`, keyed by the uuid that is going
           * away — the one identifier a rename cannot forge.
           *
           * It stays REPORTED, never silent. The point is to distinguish "we
           * meant this" from "something ate a token", not to stop mentioning
           * it.
           */
          const record = removals.get(headUuid);
          removed.push(`uuid removed ON PURPOSE: ${rel}#${path} — ${record.reason} (${record.date})`);
        } else {
          failures.push(
            `uuid removed: ${rel}#${path} had ${headUuid} at HEAD, and that uuid is nowhere in the tree now. ` +
              `If that was deliberate, record it in .altitude/token-removals.json with a reason.`,
          );
        }
      } else if (curUuid !== headUuid) {
        failures.push(`uuid CHANGED: ${rel}#${path} was ${headUuid} at HEAD, now ${curUuid}`);
      }
    }
  }

  // ---- 4. REPLACEMENT INTEGRITY ----
  const allPaths = new Set(allLeaves.map((l) => l.path));
  let replacementCount = 0;
  for (const leaf of allLeaves) {
    const atlassian = leaf.node.$extensions?.['com.atlassian.token'];
    if (!atlassian?.replacement) continue;
    replacementCount++;
    if (!allPaths.has(atlassian.replacement)) {
      failures.push(
        `dangling replacement: ${leaf.relFile}#${leaf.path} -> "${atlassian.replacement}" (no token has that path anywhere in the tree)`
      );
    }
    if (atlassian.state !== 'deprecated') {
      warnings.push(`${leaf.relFile}#${leaf.path} has a replacement but state is "${atlassian.state}", not "deprecated"`);
    }
  }

  const summary = {
    tokens: allLeaves.length,
    files: allFiles.length,
    missingUuid,
    uniqueUuids: uuidOwners.size,
    comparedAgainstHead,
    replacements: replacementCount,
    failures: failures.length,
    warnings: warnings.length,
  };

  if (JSON_OUT) {
    console.log(JSON.stringify({ ...summary, failureDetails: failures, warningDetails: warnings }, null, 2));
  } else {
    console.log('[token-metadata:check]');
    console.log(`  tokens: ${summary.tokens} across ${summary.files} files`);
    console.log(`  uuid coverage: ${summary.tokens - missingUuid}/${summary.tokens}`);
    console.log(`  unique uuids: ${summary.uniqueUuids}`);
    console.log(`  compared against HEAD: ${comparedAgainstHead} tokens`);
    console.log(`  replacement links: ${replacementCount}`);
    if (renames.length) {
      console.log(`\nRENAMES (${renames.length}) — identity preserved, not a violation:`);
      for (const r of renames) console.log(`  ${r}`);
    }
    if (removed.length) {
      console.log(`\nDELIBERATE REMOVALS (${removed.length}) — recorded in .altitude/token-removals.json:`);
      for (const r of removed) console.log(`  ${r}`);
    }
    if (warnings.length) {
      console.log(`\nWARNINGS (${warnings.length}):`);
      for (const w of warnings) console.log(`  ${w}`);
    }
    if (failures.length) {
      console.log(`\nFAILURES (${failures.length}):`);
      for (const f of failures) console.log(`  ${f}`);
    }
  }

  if (failures.length) {
    console.error(`\n[token-metadata:check] FAIL — ${failures.length} violation(s)`);
    process.exit(1);
  }
  console.log('\n[token-metadata:check] PASS');
}

main();
