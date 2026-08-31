// Markdown twin — one per non-default design system.
import type { APIRoute } from 'astro';
import { iconsMarkdown } from '../../lib/markdown.mjs';
import { projectPaths } from '../../lib/projects.mjs';
import { contextFor } from '../../lib/context.mjs';

export function getStaticPaths() {
  return projectPaths();
}

export const GET: APIRoute = ({ props }) =>
  new Response(iconsMarkdown(contextFor((props as any).project)), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
