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
import { readdirSync, readFileSync, statSync } from 'node:fs';
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
        failures.push(`uuid removed: ${rel}#${path} had ${headUuid} at HEAD, token (or its uuid) is gone now`);
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
