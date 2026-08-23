// /<project>/llms-full.txt — one corpus per design system.
import type { APIRoute } from 'astro';
import { fullCorpus } from '../../lib/markdown.mjs';
import { projectPaths } from '../../lib/projects.mjs';
import { contextFor } from '../../lib/context.mjs';

export function getStaticPaths() {
  return projectPaths();
}

export const GET: APIRoute = ({ props }) =>
  new Response(fullCorpus(contextFor((props as any).project)), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
