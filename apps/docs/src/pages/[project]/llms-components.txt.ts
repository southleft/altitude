// /<project>/llms-components.txt — every element's complete API. One per design system.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { llmsComponents } from '../../lib/artifacts.mjs';
import { projectPaths } from '../../lib/projects.mjs';
import { contextFor } from '../../lib/context.mjs';

export function getStaticPaths() {
  return projectPaths();
}

export const GET: APIRoute = async ({ props }) => {
  const guidance = await getCollection('guidance');
  return new Response(llmsComponents(contextFor((props as any).project), guidance), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
