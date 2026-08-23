// Markdown twin of `/docs/` (the Overview screen).
import type { APIRoute } from 'astro';
import { overviewMarkdown } from '../lib/markdown.mjs';

export const GET: APIRoute = () =>
  new Response(overviewMarkdown(), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
