// /llms.txt — spec 2026-08-20-southleft-example-app, T4-1. A structured,
// LLM-friendly map of this site (https://llmstxt.org), generated at build
// time from the same content collections that render the HTML.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../lib/site';

export const GET: APIRoute = async () => {
  const posts = (await getCollection('insights')).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const work = (await getCollection('work')).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const post = (p) =>
    `- [${p.data.title}](${SITE.url}/insights/${p.data.category}/${p.id.replace(/\.md$/, '')}/): ${p.data.excerpt || p.data.categoryName}`;

  const project = (w) =>
    `- [${w.data.client} — ${w.data.title}](${SITE.url}/projects/${w.id.replace(/\.md$/, '')}/): ${w.data.oneLiner || w.data.summary}`;

  const body = `# Southleft

> Design systems consulting, engineering, and AI integration studio. Founded in New
> Orleans in 2012 by TJ Pitre; Nicole Hampton became CEO in 2026. Southleft helps
> product organizations build design systems that work with AI — audits, engineering,
> workshops, team augmentation, and discovery/research — and builds the open-source AI
> tooling the design systems community uses (Figma Console MCP, Story UI, FigmaLint,
> design-systems-mcp, Altitude).

This site is itself a working example of Altitude, Southleft's own design system: every
color, radius, type ramp, and shadow derives from the token layer published at
${SITE.url}/tokens.json.

## Services

- [Services overview](${SITE.url}/services/): the five practice areas
- [AI + Design Systems](${SITE.url}/ai-design-systems/): the flagship practice — audits, discovery, MCP integration, open-source tooling
- [Team Augmentation](${SITE.url}/services/team-augmentation/): senior design-system and front-end engineers embedded with client teams
- [Design System Development](${SITE.url}/services/design-systems/): build, audit, and scale systems from Figma to production
- [Workshops & Training](${SITE.url}/services/workshops-training/): team workshops, speaking engagements, and the AI & Design Systems course
- [AI Prototype to Production](${SITE.url}/services/ai-prototype-to-production/): hardening AI-generated (vibe-coded) prototypes for launch
- [Northright](${SITE.url}/northright/): fixed-price WordPress websites for smaller teams

## Open-source tools

- [Tools hub](${SITE.url}/tools/): the full catalog
- [Altitude](${SITE.url}/tools/altitude/): Southleft's own design system and AI testbed (also this site's foundation)
- [figma-console-mcp](https://github.com/southleft/figma-console-mcp): AI-powered design system management inside Figma via MCP
- [story-ui](https://github.com/southleft/story-ui): AI layout generation for Storybook via MCP
- [figmalint](https://github.com/southleft/figmalint): design linting for developer-ready Figma files
- [design-systems-mcp](https://github.com/southleft/design-systems-mcp): a design systems knowledge base AI can query
- [Figma design systems guide](${SITE.url}/figma-design-systems/): turning Figma into machine-readable infrastructure

## Resources

- [Speaking & teaching](${SITE.url}/speaking/): talks, workshops, podcasts, and the AI & Design Systems course
- [Design Systems Aptitude Test](${SITE.url}/quiz/): a nine-question quiz on tokens, parity, and drift
- [AI-Ready Design System Scorecard](${SITE.url}/scorecard/): a six-dimension, self-scored AI-readiness diagnostic

## Company

- [About](${SITE.url}/about/): history, Baseline partnership, leadership (TJ Pitre, founder & chairman; Nicole Hampton, CEO)
- [Contact](${SITE.url}/contact/): discovery calls via Calendly, email ${SITE.email}
- [Work / case studies](${SITE.url}/work/): ${work.length} projects including IBM, PetSmart, Stanford d.school
- [Design tokens](${SITE.url}/tokens.json): the live Altitude token layer this site runs on
- [RSS feed](${SITE.url}/rss.xml)
- [Privacy policy](${SITE.url}/privacy-policy/) · [Cookie policy](${SITE.url}/cookie-policy/)

## Case studies

${work.map(project).join('\n')}

## Insights (all ${posts.length} posts, newest first)

${posts.map(post).join('\n')}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
