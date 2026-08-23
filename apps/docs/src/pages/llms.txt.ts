// /llms.txt — a structured, LLM-friendly map of this site
// (https://llmstxt.org), generated at build time from the same context that
// renders the HTML. Body: src/lib/artifacts.mjs, shared with every project.
import type { APIRoute } from 'astro';
import { llmsTxt } from '../lib/artifacts.mjs';
import { DEFAULT_CONTEXT } from '../lib/context.mjs';

export const GET: APIRoute = () =>
  new Response(llmsTxt(DEFAULT_CONTEXT), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
