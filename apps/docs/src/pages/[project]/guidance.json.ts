// /<project>/guidance.json — one machine guidance file per design system,
// scoped to that system's components and its own brand-layer guidance. Body:
// src/lib/guidance.mjs, the same module the root artifact and the pages use.
//
// The scoping is not cosmetic: `guidance/southleft/header.yaml` describes a
// different element than `guidance/header.yaml` under the same slug, and the
// lookup rule that keeps them apart lives in guidanceFor(). Emitting one file
// per project is what lets an MCP caller pass `project` and get the advice for
// the component that project actually ships.
import { getCollection } from 'astro:content';
import { guidanceJson } from '../../lib/guidance.mjs';
import { projectPaths } from '../../lib/projects.mjs';
import { contextFor } from '../../lib/context.mjs';

export function getStaticPaths() {
  return projectPaths();
}

export async function GET({ props }: any) {
  const entries = await getCollection('guidance');
  return new Response(JSON.stringify(guidanceJson(contextFor(props.project), entries), null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
