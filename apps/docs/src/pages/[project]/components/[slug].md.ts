// Markdown twin of one component page, on one non-default design system's site.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { componentMarkdown } from '../../../lib/markdown.mjs';
import { SCOPED_PROJECTS } from '../../../lib/projects.mjs';
import { contextFor } from '../../../lib/context.mjs';

export function getStaticPaths() {
  return SCOPED_PROJECTS.flatMap((project: any) =>
    contextFor(project).registry.components.map((component: any) => ({
      params: { project: project.id, slug: component.slug },
      props: { project, component },
    })),
  );
}

export const GET: APIRoute = async ({ props }) => {
  const { project, component } = props as any;
  const guidance = await getCollection('guidance');
  return new Response(componentMarkdown(component, contextFor(project), guidance), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
