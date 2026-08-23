/**
 * Markdown renderings of the generated pages.
 *
 * Every docs page is also served as Markdown at the same URL plus `.md`
 * (`/docs/components/button` → `/docs/components/button.md`), and the same
 * renderers feed `llms-full.txt`. Both read the registry, so the Markdown an
 * agent fetches and the HTML a human reads are the same facts rendered twice —
 * there is no second copy of the content to drift.
 */
import { TIERS, COMPONENTS, COMPONENT_COUNT, STATS } from './registry.mjs';
import { TOKEN_COUNT, colorRamps, spacingScale, radiusScale, typeScale } from './tokens.mjs';
import { SITE } from './site.mjs';

const table = (headers, rows) =>
  rows.length
    ? [
        `| ${headers.join(' | ')} |`,
        `| ${headers.map(() => '---').join(' | ')} |`,
        ...rows.map((cells) => `| ${cells.map((c) => String(c).replace(/\|/g, '\\|')).join(' | ')} |`),
      ].join('\n')
    : '_None declared in the manifest._';

/** One component, as Markdown. */
export function componentMarkdown(component) {
  const lines = [
    `# ${component.name}`,
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
    ...(component.react ? [`import { ${component.react} } from 'al-react';`] : []),
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
export function overviewMarkdown() {
  return [
    `# ${SITE.title}`,
    '',
    SITE.description,
    '',
    '## By the numbers',
    '',
    `- Components: ${COMPONENT_COUNT}`,
    `- Icon glyphs: ${STATS.icons}`,
    `- Custom elements in the manifest: ${STATS.cemTags}`,
    `- Documented properties: ${STATS.documentedProps} of ${STATS.totalProps}`,
    `- Components with a React wrapper: ${STATS.withReact}`,
    `- Design tokens: ${TOKEN_COUNT}`,
    '',
    '## Taxonomy',
    '',
    ...TIERS.map((tier) => `- ${tier.label}: ${tier.count}`),
    '',
  ].join('\n');
}

/** The Components index, as Markdown. */
export function componentsIndexMarkdown() {
  return [
    `# Components (${COMPONENT_COUNT})`,
    '',
    'Generated from `libs/al-web-components/custom-elements.json`.',
    '',
    ...TIERS.flatMap((tier) => [
      `## ${tier.label} (${tier.count})`,
      '',
      table(
        ['Component', 'Tag', 'React', 'Props', 'Slots', 'Events'],
        tier.components.map((c) => [
          `[${c.name}](${SITE.url}/docs/components/${c.slug})`,
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
export function foundationsMarkdown() {
  const ramps = colorRamps();
  return [
    '# Foundations',
    '',
    `Read at build time from the published token layer — ${TOKEN_COUNT} tokens.`,
    '',
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

/** Everything, concatenated — the body of `llms-full.txt`. */
export function fullCorpus() {
  return [
    overviewMarkdown(),
    foundationsMarkdown(),
    componentsIndexMarkdown(),
    ...COMPONENTS.map(componentMarkdown),
  ].join('\n\n---\n\n');
}
