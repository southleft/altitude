// The Markdown twin of `/docs/components/<slug>` — same URL, `.md` suffix.
// Body comes from the same context the HTML page renders, so the two cannot
// describe different components or different design systems.
import type { APIRoute } from 'astro';
import { componentMarkdown } from '../../lib/markdown.mjs';
import { DEFAULT_CONTEXT } from '../../lib/context.mjs';

export function getStaticPaths() {
  return DEFAULT_CONTEXT.registry.components.map((component: any) => ({
    params: { slug: component.slug },
    props: { component },
  }));
}

export const GET: APIRoute = ({ props }) =>
  new Response(componentMarkdown((props as any).component, DEFAULT_CONTEXT), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
