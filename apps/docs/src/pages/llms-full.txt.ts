// /llms-full.txt — every page's Markdown, concatenated. Companion to
// /llms.txt (the map); this is the corpus.
import type { APIRoute } from 'astro';
import { fullCorpus } from '../lib/markdown.mjs';
import { DEFAULT_CONTEXT } from '../lib/context.mjs';

export const GET: APIRoute = () =>
  new Response(fullCorpus(DEFAULT_CONTEXT), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
