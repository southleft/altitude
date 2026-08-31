// /<project>/llms-a11y.txt — the measured accessibility results, per component. One per design system.
import type { APIRoute } from 'astro';
import { llmsA11y } from '../../lib/artifacts.mjs';
import { projectPaths } from '../../lib/projects.mjs';
import { contextFor } from '../../lib/context.mjs';

export function getStaticPaths() {
  return projectPaths();
}

export const GET: APIRoute = ({ props }) =>
  new Response(llmsA11y(contextFor((props as any).project)), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
