// /<project>/status.json — one machine status file per design system, scoped
// to that system's components and its own Figma parity rows. Body:
// src/lib/artifacts.mjs, the same serializer the site at the root uses.
import { statusJson } from '../../lib/artifacts.mjs';
import { projectPaths } from '../../lib/projects.mjs';
import { contextFor } from '../../lib/context.mjs';

export function getStaticPaths() {
  return projectPaths();
}

export async function GET({ props }: any) {
  return new Response(JSON.stringify(statusJson(contextFor(props.project)), null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
