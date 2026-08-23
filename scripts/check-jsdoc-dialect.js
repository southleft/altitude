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
 *   2. EMPTY EVENT DESCRIPTIONS (fatal). Every event in the CEM must carry a
 *      description. This started as a ratchet at 53/54; T2 documented every
 *      dispatch site, so it is now a hard assertion at zero.
 *
 *   3. DUPLICATE CEM ENTRIES (fatal). cem-plugins/al-conventions.mjs used to
 *      concatenate its parsed tags onto whatever the analyzer had already found,
 *      which silently doubled every event (54 -> 107) the moment components
 *      gained real `@event` tags. It now merges by name; this gate makes a
 *      regression loud instead of invisible.
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
 * CEM events allowed to carry an empty description.
 *
 * This began as a high-water mark of 53 (of 54) because failing outright would
 * have blocked every PR. T2 documented every dispatch site, so it is now a plain
 * assertion: zero. Do not raise it — document the event at its dispatch site.
 */
const ALLOWED_EMPTY_EVENTS = 0;

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
  fail('NO-CEM', 'custom-elements.json not found — run `pnpm --filter @southleft/al-web-components build:custom-elements.json`');
} else {
  const cem = JSON.parse(readFileSync(CEM, 'utf8'));
  let total = 0;
  const empty = [];
  const dupes = [];
  for (const mod of cem.modules || []) {
    for (const dec of mod.declarations || []) {
      const tag = dec.tagName || dec.name;
      const seen = new Map();
      for (const ev of dec.events || []) {
        total++;
        if (!(ev.description || '').trim()) empty.push(`${tag}#${ev.name}`);
        seen.set(ev.name, (seen.get(ev.name) || 0) + 1);
      }
      for (const [name, n] of seen) if (n > 1) dupes.push(`${tag}#${name} x${n}`);
      // Slots/parts/properties go through the same merge path — check them too.
      for (const [kind, list] of [['slot', dec.slots], ['cssPart', dec.cssParts], ['cssProperty', dec.cssProperties]]) {
        const s2 = new Map();
        for (const item of list || []) s2.set(item.name, (s2.get(item.name) || 0) + 1);
        for (const [name, n] of s2) if (n > 1) dupes.push(`${tag} ${kind} "${name}" x${n}`);
      }
    }
  }
  for (const d of dupes) fail('DUPLICATE-CEM-ENTRY', d);
  if (dupes.length) {
    console.error('  ^ cem-plugins/al-conventions.mjs must merge by name, not concatenate.');
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
