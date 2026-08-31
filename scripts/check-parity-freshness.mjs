#!/usr/bin/env node
/**
 * check-parity-freshness.mjs — is the Figma side of parity being READ, and how
 * recently?
 *
 * `pnpm run parity:projects` (scripts/figma-parity/list-projects.mjs) answers
 * "what's what" — the current in-sync/code-drift/... counts. It does not say
 * whether those counts could ever have included `figma-drift` or `conflict` at
 * all. A manifest whose `figmaLastRefreshed` is `null` reports "0 figma-drift"
 * for the same reason a scale with dead batteries reports "0 lbs" — the
 * absence of a positive reading is not evidence of a negative one. This script
 * makes THAT distinction visible on its own, so it can be watched over time
 * (a manifest 40 days stale) rather than only spotted per-component in the
 * engine's `observation` block (see `.altitude-mcp/src/lib/parity.mjs:423-443`
 * for where these fields come from — read-only from here).
 *
 * Per project (from `.altitude/ds-projects.json`, every registered design
 * system) this prints:
 *   - figmaLastRefreshed, and its age in days ("never" if null)
 *   - everObserved (has the Figma side EVER been read, even once)
 *   - unreachableStatuses (statuses that cannot occur while unobserved —
 *     currently figma-drift, conflict)
 *   - how many mapped components are relying on a source-hash fallback rather
 *     than a contract diff (driftBasis['source-hash'])
 *
 * Exit code: 0 by default — this is a WARNING surface, meant for a CI step
 * that reports without blocking a merge. Pass `--max-age-days N` to turn it
 * into a gate: exits 1 if any project is stale beyond N days OR has never been
 * observed at all (never-observed is treated as maximally stale, not as 0).
 *
 * Usage:
 *   node scripts/check-parity-freshness.mjs                    # pnpm run parity:freshness
 *   node scripts/check-parity-freshness.mjs --json
 *   node scripts/check-parity-freshness.mjs --max-age-days 30   # gate mode
 */
import { listProjectIds, resolveProject } from '../libs/altitude-mcp/src/lib/ds-project.mjs';
import { computeParity } from '../libs/altitude-mcp/src/lib/parity.mjs';

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const maxAgeIdx = argv.indexOf('--max-age-days');
const maxAgeDays = maxAgeIdx !== -1 && argv[maxAgeIdx + 1] !== undefined ? Number(argv[maxAgeIdx + 1]) : null;
if (maxAgeIdx !== -1 && (maxAgeDays === null || Number.isNaN(maxAgeDays) || maxAgeDays < 0)) {
  console.error('check-parity-freshness: --max-age-days requires a non-negative number');
  process.exit(2);
}

const now = Date.now();
const rows = [];

for (const id of listProjectIds()) {
  const project = resolveProject(id);
  let report = null;
  let error = null;
  try {
    report = computeParity(project);
  } catch (err) {
    error = String(err?.message ?? err);
  }

  if (error) {
    rows.push({ id: project.id, name: project.name, error, stale: true, everObserved: false });
    continue;
  }

  const obs = report.observation;
  const refreshed = obs.figmaLastRefreshed ?? report.figmaLastRefreshed ?? null;
  const ageDays = refreshed ? (now - new Date(refreshed).getTime()) / 86_400_000 : null;
  const sourceHashFallbackCount = obs.driftBasis?.['source-hash'] ?? 0;
  const stale = maxAgeDays !== null && (ageDays === null || ageDays > maxAgeDays);

  rows.push({
    id: project.id,
    name: project.name,
    error: null,
    figmaLastRefreshed: refreshed,
    ageDays: ageDays === null ? null : Math.round(ageDays * 10) / 10,
    everObserved: obs.everObserved,
    unreachableStatuses: obs.unreachableStatuses,
    mappedComponents: obs.mappedComponents,
    observedComponents: obs.observedComponents,
    sourceHashFallbackCount,
    refreshCommand: obs.refreshCommand,
    stale,
  });
}

const anyStale = rows.some((r) => r.stale);

if (asJson) {
  console.log(JSON.stringify({ maxAgeDays, generated: new Date(now).toISOString(), projects: rows }, null, 2));
} else {
  console.log('Parity freshness — is the Figma side actually being read?\n');
  for (const r of rows) {
    console.log(`${r.id}${resolveProject(r.id).isDefault ? '  (default)' : ''}`);
    if (r.error) {
      console.log(`  ERROR  ${r.error}`);
      console.log('');
      continue;
    }
    const ageLabel = r.figmaLastRefreshed
      ? `${r.ageDays}d ago (${r.figmaLastRefreshed})`
      : 'NEVER';
    const staleFlag = maxAgeDays !== null && r.stale ? '  [STALE]' : '';
    console.log(`  figmaLastRefreshed   ${ageLabel}${staleFlag}`);
    console.log(`  everObserved         ${r.everObserved}`);
    console.log(
      `  unreachableStatuses  ${r.unreachableStatuses.length ? r.unreachableStatuses.join(', ') : '(none — Figma has been read)'}`,
    );
    console.log(`  mapped/observed      ${r.observedComponents}/${r.mappedComponents} components`);
    console.log(`  source-hash fallback ${r.sourceHashFallbackCount} component(s) (no contract diff — byte hash only)`);
    if (!r.everObserved || (maxAgeDays !== null && r.stale)) {
      console.log(`  -> run: ${r.refreshCommand}`);
    }
    console.log('');
  }
  if (maxAgeDays !== null) {
    console.log(
      anyStale
        ? `STALE: one or more projects exceed --max-age-days ${maxAgeDays} (or have never been observed).`
        : `OK: all projects observed within the last ${maxAgeDays} day(s).`,
    );
  } else {
    console.log('(no --max-age-days given — this run is report-only and always exits 0)');
  }
}

process.exit(maxAgeDays !== null && anyStale ? 1 : 0);
