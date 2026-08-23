#!/usr/bin/env node
// Altitude MCP server — a stdio MCP server over Altitude's already-generated
// token/component graph (CEM, per-component JSON schemas, migration state,
// resolved tokens, the icon catalog, and the deterministic OKLCH theme
// engine). It is a READER of those artifacts, never a second source of
// truth: every tool below shells out to or parses a file al-web-components'
// own build already produced. See README.md for the full contract.
//
// Run with `--experimental-strip-types` (harmless no-op on Node versions
// where type stripping is unflagged) so the deterministic theme engine — a
// plain-TypeScript module that ships in git with no build step — can be
// imported directly by altitude_generate_theme.

import { createServer as createHttpServer } from 'node:http';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

import { loadComponents, getComponent } from './lib/cem.mjs';
import { getMigrationState } from './lib/migration.mjs';
import { loadSchema } from './lib/schemas.mjs';
import { getStoryInfo } from './lib/stories.mjs';
import { validate } from './lib/validate.mjs';
import { queryTokens } from './lib/tokens.mjs';
import { searchIcons } from './lib/icons.mjs';
import { generateTheme } from './lib/theme.mjs';
import { computeParity, STATUS } from './lib/parity.mjs';
import { resolveProject, listProjectIds } from './lib/ds-project.mjs';
import { MissingArtifactError } from './lib/paths.mjs';

/** Uniform JSON tool response, with MissingArtifactError surfaced as structured data (not a thrown protocol error) so an agent can read `hint` and self-heal. */
function json(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function toolHandler(fn) {
  return async (args) => {
    try {
      return json(await fn(args));
    } catch (err) {
      if (err instanceof MissingArtifactError) {
        return json({ error: err.message, code: err.code, path: err.path, hint: err.hint });
      }
      return json({ error: String(err?.message ?? err), code: 'ERR_TOOL_FAILURE' });
    }
  };
}

/**
 * Build a fully-registered server instance. A FACTORY rather than a module
 * singleton because the streamable-HTTP mode runs STATELESS: one fresh
 * server + transport pair per request (the documented pattern for servers
 * whose tools hold no session state — every tool here is a pure reader).
 * Stdio mode builds exactly one.
 */
function buildServer() {
  const server = new McpServer({ name: 'altitude', version: '1.0.0' });

// ── altitude_list_components ────────────────────────────────────────────
server.registerTool(
  'altitude_list_components',
  {
    title: 'List Altitude components',
    description:
      'List every al-web-components custom element from the Custom Elements Manifest (CEM): tag, ' +
      'class name, description, and migration state. Optionally filter by a substring match on tag, ' +
      'class name, or description.',
    inputSchema: {
      filter: z.string().optional().describe('Case-insensitive substring to match against tag, className, or description.'),
    },
  },
  toolHandler(({ filter }) => {
    const q = filter?.toLowerCase().trim();
    const components = loadComponents()
      .filter((c) => !q || [c.tag, c.className, c.description].some((s) => s?.toLowerCase().includes(q)))
      .map((c) => ({
        tag: c.tag,
        className: c.className,
        summary: c.summary || c.description,
        migration: getMigrationState(c.tag),
      }));
    return { count: components.length, components };
  })
);

// ── altitude_get_component ──────────────────────────────────────────────
server.registerTool(
  'altitude_get_component',
  {
    title: 'Get one Altitude component',
    description:
      'Full detail for one al-web-components custom element: its CEM entry (attributes, slots, ' +
      'events, CSS parts/properties), its JSON Schema from schemas/, its migration state, and its ' +
      'Storybook docs URL.',
    inputSchema: {
      tag: z.string().describe('The custom element tag name, e.g. "al-button".'),
    },
  },
  toolHandler(({ tag }) => {
    const component = getComponent(tag);
    if (!component) {
      return { error: `No CEM entry for tag "${tag}".`, code: 'ERR_UNKNOWN_COMPONENT' };
    }
    return {
      tag: component.tag,
      className: component.className,
      description: component.description,
      summary: component.summary,
      attributes: component.attributes,
      slots: component.slots,
      events: component.events,
      cssParts: component.cssParts,
      cssProperties: component.cssProperties,
      migration: getMigrationState(component.tag),
      schema: loadSchema(component.tag),
      story: getStoryInfo(component.modulePath),
    };
  })
);

// ── altitude_validate ────────────────────────────────────────────────────
server.registerTool(
  'altitude_validate',
  {
    title: 'Validate Altitude usage',
    description:
      'Validate <al-*> / al-react usage against the component contracts. Wraps ' +
      'libs/al-web-components/cli/validate.mjs --json verbatim (same stable error codes: ' +
      'ERR_UNKNOWN_COMPONENT, ERR_UNKNOWN_ATTRIBUTE, ERR_INVALID_ENUM, ERR_TYPE_MISMATCH). Pass ' +
      'either inline markup or a file/directory path.',
    inputSchema: {
      markup: z.string().optional().describe('Inline HTML/JSX/markup to validate.'),
      path: z.string().optional().describe('A file or directory path to scan instead of inline markup.'),
    },
  },
  toolHandler(({ markup, path }) => validate({ markup, path }))
);

// ── altitude_get_tokens ──────────────────────────────────────────────────
server.registerTool(
  'altitude_get_tokens',
  {
    title: 'Query Altitude design tokens',
    description:
      'Query design tokens. With no filters, returns the flat resolved dist/css/tokens.json set ' +
      '(the default altitude/light build). Add `tier` (1|2|3), `brand` (e.g. "meridian"), or ' +
      '`mode` ("light"|"dark") to query the DTCG source tree instead and get brand/mode-scoped ' +
      'raw + resolved values (a token\'s CSS custom-property name is stable across brand/mode; ' +
      'only its value changes). `name` is a substring filter on the token name in all cases.',
    inputSchema: {
      tier: z.union([z.string(), z.number()]).optional().describe('1, 2, or 3 (or "tier-1" etc).'),
      brand: z.string().optional().describe('e.g. "altitude", "meridian", "nocturne", "northright", "odyssey", "solstice", "southleft", "voltage".'),
      mode: z.enum(['light', 'dark']).optional(),
      name: z.string().optional().describe('Substring to match against the token name.'),
      limit: z.number().int().positive().max(1000).optional(),
    },
  },
  toolHandler((args) => queryTokens(args))
);

// ── altitude_search_icons ────────────────────────────────────────────────
server.registerTool(
  'altitude_search_icons',
  {
    title: 'Search Altitude icons',
    description:
      'Search the 1,512-glyph Phosphor icon catalog by name, tag, or category. Each result includes ' +
      'the exact glyphs.js barrel import + registerIcons() snippet to use it.',
    inputSchema: {
      query: z.string().optional().describe('Substring match against icon name, tags, or categories.'),
      category: z.string().optional().describe('Exact category match, e.g. "weather", "arrows".'),
      limit: z.number().int().positive().max(200).optional(),
    },
  },
  toolHandler((args) => {
    const results = searchIcons(args);
    return { count: results.length, icons: results };
  })
);

// ── altitude_generate_theme ──────────────────────────────────────────────
server.registerTool(
  'altitude_generate_theme',
  {
    title: 'Generate an Altitude theme (deterministic OKLCH solver)',
    description:
      'Derive a full Altitude token override set from an art-direction object (same shape as the ' +
      'Storybook AI console\'s functions/api/theme.js contract) or a bare text prompt. Runs the ' +
      'same deterministic, WCAG-AA-enforcing OKLCH solver Storybook uses — this tool never calls ' +
      'an LLM or returns colors it did not derive itself.',
    inputSchema: {
      prompt: z.string().max(80).optional().describe('A short text prompt; seeds hue/chroma/personality/mode via a keyless keyword dictionary when `direction` omits them.'),
      direction: z
        .object({
          accentHue: z.number().optional(),
          secondaryHue: z.number().optional(),
          neutralHue: z.number().optional(),
          chroma: z.number().optional(),
          personality: z.enum(['editorial', 'brutalist', 'geometric', 'luxe', 'playful']).optional(),
          mode: z.enum(['light', 'dark']).optional(),
          bgTint: z.enum(['neutral', 'tinted', 'vivid']).optional(),
          radius: z.enum(['sharp', 'subtle', 'rounded', 'pill']).optional(),
          elevation: z.enum(['flat', 'subtle', 'lifted', 'deep']).optional(),
          motion: z.enum(['snappy', 'smooth', 'springy', 'stately']).optional(),
          borderWeight: z.enum(['hairline', 'standard', 'thick']).optional(),
          name: z.string().optional(),
          quip: z.string().optional(),
        })
        .optional()
        .describe('Explicit art direction. Any omitted field falls back to the prompt-seeded value.'),
      variant: z.number().int().optional(),
    },
  },
  toolHandler((args) => generateTheme(args))
);

// ── altitude_check_parity ────────────────────────────────────────────────
server.registerTool(
  'altitude_check_parity',
  {
    title: 'Check Figma <-> code parity',
    description:
      'Figma <-> code parity status for every component (or one tag): in-sync, code-drift, ' +
      'figma-drift, conflict, missing-in-figma, missing-in-code, or excluded. MULTI-PROJECT: this ' +
      'repo drives more than one design system off one component library (see ' +
      '.altitude/ds-projects.json and altitude_list_ds_projects) — pass `project` to check ' +
      'Southleft instead of Altitude. Reads that project\'s parity manifest; code drift is ' +
      'computed LIVE by hashing the component source, Figma drift is as of the manifest\'s ' +
      'figmaLastRefreshed (update it with scripts/figma-parity/refresh-figma-digests.mjs ' +
      '--project <id>). Each entry carries an `aiPrompt` — a ready-to-run reconciliation prompt ' +
      'naming THAT project\'s Figma file. Same data the Storybook sidebar badges render from.',
    inputSchema: {
      tag: z.string().optional().describe('One custom element tag, e.g. "al-button". Omit for the full report.'),
      status: z
        .enum(Object.values(STATUS))
        .optional()
        .describe('Only return components with this status.'),
      project: z
        .string()
        .optional()
        .describe(
          `Design-system project id from .altitude/ds-projects.json (${listProjectIds().join(', ')}). Omit for the default ("${resolveProject().id}").`,
        ),
    },
  },
  toolHandler(({ tag, status, project }) => {
    let report;
    try {
      report = computeParity(project);
    } catch (err) {
      if (err?.code === 'ERR_UNKNOWN_DS_PROJECT') {
        return { error: err.message, code: err.code, knownProjects: err.known };
      }
      throw err;
    }
    if (tag) {
      const component = report.components.find((c) => c.tag === tag);
      return (
        component ?? {
          error: `No component "${tag}" in the ${report.project} parity report.`,
          code: 'ERR_UNKNOWN_COMPONENT',
        }
      );
    }
    if (status) {
      const matches = [...report.components, ...report.figmaOnly].filter((c) => c.status === status);
      return { ...report, components: matches, figmaOnly: [] };
    }
    return report;
  })
);

// ── altitude_list_ds_projects ────────────────────────────────────────────
server.registerTool(
  'altitude_list_ds_projects',
  {
    title: 'List design-system projects',
    description:
      'Every design system this repo drives, from .altitude/ds-projects.json: id, display name, ' +
      'brand, Figma file key/name/URL, Storybook port and parity-manifest path. Use it to discover ' +
      'the `project` argument accepted by altitude_check_parity.',
    inputSchema: {},
  },
  toolHandler(() => ({
    default: resolveProject().id,
    projects: listProjectIds().map((id) => {
      const p = resolveProject(id);
      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        isDefault: p.isDefault,
        figma: { fileKey: p.figma.fileKey, fileName: p.figma.fileName, url: p.resolved.figmaUrlBase },
        storybook: { port: p.storybook.port, brandTitle: p.storybook.brandTitle },
        parityManifest: p.paths.parityManifest,
      };
    }),
  }))
);

  return server;
}

// ── transports ───────────────────────────────────────────────────────────
// Default: stdio (what .mcp.json launches — one server, one client).
// `--http [port]`: streamable HTTP for the Storybook pairing
// (`pnpm --filter al-web-components start` runs both via concurrently), so
// any MCP client can attach to the running instance at /mcp while Storybook
// is up. Stateless: a fresh server+transport per POST, no session ids.
const httpFlag = process.argv.indexOf('--http');

if (httpFlag === -1) {
  await buildServer().connect(new StdioServerTransport());
} else {
  // 6017, not 6006+1: 6007 was observed occupied on a dev machine (and is the
  // first port a second `storybook dev` would grab anyway).
  const port = Number(process.argv[httpFlag + 1]) || Number(process.env.ALTITUDE_MCP_PORT) || 6017;

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => resolve(raw));
      req.on('error', reject);
    });

  const httpServer = createHttpServer(async (req, res) => {
    // CORS: the Storybook manager (localhost:6006) and other local tools may
    // fetch /parity.json cross-origin. Local dev surface only.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type, mcp-session-id, mcp-protocol-version');
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }

    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    try {
      if (url.pathname === '/healthz') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, name: 'altitude', transport: 'streamable-http' }));
        return;
      }
      if (url.pathname === '/parity.json') {
        // `?project=<id>` selects the design system; omitted falls back to
        // DS_PROJECT (set by each Storybook's config) then the registry default.
        const requested = url.searchParams.get('project') ?? undefined;
        // Compute BEFORE writing any header: an unknown project id must be able
        // to come back as a 400, and writeHead is not reversible.
        let payload;
        try {
          payload = JSON.stringify(computeParity(requested));
        } catch (err) {
          if (err?.code === 'ERR_UNKNOWN_DS_PROJECT') {
            res.writeHead(400, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: err.message, code: err.code, knownProjects: err.known }));
            return;
          }
          throw err;
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(payload);
        return;
      }
      if (url.pathname === '/ds-projects.json') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ default: resolveProject().id, projects: listProjectIds() }));
        return;
      }
      if (url.pathname === '/mcp') {
        if (req.method !== 'POST') {
          // Stateless mode: no SSE stream to resume, no session to delete.
          res.writeHead(405, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed (stateless server: POST only)' }, id: null }));
          return;
        }
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : undefined;
        const server = buildServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // stateless
          enableJsonResponse: true, // plain JSON responses; no SSE needed for reader tools
        });
        res.on('close', () => {
          transport.close();
          server.close();
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, body);
        return;
      }
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'Unknown route. Endpoints: POST /mcp, GET /parity.json[?project=<id>], GET /ds-projects.json, GET /healthz',
        }),
      );
    } catch (err) {
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: String(err?.message ?? err) }));
    }
  });

  httpServer.listen(port, () => {
    console.log(`[altitude-mcp] streamable HTTP on http://localhost:${port}/mcp (parity: /parity.json)`);
  });
}
