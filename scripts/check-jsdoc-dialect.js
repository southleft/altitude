#!/usr/bin/env node
/**
 * check-jsdoc-dialect.js — T9 / R1+R2 of 2026-08-18-unified-jsdoc-and-generated-ai-docs.
 *
 * Two independent gates over the JSDoc → CEM pipeline:
 *
 *   1. DIALECT (fatal, always). No component source may reintroduce the legacy
 *      prose form (`- **slot**:`, `- **event**`, `- **csspart**`, `- **cssproperty**`).
 *      T1 codemodded all 52 remaining files to the tag dialect; this stops the
 *      plop templates or a hand-written component from walking it back.
 *
 *   2. EMPTY EVENT DESCRIPTIONS (ratcheted). Every event in the CEM should carry
 *      a description. 53 of 54 were empty when this gate was written, so failing
 *      outright would block every PR. Instead the gate holds a HIGH-WATER MARK:
 *      the count may fall, never rise. Lower ALLOWED_EMPTY_EVENTS as T2 lands.
 *      When it reaches 0, delete the ratchet and make it a plain assertion.
 *
 * Exit 0 = clean, 1 = at least one problem.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMPONENTS = join(ROOT, 'libs/al-web-components/components');
const PLOP = join(ROOT, 'libs/al-web-components/plop');
const CEM = join(ROOT, 'libs/al-web-components/custom-elements.json');

/**
 * High-water mark for CEM events with an empty description.
 * Ratchet DOWN as T2 documents dispatch sites. Never raise it.
 */
const ALLOWED_EMPTY_EVENTS = 53;

const LEGACY_PROSE = /-\s*\*\*(slot|event|csspart|cssproperty)\*\*/;

let problems = 0;
const fail = (kind, msg) => { console.error(`  ${kind}  ${msg}`); problems++; };

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (name === 'node_modules' || name === 'dist') continue;
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.ts') || name.endsWith('.hbs')) out.push(p);
  }
  return out;
}

// --- gate 1: no legacy prose dialect -----------------------------------------
console.log('[jsdoc-dialect] checking component sources and plop templates\n');

let scanned = 0;
for (const file of [...walk(COMPONENTS), ...walk(PLOP)]) {
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { continue; }
  scanned++;
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(LEGACY_PROSE);
    if (m) {
      fail(
        'LEGACY-DIALECT',
        `${relative(ROOT, file).split(sep).join('/')}:${i + 1} uses the legacy prose form ` +
        `"- **${m[1]}**" — use the @${m[1]} tag instead`
      );
    }
  }
}
console.log(`  ${scanned} source file(s) scanned for legacy prose`);

// --- gate 2: ratcheted empty CEM event descriptions ---------------------------
console.log('\n[jsdoc-dialect] checking CEM event descriptions');

if (!existsSync(CEM)) {
  fail('NO-CEM', 'custom-elements.json not found — run `pnpm --filter al-web-components build:custom-elements.json`');
} else {
  const cem = JSON.parse(readFileSync(CEM, 'utf8'));
  let total = 0;
  const empty = [];
  for (const mod of cem.modules || []) {
    for (const dec of mod.declarations || []) {
      for (const ev of dec.events || []) {
        total++;
        if (!(ev.description || '').trim()) {
          empty.push(`${dec.tagName || dec.name}#${ev.name}`);
        }
      }
    }
  }
  console.log(`  ${total} event(s) in the CEM, ${empty.length} with an empty description (allowed: ${ALLOWED_EMPTY_EVENTS})`);

  if (empty.length > ALLOWED_EMPTY_EVENTS) {
    for (const e of empty.slice(0, 10)) fail('EMPTY-EVENT-DESC', e);
    if (empty.length > 10) console.error(`  ... and ${empty.length - 10} more`);
    fail(
      'RATCHET',
      `${empty.length} empty event descriptions exceeds the high-water mark of ${ALLOWED_EMPTY_EVENTS}. ` +
      `Document the new event at its dispatch site.`
    );
  } else if (empty.length < ALLOWED_EMPTY_EVENTS) {
    console.log(
      `\n  RATCHET: down to ${empty.length} (allowed ${ALLOWED_EMPTY_EVENTS}). ` +
      `Lower ALLOWED_EMPTY_EVENTS in ${relative(ROOT, fileURLToPath(import.meta.url)).split(sep).join('/')} to ${empty.length} to lock the gain in.`
    );
  }
}

console.log('');
if (problems) {
  console.error(`[jsdoc-dialect] FAIL — ${problems} problem(s).`);
  process.exit(1);
}
console.log('[jsdoc-dialect] PASS — tag dialect only, no regression in empty event descriptions.');
