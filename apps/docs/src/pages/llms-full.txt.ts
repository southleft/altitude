// /llms-full.txt — the whole corpus in one file: the rules, every token, every
// component API, the measured accessibility results, and the page Markdown.
// Companion to /llms.txt (the map) and to the three topic splits
// (/llms-tokens.txt, /llms-components.txt, /llms-a11y.txt), which are the same
// content addressable one subject at a time.
import type { APIRoute } from 'astro';
import { llmsFull } from '../lib/artifacts.mjs';
import { DEFAULT_CONTEXT } from '../lib/context.mjs';

export const GET: APIRoute = () =>
  new Response(llmsFull(DEFAULT_CONTEXT), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
