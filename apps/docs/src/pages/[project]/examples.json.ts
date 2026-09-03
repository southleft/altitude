// /<project>/examples.json — one machine examples file per design system.
//
// Scoped, and it has to be: a brand layer supersedes base components under the
// same tag (Southleft's `al-header` is not Altitude's), and the story that
// backs the example lives beside the implementation THAT project ships.
// `examplesJson()` reads `component.libraryRoot`, so the right story is picked
// by construction rather than by a special case here.
//
// Body: ../_examples-artifact.mjs, the same serializer the root artifact uses.
import { examplesJson } from '../_examples-artifact.mjs';
import { projectPaths } from '../../lib/projects.mjs';
import { contextFor } from '../../lib/context.mjs';

export function getStaticPaths() {
  return projectPaths();
}

export async function GET({ props }: any) {
  return new Response(JSON.stringify(await examplesJson(contextFor(props.project)), null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
