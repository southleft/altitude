// /llms-full.txt — the whole corpus in one file: the rules, every token, every
// component API, the measured accessibility results, and the page Markdown.
// Companion to /llms.txt (the map) and to the three topic splits
// (/llms-tokens.txt, /llms-components.txt, /llms-a11y.txt), which are the same
// content addressable one subject at a time.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { llmsFull } from '../lib/artifacts.mjs';
import { DEFAULT_CONTEXT } from '../lib/context.mjs';

// Guidance rides along so the machine surface carries the same judgement the
// component pages show, not just the generated API. See src/lib/guidance.mjs.
export const GET: APIRoute = async () => {
  const guidance = await getCollection('guidance');
  return new Response(llmsFull(DEFAULT_CONTEXT, guidance), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
