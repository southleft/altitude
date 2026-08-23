/**
 * `/docs/status.json` — the status panels as a machine artifact.
 *
 * The docs site already emits `llms.txt` and per-page `.md` for agents that
 * read prose. This is the same idea for the numbers: one static file carrying
 * every per-component parity status and accessibility result the site renders,
 * from the same build-time sources, so an agent never has to scrape a page or
 * re-derive a status.
 *
 * WHY IT IS WORTH SHIPPING. `altitude_check_parity` (libs/altitude-mcp) can
 * already answer "is this component in sync with Figma", but only for someone
 * running this repo's MCP server locally. Nothing on the public web reports
 * design↔code drift for a design system. This file makes that answer fetchable
 * without any of it — and, being generated at build time from the parity
 * manifests and the axe report, it cannot disagree with the pages beside it.
 *
 * It carries the PUBLIC projection (`publicParityReport`), so it is subject to
 * the same no-internal-geometry rule the pages are, enforced by
 * `apps/docs/scripts/check-status-panels.mjs`.
 */
import { COMPONENTS } from '../lib/registry.mjs';
import { PARITY_PROJECTS, PARITY_FAILURES, PARITY_TOTALS, parityFor } from '../lib/parity.mjs';
import { A11Y_REPORT, a11yFor } from '../lib/a11y.mjs';
import { SITE } from '../lib/site.mjs';

export async function GET() {
  const body = {
    $comment:
      'Generated at build time by apps/docs/src/pages/status.json.ts from the Figma parity manifests and the axe report. Every value here is rendered on the corresponding component page; neither is hand-maintained.',
    site: SITE.url,
    generated: new Date().toISOString(),
    parity: {
      available: PARITY_PROJECTS.length > 0,
      failures: PARITY_FAILURES,
      projects: PARITY_TOTALS,
    },
    accessibility: A11Y_REPORT.available
      ? {
          available: true,
          generated: A11Y_REPORT.generated,
          axeVersion: A11Y_REPORT.source.axeVersion,
          axeTags: A11Y_REPORT.source.axeTags,
          gateExcludes: A11Y_REPORT.source.gateExcludes,
          totals: A11Y_REPORT.totals,
        }
      : { available: false, reason: A11Y_REPORT.reason },
    components: COMPONENTS.map((component) => {
      const checks = a11yFor(component.slug);
      return {
        tag: component.tag,
        slug: component.slug,
        tier: component.tier,
        status: component.status ?? null,
        docs: `${SITE.url}/docs/components/${component.slug}`,
        parity: parityFor(component.tag).map((row) => ({
          project: row.project,
          status: row.status,
          driftBasis: row.driftBasis,
          figmaObserved: row.figmaObserved,
          figmaSetName: row.figmaSetName,
          lastSyncDate: row.lastSyncDate,
          contractMismatches: row.contractDiff?.mismatches.length ?? null,
        })),
        accessibility: checks.measured
          ? {
              measured: true,
              storyCount: checks.storyCount,
              unmeasuredStories: checks.errored.map((e) => e.id),
              structuralViolations: checks.violations.map((v) => ({ rule: v.id, nodes: v.nodes })),
              contrastViolations: checks.contrastViolations.map((v) => ({ rule: v.id, nodes: v.nodes })),
              rows: checks.rows.map((row) => ({ id: row.id, state: row.state, evidence: row.evidence })),
            }
          : { measured: false, reason: checks.reason },
      };
    }),
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
