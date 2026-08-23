// /<project>/llms-tokens.txt — the closed set of design tokens, with resolved values. One per design system.
import type { APIRoute } from 'astro';
import { llmsTokens } from '../../lib/artifacts.mjs';
import { projectPaths } from '../../lib/projects.mjs';
import { contextFor } from '../../lib/context.mjs';

export function getStaticPaths() {
  return projectPaths();
}

export const GET: APIRoute = ({ props }) =>
  new Response(llmsTokens(contextFor((props as any).project)), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
