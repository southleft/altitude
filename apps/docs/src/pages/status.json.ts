/**
 * `/docs/status.json` — the status panels as a machine artifact.
 *
 * The docs site already emits `llms.txt` and per-page `.md` for agents that
 * read prose. This is the same idea for the numbers: one static file carrying
 * every per-component parity status and accessibility result the site renders,
 * from the same build-time sources, so an agent never has to scrape a page or
 * re-derive a status.
 *
 * WHY IT IS WORTH SHIPPING. `altitude_check_parity` (libs/altitude-mcp) can
 * already answer "is this component in sync with Figma", but only for someone
 * running this repo's MCP server locally. Nothing on the public web reports
 * design↔code drift for a design system. This file makes that answer fetchable
 * without any of it — and, being generated at build time from the parity
 * manifests and the axe report, it cannot disagree with the pages beside it.
 *
 * Body: src/lib/artifacts.mjs, shared with every other design system's
 * status.json, so each one is scoped to its own components and its own parity
 * rows without a second serializer existing.
 */
import { statusJson } from '../lib/artifacts.mjs';
import { DEFAULT_CONTEXT } from '../lib/context.mjs';

export async function GET() {
  return new Response(JSON.stringify(statusJson(DEFAULT_CONTEXT), null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
