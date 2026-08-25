#!/usr/bin/env node
/**
 * generate-token-metadata.mjs — R7/R8/R9 of
 * 2026-08-22-token-debt-and-machine-readable-metadata.
 *
 * MUTATES `libs/al-web-components/styles/tokens-dtcg/**.json` (the hand-authored
 * DTCG source of truth) in place, adding one `$extensions` block per token leaf:
 *
 *   $extensions["org.altitude.token"].cssType   AUTHORED — see below
 *   $extensions["org.primer.llm"].usage        R7 — usage rule, FAMILY-level
 *   $extensions["com.salesforce.styling"].cssProperties  R7 — derived allow-list
 *   $extensions["com.atlassian.token"].{state,introduced,replacement,reason}  R8
 *   $extensions["com.adobe.id"].uuid            R9 — assigned once, never regenerated
 *
 * Style Dictionary v5 (`usesDtcg: true`) never reads `$extensions` in any
 * custom format registered in tokens-config.v5.mjs (all three cherry-pick
 * `$value`/`$type`/`original` explicitly), so emission is unaffected — see the
 * spec's byte-identical verification.
 *
 * IDENTITY vs DERIVED — the distinction this script turns on:
 *   - `uuid` is IDENTITY. Read back from the token's own current `$extensions`
 *     and reused verbatim; only a token with no uuid yet gets
 *     `crypto.randomUUID()`. Re-running never changes an existing uuid.
 *   - `cssType` is IDENTITY. It cannot be re-derived, because DTCG `$type` is
 *     deliberately coarser than the CSS surface a token is authored for (see
 *     the comment at its assignment below). A token with no `cssType` gets NO
 *     `cssProperties` and is reported at the end of the run — that is a real
 *     authoring gap, not something to paper over with a guess.
 *   - `cssProperties`, `introduced`, and the FAMILY usage rule are DERIVED, so
 *     redriving them every run is correct (a rule can be improved, `introduced`
 *     reflects whatever git history exists at run time).
 *
 * Usage: node scripts/generate-token-metadata.mjs [--dry-run]
 */
'use strict';

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_USAGE_RULES,
  KNOWN_LIFECYCLE,
  TYPE_CSS_PROPERTIES,
  otherTypeCssProperties,
} from './lib/token-metadata-rules.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS_DIR = join(REPO, 'libs/al-web-components/styles/tokens-dtcg');
const DRY_RUN = process.argv.includes('--dry-run');

function isTokenLeaf(node) {
  return node !== null && typeof node === 'object' && '$value' in node;
}

function walkJsonFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('$')) continue; // defensive: no $-prefixed files in the DTCG tree
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkJsonFiles(p));
    else if (name.endsWith('.json')) out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------- git history

/**
 * For one tokens file, walk its OWN commit history oldest -> newest and
 * record the first revision at which each dot-path exists as a token leaf.
 * Real git history, not a per-token invented date; a path with no history
 * hit (e.g. git unavailable, or genuinely new/uncommitted) is simply absent
 * from the returned map, and the caller omits `introduced` rather than
 * guessing.
 *
 * KNOWN LIMITATION, disclosed rather than silently accepted: this walks
 * `git log` on the CURRENT file path only (no `--follow`). Verified example —
 * `tier-1/spacing.json` reports 2024-03-05 here, but `git log --follow`
 * traces its content through a rename+cross-package copy chain back to
 * `libs/sl-web-components/tokens/sl/tier-1/spacing.json` at 2024-01-18 (the
 * pre-T1.1 token layout). `--follow`'s copy/rename detection is heuristic and
 * tracking the historical path per revision correctly (a file can be
 * renamed AND have unrelated siblings touched in the same commit) is
 * meaningfully harder to get right than this simple version — so `introduced`
 * here is a LOWER BOUND on a token's true age (the date it arrived at its
 * CURRENT path), not necessarily its original authoring date. That is
 * disclosed, not fabricated: every date returned is still a real commit that
 * really does contain that token at that path.
 */
function introducedDatesForFile(absFile) {
  const relFile = relative(REPO, absFile).replace(/\\/g, '/');
  const map = new Map(); // dot-path -> YYYY-MM-DD
  let revs;
  try {
    const raw = execFileSync(
      'git',
      ['log', '--format=%H,%ad', '--date=short', '--reverse', '--', relFile],
      { cwd: REPO, encoding: 'utf8' }
    );
    revs = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const idx = l.indexOf(',');
        return { hash: l.slice(0, idx), date: l.slice(idx + 1) };
      });
  } catch {
    return map; // git unavailable — every token in this file omits `introduced`
  }

  const seen = new Set();
  for (const { hash, date } of revs) {
    let text;
    try {
      text = execFileSync('git', ['show', `${hash}:${relFile}`], { cwd: REPO, encoding: 'utf8' });
    } catch {
      continue; // file didn't exist at this path in this revision (rename/creation boundary)
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      continue;
    }
    collectPaths(parsed, []).forEach((p) => {
      if (!seen.has(p)) {
        seen.add(p);
        map.set(p, date);
      }
    });
  }
  return map;
}

function collectPaths(node, segs, out = []) {
  if (Array.isArray(node) || node === null || typeof node !== 'object') return out;
  if (isTokenLeaf(node)) {
    out.push(segs.join('.'));
    return out;
  }
  for (const [k, v] of Object.entries(node)) collectPaths(v, [...segs, k], out);
  return out;
}

// ---------------------------------------------------------------- cssProperties

function cssPropertiesFor(type, pathStr) {
  if (type === 'other') return otherTypeCssProperties(pathStr);
  return TYPE_CSS_PROPERTIES[type] ?? [];
}

// ---------------------------------------------------------------- main walk

function annotate(node, segs, ctx) {
  if (Array.isArray(node) || node === null || typeof node !== 'object') return;
  if (isTokenLeaf(node)) {
    const pathStr = segs.join('.');
    const family = segs.slice(0, -1).join('.');

    const existing = node.$extensions ?? {};
    const uuid = existing['com.adobe.id']?.uuid ?? crypto.randomUUID();

    const ext = {};

    // AUTHORED INTENT — identity data, not derived. Read back like `uuid` and
    // never recomputed once present.
    //
    // DTCG's `$type` vocabulary is deliberately coarse: `sizing`, `spacing`,
    // `borderRadius`, `borderWidth`, `fontSizes` and `lineHeights` ALL collapse
    // to `dimension`, so a `dimension` token could legally be a width, a
    // padding, a radius, a font-size or a border width. `cssType` carries the
    // finer semantic that `cssPropertiesFor()` needs — without it, 163 of 555
    // tokens lose their `cssProperties` allow-list entirely (measured, not
    // estimated). Seeded once from the legacy Tokens Studio `type` field
    // during the tokens/ -> tokens-dtcg/ flip; authored by hand thereafter.
    // Vocabulary: the keys of TYPE_CSS_PROPERTIES in lib/token-metadata-rules.mjs.
    const cssType = existing['org.altitude.token']?.cssType;
    if (cssType) ext['org.altitude.token'] = { cssType };

    const usage = FAMILY_USAGE_RULES[family];
    if (usage) ext['org.primer.llm'] = { usage };

    const cssProperties = cssPropertiesFor(cssType, pathStr);
    if (cssProperties.length) ext['com.salesforce.styling'] = { cssProperties };

    const atlassian = {};
    // `introduced` is IDENTITY once established, DERIVED only as a fallback.
    // The date a token first appeared is a historical fact that must not change
    // when the file it lives in is renamed or moved — and `introducedDatesForFile`
    // walks the CURRENT path only (no `--follow`, see its header), so a tree move
    // silently resets every date to "no history". Reading back what is already
    // recorded makes the value survive exactly the event that would corrupt it.
    // The tokens/ -> tokens-dtcg/ flip is precisely that event.
    const introduced =
      existing['com.atlassian.token']?.introduced ?? ctx.introducedDates.get(pathStr);
    if (introduced) atlassian.introduced = introduced;
    const lifecycle = ctx.lifecycleByKey.get(`${ctx.relFile}::${pathStr}`);
    if (lifecycle) {
      atlassian.state = 'deprecated';
      atlassian.replacement = lifecycle.replacement;
      atlassian.reason = lifecycle.reason;
    }
    if (Object.keys(atlassian).length) ext['com.atlassian.token'] = atlassian;

    ext['com.adobe.id'] = { uuid };

    node.$extensions = ext;
    ctx.stats.tokens++;
    if (usage) ctx.stats.withUsage++;
    if (cssProperties.length) ctx.stats.withCssProperties++;
    else ctx.stats.noCssProperties.push(pathStr);
    if (introduced) ctx.stats.withIntroduced++;
    if (lifecycle) ctx.stats.deprecated++;
    return;
  }
  for (const [k, v] of Object.entries(node)) annotate(v, [...segs, k], ctx);
}

function main() {
  if (!existsSync(TOKENS_DIR)) {
    console.error(`[token-metadata] ${TOKENS_DIR} does not exist`);
    process.exit(1);
  }

  const lifecycleByKey = new Map(KNOWN_LIFECYCLE.map((e) => [`${e.file}::${e.path}`, e]));
  const stats = { tokens: 0, withUsage: 0, withCssProperties: 0, noCssProperties: [], withIntroduced: 0, deprecated: 0, files: 0 };

  for (const absFile of walkJsonFiles(TOKENS_DIR)) {
    const relFile = relative(TOKENS_DIR, absFile).replace(/\\/g, '/');
    const raw = JSON.parse(readFileSync(absFile, 'utf8'));
    const introducedDates = introducedDatesForFile(absFile);
    annotate(raw, [], { relFile, introducedDates, lifecycleByKey, stats });
    stats.files++;
    if (!DRY_RUN) writeFileSync(absFile, JSON.stringify(raw, null, 2) + '\n');
  }

  console.log(`[token-metadata] ${DRY_RUN ? '(dry run) ' : ''}annotated ${stats.tokens} tokens across ${stats.files} files`);
  console.log(`  org.primer.llm usage rule:        ${stats.withUsage}/${stats.tokens}`);
  console.log(`  com.salesforce.styling cssProperties: ${stats.withCssProperties}/${stats.tokens}`);
  console.log(`  com.atlassian.token introduced:   ${stats.withIntroduced}/${stats.tokens}`);
  console.log(`  com.atlassian.token state=deprecated: ${stats.deprecated}`);
  if (stats.noCssProperties.length) {
    console.log(`  no cssProperties derivable (${stats.noCssProperties.length}):`);
    for (const p of stats.noCssProperties) console.log(`    ${p}`);
  }
}

main();
