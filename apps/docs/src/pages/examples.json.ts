// /examples.json — working markup for every component in the default design
// system, from each component's own executed story. Body:
// ./_examples-artifact.mjs, shared with the per-project route.
import { examplesJson } from './_examples-artifact.mjs';
import { DEFAULT_CONTEXT } from '../lib/context.mjs';

export async function GET() {
  return new Response(JSON.stringify(await examplesJson(DEFAULT_CONTEXT), null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
