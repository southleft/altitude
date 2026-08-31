// The Markdown twin of `/docs/components/<slug>` — same URL, `.md` suffix.
// Body comes from the same context the HTML page renders, so the two cannot
// describe different components or different design systems.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { componentMarkdown } from '../../lib/markdown.mjs';
import { DEFAULT_CONTEXT } from '../../lib/context.mjs';

export function getStaticPaths() {
  return DEFAULT_CONTEXT.registry.components.map((component: any) => ({
    params: { slug: component.slug },
    props: { component },
  }));
}

// Guidance is loaded here, not inside the renderer: `getCollection` only
// exists in an Astro route, and `markdown.mjs` is plain ESM shared with Node
// scripts. See src/lib/guidance.mjs.
export const GET: APIRoute = async ({ props }) => {
  const guidance = await getCollection('guidance');
  return new Response(componentMarkdown((props as any).component, DEFAULT_CONTEXT, guidance), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
