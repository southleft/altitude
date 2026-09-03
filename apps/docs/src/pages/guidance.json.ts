/**
 * `/docs/guidance.json` — the authored judgement, as data.
 *
 * A sibling of `status.json`: same idea (the pages' own facts, fetchable
 * without scraping HTML), different half of the documentation. `status.json`
 * carries what was MEASURED — parity, axe results. This carries what was
 * WRITTEN — purpose, when to use, and above all `whenNotToUse` with its
 * resolved `instead:` pointer, which is the one field in this system that can
 * stop an agent choosing the wrong component instead of merely confirming a
 * choice already made.
 *
 * Body: `src/lib/guidance.mjs`, the same module `GuidancePanel.astro` and the
 * `.md` twins read, so the machine artifact cannot disagree with the page —
 * including the brand-layer lookup rule, which is subtle enough that a second
 * implementation would drift from it.
 *
 * The collection is loaded HERE and passed down because `getCollection()` only
 * exists inside an Astro route; see `src/lib/guidance.mjs`'s header.
 */
import { getCollection } from 'astro:content';
import { guidanceJson } from '../lib/guidance.mjs';
import { DEFAULT_CONTEXT } from '../lib/context.mjs';

export async function GET() {
  const entries = await getCollection('guidance');
  return new Response(JSON.stringify(guidanceJson(DEFAULT_CONTEXT, entries), null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
