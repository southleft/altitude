#!/usr/bin/env node
/**
 * Generate libs/altitude-mcp/CAPABILITY-MATRIX.md — Carbon's format:
 * intent -> tool/resource/prompt -> required filters -> expected result
 * fields -> common failure mode.
 *
 * WHY GENERATED, AND WHAT PART OF IT IS GENERATED. The roster columns (name,
 * required args/filters) come from a REAL MCP handshake against the actual
 * server — this script spawns libs/altitude-mcp/src/server.mjs over stdio,
 * the same way test/smoke.mjs does, and reads `tools/list`, `resources/list`,
 * `resources/templates/list`, and `prompts/list` off the wire. That half
 * cannot drift from server.mjs by construction: it IS server.mjs, running.
 *
 * The "intent" / "expected result fields" / "common failure mode" columns
 * are prose knowledge no protocol response carries (an inputSchema does not
 * say what a 200 looks like, and it does not say what error code a caller
 * will hit). Those live in the METADATA map below, keyed by the same name
 * the live handshake returns. `check(...)` fails LOUDLY if a registered
 * name has no METADATA entry — so a ninth tool, a new resource, or a new
 * prompt cannot ship with an undocumented row; the generator refuses to
 * paper over it with a placeholder.
 *
 * Every failure-mode entry is sourced from a real `code` in server.mjs or
 * src/lib/*.mjs (grep for `code:` / `this.code =`), never invented. Where a
 * surface genuinely has no observed failure mode (e.g. an optional filter
 * that just narrows an array), the entry says "none observed" rather than
 * manufacturing one.
 *
 * Lives under libs/altitude-mcp/ (not repo-root scripts/) so it resolves
 * @modelcontextprotocol/sdk from this workspace's own node_modules rather
 * than needing the SDK hoisted to the repo root.
 *
 * Usage:
 *   node libs/altitude-mcp/scripts/build-capability-matrix.mjs            # write CAPABILITY-MATRIX.md
 *   node libs/altitude-mcp/scripts/build-capability-matrix.mjs --check    # fail if the tracked file has drifted
 *   pnpm --filter @southleft/altitude-mcp run capability-matrix[:check]   # same, via the package script
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url)); // libs/altitude-mcp
const REPO_ROOT = path.join(PACKAGE_ROOT, '..', '..');
const SERVER_PATH = path.join(PACKAGE_ROOT, 'src', 'server.mjs');
const OUT = path.join(PACKAGE_ROOT, 'CAPABILITY-MATRIX.md');
const CHECK = process.argv.includes('--check');

/**
 * Authored knowledge, one entry per registered tool/resource/prompt NAME.
 * `requiredFilters` here is a FALLBACK only — for tools/prompts the live
 * schema's `required` array wins when present; this covers resources, whose
 * protocol carries no per-URI "required" concept.
 */
const METADATA = {
  // ── tools ────────────────────────────────────────────────────────────
  altitude_list_components: {
    intent: 'Discover components, or filter by a tag/class/description substring',
    expectedFields: 'count, components[].{tag, className, summary, migration}',
    commonFailureMode: 'none observed — an unmatched `filter` returns an empty components[], not an error',
  },
  altitude_get_component: {
    intent: 'Get one component\'s full contract (attributes, slots, events, CSS parts/properties, schema, docs URL)',
    expectedFields: 'tag, className, attributes, slots, events, cssParts, cssProperties, migration, schema, story',
    commonFailureMode: 'unknown `tag` -> {error, code: ERR_UNKNOWN_COMPONENT} (server.mjs)',
  },
  altitude_validate: {
    intent: 'Check <al-*> / @southleft/al-react usage against the shipped component contracts before it ships',
    expectedFields: 'apiVersion, type, data.violations[].{component, rule, code, fix}',
    commonFailureMode:
      'violations carry ERR_UNKNOWN_COMPONENT / ERR_UNKNOWN_ATTRIBUTE / ERR_INVALID_ENUM / ERR_TYPE_MISMATCH ' +
      '(cli/validate.mjs, wrapped verbatim); the CLI itself missing -> ERR_MISSING_ARTIFACT (paths.mjs)',
  },
  altitude_get_tokens: {
    intent: 'Query the resolved token set, or a tier/brand/mode-scoped source token',
    expectedFields: 'count, totalMatched, tokens[].{name, tier?, brand?, mode?, rawValue?, resolvedValue?, type}',
    commonFailureMode:
      '`brand` outside the shipped enum (altitude|southleft — a pruned brand) is rejected at the protocol ' +
      'level by the zod input schema, before the handler runs; a missing dist/css/tokens.json (and its ' +
      'styles/dist/ fallback) -> ERR_MISSING_ARTIFACT (paths.mjs, HINTS.tokens)',
  },
  altitude_search_icons: {
    intent: 'Find a Phosphor icon by name/tag/category and get its exact import + registerIcons() snippet',
    expectedFields: 'count, icons[].{name, pascalName, categories, tags, exportName, snippet}',
    commonFailureMode: 'none observed — an unmatched query/category returns an empty icons[], not an error',
  },
  altitude_generate_theme: {
    intent: 'Derive a WCAG-AA token override set from a short prompt or an explicit art-direction object',
    expectedFields: 'name, quip, mode, personality, palette, receipts, direction, source',
    commonFailureMode:
      'both the built theme-engine barrel and its TypeScript source missing (incomplete checkout) -> a ' +
      'thrown Error surfaced by toolHandler() as {error, code: ERR_TOOL_FAILURE} (theme.mjs has no ' +
      'dedicated code for this case)',
  },
  altitude_check_parity: {
    intent: 'Figma <-> code parity for one component or the full report, for any registered design-system project',
    expectedFields: 'project, manifestPresent, components[].{tag, status, driftBasis, aiPrompt, ...}, scope, observation',
    commonFailureMode:
      'unknown `project` -> {error, code: ERR_UNKNOWN_DS_PROJECT, knownProjects} (ds-project.mjs); a missing ' +
      'or malformed .altitude/ds-projects.json -> ERR_MISSING_DS_REGISTRY / ERR_INVALID_DS_REGISTRY; unknown ' +
      '`tag` -> {error, code: ERR_UNKNOWN_COMPONENT}',
  },
  altitude_list_ds_projects: {
    intent: 'Discover design-system project ids and their Figma file / brand / docs / parity-manifest coordinates',
    expectedFields: 'default, projects[].{id, name, brand, isDefault, figma, storybook, docs, parityManifest}',
    commonFailureMode: 'missing or malformed .altitude/ds-projects.json -> {error, code: ERR_MISSING_DS_REGISTRY | ERR_INVALID_DS_REGISTRY}',
  },
  // ── resources ────────────────────────────────────────────────────────
  'altitude://components': {
    intent: 'Pull the whole Custom Elements Manifest for local analysis or caching',
    expectedFields: 'the raw CEM JSON (modules[].declarations[]…) — same file altitude_list_components/altitude_get_component parse',
    commonFailureMode: 'missing custom-elements.json -> JSON content {error, code: ERR_MISSING_ARTIFACT, path, hint}, never a thrown protocol error',
  },
  'altitude://tokens': {
    intent: 'Pull the whole resolved --al-* token set',
    expectedFields: 'the raw dist/css/tokens.json contents (flat name -> value map)',
    commonFailureMode: 'missing dist/css/tokens.json and its styles/dist/ fallback -> {error, code: ERR_MISSING_ARTIFACT, hint: HINTS.tokens}',
  },
  'altitude://a11y-report': {
    intent: 'Pull the full axe-core accessibility sweep across every component',
    expectedFields: 'the raw .altitude/a11y/report.json contents',
    commonFailureMode: 'missing report.json -> {error, code: ERR_MISSING_ARTIFACT, hint: "pnpm run a11y:report"}',
  },
  'altitude://ai-readiness/cem-digest': {
    intent: 'Pull the fleet-probe-shaped CEM digest (attributes/slots/events + doNotFlag carve-outs)',
    expectedFields: 'the raw .altitude/ai-readiness/cem-digest.json contents',
    commonFailureMode: 'missing digest -> {error, code: ERR_MISSING_ARTIFACT, hint: "node scripts/ai-readiness/build-cem-digest.mjs"}',
  },
  'altitude://ai-readiness/tokens-digest': {
    intent: 'Pull the fleet-probe-shaped tokens digest (families + do-not-invent conventions)',
    expectedFields: 'the raw .altitude/ai-readiness/tokens-digest.json contents',
    commonFailureMode: 'missing digest -> {error, code: ERR_MISSING_ARTIFACT, hint: "node scripts/ai-readiness/build-tokens-digest.mjs"}',
  },
  'altitude://ds-projects': {
    intent: 'Pull the raw design-system project registry',
    expectedFields: 'the raw .altitude/ds-projects.json contents (default + projects{})',
    commonFailureMode: 'missing registry -> {error, code: ERR_MISSING_ARTIFACT} (a tracked file; restore via git)',
  },
  'altitude://parity-manifest/{project}': {
    intent: 'Pull one design system\'s Figma <-> code parity manifest',
    requiredFilters: '{project} — any id from altitude_list_ds_projects / altitude://ds-projects',
    expectedFields: 'the raw parity-manifest.json contents for that project (components{}, figmaOnly[], figmaLastRefreshed)',
    commonFailureMode:
      'unknown project id -> {error, code: ERR_UNKNOWN_DS_PROJECT, knownProjects}; missing/malformed registry -> ' +
      'ERR_MISSING_DS_REGISTRY / ERR_INVALID_DS_REGISTRY — same codes altitude_check_parity surfaces, always as ' +
      'resource content, never a thrown protocol error (verified: server still starts and lists resources with ' +
      'ds-projects.json moved aside)',
  },
  // ── prompts ──────────────────────────────────────────────────────────
  audit_component_parity: {
    intent: 'Draft a Figma <-> code reconciliation plan for one component, grounded in the live parity engine',
    expectedFields: 'one user message: current status, drift basis, the parity engine\'s ready-to-run aiPrompt (if drifted), a pointer to the altitude-figma-sync skill',
    commonFailureMode: 'unknown `tag` -> message body {error, code: ERR_UNKNOWN_COMPONENT}; unknown `project` -> {error, code: ERR_UNKNOWN_DS_PROJECT, knownProjects}',
  },
  generate_brand_theme: {
    intent: 'Draft an altitude_generate_theme call (prompt + optional mode/personality) and how to apply the result',
    expectedFields: 'one user message naming the exact tool call to make, plus how to apply the returned palette',
    commonFailureMode: '`prompt` missing or over 80 chars is rejected at the protocol level by the zod argsSchema, before the callback runs',
  },
  check_snippet_convention: {
    intent: 'Draft an altitude_validate call for a proposed snippet, plus the code -> fix self-heal loop',
    expectedFields: 'one user message naming the exact tool call and the REPAIR.md-keyed self-heal loop',
    commonFailureMode: 'empty `markup` is rejected at the protocol level by the zod argsSchema (min length 1), before the callback runs',
  },
  scaffold_component: {
    intent: 'Pre-flight a proposed component name against the layout-primitive gate, then walk the authoring checklist',
    expectedFields: 'one user message: either a structured ERR_LAYOUT_SUSPECT/ERR_INVALID_COMPONENT_NAME refusal, or the plop + authoring-skill steps',
    commonFailureMode: 'a name matching the plop LAYOUT_SUSPECT gate -> {error, code: ERR_LAYOUT_SUSPECT}; a non-dash-case name -> {error, code: ERR_INVALID_COMPONENT_NAME}',
  },
};

function metaFor(name) {
  const m = METADATA[name];
  if (!m) {
    console.error(
      `FAIL — "${name}" is registered by the live server but has no METADATA entry in ` +
        `${path.relative(REPO_ROOT, fileURLToPath(import.meta.url))}. Add one before regenerating.`
    );
    process.exit(1);
  }
  return m;
}

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

function row(name, requiredFilters, meta) {
  return `| ${esc(meta.intent)} | \`${name}\` | ${esc(requiredFilters || meta.requiredFilters || 'none')} | ${esc(meta.expectedFields)} | ${esc(meta.commonFailureMode)} |`;
}

const HEADER = '| Intent | Tool | Required filters | Expected result fields | Common failure mode |\n|---|---|---|---|---|';
const HEADER_RESOURCE = '| Intent | Resource | Required filters | Expected result fields | Common failure mode |\n|---|---|---|---|---|';
const HEADER_PROMPT = '| Intent | Prompt | Required arguments | Expected result fields | Common failure mode |\n|---|---|---|---|---|';

async function main() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--experimental-strip-types', '--no-warnings', SERVER_PATH],
  });
  const client = new Client({ name: 'altitude-mcp-capability-matrix', version: '1.0.0' });
  await client.connect(transport);

  const { tools } = await client.listTools();
  const { resources } = await client.listResources();
  const { resourceTemplates } = await client.listResourceTemplates();
  const { prompts } = await client.listPrompts();

  await client.close();

  const toolRows = tools.map((t) => {
    const required = (t.inputSchema?.required ?? []).join(', ');
    return row(t.name, required, metaFor(t.name));
  });

  // `resources/list` returns BOTH the fixed-URI resources AND every concrete
  // instance a ResourceTemplate's own `list` callback enumerates (here: one
  // per design-system project) — see setResourceRequestHandlers() in the
  // SDK's mcp.js, which concatenates them. Row those concrete instances
  // under the template's single METADATA entry, not the fixed-URI ones
  // (there is no separate row for "altitude://parity-manifest/southleft").
  const templateUriPrefixes = resourceTemplates.map((t) => t.uriTemplate.replace(/\{[^}]+\}.*$/, ''));
  const isTemplateInstance = (uri) => templateUriPrefixes.some((prefix) => uri.startsWith(prefix));

  const fixedResources = resources.filter((r) => !isTemplateInstance(r.uri));
  const resourceRows = [
    ...fixedResources.map((r) => row(r.uri, 'none', metaFor(r.uri))),
    ...resourceTemplates.map((t) => row(t.uriTemplate, undefined, metaFor(t.uriTemplate))),
  ];

  const promptRows = prompts.map((p) => {
    const required = (p.arguments ?? []).filter((a) => a.required).map((a) => a.name).join(', ');
    return row(p.name, required, metaFor(p.name));
  });

  const body = `# Altitude MCP — capability matrix

GENERATED by \`libs/altitude-mcp/scripts/build-capability-matrix.mjs\` from a REAL MCP handshake against
\`libs/altitude-mcp/src/server.mjs\` (the name and required-argument columns come off the wire,
the same way \`test/smoke.mjs\` talks to the server) — this file cannot list a tool, resource, or
prompt the server does not actually register, and cannot omit one it does. \`--check\` gates it in
CI via \`scripts/check-mcp-docs.mjs\`. Regenerate: \`node libs/altitude-mcp/scripts/build-capability-matrix.mjs\`.

Format follows Carbon's tool-docs convention: intent -> surface -> required filters -> expected
result fields -> common failure mode. "Common failure mode" is real — every entry cites an actual
\`code\` raised somewhere in \`server.mjs\` or \`src/lib/*.mjs\`; where none exists, it says so.

## Tools (${tools.length})

${HEADER}
${toolRows.join('\n')}

## Resources (${fixedResources.length} fixed + ${resourceTemplates.length} templated)

${HEADER_RESOURCE}
${resourceRows.join('\n')}

## Prompts (${prompts.length})

${HEADER_PROMPT}
${promptRows.join('\n')}
`;

  const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;

  if (CHECK) {
    if (existing === body) {
      console.log(
        `OK — CAPABILITY-MATRIX.md matches the live server (${tools.length} tools, ${fixedResources.length + resourceTemplates.length} resources, ${prompts.length} prompts).`
      );
      process.exit(0);
    }
    console.error('FAIL — libs/altitude-mcp/CAPABILITY-MATRIX.md has drifted from the live server.');
    console.error('Regenerate it:  node libs/altitude-mcp/scripts/build-capability-matrix.mjs');
    process.exit(1);
  }

  fs.writeFileSync(OUT, body, 'utf8');
  console.log(
    `Wrote libs/altitude-mcp/CAPABILITY-MATRIX.md — ${tools.length} tools, ${fixedResources.length + resourceTemplates.length} resources, ${prompts.length} prompts.`
  );
}

main().catch((err) => {
  console.error('build-mcp-capability-matrix: crashed:', err);
  process.exit(1);
});
