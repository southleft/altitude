// Markdown twin of `/docs/foundations`.
import type { APIRoute } from 'astro';
import { foundationsMarkdown } from '../lib/markdown.mjs';

export const GET: APIRoute = () =>
  new Response(foundationsMarkdown(), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
