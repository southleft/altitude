// MCP RESOURCES — read-only, subscribable-by-URI views over the same
// generated artifacts the tools already read (see ./paths.mjs). A resource
// is the right shape for something an agent wants to pull wholesale and keep
// open (a manifest, a digest, a registry) rather than query with filters —
// that's what the tools are for. Nothing here is a second source of truth:
// every reader below points at a file `paths.mjs` already names.
//
// URI SCHEME — `altitude://<category>[/<name>]`
// ------------------------------------------------------------------------
// One custom scheme, `altitude:`, host-less (the path segments after `://`
// carry all the structure). Six artifacts are SINGLE-INSTANCE — one CEM, one
// resolved token set, one a11y report, two ai-readiness digests, one project
// registry — so each gets a fixed URI:
//
//   altitude://components              the base CEM (libs/al-web-components/custom-elements.json)
//   altitude://tokens                  the resolved flat token set (dist/css/tokens.json)
//   altitude://a11y-report             the axe sweep (.altitude/a11y/report.json)
//   altitude://ai-readiness/cem-digest
//   altitude://ai-readiness/tokens-digest
//   altitude://ds-projects             the design-system project registry itself
//
// ONE artifact is genuinely PER-PROJECT: the Figma <-> code parity manifest.
// This repo drives more than one design system off one component library
// (see ds-project.mjs) and each project owns its own manifest file
// (`.altitude/figma-sync/parity-manifest.json`,
// `.altitude/figma-sync/southleft/parity-manifest.json`, and any project
// added to `.altitude/ds-projects.json` in future). That is exactly the case
// a `ResourceTemplate` exists for, so the parity manifest is the ONE
// templated resource here:
//
//   altitude://parity-manifest/{project}
//
// Why a template and not N static URIs (`altitude://parity-manifest/altitude`,
// `altitude://parity-manifest/southleft`, ...) hardcoded one-by-one: static
// URIs would mean every new design system added to ds-projects.json needs a
// matching server.mjs edit before its manifest is reachable as a resource —
// the exact "hand-maintained index of a generated thing" this whole spec
// pass (see NEXT-GEN-UPGRADE-PLAN.md / R7) is fighting everywhere else. A
// template's `list` callback enumerates `listProjectIds()` at LIST time
// (never at registration time — see the eager-read postmortem below), so a
// new project registers itself for free.
//
// Every other candidate artifact in this repo (component CEM, tokens, a11y
// report, the two ai-readiness digests) has exactly one instance today, so a
// template would only add indirection with nothing to parameterize — hence
// the plain fixed URIs above for those six.
//
// FAILURE DISCIPLINE — matches toolHandler() in ../server.mjs exactly.
// server.mjs:244's postmortem: an eager `listProjectIds()` read INSIDE a
// tool's description template ran at `registerTool()` time, so one missing
// `ds-projects.json` threw out of `buildServer()` and killed all eight
// tools, not just the two that touch the registry. Every reader below is
// LAZY — nothing here runs until a `resources/list` or `resources/read`
// request actually asks for it — and every read is wrapped so a missing or
// malformed artifact comes back as a structured JSON error resource (same
// {error, code, path, hint} shape toolHandler returns), never a thrown
// protocol error and never a crash that takes other resources down with it.
// `resources/list-templates/list` sees empty/degraded lists rather than an
// unhandled rejection.

import { readFileSync, existsSync } from 'node:fs';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

import { PATHS, HINTS, MissingArtifactError } from './paths.mjs';
import { listProjectIds, resolveProject, UnknownProjectError } from './ds-project.mjs';

const JSON_MIME = 'application/json';

/** Structured error contents — the resource-read equivalent of toolHandler()'s `json({error, ...})`. */
function errorContents(uri, err) {
  const payload =
    err instanceof MissingArtifactError
      ? { error: err.message, code: err.code, path: err.path, hint: err.hint }
      : {
          error: String(err?.message ?? err),
          code: typeof err?.code === 'string' ? err.code : 'ERR_RESOURCE_FAILURE',
          ...(Array.isArray(err?.known) && err.known.length ? { knownProjects: err.known } : {}),
        };
  return { contents: [{ uri: uri.href ?? String(uri), mimeType: JSON_MIME, text: JSON.stringify(payload, null, 2) }] };
}

/** Read one JSON artifact off disk into a single-content ReadResourceResult, or a structured error. */
function readJsonArtifact(uri, path, hint) {
  try {
    if (!existsSync(path)) throw new MissingArtifactError(path, hint);
    const text = readFileSync(path, 'utf8');
    return { contents: [{ uri: uri.href ?? String(uri), mimeType: JSON_MIME, text }] };
  } catch (err) {
    return errorContents(uri, err);
  }
}

/** Resolve the resolved-tokens artifact path, preferring the packaged copy (mirrors tokens.mjs). */
function resolvedTokensPath() {
  return existsSync(PATHS.tokensJson) ? PATHS.tokensJson : PATHS.tokensJsonFallback;
}

/** Static (fixed-URI) resource definitions: [name, uri, config, readCallback]. */
export const STATIC_RESOURCES = [
  [
    'altitude-components',
    'altitude://components',
    {
      title: 'Altitude components (CEM)',
      description:
        'The base @southleft/al-web-components Custom Elements Manifest — every <al-*> tag, its ' +
        'attributes, slots, events, and CSS parts/properties. Same source as altitude_list_components / ' +
        'altitude_get_component.',
      mimeType: JSON_MIME,
    },
    (uri) => readJsonArtifact(uri, PATHS.cem, HINTS.cem),
  ],
  [
    'altitude-tokens',
    'altitude://tokens',
    {
      title: 'Altitude resolved tokens',
      description:
        'The flat, fully-resolved --al-* custom-property map (default altitude/light build). Same ' +
        'artifact altitude_get_tokens queries with no filters.',
      mimeType: JSON_MIME,
    },
    (uri) => readJsonArtifact(uri, resolvedTokensPath(), HINTS.tokens),
  ],
  [
    'altitude-a11y-report',
    'altitude://a11y-report',
    {
      title: 'Altitude accessibility report',
      description: 'The axe-core sweep across every component (.altitude/a11y/report.json).',
      mimeType: JSON_MIME,
    },
    (uri) => readJsonArtifact(uri, PATHS.a11yReport, HINTS.a11yReport),
  ],
  [
    'altitude-ai-readiness-cem-digest',
    'altitude://ai-readiness/cem-digest',
    {
      title: 'AI-readiness CEM digest',
      description:
        'Thin per-tag map of real attributes/slots/events/cssParts/cssProperties with literal-union ' +
        'enum strings, plus doNotFlag carve-outs — the shape the fleet probe agents are pointed at.',
      mimeType: JSON_MIME,
    },
    (uri) => readJsonArtifact(uri, PATHS.aiReadinessCemDigest, HINTS.aiReadinessCemDigest),
  ],
  [
    'altitude-ai-readiness-tokens-digest',
    'altitude://ai-readiness/tokens-digest',
    {
      title: 'AI-readiness tokens digest',
      description:
        'Every --al-* token grouped by family, with a `conventions` block (including notExistDoNotInvent) ' +
        'documenting the naming/suffix scheme.',
      mimeType: JSON_MIME,
    },
    (uri) => readJsonArtifact(uri, PATHS.aiReadinessTokensDigest, HINTS.aiReadinessTokensDigest),
  ],
  [
    'altitude-ds-projects',
    'altitude://ds-projects',
    {
      title: 'Design-system project registry',
      description:
        'The raw .altitude/ds-projects.json this repo’s parity engine resolves against: every design ' +
        'system, its Figma file, brand, docs base and manifest path. Same source altitude_list_ds_projects reads.',
      mimeType: JSON_MIME,
    },
    (uri) => readJsonArtifact(uri, PATHS.dsProjects, HINTS.dsProjects),
  ],
];

/** The one templated resource: the per-project Figma <-> code parity manifest. */
export function parityManifestTemplate() {
  return new ResourceTemplate('altitude://parity-manifest/{project}', {
    // Called on `resources/list` (or `resources/templates/list` completion),
    // NOT at registration time — a missing/malformed registry degrades to an
    // empty list rather than throwing out of buildServer().
    list: async () => {
      let ids;
      try {
        ids = listProjectIds();
      } catch {
        return { resources: [] };
      }
      return {
        resources: ids.map((id) => ({
          uri: `altitude://parity-manifest/${id}`,
          name: `altitude-parity-manifest-${id}`,
          title: `${id} parity manifest`,
          mimeType: JSON_MIME,
        })),
      };
    },
  });
}

export function readParityManifest(uri, variables) {
  const id = Array.isArray(variables.project) ? variables.project[0] : variables.project;
  try {
    const project = resolveProject(id);
    return readJsonArtifact(uri, project.resolved.parityManifest, `scripts/figma-parity/seed-manifest.mjs --project ${project.id}`);
  } catch (err) {
    // UnknownProjectError (ERR_UNKNOWN_DS_PROJECT / ERR_MISSING_DS_REGISTRY /
    // ERR_INVALID_DS_REGISTRY) — same codes altitude_check_parity surfaces.
    return errorContents(uri, err instanceof UnknownProjectError ? err : err);
  }
}
