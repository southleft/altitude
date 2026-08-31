// Altitude MCP — Fetch-standard (Web Streams / Request / Response) entrypoint.
//
// R9: "an agent can reach the MCP server without a local checkout." The rest
// of this package (server.mjs) is stdio + a Node `http.createServer` — both
// need a real Node process and a real filesystem, so both need a local
// checkout to run at all. This file is the piece of R9 that is genuinely
// buildable and testable from here: a transport + tool surface that runs on
// any Fetch-standard runtime — Cloudflare Workers/Pages Functions, Deno, Bun,
// or plain Node — with NO filesystem access, proven under the actual
// Cloudflare runtime locally via `wrangler pages dev` (not just "runs under
// Node", which would prove nothing about Workers-compatibility). See
// `libs/altitude-mcp/README.md` "Hosted endpoint" for the verified-vs-not
// boundary; the short version: this file and the transport are implemented
// and locally verified, an actual public deployment is not (auth secret,
// DNS, and the Cloudflare project itself all require a human with dashboard
// access this session does not have).
//
// WHY A SUBSET OF THE EIGHT TOOLS, NOT ALL EIGHT. `buildServer()` in
// server.mjs is the ground truth for the full surface; this file does not
// reimplement it, it deliberately covers less of it, because three of the
// eight tools are not portable to a filesystem-less, subprocess-less
// runtime, for reasons that will not change with more engineering effort:
//
//   altitude_validate       — spawns `node cli/validate.mjs` as a CHILD
//                              PROCESS (lib/validate.mjs). Workers isolates
//                              cannot spawn processes, ever — this is a
//                              platform wall, not a gap to close.
//   altitude_get_tokens     — reads dist/css/tokens.json, a BUILD artifact
//                              this repo deliberately does not commit (see
//                              llms.txt "Built artifacts — import them, do
//                              not link them"). A static import needs a
//                              tracked file to import; bundling an untracked
//                              build artifact into a Worker would need its
//                              own build-and-upload step this task cannot
//                              verify without a real Cloudflare deploy.
//   altitude_generate_theme — dynamically resolves the BUILT theme-engine
//                              barrel (dist/theme-engine/index.js) with a
//                              TypeScript-source fallback (theme.mjs) — same
//                              "depends on an untracked dist/ artifact"
//                              problem as tokens, plus a runtime `import()`
//                              of a path this module cannot statically name.
//
// What's left — altitude_list_components and altitude_list_ds_projects,
// plus five read-only resources — is exactly the subset backed ONLY by
// small, committed, single-file JSON (see ./lib/registry-data.mjs): the CEM,
// the migration state, the design-system registry, both ai-readiness
// digests, and the a11y report. Every one of those is already read by
// server.mjs's Node-http/stdio surface AND by this file, from the identical
// source file, via two different I/O mechanisms (`fs.readFileSync` there,
// a bundler-inlined `import … with { type: "json" }` here) — never two
// copies of the data itself, so the two surfaces cannot drift on WHAT they
// report, only on which subset of tools exists on which transport.
// `altitude_check_parity` and `altitude_get_component` are also NOT here:
// both need a live directory walk over `libs/al-web-components/components/`
// (source hashing for drift, `.stories.ts` parsing for docs URLs) that has
// no static-import equivalent — deferred, not impossible; see the README
// note on what a genuine port would need.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';

import { parseCem } from './lib/cem-parse.mjs';
import {
  customElementsManifest,
  dsProjects,
  cemDigest,
  tokensDigest,
  a11yReport,
  getMigrationState,
} from './lib/registry-data.mjs';

const JSON_MIME = 'application/json';

function json(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

/** `resolveProject()`'s shape, over the statically-imported registry — no `resolved.*` absolute paths (meaningless off the build machine). */
function projectSummary(id) {
  const p = dsProjects.projects[id];
  const urlBase = (p.figma.urlBase ?? 'https://www.figma.com/design/{fileKey}/').replace('{fileKey}', p.figma.fileKey);
  return {
    id,
    name: p.name,
    brand: p.brand,
    isDefault: id === dsProjects.default,
    figma: { fileKey: p.figma.fileKey, fileName: p.figma.fileName, url: urlBase },
    storybook: p.storybook ? { port: p.storybook.port, brandTitle: p.storybook.brandTitle } : null,
    docs: p.docs?.productionBase ?? null,
  };
}

/**
 * Build the hosted server. A SEPARATE `McpServer` instance from server.mjs's
 * `buildServer()` (different name, deliberately: `altitude-hosted`, not
 * `altitude`) — an agent introspecting `server/info` should be able to tell
 * "this is the read-only hosted subset", not have to diff a tool list
 * against the README to notice.
 */
export function buildHostedServer() {
  const server = new McpServer({ name: 'altitude-hosted', version: '1.0.0' });

  server.registerTool(
    'altitude_list_components',
    {
      title: 'List Altitude components',
      description:
        'List every @southleft/al-web-components custom element from the Custom Elements Manifest ' +
        '(CEM): tag, class name, description, and migration state. Optionally filter by a substring ' +
        'match on tag, class name, or description. Hosted-endpoint subset of the full altitude MCP — ' +
        'see this server\'s README for what is not included here and why.',
      inputSchema: {
        filter: z.string().optional().describe('Case-insensitive substring to match against tag, className, or description.'),
      },
    },
    async ({ filter }) => {
      const q = filter?.toLowerCase().trim();
      const components = parseCem(customElementsManifest)
        .filter((c) => !q || [c.tag, c.className, c.description].some((s) => s?.toLowerCase().includes(q)))
        .map((c) => ({
          tag: c.tag,
          className: c.className,
          summary: c.summary || c.description,
          migration: getMigrationState(c.tag),
        }));
      return json({ count: components.length, components });
    },
  );

  server.registerTool(
    'altitude_list_ds_projects',
    {
      title: 'List design-system projects',
      description:
        'Every design system this repo drives, from .altitude/ds-projects.json: id, display name, ' +
        'brand, Figma file key/name/URL, Storybook port and docs base. Hosted-endpoint subset — no ' +
        '`parityManifest` path (a build-machine filesystem path, meaningless off it).',
      inputSchema: {},
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            { default: dsProjects.default, projects: Object.keys(dsProjects.projects).map(projectSummary) },
            null,
            2,
          ),
        },
      ],
    }),
  );

  const resource = (name, uri, title, description, data) => {
    server.registerResource(
      name,
      uri,
      { title, description, mimeType: JSON_MIME },
      (u) => ({ contents: [{ uri: u.href ?? String(u), mimeType: JSON_MIME, text: JSON.stringify(data, null, 2) }] }),
    );
  };

  resource(
    'altitude-components',
    'altitude://components',
    'Altitude components (CEM)',
    'The base @southleft/al-web-components Custom Elements Manifest. Same source altitude_list_components parses.',
    customElementsManifest,
  );
  resource(
    'altitude-ai-readiness-cem-digest',
    'altitude://ai-readiness/cem-digest',
    'Altitude CEM digest',
    'The fleet-probe-shaped CEM digest — attributes/slots/events + doNotFlag carve-outs, per tag.',
    cemDigest,
  );
  resource(
    'altitude-ai-readiness-tokens-digest',
    'altitude://ai-readiness/tokens-digest',
    'Altitude tokens digest',
    'Token naming conventions, families and the do-not-invent list. No resolved values (those live in ' +
      'an untracked dist/ artifact this hosted endpoint does not source — see altitude_get_tokens on ' +
      'the full stdio/Node-HTTP server for those).',
    tokensDigest,
  );
  resource(
    'altitude-ds-projects',
    'altitude://ds-projects',
    'Design-system project registry',
    'The raw .altitude/ds-projects.json contents.',
    dsProjects,
  );
  resource(
    'altitude-a11y-report',
    'altitude://a11y-report',
    'Altitude accessibility report',
    'The full axe-core accessibility sweep across every component.',
    a11yReport,
  );

  return server;
}

/**
 * Fetch-standard request handler — the one function every host adapter
 * (Cloudflare Pages Function, a plain Node http.createServer wrapper, a
 * local smoke test) calls. Stateless: a fresh server + transport per
 * request, same discipline server.mjs's Node-HTTP `/mcp` route already uses,
 * for the same reason (no cross-request session state to leak between
 * unrelated callers on a shared hosted endpoint).
 */
export async function handleMcpRequest(request) {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = buildHostedServer();
  await server.connect(transport);
  const response = await transport.handleRequest(request);
  await server.close();
  return response;
}
