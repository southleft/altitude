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

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { loadComponents, getComponent } from './lib/cem.mjs';
import { getMigrationState } from './lib/migration.mjs';
import { loadSchema } from './lib/schemas.mjs';
import { getStoryInfo } from './lib/stories.mjs';
import { validate } from './lib/validate.mjs';
import { queryTokens } from './lib/tokens.mjs';
import { searchIcons } from './lib/icons.mjs';
import { generateTheme } from './lib/theme.mjs';
import { MissingArtifactError } from './lib/paths.mjs';

const server = new McpServer({ name: 'altitude', version: '1.0.0' });

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

const transport = new StdioServerTransport();
await server.connect(transport);
