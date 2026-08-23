/**
 * Markdown renderings of the generated pages.
 *
 * Every renderer takes a design-system CONTEXT (`context.mjs` — one project,
 * its scoped registry, its site copy and its href builder) and defaults to the
 * site at the root, so Southleft's Markdown describes Southleft's 21 components
 * under Southleft's name without a second set of renderers existing.
 *
 * Every docs page is also served as Markdown at the same URL plus `.md`
 * (`/docs/components/button` → `/docs/components/button.md`), and the same
 * renderers feed the machine artifacts in `artifacts.mjs` (`llms-full.txt` and
 * `llms-components.txt`). Both read the registry, so the Markdown an
 * agent fetches and the HTML a human reads are the same facts rendered twice —
 * there is no second copy of the content to drift.
 */
import { TOKEN_COUNT, colorRamps, spacingScale, radiusScale, typeScale, brandOverrides } from './tokens.mjs';
import { DEFAULT_CONTEXT } from './context.mjs';

const table = (headers, rows) =>
  rows.length
    ? [
        `| ${headers.join(' | ')} |`,
        `| ${headers.map(() => '---').join(' | ')} |`,
        ...rows.map((cells) => `| ${cells.map((c) => String(c).replace(/\|/g, '\\|')).join(' | ')} |`),
      ].join('\n')
    : '_None declared in the manifest._';

/** One component, as Markdown. */
export function componentMarkdown(component, context = DEFAULT_CONTEXT) {
  const lines = [
    `# ${component.name}`,
    '',
    `In ${context.site.fullName}, rendered under \`<al-theme brand="${context.project.brand}">\`.`,
    '',
    `\`<${component.tag}>\`${component.react ? ` · React: \`<${component.react}>\`` : ''}${
      component.status ? ` · status: ${component.status}` : ''
    } · tier: ${component.tier}`,
    '',
    component.summary ||
      `Generated from the custom elements manifest: ${component.props.length} properties, ${component.slots.length} slots, ${component.events.length} events.`,
    '',
    '## Install',
    '',
    '```js',
    `import '${component.importPath}';`,
    ...(component.react ? [`import { ${component.react} } from '@southleft/al-react';`] : []),
    '```',
    '',
    '## Properties',
    '',
    table(
      ['Prop', 'Type', 'Default', 'Description'],
      component.props.map((p) => [
        `\`${p.name}\``,
        `\`${p.type}\``,
        `\`${p.default}\``,
        p.description.replace(/\n+/g, ' ') || '—',
      ])
    ),
    '',
    '## Slots',
    '',
    table(
      ['Slot', 'Description'],
      component.slots.map((s) => [`\`${s.name}\``, s.description || '—'])
    ),
    '',
    '## Events',
    '',
    table(
      ['Event', 'Type', 'Description'],
      component.events.map((e) => [`\`${e.name}\``, `\`${e.type}\``, e.description || '—'])
    ),
  ];

  if (component.cssParts.length) {
    lines.push(
      '',
      '## CSS parts',
      '',
      table(
        ['Part', 'Description'],
        component.cssParts.map((p) => [`\`${p.name}\``, p.description || '—'])
      )
    );
  }
  if (component.cssProperties.length) {
    lines.push(
      '',
      '## CSS custom properties',
      '',
      table(
        ['Property', 'Default', 'Description'],
        component.cssProperties.map((p) => [`\`${p.name}\``, `\`${p.default}\``, p.description || '—'])
      )
    );
  }
  if (component.methods.length) {
    lines.push(
      '',
      '## Public methods',
      '',
      table(
        ['Method', 'Description'],
        component.methods.map((m) => [`\`${m.name}()\``, m.description || '—'])
      )
    );
  }

  lines.push('', `Source: \`libs/al-web-components/${component.modulePath}\``, '');
  return lines.join('\n');
}

/** The Overview page, as Markdown. */
export function overviewMarkdown(context = DEFAULT_CONTEXT) {
  const { site, registry, project } = context;
  return [
    `# ${site.title}`,
    '',
    site.description,
    '',
    '## By the numbers',
    '',
    `- Components documented: ${registry.count}${
      registry.scope.scoped
        ? " (this design system's declared scope; the shared library declares more)"
        : ''
    }`,
    `- Icon glyphs: ${registry.stats.icons}`,
    `- Custom elements in the manifest: ${registry.stats.cemTags}`,
    `- Documented properties: ${registry.stats.documentedProps} of ${registry.stats.totalProps}`,
    `- Components with a React wrapper: ${registry.stats.withReact}`,
    `- Design tokens: ${TOKEN_COUNT}`,
    `- Brand: \`<al-theme brand="${project.brand}">\``,
    '',
    '## Taxonomy',
    '',
    ...registry.tiers.map((tier) => `- ${tier.label}: ${tier.count}`),
    '',
  ].join('\n');
}

/** The Components index, as Markdown. */
export function componentsIndexMarkdown(context = DEFAULT_CONTEXT) {
  const { site, registry } = context;
  return [
    `# Components (${registry.count})`,
    '',
    'Generated from `libs/al-web-components/custom-elements.json`' +
      (registry.scope.scoped
        ? ", scoped to this design system's `library.components` allowlist in `.altitude/ds-projects.json`."
        : '.'),
    '',
    ...registry.tiers.flatMap((tier) => [
      `## ${tier.label} (${tier.count})`,
      '',
      table(
        ['Component', 'Tag', 'React', 'Props', 'Slots', 'Events'],
        tier.components.map((c) => [
          `[${c.name}](${site.url}/components/${c.slug})`,
          `\`<${c.tag}>\``,
          c.react ? `\`<${c.react}>\`` : '—',
          c.props.length,
          c.slots.length,
          c.events.length,
        ])
      ),
      '',
    ]),
  ].join('\n');
}

/** The Foundations page, as Markdown. */
export function foundationsMarkdown(context = DEFAULT_CONTEXT) {
  const ramps = colorRamps();
  const overrides = brandOverrides(context.project.brand);
  return [
    '# Foundations',
    '',
    `Read at build time from the published token layer — ${TOKEN_COUNT} tokens.`,
    '',
    `## Brand — \`${context.project.brand}\``,
    '',
    overrides.available
      ? overrides.properties.length
        ? `This brand redeclares ${overrides.properties.length} of those properties inside ` +
          `\`<al-theme brand="${context.project.brand}">\`; everything else resolves to the base bundle.`
        : overrides.reason
      : overrides.reason,
    '',
    ...(overrides.properties.length
      ? [
          table(
            ['Property', 'Brand value', 'Base value'],
            overrides.properties.map((p) => [`\`${p.name}\``, p.value, p.base ?? '—'])
          ),
          '',
        ]
      : []),
    `## Color (${ramps.length} ramps)`,
    '',
    ...ramps.flatMap((ramp) => [
      `### ${ramp.label} — \`${ramp.prefix}\``,
      '',
      table(
        ['Step', 'Value', 'Token'],
        ramp.steps.map((s) => [s.name, s.value, `\`--${s.key}\``])
      ),
      '',
    ]),
    '## Typography',
    '',
    table(
      ['Preset', 'Value'],
      typeScale().map((t) => [`\`--${t.key}\``, t.value])
    ),
    '',
    '## Spacing',
    '',
    table(
      ['Step', 'Value', 'Token'],
      spacingScale().map((s) => [s.name, s.value, `\`--${s.key}\``])
    ),
    '',
    '## Radius',
    '',
    table(
      ['Step', 'Value', 'Token'],
      radiusScale().map((r) => [r.name, r.value, `\`--${r.key}\``])
    ),
    '',
  ].join('\n');
}
