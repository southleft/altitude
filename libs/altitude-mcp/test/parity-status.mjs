#!/usr/bin/env node
// Unit tests for the parity STATUS ENGINE (spec
// 2026-08-27-parity-system-audit-remediation, R6). Before this file, the
// functions that decide every status badge — assessEntry(), and computeParity()
// around it — had zero coverage; the only tested pieces of the parity family
// were contract-diff.mjs (diff-contracts --self-test) and check-figma-drift.
//
// Three groups:
//   1. assessEntry() — every reachable status, the driftBasis fallback ladder
//      (contract → source-hash → never-synced), and the observed/unobserved
//      distinction. Pure function, pure fixtures.
//   2. readManifest()/writeManifest() — the typed InvalidManifestError (path
//      named, not a bare SyntaxError) and the atomic, non-mutating write.
//      Runs against a throwaway fake project record in a temp dir.
//   3. computeParity() smoke — the REAL default project: report shape, summary
//      arithmetic, and the T11 guard (no contractHash stamped → no
//      contractHash/contractDrifted keys on the entry).
//
// Wired into libs/altitude-mcp/package.json `test`.

import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  STATUS,
  assessEntry,
  readManifest,
  writeManifest,
  InvalidManifestError,
  computeParity,
} from '../src/lib/parity.mjs';

let failures = 0;
function ok(cond, label) {
  if (cond) {
    console.log(`  ok — ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL — ${label}`);
  }
}

// ── 1. assessEntry ──────────────────────────────────────────────────────

console.log('assessEntry():');

const CURRENT = { codeHash: 'h-now', contractDigest: 'c-now', contractDiff: null };
const mapped = (over = {}) => ({ figma: { name: 'Button', nodeId: '1:1' }, ...over });

{
  const r = assessEntry({ excluded: true }, CURRENT);
  ok(r.status === STATUS.EXCLUDED && r.driftBasis === 'never-synced', 'excluded entry → excluded / never-synced');
}
{
  const r = assessEntry({}, CURRENT);
  ok(r.status === STATUS.MISSING_IN_FIGMA, 'no figma mapping → missing-in-figma');
}
{
  // contract digests present on both sides and equal, figma digest equal → in-sync.
  const r = assessEntry(
    mapped({ figmaCurrentDigest: 'f1', lastSync: { contractDigest: 'c-now', codeHash: 'other', figmaDigest: 'f1' } }),
    CURRENT,
  );
  ok(r.status === STATUS.IN_SYNC, 'contract match + figma match → in-sync');
  ok(r.driftBasis === 'contract', 'contract digest present on both sides decides (driftBasis=contract)');
  ok(r.figmaObserved === true, 'figmaCurrentDigest present → figmaObserved');
}
{
  // Contract digest disagrees — even though the byte hash agrees. The contract
  // is preferred exactly so a JSDoc-only edit (byte hash moves, contract
  // stays) or a surface change (contract moves) is judged on the surface.
  const r = assessEntry(
    mapped({ figmaCurrentDigest: 'f1', lastSync: { contractDigest: 'c-old', codeHash: 'h-now', figmaDigest: 'f1' } }),
    CURRENT,
  );
  ok(r.status === STATUS.CODE_DRIFT && r.driftBasis === 'contract', 'contract digest mismatch → code-drift, contract basis');
}
{
  // Pre-contract manifest entry: only codeHash stamped → source-hash fallback.
  const r = assessEntry(
    mapped({ figmaCurrentDigest: 'f1', lastSync: { codeHash: 'h-now', figmaDigest: 'f1' } }),
    CURRENT,
  );
  ok(r.status === STATUS.IN_SYNC && r.driftBasis === 'source-hash', 'codeHash-only lastSync → source-hash fallback');
}
{
  // Never stamped at all: "code is ahead", not "in sync".
  const r = assessEntry(mapped({ figmaCurrentDigest: 'f1' }), CURRENT);
  ok(r.status === STATUS.CODE_DRIFT && r.driftBasis === 'never-synced', 'never-synced entry reads as code-drift, not in-sync');
}
{
  // Figma digest moved since the stamp → figma-drift.
  const r = assessEntry(
    mapped({ figmaCurrentDigest: 'f2', lastSync: { contractDigest: 'c-now', figmaDigest: 'f1' } }),
    CURRENT,
  );
  ok(r.status === STATUS.FIGMA_DRIFT, 'figma digest moved → figma-drift');
}
{
  // Both sides moved → conflict.
  const r = assessEntry(
    mapped({ figmaCurrentDigest: 'f2', lastSync: { contractDigest: 'c-old', figmaDigest: 'f1' } }),
    CURRENT,
  );
  ok(r.status === STATUS.CONFLICT, 'both moved → conflict');
}
{
  // UNOBSERVED figma (figmaCurrentDigest null): figma-drift is unreachable —
  // the honesty rule. Same lastSync as the drift case above, but no observation.
  const r = assessEntry(
    mapped({ lastSync: { contractDigest: 'c-now', figmaDigest: 'f1' } }),
    CURRENT,
  );
  ok(r.status === STATUS.IN_SYNC && r.figmaObserved === false, 'unobserved figma cannot produce figma-drift');
}
{
  // A contract mismatch against the OBSERVED set counts as figma drift on its
  // own, even with the digest unchanged.
  const r = assessEntry(
    mapped({ figmaCurrentDigest: 'f1', lastSync: { contractDigest: 'c-now', figmaDigest: 'f1' } }),
    { ...CURRENT, contractDiff: { mismatches: [{ kind: 'option-count' }], matched: [], unmatchedFigmaProps: [] } },
  );
  ok(r.status === STATUS.FIGMA_DRIFT && r.contractMismatches === 1, 'contract mismatch alone → figma-drift');
}

// ── 2. manifest io ──────────────────────────────────────────────────────

console.log('readManifest()/writeManifest():');

const tmp = mkdtempSync(join(tmpdir(), 'al-parity-test-'));
const fakeProject = { id: 'test-fixture', resolved: { parityManifest: join(tmp, 'parity-manifest.json') } };

try {
  ok(readManifest(fakeProject) === null, 'missing manifest → null (not an error)');

  writeFileSync(fakeProject.resolved.parityManifest, '{ "components": { truncated', 'utf8');
  let threw = null;
  try {
    readManifest(fakeProject);
  } catch (e) {
    threw = e;
  }
  ok(threw instanceof InvalidManifestError, 'malformed manifest throws InvalidManifestError, not bare SyntaxError');
  ok(threw?.code === 'ERR_INVALID_PARITY_MANIFEST', 'error carries a stable code');
  ok(String(threw?.message).includes(fakeProject.resolved.parityManifest), 'error names the offending path');

  const input = { project: 'test-fixture', components: { 'al-x': { figma: null } } };
  const written = writeManifest(input, fakeProject);
  ok(!('updated' in input), 'writeManifest does not mutate its argument');
  ok(typeof written.updated === 'string', 'returned record carries the updated stamp');
  const onDisk = JSON.parse(readFileSync(fakeProject.resolved.parityManifest, 'utf8'));
  ok(onDisk.updated === written.updated && onDisk.components['al-x'].figma === null, 'written file round-trips');
  ok(!existsSync(`${fakeProject.resolved.parityManifest}.tmp-${process.pid}`), 'no temp file left behind (renamed over target)');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// ── 3. computeParity smoke (real default project) ───────────────────────

console.log('computeParity() smoke:');

const report = computeParity();
const statuses = new Set(Object.values(STATUS));
ok(report.components.length === report.scope.inScope, 'entries.length === scope.inScope');
ok(report.components.every((e) => statuses.has(e.status)), 'every entry status is in the STATUS vocabulary');
const total = Object.values(report.summary).reduce((a, b) => a + b, 0);
ok(total === report.components.length + report.figmaOnly.length, 'summary counts sum to entries + figmaOnly');
ok(report.components.every((e) => typeof e.aiPrompt === 'string' && e.aiPrompt.length > 0), 'every entry carries an aiPrompt');
ok(
  ['everObserved', 'mappedComponents', 'observedComponents', 'unreachableStatuses', 'driftBasis'].every((k) => k in report.observation),
  'observation (honesty block) present',
);
// T11 guard: an entry never stamped with a contract hash must carry NEITHER
// contractHash NOR contractDrifted — absence, not false.
ok(
  report.components.every((e) => (e.lastSync?.contractHash ? 'contractHash' in e : !('contractHash' in e) && !('contractDrifted' in e))),
  'contractHash/contractDrifted appear iff lastSync stamped one (T11 guard)',
);

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nall parity-status tests passed');
