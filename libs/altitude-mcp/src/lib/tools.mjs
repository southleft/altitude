// MCP TOOLS — a data-driven `TOOLS` array (R4, spec
// 2026-08-25-mcp-library-first-refactor), the same shape `STATIC_RESOURCES`
// (./resources.mjs) and `PROMPTS` (./prompts.mjs) already use: each entry is
// `{ name, config, handler }`, registered in a loop by
// `registerAltitudeTools()` in `../index.mjs`. This file used to be eight
// inline `server.registerTool(...)` calls in `../server.mjs`; the names, input
// schemas and error codes are unchanged from that version. A ninth tool,
// `altitude_resolve_token`, was added on 2026-09-03.
//
// EVERY `description` STRING IS WRITTEN FOR THE AGENT THAT READS IT, not for
// whoever maintains this file. They used to open with Figma contract vocabulary
// and internal spec task ids, and several named Storybook, which was retired
// on 2026-08-25 — a description is the only documentation an agent sees before
// choosing a tool, so provenance, task ids and file paths that are not
// actionable belong in comments like this one. Response shapes are additive
// only: fields have been ADDED (examples, guidance, react, a11y, per-token
// cssType/cssProperties) and none removed, so existing callers keep working.

import { z } from 'zod';

import { loadComponents, getComponent } from './cem.mjs';
import { getMigrationState } from './migration.mjs';
import { loadSchema } from './schemas.mjs';
import { getStoryInfo } from './stories.mjs';
import { validate } from './validate.mjs';
import { queryTokensDetailed } from './token-detail.mjs';
import { resolveTokenIntent, collapsedLadderReport } from './token-resolve.mjs';
import { searchIcons } from './icons.mjs';
import { generateTheme } from './theme.mjs';
import { computeParity, STATUS } from './parity.mjs';
import { resolveProject, listProjectIds } from './ds-project.mjs';
import { loadComponentContract, loadComponentDoc } from './component-docs.mjs';
import { examplesFor, guidanceFor, guidanceSummaryIndex } from './docs-artifacts.mjs';
import { getReactWrapper, wrapperNamesByTag, reactTwin } from './react-wrappers.mjs';
import { a11yFor } from './a11y.mjs';
import { MissingArtifactError } from './paths.mjs';

/** Uniform JSON tool response, with MissingArtifactError surfaced as structured data (not a thrown protocol error) so an agent can read `hint` and self-heal. */
export function json(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

/**
 * The `project` argument's description, WITHOUT reading the registry eagerly.
 *
 * This string used to be built by calling `listProjectIds()` / `resolveProject()`
 * inline in the description template. Both read `.altitude/ds-projects.json`, and
 * a description is evaluated at `registerTool()` time — so a missing or malformed
 * registry threw out of `buildServer()` and took down ALL EIGHT tools, not just
 * the two that need the registry. `altitude_list_components` has nothing to do
 * with design-system projects and should not stop working because a JSON file a
 * different tool reads went missing.
 *
 * The read is now best-effort: on success the ids are named (they are genuinely
 * useful in a description), on failure the description degrades to prose and the
 * error resurfaces where it belongs — inside the handler, as structured JSON the
 * agent can act on.
 *
 * LAZY BY CONSTRUCTION: `altitude_check_parity`'s `inputSchema` exposes the
 * `project` field through a GETTER, so this function runs when the tool is
 * REGISTERED (the SDK reads the schema at `registerTool()` time), not when
 * this module is imported. A plain property on the `TOOLS` array literal
 * would evaluate it at module-eval time — a filesystem read as an import
 * side effect (violates the index.mjs zero-side-effect contract), baked in
 * before any consumer `repoRoot` override could apply. The getter also means
 * a server registered after `configurePaths(repoRoot)` names THAT root's
 * project ids, not this checkout's.
 */
function describeProjectArg() {
  try {
    return `Design-system project id from .altitude/ds-projects.json (${listProjectIds().join(', ')}). Omit for the default ("${resolveProject().id}").`;
  } catch {
    return 'Design-system project id from .altitude/ds-projects.json. Call altitude_list_ds_projects for the valid ids (the registry could not be read when this server started, so they cannot be named here). Omit for the registry default.';
  }
}

export function toolHandler(fn) {
  return async (args) => {
    try {
      return json(await fn(args));
    } catch (err) {
      if (err instanceof MissingArtifactError) {
        return json({ error: err.message, code: err.code, path: err.path, hint: err.hint });
      }
      // Errors that carry their own `code` (UnknownProjectError's
      // ERR_MISSING_DS_REGISTRY / ERR_INVALID_DS_REGISTRY / ERR_UNKNOWN_DS_PROJECT)
      // are self-describing — pass the code and the known-id list through rather
      // than flattening them to a generic failure.
      return json({
        error: String(err?.message ?? err),
        code: typeof err?.code === 'string' ? err.code : 'ERR_TOOL_FAILURE',
        ...(Array.isArray(err?.known) && err.known.length ? { knownProjects: err.known } : {}),
      });
    }
  };
}

/** The nine tools this server registers — `{ name, config, handler }`, one per entry. */
export const TOOLS = [
  // ── altitude_list_components ────────────────────────────────────────────
  {
    name: 'altitude_list_components',
    config: {
      title: 'List Altitude components',
      description:
        'Every <al-*> element this design system ships — tag, class name, a one-line summary, and, where ' +
        'someone has written it, a guidance summary: what the component is FOR, when to use it, and when ' +
        'NOT to (each "when not to" may name the component to use instead). Read this before choosing a ' +
        'component; the whenNotToUse entries are the only thing here that can stop a wrong choice. ' +
        'Optionally narrow the list with `filter`, a case-insensitive substring matched against the tag, ' +
        'class name or description. Components without authored guidance say so explicitly — treat that ' +
        'as "nobody has written it yet", never as "this component has no caveats".',
      inputSchema: {
        filter: z.string().optional().describe('Case-insensitive substring to match against tag, className, or description.'),
      },
    },
    // Guidance is looked up for the DEFAULT design-system project, because this
    // tool lists the base CEM — the whole shared library, not one project's
    // scoped subset. A brand layer's own guidance for a superseded tag is
    // reached through altitude_get_component({ tag, project }).
    handler: toolHandler(({ filter }) => {
      const q = filter?.toLowerCase().trim();
      const summaries = guidanceSummaryIndex(null);
      const components = loadComponents()
        .filter((c) => !q || [c.tag, c.className, c.description].some((s) => s?.toLowerCase().includes(q)))
        .map((c) => ({
          tag: c.tag,
          className: c.className,
          summary: c.summary || c.description,
          migration: getMigrationState(c.tag),
          guidance: summaries.ok ? (summaries.summaries.get(c.tag) ?? null) : null,
        }));
      return {
        count: components.length,
        // Named, not implied: without this a caller cannot tell an unbuilt docs
        // artifact from a library where nobody has authored guidance at all.
        guidanceCoverage: summaries.ok
          ? summaries.coverage
          : { available: false, reason: summaries.note },
        components,
      };
    }),
  },

  // ── altitude_get_component ──────────────────────────────────────────────
  {
    name: 'altitude_get_component',
    config: {
      title: 'Get one Altitude component',
      description:
        'Everything you need to write correct code for one <al-*> element. ' +
        '`examples[]` — working markup taken from the component\'s own story, with a React twin where one ' +
        'is derivable; start here rather than assembling markup from the attribute list. ' +
        '`guidance` — the authored purpose, when to use it, and when NOT to (with the component to reach ' +
        'for instead). `react` — the @southleft/al-react wrapper name, its import specifier, and the ' +
        'event-name-to-prop mapping, which is the part nothing else records: a custom event only reaches ' +
        'React through the prop named here. `a11y` — the element and ARIA surface the component renders, ' +
        'the measured axe result (or an explicit statement that it was never measured — a missing result ' +
        'is not a pass), and any accessibility obligation the consumer has to meet. ' +
        'Plus the generated API: `attributes`, `slots`, `events`, `cssParts`, `cssProperties`, the JSON ' +
        'Schema, the migration state, and the documentation URL. ' +
        '`contract` and `referenceDoc` describe the component as it exists in the resolved `project`\'s ' +
        'Figma library — variant axes, slots, states and token bindings — and are present only for a tag ' +
        'that has been mapped to a Figma set. ' +
        'Anything that cannot be produced says why in a matching `*Note` field instead of going missing.',
      inputSchema: {
        tag: z.string().describe('The custom element tag name, e.g. "al-button".'),
        // Getter, not a plain property — see describeProjectArg()'s header.
        get project() {
          return z.string().optional().describe(describeProjectArg());
        },
      },
    },
    handler: toolHandler(({ tag, project }) => {
      const component = getComponent(tag);
      if (!component) {
        return { error: `No CEM entry for tag "${tag}".`, code: 'ERR_UNKNOWN_COMPONENT' };
      }
      // Contract/doc lookup is per-project, but a missing/unknown project id
      // here must not fail a request that only asked for CEM facts — the
      // rest of this tool's response has nothing to do with ds-projects.json.
      let contract = null;
      let referenceDoc = null;
      let projectId = null;
      try {
        const resolved = resolveProject(project);
        projectId = resolved.id;
        contract = loadComponentContract(component.tag, resolved.id);
        referenceDoc = loadComponentDoc(component.tag, resolved.id);
      } catch {
        // Unknown/misconfigured project — leave contract/referenceDoc null,
        // same graceful-degradation discipline as a tag with no contract.
        //
        // The unresolvable id is passed THROUGH to the docs-artifact readers
        // rather than swallowed to null. Null means "the default project", and
        // a brand layer supersedes base components under the same tag, so
        // quietly answering `project: "typo"` with the default system's example
        // and advice would hand back confidently wrong code for a component
        // nobody asked about. Those readers turn the unresolvable id into a
        // note naming altitude_list_ds_projects instead.
        projectId = project ?? null;
      }

      // The React wrapper index is needed twice: once for THIS component's
      // wrapper, and once as a tag -> wrapper map so an example's markup can be
      // translated into the JSX a React consumer would write. Both come from
      // libs/al-react's own source; neither is a maintained table.
      const react = getReactWrapper(component.modulePath);
      const wrapperByTag = wrapperNamesByTag(loadComponents());

      const { examples, examplesNote } = examplesFor(component.tag, projectId, (example) => {
        const twin = reactTwin(example.code, wrapperByTag);
        return {
          ...example,
          react: twin.code ?? null,
          reactImports: twin.imports ?? null,
          // Null when the twin was produced; a sentence naming what stopped it
          // otherwise (a style attribute, a comment, an unwrapped element).
          reactNote: twin.note ?? null,
        };
      });
      const { guidance, guidanceNote } = guidanceFor(component.tag, projectId);

      return {
        tag: component.tag,
        className: component.className,
        description: component.description,
        summary: component.summary,
        // Working code first: it is what a caller acts on, and an attribute
        // table read before an example is what invention grows out of.
        examples,
        examplesNote,
        guidance,
        guidanceNote,
        react,
        reactNote: react
          ? null
          : `no @southleft/al-react wrapper ships for "${component.tag}" — use the custom element directly, ` +
            'or check libs/al-react/src/components for a differently-named wrapper.',
        a11y: a11yFor(component.tag, contract, guidance),
        attributes: component.attributes,
        slots: component.slots,
        events: component.events,
        cssParts: component.cssParts,
        cssProperties: component.cssProperties,
        migration: getMigrationState(component.tag),
        schema: loadSchema(component.tag),
        story: getStoryInfo(component.modulePath),
        ...(contract ? { contract } : {}),
        ...(referenceDoc ? { referenceDoc } : {}),
      };
    }),
  },

  // ── altitude_validate ────────────────────────────────────────────────────
  {
    name: 'altitude_validate',
    config: {
      title: 'Validate Altitude usage',
      description:
        'Check <al-*> or @southleft/al-react code against the shipped component API before it ships — it ' +
        'catches an element, attribute, enum value or type that does not exist. Pass inline `markup`, or ' +
        'a `path` to a file or directory to scan. Each violation carries a stable code ' +
        '(ERR_UNKNOWN_COMPONENT, ERR_UNKNOWN_ATTRIBUTE, ERR_INVALID_ENUM, ERR_TYPE_MISMATCH) and a fix. ' +
        'Run this on anything you generated from an attribute table rather than from an example.',
      inputSchema: {
        markup: z.string().optional().describe('Inline HTML/JSX/markup to validate.'),
        path: z.string().optional().describe('A file or directory path to scan instead of inline markup.'),
      },
    },
    handler: toolHandler(({ markup, path }) => validate({ markup, path })),
  },

  // ── altitude_get_tokens ──────────────────────────────────────────────────
  {
    name: 'altitude_get_tokens',
    config: {
      title: 'Query Altitude design tokens',
      description:
        'Find the right design token and the CSS properties it is legal in. Every result carries ' +
        '`cssType` — the surface the token was authored for (spacing, borderRadius, fontSizes …) — and ' +
        '`cssProperties`, the allow-list of concrete properties it may set. Use those, not `type`: the ' +
        'DTCG `type` is deliberately coarse and collapses sizing, spacing, radius, border width, font ' +
        'size and line height all into "dimension", so it cannot tell you what a token is FOR. ' +
        '`description` is derived, not authored: one sentence stating the surface and role the token is ' +
        'for, its emphasis step, what it resolves to in each mode, any neighbouring step it resolves to ' +
        'the SAME value as, and the measured contrast pair where one exists — so it cannot go stale ' +
        'against the build. If you know what you need but not which token it is, call ' +
        'altitude_resolve_token instead: this tool is a substring filter and will not choose between ' +
        'weak, default, strong and bold for you. ' +
        'With no filters you get the resolved default build (altitude brand, light mode). Add `tier` ' +
        '(1|2|3), `brand` or `mode` to query the source tree instead and see raw plus resolved values per ' +
        'brand/mode — a token\'s custom-property NAME never changes across those, only its value. `name` ' +
        'is a substring filter in every case. Never write a --al-* name that does not appear here: CSS ' +
        'resolves an unknown custom property silently, so an invented token renders and is wrong.',
      inputSchema: {
        tier: z.union([z.string(), z.number()]).optional().describe('1, 2, or 3 (or "tier-1" etc).'),
        brand: z
          .enum(['altitude', 'southleft'])
          .optional()
          .describe(
            'The two brands this design system ships. "altitude" is the default identity; "southleft" is ' +
            'the southleft.com brand. No other brand exists — a value outside this enum is rejected.',
          ),
        mode: z.enum(['light', 'dark']).optional(),
        name: z.string().optional().describe('Substring to match against the token name.'),
        limit: z.number().int().positive().max(1000).optional(),
      },
    },
    handler: toolHandler((args) => queryTokensDetailed(args)),
  },

  // ── altitude_resolve_token ───────────────────────────────────────────────
  //
  // The intent vocabulary, the ladder walk and the collapse facts all live in
  // ./token-resolve.mjs; this entry is registration and schema only. Two things
  // about the SCHEMA are deliberate: `role`/`surface`/`emphasis` are `z.string()`
  // and not enums, because the valid values are DERIVED from the emitted token
  // set at call time (an enum baked here would be a hardcoded token list that
  // goes stale the next time a role ships), and a wrong value comes back as a
  // structured error carrying the real list rather than as a protocol rejection
  // the agent cannot read.
  {
    name: 'altitude_resolve_token',
    config: {
      title: 'Resolve an intent to one Altitude token',
      description:
        'Describe the colour you need and get back exactly ONE token name — not a list to guess from. ' +
        'Say what it paints (`surface`: background, content, border), what it means (`role`: neutral, ' +
        'primary, danger, success, warning, info …), and how loud it should be (`emphasis`: a step like ' +
        '"weak"/"strong", or a direction like "stronger"/"weaker"/"strongest"). Add `state` (hover, ' +
        'active, selected, disabled) to move along the ladder the way the components do, `property` to ' +
        'have the CSS property you are setting checked against the token\'s allow-list, and `mode` to ' +
        'ask about one mode instead of both. ' +
        'The answer carries the resolved value in each mode, the reason that token won, and the near ' +
        'misses it beat — so the choice is checkable rather than trusted. ' +
        'This exists because the emphasis ladder does not always step: in the light bundle ' +
        'background-neutral-weak and background-neutral-strong are THE SAME colour, and there are 35 ' +
        'such collapses across the four brand+mode bundles. Asking for "stronger" walks past a rung ' +
        'that would have rendered an identical pixel and tells you it did. ' +
        'Pass `report: true` with no other argument to list every collapsed ladder, per brand and mode.',
      inputSchema: {
        role: z
          .string()
          .optional()
          .describe(
            'What the colour MEANS: neutral, primary, secondary, tertiary, info, success, warning, ' +
            'danger, inverse, disabled. Common synonyms are accepted (error -> danger, accent -> ' +
            'primary, grey -> neutral). Required unless `report` is true.',
          ),
        surface: z
          .string()
          .optional()
          .describe(
            'What the colour PAINTS: "background" (a fill), "content" (text/icon ink), "border" (a ' +
            'stroke), "shadow". Synonyms accepted (fill, text, ink, stroke, outline, divider). Required ' +
            'unless `report` is true.',
          ),
        emphasis: z
          .string()
          .optional()
          .describe(
            'Either a rung — faint, weak, default, strong, bold — or a DIRECTION to walk from the ' +
            'default: stronger, weaker, strongest, weakest (softer/louder/subtler also work). A ' +
            'direction is the safer ask: it steps over rungs that resolve to the same value.',
          ),
        state: z
          .string()
          .optional()
          .describe(
            'Interaction state, applied as movement along the ladder the way the components paint it ' +
            '(hover = one rung up, active/pressed = two, selected = one, focus/rest = none). ' +
            '"disabled" selects the tree\'s own disabled role instead.',
          ),
        property: z
          .string()
          .optional()
          .describe(
            'The CSS property this token will set, e.g. "background-color". Checked against the ' +
            'token\'s derived cssProperties allow-list, and flagged when it contradicts `surface`.',
          ),
        mode: z.enum(['light', 'dark']).optional().describe('Ask about one mode. Omit to require a token that works in both.'),
        brand: z.string().optional().describe('Brand to resolve against. Omit for the default identity.'),
        report: z
          .boolean()
          .optional()
          .describe('Return the collapsed-emphasis-ladder report instead of resolving a token. Narrowable by `brand`/`mode`.'),
      },
    },
    handler: toolHandler((args) => {
      if (args?.report) return collapsedLadderReport({ brand: args.brand, mode: args.mode });
      if (!args?.role || !args?.surface) {
        return {
          error: 'Both `role` and `surface` are required (or pass `report: true` for the collapsed-ladder report).',
          code: 'ERR_INCOMPLETE_TOKEN_INTENT',
          hint: 'e.g. { surface: "background", role: "neutral", emphasis: "stronger" }',
        };
      }
      return resolveTokenIntent(args);
    }),
  },

  // ── altitude_search_icons ────────────────────────────────────────────────
  {
    name: 'altitude_search_icons',
    config: {
      title: 'Search Altitude icons',
      description:
        'Find an icon by name, tag or category across the 1,512-glyph Phosphor catalog. Every result ' +
        'comes with the exact import and registerIcons() snippet that makes it render — copy that ' +
        'rather than guessing a glyph name, since an unregistered icon fails silently.',
      inputSchema: {
        query: z.string().optional().describe('Substring match against icon name, tags, or categories.'),
        category: z.string().optional().describe('Exact category match, e.g. "weather", "arrows".'),
        limit: z.number().int().positive().max(200).optional(),
      },
    },
    handler: toolHandler((args) => {
      const results = searchIcons(args);
      return { count: results.length, icons: results };
    }),
  },

  // ── altitude_generate_theme ──────────────────────────────────────────────
  {
    name: 'altitude_generate_theme',
    config: {
      title: 'Generate an Altitude theme (deterministic OKLCH solver)',
      description:
        'Derive a complete Altitude token override set — a new brand — from a short text `prompt`, an ' +
        'explicit `direction` object (hues, chroma, personality, mode, radius, elevation, motion), or ' +
        'both. The solver works in OKLCH and enforces WCAG AA contrast on every pair it emits, so the ' +
        'result is usable rather than merely plausible. It is deterministic: the same input always ' +
        'returns the same palette, and it never calls a model or invents a color it did not derive.',
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
    handler: toolHandler((args) => generateTheme(args)),
  },

  // ── altitude_check_parity ────────────────────────────────────────────────
  {
    name: 'altitude_check_parity',
    config: {
      title: 'Check Figma <-> code parity',
      description:
        'Whether each component still matches its Figma counterpart: in-sync, code-drift, figma-drift, ' +
        'conflict, missing-in-figma, missing-in-code, or excluded. Ask for one `tag` or the whole ' +
        'report, and narrow by `status`. Each drifted entry carries an `aiPrompt` — a ready-to-run ' +
        'reconciliation prompt naming that project\'s own Figma file — and, where a canvas dump exists, ' +
        'a property-level `disagreements[]` saying exactly which value differs on which side. ' +
        'One component library backs several design systems here, so pass `project` to check a system ' +
        'other than the default. Code drift is measured live from the component source; Figma drift is ' +
        'as of the last recorded refresh, which the report timestamps so you can tell how fresh it is.',
      inputSchema: {
        tag: z.string().optional().describe('One custom element tag, e.g. "al-button". Omit for the full report.'),
        status: z
          .enum(Object.values(STATUS))
          .optional()
          .describe('Only return components with this status.'),
        // Getter, not a plain property: defers the registry read to
        // registerTool() time — see describeProjectArg()'s header.
        get project() {
          return z.string().optional().describe(describeProjectArg());
        },
      },
    },
    handler: toolHandler(({ tag, status, project }) => {
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
    }),
  },

  // ── altitude_list_ds_projects ────────────────────────────────────────────
  {
    name: 'altitude_list_ds_projects',
    config: {
      title: 'List design-system projects',
      description:
        'Every design system built on this component library: id, display name, the brand its ' +
        'components render under, its Figma file, and its documentation site. Call this to discover the ' +
        '`project` argument that altitude_check_parity and altitude_get_component accept — the default ' +
        'is flagged, and passing an unknown id returns the valid list.',
      inputSchema: {},
    },
    handler: toolHandler(() => ({
      default: resolveProject().id,
      projects: listProjectIds().map((id) => {
        const p = resolveProject(id);
        return {
          id: p.id,
          name: p.name,
          brand: p.brand,
          isDefault: p.isDefault,
          figma: { fileKey: p.figma.fileKey, fileName: p.figma.fileName, url: p.resolved.figmaUrlBase },
          // null when a project has no Storybook (Southleft's was retired in
          // favour of the docs site); `docs` is the surface that replaced it.
          storybook: p.storybook ? { port: p.storybook.port, brandTitle: p.storybook.brandTitle } : null,
          docs: p.docs?.productionBase ?? null,
          parityManifest: p.paths.parityManifest,
        };
      }),
    })),
  },
];
