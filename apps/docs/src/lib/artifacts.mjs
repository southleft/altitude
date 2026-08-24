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
import { TOKEN_COUNT, TOKENS, resolve } from './tokens.mjs';
import { parityForProject, totalsForProject, PARITY_FAILURES } from './parity.mjs';
import { A11Y_REPORT, a11yFor } from './a11y.mjs';
import { TOKEN_CONVENTIONS, TOKENS_DIGEST, DO_NOT_INVENT, allDoNotFlag } from './digests.mjs';
import {
  overviewMarkdown,
  foundationsMarkdown,
  motionMarkdown,
  componentsIndexMarkdown,
  componentMarkdown,
} from './markdown.mjs';
import { CHOREOGRAPHY_COUNT, MOTION_TOKEN_COUNT, PRESET_COUNT } from './motion.mjs';

/* ------------------------------------------------------- prescriptive rules */

/**
 * THE RULES BLOCK — the same text at the head of every machine artifact.
 *
 * Written in the imperative, after Atlassian's llms.txt ("You must ONLY use
 * tokens listed in this document, do not make up values"). The reason it is
 * phrased that way rather than as description: an agent reading a DESCRIPTIVE
 * token table treats it as a sample and interpolates. Every rule below names a
 * failure mode that has a gate or a digest entry behind it, and cites where the
 * enforcement lives, so a reader can check the claim instead of trusting it.
 *
 * Rule 2's silent-fallback claim is the one that matters most and the one that
 * is least obvious: an unknown `--al-*` name is not an error in CSS. It resolves
 * to the inherited value or to the declaration's fallback, so a hallucinated
 * token produces a page that renders — wrong, and quietly. The repo-side gate
 * for exactly that is `scripts/check-token-usage.mjs --fail-on-phantom`.
 */
function rulesBlock(context, { self }) {
  const { site, project, registry } = context;
  const url = site.url;
  return `## Rules

You MUST follow these when generating code that uses this design system. They
are not style preferences — each names a failure mode observed in generated
code, and each is machine-checkable.

1. You must ONLY use the design tokens listed in ${url}/llms-tokens.txt. Do not
   make up values. A raw hex code, a px length, a font stack or a shadow written
   literally into a rule a token already covers is WRONG even when the rendered
   result is identical — it sits outside the design system's control and will
   not follow a brand, a mode, a density or a contrast setting.
2. You must ONLY use CSS custom property names that appear in that same file.
   An unknown \`--al-*\` name is NOT an error: CSS resolves it to the inherited
   value or to the declaration's fallback, so an invented token produces a page
   that renders and is silently wrong. There are ${TOKEN_COUNT} real ones.
3. You must not invent an element, attribute, slot, event, CSS part or method.
   Every one this system has is listed in ${url}/llms-components.txt, generated
   from \`libs/al-web-components/custom-elements.json\`. If it is not there, it
   does not exist.
4. You must render components inside \`<al-theme brand="${project.brand}">\`.
   Tokens are set on that host, not on \`:root\` — a component outside it falls
   back to the base bundle and loses this brand.
5. You must set the arrangement of sibling components with \`<al-layout>\` and
   its props, not with hand-rolled flex or grid on a wrapper of your own, and
   not by inventing a \`*-group\` wrapper. The groups that exist
   (\`al-checkbox-group\`, \`al-radio-group\`, \`al-toggle-button-group\`) exist
   for their SEMANTICS — fieldset/legend, roving keyboard selection,
   single-select state — not for their spacing.
6. You must register the elements by the path that matches what you are
   building, and must not mix two paths in one document:
   plain HTML / Astro / Svelte / Angular — set \`window.alAutoRegistry = true\`
   in an inline \`<script>\` in \`<head>\`, BEFORE any module script (ESM imports
   hoist, so setting it from application JS is too late);
   React — import the wrappers from the React package and set no flag;
   micro-frontends — call \`registerAltitude({ mode: 'versioned', suffix })\`.
7. You must not treat a missing accessibility result as a pass.
   ${url}/llms-a11y.txt states, per component, which rows were machine-measured
   and which were never recorded.
${
  registry.scope.scoped
    ? `8. You must not use a component absent from this system's list. ${site.fullName}
   documents a DECLARED SUBSET (${registry.count} components) of a larger shared
   library. A component missing from ${url}/llms-components.txt exists in the
   library but is not part of this system.`
    : `8. Other design systems are built on this same component library under their
   own brands and document a subset of it. This one documents the whole library.`
}

### Names that do not exist — do not write these

${
  DO_NOT_INVENT.length
    ? `Read from \`${TOKENS_DIGEST.artifact}\`. Each has been observed being invented
because it looks like it should exist.

${DO_NOT_INVENT.map((name) => `- \`${name}\``).join('\n')}`
    : TOKENS_DIGEST.reason
}

### Do not "fix" these — they are correct

${
  allDoNotFlag().length
    ? allDoNotFlag()
        .map(
          ({ tag, rules }) =>
            `- \`<${tag}>\` — ${rules
              .map((rule) => `${rule.rule.replace(/\s+/g, ' ')} (${rule.citation})`)
              .join(' ')}`,
        )
        .join('\n')
    : '_The CEM digest declares no sanctioned patterns in this checkout._'
}

## The machine artifacts

- [Map](${url}/llms.txt): the rules, the counts, and the component index.
- [Tokens](${url}/llms-tokens.txt): every token name and its resolved value.
- [Components](${url}/llms-components.txt): every element's full API.
- [Accessibility](${url}/llms-a11y.txt): the measured axe results, per component.
- [Everything](${url}/llms-full.txt): all of the above, concatenated.

Every page of this site is also served as Markdown at the same URL plus \`.md\`
(e.g. ${url}/components/button.md).${self ? `\n\nYou are reading ${self}.` : ''}`;
}

/** https://llmstxt.org — the structured map of one project's site. */
export function llmsTxt(context) {
  const { site, registry, project } = context;
  const url = site.url;

  const line = (component) =>
    `- [${component.name}](${url}/components/${component.slug}): \`<${component.tag}>\`` +
    `${component.react ? ` / \`<${component.react}>\`` : ''} — ` +
    `${component.props.length} props, ${component.slots.length} slots, ${component.events.length} events` +
    `${component.summary ? `. ${component.summary}` : ''}`;

  // Three cases, not two. A site is scoped, or it is the default whole-library
  // site, or — since `docs.components: "all"` split docs scope from library
  // scope — it is a BRANDED whole-library site: every component in the shared
  // library, documented under this system's brand and with its brand layer
  // leading wherever it supersedes a base component. Saying "this is the
  // whole-library site" there would be wrong twice: there is more than one now,
  // and the sentence that followed claimed every other system documents a
  // subset.
  const scopeNote = registry.scope.scoped
    ? `This design system documents a DECLARED SUBSET of that shared library — the
${registry.count} components it ships, listed as \`library.components\` in
\`.altitude/ds-projects.json\` and re-derived from its own site's source by a CI
gate. A component absent from this map exists in the library and is documented
on the whole-library site; it is not part of this system.`
    : project.isDefault
      ? `This site documents the whole shared library. Other design systems are built
on the same components, each under its own brand.`
      : `This site documents the whole shared library under the ${project.shortName}
brand: the same ${registry.count} components, rendered with this system's tokens.
Where ${project.shortName} ships its own implementation of a component, that is
the one documented here — the brand layer supersedes the base component rather
than sitting alongside it.`;

  return `# ${site.title}

> ${site.description}

This documentation site is generated from the library itself: the component
list, the atomic taxonomy, the counts and every props table are read at build
time from \`libs/al-web-components/custom-elements.json\`, and the Foundations
page is read from the published token layer. Nothing component-shaped on this
site is hand-maintained, so it cannot drift from the code.

${scopeNote}

${rulesBlock(context, { self: `${url}/llms.txt` })}

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
- [Motion](${url}/motion): the ${MOTION_TOKEN_COUNT} motion tokens, the \`<al-theme motion>\` axis matrix, and the ${CHOREOGRAPHY_COUNT} choreography tokens over ${PRESET_COUNT} keyframe presets
- [Components](${url}/components): the full index, filterable

${registry.tiers
  .map(
    (tier) => `## ${tier.label.charAt(0)}${tier.label.slice(1).toLowerCase()} (${tier.count})

${tier.components.map(line).join('\n')}`,
  )
  .join('\n\n')}
`;
}

/* ------------------------------------------------------------ topic splits */

/**
 * `llms-tokens.txt` — the closed set of token names, with resolved values.
 *
 * Atlassian's llms.txt carries 172 token rows under a "do not make up values"
 * instruction; this carries every name the pipeline emits, read from the built
 * token layer (`tokens.mjs` → the published `tokens.json`) rather than
 * transcribed. The naming CONVENTIONS above the table come from the committed
 * token digest, the only place the role/suffix matrix and the do-not-invent list
 * are written down.
 *
 * Families are DERIVED by splitting names, never listed — a new token family
 * appears here the build after it is emitted.
 */
export function llmsTokens(context) {
  const { site } = context;
  const url = site.url;

  const families = new Map();
  for (const [key, raw] of Object.entries(TOKENS)) {
    // `al-theme-color-content-primary-strong` → `al-theme-color-content`. Four
    // segments is the level at which groups read the way a designer names them
    // (one group per role ramp), and it degrades correctly for the short names
    // (`al-space-4` → `al-space`).
    const parts = key.split('-');
    const family = parts.slice(0, Math.min(4, Math.max(2, parts.length - 1))).join('-');
    if (!families.has(family)) families.set(family, []);
    families.get(family).push({ key, raw, value: resolve(raw) });
  }

  const matrix = (label, byRole) =>
    byRole
      ? [
          `### ${label}`,
          '',
          '| Role | Suffixes that exist |',
          '| --- | --- |',
          ...Object.entries(byRole).map(
            ([role, suffixes]) => `| \`${role}\` | ${suffixes.map((x) => `\`${x}\``).join(', ')} |`,
          ),
          '',
        ]
      : [];

  return [
    `# ${site.title} — design tokens`,
    '',
    `The COMPLETE set: ${TOKEN_COUNT} tokens in ${families.size} families, read at build`,
    'time from the token layer this design system publishes (emitted by Style',
    'Dictionary v5 from the DTCG sources in `styles/tokens-dtcg/`). Nothing below is',
    'transcribed by hand.',
    '',
    'You must ONLY use tokens listed in this document. Do not make up values, and do',
    'not invent names that merely follow the pattern — the set is closed. Write them',
    'as `var(--al-…)`; the value column is for choosing between tokens, never for',
    'pasting.',
    '',
    rulesBlock(context, { self: `${url}/llms-tokens.txt` }),
    '',
    '## Naming conventions',
    '',
    ...(TOKEN_CONVENTIONS
      ? [
          `- CSS variable prefix: \`${TOKEN_CONVENTIONS.cssVariablePrefix}\``,
          `- Semantic layer: ${TOKEN_CONVENTIONS.themeTokensPrefix}`,
          `- Primitive layer: ${TOKEN_CONVENTIONS.primitiveTokensPrefix}`,
          `- Font sizes: ${TOKEN_CONVENTIONS.fontSizeNamingScheme}`,
          `- Font weights: ${TOKEN_CONVENTIONS.fontWeights}`,
          '',
          'The colour families are not free-form: a role has the suffixes listed here and',
          'no others. A name built by pairing a role with a suffix from another row does',
          'not exist.',
          '',
          ...matrix(
            'Content colours — `--al-theme-color-content-<role>[-<suffix>]`',
            TOKEN_CONVENTIONS.contentColorSuffixesByRole,
          ),
          ...matrix(
            'Background colours — `--al-theme-color-background-<role>[-<suffix>]`',
            TOKEN_CONVENTIONS.backgroundColorSuffixesByRole,
          ),
          ...matrix(
            'Border colours — `--al-theme-color-border-<role>[-<suffix>]`',
            TOKEN_CONVENTIONS.borderColorSuffixesByRole,
          ),
        ]
      : [TOKENS_DIGEST.reason, '']),
    '## Every token',
    '',
    ...[...families.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([family, tokens]) => [
        `### \`--${family}-*\` (${tokens.length})`,
        '',
        '| Token | Value | Declared as |',
        '| --- | --- | --- |',
        ...tokens
          .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }))
          .map((t) => `| \`--${t.key}\` | ${t.value} | ${t.raw === t.value ? '—' : `\`${t.raw}\``} |`),
        '',
      ]),
  ].join('\n');
}

/**
 * `llms-components.txt` — every element's complete API.
 *
 * The bodies are `componentMarkdown()`, the exact renderer behind each component
 * page and each `.md` URL, so this file cannot say something a page does not.
 */
export function llmsComponents(context) {
  const { site, registry } = context;
  return [
    `# ${site.title} — components`,
    '',
    `The COMPLETE API of all ${registry.count} components, generated from`,
    '`libs/al-web-components/custom-elements.json`. Every attribute, slot, event, CSS',
    'part, CSS custom property and public method this system has is below.',
    '',
    'You must ONLY use the elements, attributes, slots and events listed here. An',
    "attribute missing from a component's table is not a typo away from working — it",
    'does nothing, and an unknown element renders as an inert unknown tag rather than',
    'failing loudly.',
    '',
    rulesBlock(context, { self: `${site.url}/llms-components.txt` }),
    '',
    componentsIndexMarkdown(context),
    '',
    ...registry.components.map((component) => `${componentMarkdown(component, context)}\n---\n`),
  ].join('\n');
}

/**
 * `llms-a11y.txt` — the measured accessibility position, per component.
 *
 * Read through `a11y.mjs`, which is also what the docs panels render, and which
 * refuses to blur MEASURED and NOT RECORDED: a component with no recorded
 * screen-reader pass says so, and an absent report is reported as absent rather
 * than as a clean bill of health.
 */
export function llmsA11y(context) {
  const { site, registry } = context;
  const lines = [
    `# ${site.title} — accessibility`,
    '',
    'What has actually been MEASURED, and what has not. Two of the four rows per',
    'component come from axe-core run against a static Storybook build; two need a',
    'human, and read NOT RECORDED when no human has recorded one.',
    '',
    'You must not read a missing result as a pass, and you must not generate a claim',
    'that a component is accessible from this file — it reports the state of the',
    'measurements, not a certification.',
    '',
    rulesBlock(context, { self: `${site.url}/llms-a11y.txt` }),
    '',
  ];

  if (!A11Y_REPORT.available) {
    lines.push('## Not measured', '', A11Y_REPORT.reason, '', 'Regenerate with:', '', '```sh', A11Y_REPORT.command ?? '', '```', '');
    return lines.join('\n');
  }

  lines.push(
    '## The run',
    '',
    `- Generated: ${A11Y_REPORT.generated}`,
    `- axe-core: ${A11Y_REPORT.source.axeVersion}`,
    `- Rule tags: ${A11Y_REPORT.source.axeTags.join(', ')}`,
    `- Reported but excluded from the CI gate: ${A11Y_REPORT.source.gateExcludes.join(', ') || 'none'}`,
    `- Stories measured: ${A11Y_REPORT.totals.stories}, errored: ${A11Y_REPORT.totals.storiesErrored}`,
    `- Components measured: ${A11Y_REPORT.totals.componentsMeasured}, clean: ${A11Y_REPORT.totals.componentsClean}`,
    `- Structural violations: ${A11Y_REPORT.totals.structuralViolations}; contrast violations: ${A11Y_REPORT.totals.contrastViolations}`,
    `- Artifact: \`${A11Y_REPORT.artifact}\``,
    '',
    '## Per component',
    '',
  );

  for (const component of registry.components) {
    const checks = a11yFor(component.slug);
    lines.push(`### \`<${component.tag}>\``, '');
    if (!checks.measured) {
      lines.push(`NOT MEASURED — ${checks.reason}`, '');
      continue;
    }
    lines.push(
      '| Row | State | Evidence | Detail |',
      '| --- | --- | --- | --- |',
      ...checks.rows.map(
        (row) =>
          `| ${row.label} | ${row.state.toUpperCase()} | ${row.evidence} | ${String(row.detail ?? '—').replace(/\|/g, '\\|')} |`,
      ),
      '',
    );
    const violations = [...checks.violations, ...checks.contrastViolations];
    if (violations.length) {
      lines.push(
        `Open violations (${violations.length}):`,
        '',
        ...violations.map((v) => `- \`${v.id}\` on ${v.nodes} node${v.nodes === 1 ? '' : 's'}`),
        '',
      );
    }
  }

  return lines.join('\n');
}

/**
 * `llms-full.txt` — every artifact concatenated, in reading order.
 *
 * The splits each repeat the rules because each is also fetched on its own, and
 * an agent that fetched only `llms-tokens.txt` must still be told not to invent
 * names.
 */
export function llmsFull(context) {
  return [
    llmsTxt(context),
    llmsTokens(context),
    llmsComponents(context),
    llmsA11y(context),
    overviewMarkdown(context),
    foundationsMarkdown(context),
    motionMarkdown(context),
  ].join('\n\n---\n\n');
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
