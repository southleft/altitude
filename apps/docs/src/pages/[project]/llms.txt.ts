// /<project>/llms.txt — one map per design system.
import type { APIRoute } from 'astro';
import { llmsTxt } from '../../lib/artifacts.mjs';
import { projectPaths } from '../../lib/projects.mjs';
import { contextFor } from '../../lib/context.mjs';

export function getStaticPaths() {
  return projectPaths();
}

export const GET: APIRoute = ({ props }) =>
  new Response(llmsTxt(contextFor((props as any).project)), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
