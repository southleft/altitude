// Markdown twin — the registry's DEFAULT project.
import type { APIRoute } from 'astro';
import { migrationMarkdown } from '../lib/markdown.mjs';
import { DEFAULT_CONTEXT } from '../lib/context.mjs';

export const GET: APIRoute = () =>
  new Response(migrationMarkdown(DEFAULT_CONTEXT), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
