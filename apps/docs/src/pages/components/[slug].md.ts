// The Markdown twin of `/docs/components/<slug>` — same URL, `.md` suffix.
// Body comes from the same registry the HTML page renders, so the two cannot
// describe different components.
import type { APIRoute } from 'astro';
import { COMPONENTS, findComponent } from '../../lib/registry.mjs';
import { componentMarkdown } from '../../lib/markdown.mjs';

export function getStaticPaths() {
  return COMPONENTS.map((component) => ({ params: { slug: component.slug } }));
}

export const GET: APIRoute = ({ params }) => {
  const component = findComponent(params.slug);
  if (!component) return new Response('Not found', { status: 404 });
  return new Response(componentMarkdown(component), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
