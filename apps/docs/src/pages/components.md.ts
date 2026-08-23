// Markdown twin of `/docs/components`.
import type { APIRoute } from 'astro';
import { componentsIndexMarkdown } from '../lib/markdown.mjs';

export const GET: APIRoute = () =>
  new Response(componentsIndexMarkdown(), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
