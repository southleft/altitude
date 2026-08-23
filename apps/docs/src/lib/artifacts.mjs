/**
 * The MACHINE artifacts, per design system.
 *
 * `llms.txt` (the map) and `status.json` (the numbers) are the two files an
 * agent reads instead of scraping the pages. Both are built from the same
 * context the HTML pages render — one project, its scoped registry, its parity
 * rows — so the artifact and the page cannot describe different systems, and a
 * new project in `.altitude/ds-projects.json` gets both without a serializer
 * being written for it.
 */
import { TOKEN_COUNT } from './tokens.mjs';
import { parityForProject, totalsForProject, PARITY_FAILURES } from './parity.mjs';
import { A11Y_REPORT, a11yFor } from './a11y.mjs';

/** https://llmstxt.org — the structured map of one project's site. */
export function llmsTxt(context) {
  const { site, registry, project } = context;
  const url = site.url;

  const line = (component) =>
    `- [${component.name}](${url}/components/${component.slug}): \`<${component.tag}>\`` +
    `${component.react ? ` / \`<${component.react}>\`` : ''} — ` +
    `${component.props.length} props, ${component.slots.length} slots, ${component.events.length} events` +
    `${component.summary ? `. ${component.summary}` : ''}`;

  const scopeNote = registry.scope.scoped
    ? `This design system documents a DECLARED SUBSET of that shared library — the
${registry.count} components it ships, listed as \`library.components\` in
\`.altitude/ds-projects.json\` and re-derived from its own site's source by a CI
gate. A component absent from this map exists in the library and is documented
on the whole-library site; it is not part of this system.`
    : `This is the whole-library site. Other design systems are built on the same
components and document a subset of them, each under its own brand.`;

  return `# ${site.title}

> ${site.description}

This documentation site is generated from the library itself: the component
list, the atomic taxonomy, the counts and every props table are read at build
time from \`libs/al-web-components/custom-elements.json\`, and the Foundations
page is read from the published token layer. Nothing component-shaped on this
site is hand-maintained, so it cannot drift from the code.

${scopeNote}

## Facts

- Components documented: ${registry.count}
- Brand: \`<al-theme brand="${project.brand}">\`
- Icon glyphs (payloads of \`<al-icon>\`, not components): ${registry.stats.icons}
- Custom elements declared in the manifest: ${registry.stats.cemTags}
- Documented properties: ${registry.stats.documentedProps} of ${registry.stats.totalProps}
- Components with a React wrapper: ${registry.stats.withReact}
- Design tokens: ${TOKEN_COUNT}
- Runtime: Lit 3.3 web components; React 19 wrappers via @lit/react

## Pages

- [Overview](${url}/): what this design system is, in numbers
- [Foundations](${url}/foundations): color ramps, type presets, spacing, radius, elevation — read from the token layer, plus what this brand redeclares
- [Components](${url}/components): the full index, filterable

${registry.tiers
  .map(
    (tier) => `## ${tier.label.charAt(0)}${tier.label.slice(1).toLowerCase()} (${tier.count})

${tier.components.map(line).join('\n')}`,
  )
  .join('\n\n')}
`;
}

/**
 * `status.json` — the status panels as a machine artifact, for one project.
 *
 * Carries the PUBLIC projection of the parity report (`publicParityReport`), so
 * it is subject to the same no-internal-geometry rule the pages are, enforced
 * on the BUILT output by `apps/docs/scripts/check-status-panels.mjs`.
 */
export function statusJson(context) {
  const { site, registry, project } = context;
  return {
    $comment:
      'Generated at build time by apps/docs/src/lib/artifacts.mjs from the Figma parity manifests and the axe report. Every value here is rendered on the corresponding component page; neither is hand-maintained.',
    site: site.url,
    project: {
      id: project.id,
      name: project.name,
      brand: project.brand,
      scoped: registry.scope.scoped,
    },
    generated: new Date().toISOString(),
    parity: {
      available: totalsForProject(project).length > 0,
      failures: PARITY_FAILURES,
      projects: totalsForProject(project),
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
    components: registry.components.map((component) => {
      const checks = a11yFor(component.slug);
      return {
        tag: component.tag,
        slug: component.slug,
        tier: component.tier,
        status: component.status ?? null,
        docs: `${site.url}/components/${component.slug}`,
        parity: parityForProject(component.tag, project).map((row) => ({
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
              contrastViolations: checks.contrastViolations.map((v) => ({
                rule: v.id,
                nodes: v.nodes,
              })),
              rows: checks.rows.map((row) => ({ id: row.id, state: row.state, evidence: row.evidence })),
            }
          : { measured: false, reason: checks.reason },
      };
    }),
  };
}
