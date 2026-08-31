// /<project>/llms-full.txt — one whole corpus per design system.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { llmsFull } from '../../lib/artifacts.mjs';
import { projectPaths } from '../../lib/projects.mjs';
import { contextFor } from '../../lib/context.mjs';

export function getStaticPaths() {
  return projectPaths();
}

export const GET: APIRoute = async ({ props }) => {
  const guidance = await getCollection('guidance');
  return new Response(llmsFull(contextFor((props as any).project), guidance), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
