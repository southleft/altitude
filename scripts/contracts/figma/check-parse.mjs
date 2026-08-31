#!/usr/bin/env node
/**
 * check-parse.mjs — trap-3 lint (spec 2026-08-28-snippet-capture-code-to-figma).
 *
 * A stray BACKTICK inside the String.raw plugin-code templates — even in a
 * comment — terminates the template and produces a SyntaxError pointing at
 * an innocent identifier. It bit three separate times in one day (the
 * altitude-figma-generate skill's trap 3, twice while writing comments ABOUT
 * CSS). Importing every generator module forces a full parse, so the mistake
 * fails HERE, in one second, instead of mid-generation.
 *
 *   node scripts/contracts/figma/check-parse.mjs
 */
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
let failed = 0;
for (const f of readdirSync(HERE).filter((x) => x.endsWith('.mjs') && x !== 'check-parse.mjs').sort()) {
  try {
    await import(pathToFileURL(join(HERE, f)).href);
    console.log(`[check-parse] ok   ${f}`);
  } catch (e) {
    failed += 1;
    console.error(`[check-parse] FAIL ${f}: ${String(e.message).split('\n')[0]}`);
  }
}
if (failed) { console.error(`[check-parse] ${failed} module(s) failed to parse/import.`); process.exit(1); }
console.log('[check-parse] all generator modules parse clean.');
