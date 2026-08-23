// /llms.txt — a structured, LLM-friendly map of this site
// (https://llmstxt.org), generated at build time from the same registry that
// renders the HTML. Reuses the apps/southleft/src/pages/llms.txt.ts pattern.
//
// Every component line, every count and every prop total below is derived
// from libs/al-web-components/custom-elements.json, so the file an agent
// reads and the pages a human reads cannot describe different libraries.
import type { APIRoute } from 'astro';
import { TIERS, COMPONENTS, COMPONENT_COUNT, STATS } from '../lib/registry.mjs';
import { TOKEN_COUNT } from '../lib/tokens.mjs';
import { SITE } from '../lib/site.mjs';

export const GET: APIRoute = async () => {
  const url = `${SITE.url}/docs`;

  const line = (component: (typeof COMPONENTS)[number]) =>
    `- [${component.name}](${url}/components/${component.slug}): \`<${component.tag}>\`` +
    `${component.react ? ` / \`<${component.react}>\`` : ''} — ` +
    `${component.props.length} props, ${component.slots.length} slots, ${component.events.length} events` +
    `${component.summary ? `. ${component.summary}` : ''}`;

  const body = `# ${SITE.title}

> ${SITE.description}

This documentation site is generated from the library itself: the component
list, the atomic taxonomy, the counts and every props table are read at build
time from \`libs/al-web-components/custom-elements.json\`, and the Foundations
page is read from the published token layer. Nothing component-shaped on this
site is hand-maintained, so it cannot drift from the code.

## Facts

- Components: ${COMPONENT_COUNT}
- Icon glyphs (payloads of \`<al-icon>\`, not components): ${STATS.icons}
- Custom elements declared in the manifest: ${STATS.cemTags}
- Documented properties: ${STATS.documentedProps} of ${STATS.totalProps}
- Components with a React wrapper: ${STATS.withReact}
- Design tokens: ${TOKEN_COUNT}
- Runtime: Lit 3.3 web components; React 19 wrappers via @lit/react

## Pages

- [Overview](${url}/): what Altitude is, in numbers
- [Foundations](${url}/foundations): color ramps, type presets, spacing, radius, elevation — read from the token layer
- [Components](${url}/components): the full index, filterable

${TIERS.map(
  (tier) => `## ${tier.label.charAt(0)}${tier.label.slice(1).toLowerCase()} (${tier.count})

${tier.components.map(line).join('\n')}`
).join('\n\n')}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
