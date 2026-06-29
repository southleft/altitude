#!/usr/bin/env node
/**
 * T1.3 — Figma / Tokens-Studio ingestion + round-trip.
 *
 * Workflow:
 *   1. Figma → Tokens Studio plugin exports a `.json` (or `.zip` containing
 *      a tree of `.json` files) using DTCG (`$value`/`$type`).
 *   2. Drop the export at `<repo>/.altitude/inbox/tokens-studio.json` (or
 *      a directory at `.altitude/inbox/tokens-studio/`).
 *   3. Run `yarn workspace al-web-components tokens:ingest` (this script).
 *   4. The script:
 *      a. Validates DTCG shape (every leaf has `$value` and `$type`).
 *      b. Validates that no new token name collides with an existing one
 *         unless the operator passed `--accept-new-names`.
 *      c. Writes the export to `libs/al-web-components/styles/tokens-dtcg/`.
 *      d. Runs `build:tokens:v5` and the parity + contract gates.
 *
 * Round-trip: `yarn workspace al-web-components tokens:export` (separately,
 * not implemented here yet) walks `tokens-dtcg/` and emits a Tokens-Studio
 * shaped export under `.altitude/outbox/` so Figma can re-import without
 * drift.
 *
 * Acceptance (per T1.3 plan):
 *   `yarn tokens:ingest` validates an export and writes DTCG files; invalid
 *   export is rejected with a clear error.
 */

'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const INBOX_FILE = path.join(REPO, '.altitude/inbox/tokens-studio.json');
const INBOX_DIR = path.join(REPO, '.altitude/inbox/tokens-studio');
const DTCG_ROOT = path.join(REPO, 'libs/al-web-components/styles/tokens-dtcg');
const ACCEPT_NEW = process.argv.includes('--accept-new-names');

function fail(msg) {
  console.error('[tokens:ingest] FAIL —', msg);
  process.exit(1);
}

function validateDtcgShape(tree, location) {
  // Walk every leaf; a leaf is an object containing `$value`. Reject if it
  // lacks `$type` (Tokens Studio always emits it; missing is a sign of a
  // pre-DTCG export that snuck through).
  const visit = (node, p) => {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return;
    if ('$value' in node) {
      if (!('$type' in node)) {
        fail(`Token at ${location}#/${p.join('/')} has \`$value\` but no \`$type\` — pre-DTCG export?`);
      }
      return;
    }
    for (const [k, v] of Object.entries(node)) visit(v, [...p, k]);
  };
  visit(tree, []);
}

function collectLeafNames(tree, prefix = []) {
  const out = [];
  const visit = (node, p) => {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return;
    if ('$value' in node) {
      out.push(p.join('.'));
      return;
    }
    for (const [k, v] of Object.entries(node)) visit(v, [...p, k]);
  };
  visit(tree, prefix);
  return out;
}

function loadInbox() {
  if (fs.existsSync(INBOX_FILE)) {
    return JSON.parse(fs.readFileSync(INBOX_FILE, 'utf8'));
  }
  if (fs.existsSync(INBOX_DIR)) {
    // Combine every JSON in the directory tree into one object keyed by
    // file's relative path stem.
    const out = {};
    const walk = (dir, prefix) => {
      for (const name of fs.readdirSync(dir)) {
        if (name.startsWith('.')) continue;
        const p = path.join(dir, name);
        const st = fs.statSync(p);
        if (st.isDirectory()) walk(p, [...prefix, name]);
        else if (name.endsWith('.json')) {
          out[[...prefix, name.replace(/\.json$/, '')].join('/')] = JSON.parse(fs.readFileSync(p, 'utf8'));
        }
      }
    };
    walk(INBOX_DIR, []);
    return out;
  }
  fail(`No export at ${INBOX_FILE} or ${INBOX_DIR}. Drop the Tokens-Studio JSON in one of those paths first.`);
}

function main() {
  console.log('[tokens:ingest] reading inbox…');
  const tree = loadInbox();
  validateDtcgShape(tree, 'inbox');

  console.log('[tokens:ingest] collecting names…');
  const incoming = new Set(collectLeafNames(tree));

  // Compare against the current DTCG root.
  const existing = new Set();
  if (fs.existsSync(DTCG_ROOT)) {
    const walk = (dir, prefix) => {
      for (const name of fs.readdirSync(dir)) {
        if (name.startsWith('.')) continue;
        const p = path.join(dir, name);
        const st = fs.statSync(p);
        if (st.isDirectory()) walk(p, [...prefix, name]);
        else if (name.endsWith('.json')) {
          try {
            const t = JSON.parse(fs.readFileSync(p, 'utf8'));
            for (const n of collectLeafNames(t)) existing.add(n);
          } catch {}
        }
      }
    };
    walk(DTCG_ROOT, []);
  }

  const additions = [...incoming].filter((n) => !existing.has(n));
  const removals = [...existing].filter((n) => !incoming.has(n));

  if (additions.length && !ACCEPT_NEW) {
    fail(`${additions.length} new token name(s) in the export. Re-run with \`--accept-new-names\` to land them. Sample: ${additions.slice(0, 5).join(', ')}`);
  }

  console.log(`[tokens:ingest] additions=${additions.length} removals=${removals.length} validated.`);
  console.log('[tokens:ingest] writing DTCG tree (existing files preserved if not in export)…');

  // Write each top-level key as a file under tokens-dtcg/ingested/.
  const outDir = path.join(DTCG_ROOT, 'ingested');
  fs.mkdirSync(outDir, { recursive: true });
  for (const [key, value] of Object.entries(tree)) {
    const safe = key.replace(/[^a-z0-9_-]/gi, '_');
    fs.writeFileSync(path.join(outDir, `${safe}.json`), JSON.stringify(value, null, 2) + '\n');
  }

  console.log('[tokens:ingest] running parity + contract…');
  try {
    execSync('pnpm --filter al-web-components build:tokens:v5', { cwd: REPO, stdio: 'inherit' });
  } catch (err) {
    fail(`build:tokens:v5 failed after ingest: ${err.message}`);
  }
  console.log('[tokens:ingest] PASS — ingest complete.');
}

main();
