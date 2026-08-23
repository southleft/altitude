#!/usr/bin/env node
// Direct test for scripts/figma-parity/mark-synced.mjs's brand-layer fix
// (T7 follow-up, spec 2026-08-23-process-audit-and-dev-workflow-coherence).
//
// Before the fix, mark-synced.mjs looked every tag up via the BASE CEM only
// (`getComponent()` from cem.mjs), which meant:
//   * a tag a project's `brandLibrary` SUPERSEDES (al-header/al-footer for
//     southleft) got hashed from the base library's source, silently
//     stamping the wrong file's hash as "confirmed synced";
//   * a brand-only tag (al-hero, al-cta-band, ...) was rejected outright as
//     "not in the CEM", even though it is a real, roster-eligible component.
//
// This spawns the REAL CLI script against the tracked southleft manifest,
// with a throwaway Figma mapping injected for `al-header` (superseded) and
// `al-hero` (brand-only) so the unrelated "no Figma mapping" skip does not
// short-circuit the assertion. The manifest is backed up before mutating and
// restored in a `finally` — this test must never leave a tracked file changed.
//
// Not wired into libs/altitude-mcp/package.json `test` — run directly:
//   node --experimental-strip-types --no-warnings libs/altitude-mcp/test/mark-synced.mjs

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { resolveProject } from '../src/lib/ds-project.mjs';
import { resolveComponentRoster, hashComponentSource } from '../src/lib/parity.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const SCRIPT = join(REPO_ROOT, 'scripts', 'figma-parity', 'mark-synced.mjs');

let failures = 0;
function ok(cond, label) {
  if (cond) {
    console.log(`  ok — ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL — ${label}`);
  }
}

const project = resolveProject('southleft');
const manifestPath = project.resolved.parityManifest;
const original = readFileSync(manifestPath, 'utf8');

try {
  const manifest = JSON.parse(original);
  ok(!!manifest.components['al-header'], 'fixture: southleft manifest has al-header (base tag the brand supersedes)');
  ok(!!manifest.components['al-hero'], 'fixture: southleft manifest has al-hero (brand-only tag)');

  // Throwaway mapping — only unblocks the "no Figma mapping" skip so
  // mark-synced actually reaches the hashing logic under test.
  manifest.components['al-header'] = {
    ...manifest.components['al-header'],
    figma: { name: 'TEST FIXTURE — not a real Figma set', nodeId: null },
  };
  manifest.components['al-hero'] = {
    ...manifest.components['al-hero'],
    figma: { name: 'TEST FIXTURE — not a real Figma set', nodeId: null },
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  execFileSync(
    process.execPath,
    ['--experimental-strip-types', '--no-warnings', SCRIPT, '--project', 'southleft', 'al-header', 'al-hero'],
    { cwd: REPO_ROOT, stdio: 'pipe' }
  );

  const stamped = JSON.parse(readFileSync(manifestPath, 'utf8'));

  // Independently derive the expected hashes via the SAME roster mark-synced
  // now uses, so this test fails if either side's resolution ever disagrees.
  const { roster } = resolveComponentRoster(project);
  const byTag = new Map(roster.map((r) => [r.component.tag, r]));

  const headerRoster = byTag.get('al-header');
  ok(headerRoster?.origin === 'brand', 'al-header resolves to the brand layer in the roster (supersedes the base tag)');
  const expectedHeaderHash = hashComponentSource(headerRoster.component.modulePath, headerRoster.view);
  ok(
    stamped.components['al-header'].lastSync?.codeHash === expectedHeaderHash,
    'mark-synced stamped al-header with the BRAND source hash, not the base one'
  );
  ok(!!stamped.components['al-header'].lastSync?.contractDigest, 'al-header stamped with a contract digest too');

  const heroRoster = byTag.get('al-hero');
  ok(!!heroRoster, 'al-hero (brand-only) is present in the roster');
  ok(!!stamped.components['al-hero']?.lastSync, 'mark-synced stamped the brand-only tag al-hero instead of rejecting it');
  const expectedHeroHash = hashComponentSource(heroRoster.component.modulePath, heroRoster.view);
  ok(stamped.components['al-hero'].lastSync?.codeHash === expectedHeroHash, 'al-hero stamped with the brand source hash');
} finally {
  writeFileSync(manifestPath, original, 'utf8');
  const restored = readFileSync(manifestPath, 'utf8');
  ok(restored === original, 'tracked southleft manifest restored byte-for-byte after the test');
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
