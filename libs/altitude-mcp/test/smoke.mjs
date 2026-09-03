#!/usr/bin/env node
// Smoke test: spawns the real @southleft/altitude-mcp server, performs the actual MCP
// handshake over stdio, lists tools, then calls every tool once with real
// inputs and asserts each response is valid JSON with the shape we expect.
// No mocking — this exercises the exact path a calling agent would use.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = join(HERE, '..', 'src', 'server.mjs');

// Must stay in lockstep with every server.registerTool() call in
// ../src/server.mjs — the LENGTH is asserted against listTools() below, so
// registering a ninth tool without adding a smoke case here fails CI rather
// than shipping an untested tool.
const EXPECTED_TOOLS = [
  'altitude_list_components',
  'altitude_get_component',
  'altitude_validate',
  'altitude_get_tokens',
  'altitude_search_icons',
  'altitude_generate_theme',
  'altitude_check_parity',
  'altitude_list_ds_projects',
];

// Must stay in lockstep with STATIC_RESOURCES in ../src/lib/resources.mjs
// (the templated parity-manifest resource is checked separately, via
// resources/templates/list, since it has no single fixed URI).
const EXPECTED_RESOURCES = [
  'altitude://components',
  'altitude://tokens',
  'altitude://a11y-report',
  'altitude://ai-readiness/cem-digest',
  'altitude://ai-readiness/tokens-digest',
  'altitude://ds-projects',
];

// Must stay in lockstep with PROMPTS in ../src/lib/prompts.mjs.
const EXPECTED_PROMPTS = [
  'audit_component_parity',
  'generate_brand_theme',
  'check_snippet_convention',
  'scaffold_component',
];

let failures = 0;
function ok(cond, label) {
  if (cond) {
    console.log(`  ok — ${label}`);
  } else {
    failures++;
    console.error(`  FAIL — ${label}`);
  }
}

function parseToolJson(result) {
  ok(!result.isError, 'tool did not report isError');
  const text = result.content?.[0]?.text;
  ok(typeof text === 'string' && text.length > 0, 'response has text content');
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    ok(false, `response text is valid JSON (${e.message})`);
    return {};
  }
  ok(true, 'response text is valid JSON');
  return data;
}

async function main() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--experimental-strip-types', '--no-warnings', SERVER_PATH],
  });
  const client = new Client({ name: 'altitude-mcp-smoke-test', version: '1.0.0' });
  await client.connect(transport);
  console.log('connected — MCP handshake OK');

  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  console.log(`\nlistTools -> ${names.length} tools: ${names.join(', ')}`);
  for (const name of EXPECTED_TOOLS) ok(names.includes(name), `server exposes ${name}`);
  ok(
    names.length === EXPECTED_TOOLS.length,
    `server exposes exactly ${EXPECTED_TOOLS.length} tools (got ${names.length}: ${names.join(', ')})`
  );

  console.log('\naltitude_list_components({ filter: "button" })');
  {
    const res = await client.callTool({ name: 'altitude_list_components', arguments: { filter: 'button' } });
    const data = parseToolJson(res);
    ok(Array.isArray(data.components) && data.components.length > 0, 'returned at least one component');
    ok(data.components.every((c) => c.tag && c.migration), 'each component has tag + migration state');
    // Shape, not content — the guidance artifact is a docs-build output that
    // CI's mcp-smoke job does not produce. See the note in the
    // altitude_get_component case below.
    ok(data.components.every((c) => 'guidance' in c), 'every row carries a guidance slot, populated or null');
    ok(!!data.guidanceCoverage, 'the report says how much guidance exists (or why it could not tell)');
    ok(
      data.components
        .filter((c) => c.guidance)
        .every((c) => Array.isArray(c.guidance.whenNotToUse) && c.guidance.whenNotToUse.length > 0),
      'authored guidance always carries a non-empty whenNotToUse — the field that prevents a wrong choice'
    );
  }

  console.log('\naltitude_get_component({ tag: "al-button" })');
  {
    const res = await client.callTool({ name: 'altitude_get_component', arguments: { tag: 'al-button' } });
    const data = parseToolJson(res);
    ok(data.tag === 'al-button', 'returned the requested component');
    ok(!!data.schema, 'schema attached');
    ok(!!data.migration, 'migration state attached');
    ok(!!data.story?.docsUrl, 'docs URL derived');

    /*
     * THE ASSERTIONS BELOW MUST HOLD ON A FRESH CLONE WITH NOTHING BUILT.
     *
     * `examples` and `guidance` come from the docs build's artifacts
     * (dist/docs/{examples,guidance}.json), which CI's mcp-smoke job does not
     * produce. So what is asserted is the CONTRACT, not the content: the field
     * is always present, and exactly one of "has data" / "has a note saying
     * why not" is true. That is the property that actually matters — a caller
     * must never be unable to distinguish "no example exists" from "this
     * checkout did not look" — and it is the one that would silently regress
     * if a future edit started omitting the key when the artifact is missing.
     */
    ok(Array.isArray(data.examples), 'examples[] is always present, built or not');
    ok(
      data.examples.length > 0 || typeof data.examplesNote === 'string',
      'an empty examples[] is explained by examplesNote, never silent'
    );
    ok(
      data.examples.every((e) => typeof e.title === 'string' && typeof e.code === 'string' && e.code.length > 0),
      'every example carries a title and non-empty web-component markup'
    );
    ok(
      data.examples.every((e) => typeof e.react === 'string' || typeof e.reactNote === 'string'),
      'every example either carries a React twin or names what stopped it'
    );
    ok(
      'guidance' in data && (data.guidance !== null || typeof data.guidanceNote === 'string'),
      'guidance is present, and a null one is explained by guidanceNote'
    );

    // The React block is derived from libs/al-react's own source, which is
    // tracked — so unlike examples/guidance it IS assertable by content here.
    ok(data.react?.component === 'ALButton', 'react wrapper name derived from the wrapper source');
    ok(data.react?.importPath === '@southleft/al-react', 'react import specifier is the package barrel');
    ok(Array.isArray(data.react?.eventProps), 'react eventProps mapping present (empty for al-button)');

    ok(!!data.a11y, 'a11y block attached');
    ok(typeof data.a11y.measured?.measured === 'boolean', 'a11y states whether it was MEASURED, either way');
    ok(Array.isArray(data.a11y.obligations), 'a11y consumer obligations present as an array');
    ok(
      data.a11y.semantics !== null || typeof data.a11y.semanticsNote === 'string',
      'absent contract semantics are explained, not omitted'
    );
  }

  // The event-name -> React-prop mapping is the field nothing else in this repo
  // records, and al-alert is where prop and event genuinely DIFFER
  // (`onClose` -> `close`). Asserting a same-named pair would have proved
  // nothing; this one fails if the two fields are ever collapsed into one.
  console.log('\naltitude_get_component({ tag: "al-alert" }) — event-name to React-prop mapping');
  {
    const res = await client.callTool({ name: 'altitude_get_component', arguments: { tag: 'al-alert' } });
    const data = parseToolJson(res);
    const close = data.react?.eventProps?.find((e) => e.prop === 'onClose');
    ok(close?.event === 'close', 'a React prop whose name differs from its event is reported as both');
  }

  console.log('\naltitude_get_component({ tag: "al-theme" }) — hand-written wrapper still resolves');
  {
    const res = await client.callTool({ name: 'altitude_get_component', arguments: { tag: 'al-theme' } });
    const data = parseToolJson(res);
    // ALTheme is a React.forwardRef over a private createComponent() result,
    // not a direct export of it. Reading only the direct shape reported
    // al-theme as having no wrapper — a wrong answer, not a missing one.
    ok(data.react?.component === 'ALTheme', 'a forwardRef wrapper is found, not reported as absent');
  }

  console.log('\naltitude_validate({ markup: "<al-button>Click</al-button>" })');
  {
    const res = await client.callTool({
      name: 'altitude_validate',
      arguments: { markup: '<al-button>Click</al-button>' },
    });
    const data = parseToolJson(res);
    ok(data.apiVersion === 1 && data.type === 'validation.result', 'envelope matches cli/validate.mjs --json shape');
    ok(data.data?.violations?.length === 0, 'valid usage reports zero violations');
  }

  console.log('\naltitude_validate({ markup: "<al-button styleTypeee=\\"x\\">Click</al-button>" }) — expect a violation');
  {
    const res = await client.callTool({
      name: 'altitude_validate',
      arguments: { markup: '<al-button styleTypeee="x">Click</al-button>' },
    });
    const data = parseToolJson(res);
    ok(data.data?.violations?.[0]?.code === 'ERR_UNKNOWN_ATTRIBUTE', 'unknown attribute flagged with stable code');
  }

  console.log('\naltitude_get_tokens({ name: "border-radius" })');
  {
    const res = await client.callTool({ name: 'altitude_get_tokens', arguments: { name: 'border-radius' } });
    const data = parseToolJson(res);
    ok(Array.isArray(data.tokens) && data.tokens.length > 0, 'returned tokens matching name filter');
    ok(
      data.tokens.every((t) => 'cssType' in t && Array.isArray(t.cssProperties)),
      'every token reports its authored cssType and its CSS-property allow-list'
    );
    /*
     * The whole point of carrying `cssType`: the DTCG `$type` of a radius token
     * is `dimension`, which it shares with spacing, sizing, border width, font
     * size and line height. A caller reading only that cannot tell what the
     * token is FOR. Asserting the two are DIFFERENT here is what would catch a
     * regression to re-deriving cssType from $type — which is impossible, and
     * which silently degrades 163 of 555 tokens when attempted.
     */
    const radius = data.tokens.find((t) => t.cssType);
    ok(!!radius, 'at least one border-radius token carries an authored cssType');
    ok(radius?.cssType === 'borderRadius', `authored cssType is the fine type (got ${radius?.cssType})`);
    ok(radius?.dtcgType === 'dimension', `DTCG type stays the coarse standard one (got ${radius?.dtcgType})`);
    ok(
      radius?.cssProperties?.includes('border-radius'),
      'the allow-list names the concrete CSS property the token may set'
    );
  }

  // altitude + southleft are the only brands the repo ships — see
  // styles/tokens-dtcg/tier-2/brand/* and .altitude/ds-projects.json.
  console.log('\naltitude_get_tokens({ tier: 2, brand: "southleft", name: "theme-color-background-primary-default" })');
  {
    const res = await client.callTool({
      name: 'altitude_get_tokens',
      arguments: { tier: 2, brand: 'southleft', name: 'theme-color-background-primary-default' },
    });
    const data = parseToolJson(res);
    ok(data.tokens?.[0]?.brand === 'southleft' && !!data.tokens?.[0]?.resolvedValue, 'brand-scoped token resolved');
  }

  console.log('\naltitude_get_tokens({ brand: "meridian" }) — a pruned brand must be rejected');
  {
    let rejected = false;
    try {
      const res = await client.callTool({ name: 'altitude_get_tokens', arguments: { brand: 'meridian' } });
      rejected = res.isError === true;
    } catch {
      // An input-schema violation surfaces as a thrown protocol error.
      rejected = true;
    }
    ok(rejected, 'brand enum rejects a brand the repo no longer ships');
  }

  console.log('\naltitude_search_icons({ query: "trash" })');
  {
    const res = await client.callTool({ name: 'altitude_search_icons', arguments: { query: 'trash' } });
    const data = parseToolJson(res);
    ok(Array.isArray(data.icons) && data.icons.length > 0, 'returned matching icons');
    ok(!!data.icons[0]?.snippet, 'import snippet included');
  }

  console.log('\naltitude_generate_theme({ prompt: "ocean sunset" })');
  {
    const res = await client.callTool({ name: 'altitude_generate_theme', arguments: { prompt: 'ocean sunset' } });
    const data = parseToolJson(res);
    ok(!!data.palette && Object.keys(data.palette).length > 0, 'derived a token palette');
    ok(data.source === 'prompt-seed', 'used the keyless prompt-seed path');
  }

  console.log(
    '\naltitude_generate_theme({ direction: { accentHue: 200, personality: "geometric", mode: "dark" } })'
  );
  {
    const res = await client.callTool({
      name: 'altitude_generate_theme',
      arguments: { direction: { accentHue: 200, personality: 'geometric', mode: 'dark' } },
    });
    const data = parseToolJson(res);
    ok(data.source === 'direction', 'used the deterministic direction path');
    ok(data.mode === 'dark' && data.personality === 'geometric', 'direction fields respected');
  }

  console.log('\naltitude_list_ds_projects({})');
  let projectIds = [];
  {
    const res = await client.callTool({ name: 'altitude_list_ds_projects', arguments: {} });
    const data = parseToolJson(res);
    ok(Array.isArray(data.projects) && data.projects.length > 0, 'returned at least one DS project');
    ok(
      data.projects.some((p) => p.id === data.default && p.isDefault === true),
      'the `default` id resolves to a project flagged isDefault'
    );
    ok(
      data.projects.every((p) => p.figma?.fileKey && p.parityManifest),
      'every project names a Figma file key and a parity manifest'
    );
    projectIds = data.projects.map((p) => p.id);
  }

  console.log('\naltitude_check_parity({}) — full report for the default project');
  {
    const res = await client.callTool({ name: 'altitude_check_parity', arguments: {} });
    const data = parseToolJson(res);
    ok(data.manifestPresent === true, 'default project parity manifest is present (tracked in git)');
    ok(Array.isArray(data.components) && data.components.length > 0, 'report covers at least one component');
    ok(data.components.every((c) => c.tag && c.status), 'each entry carries a tag + status');
  }

  console.log('\naltitude_check_parity({ tag: "al-button" })');
  {
    const res = await client.callTool({ name: 'altitude_check_parity', arguments: { tag: 'al-button' } });
    const data = parseToolJson(res);
    ok(data.tag === 'al-button', 'returned the requested component');
    ok(typeof data.status === 'string', 'status attached');
    ok(typeof data.aiPrompt === 'string' && data.aiPrompt.length > 0, 'reconciliation prompt attached');
  }

  console.log('\naltitude_check_parity({ project: "southleft" }) — brand layer components (T7)');
  {
    const res = await client.callTool({ name: 'altitude_check_parity', arguments: { project: 'southleft' } });
    const data = parseToolJson(res);
    // .altitude/ds-projects.json southleft.brandLibrary declares @southleft/sl-web-components:
    // 9 brand CEM components total, 6 of which are brand-only (hero, cta-band, marquee,
    // logo-wall, page-hero, section-header). al-header, al-footer and al-card SUPERSEDE the
    // base library's under the same tag rather than adding new ones.
    //
    // Was 7 brand-only until `media-card` was retired and `card` promoted to the brand layer
    // (commit 8ca1fd0). The TOTAL stayed at 9, which is why only the brand-only count moved:
    // media-card was brand-only, and card supersedes a base component instead. Asserting the
    // total alone would not have noticed the swap — that is the point of checking both.
    ok(data.scope?.brandComponents === 9, `southleft reports 9 brand components (got ${data.scope?.brandComponents})`);
    ok(data.scope?.brandOnly === 6, `southleft reports 6 brand-only components (got ${data.scope?.brandOnly})`);
    ok(
      data.components.every((c) => c.origin === 'base' || c.origin === 'brand'),
      'every southleft entry carries an origin of "base" or "brand"'
    );
    const hero = data.components.find((c) => c.tag === 'al-hero');
    ok(hero?.origin === 'brand', 'brand-only component al-hero is present with origin "brand"');
    const header = data.components.find((c) => c.tag === 'al-header');
    ok(header?.origin === 'brand', 'al-header is attributed to the brand layer (supersedes the base component)');
    ok(typeof header?.codeHash === 'string' && header.codeHash.length > 0, 'al-header carries a code hash');

    // The bug this fixes: al-header/al-footer used to hash the BASE source
    // (libs/al-web-components) even though Southleft ships the BRAND
    // implementation (libs/sl-web-components) under that tag. Cross-check
    // against Altitude's al-header, which is genuinely base-sourced — the two
    // hashes must differ, because they are now reading two different files.
    const altitudeReport = parseToolJson(
      await client.callTool({ name: 'altitude_check_parity', arguments: { project: 'altitude' } })
    );
    const altitudeHeader = altitudeReport.components.find((c) => c.tag === 'al-header');
    ok(altitudeHeader?.origin === 'base', 'altitude\'s al-header stays attributed to the base library');
    ok(
      !!altitudeHeader?.codeHash && altitudeHeader.codeHash !== header?.codeHash,
      'southleft al-header hashes the BRAND source, not the same bytes as altitude\'s base al-header'
    );
  }

  console.log('\naltitude_check_parity({ project: "altitude" }) — base library output unchanged by the brand layer');
  {
    const res = await client.callTool({ name: 'altitude_check_parity', arguments: { project: 'altitude' } });
    const data = parseToolJson(res);
    ok(data.scope?.brandComponents === 0, 'altitude has no brand layer — brandComponents is 0');
    ok(data.scope?.brandOnly === 0, 'altitude has no brand layer — brandOnly is 0');
    ok(data.scope?.allowlisted === false, 'altitude is still unscoped (the whole library)');
    ok(
      data.components.every((c) => c.origin === 'base'),
      'every altitude entry is still origin "base"'
    );
  }

  console.log('\naltitude_check_parity — every project in .altitude/ds-projects.json resolves');
  for (const id of projectIds) {
    const res = await client.callTool({ name: 'altitude_check_parity', arguments: { project: id } });
    const data = parseToolJson(res);
    ok(data.project === id, `project "${id}" reports itself`);
    ok(data.manifestPresent === true, `project "${id}" parity manifest is present`);
  }

  console.log('\naltitude_check_parity({ project: "not-a-project" }) — expect a structured error');
  {
    const res = await client.callTool({ name: 'altitude_check_parity', arguments: { project: 'not-a-project' } });
    const data = parseToolJson(res);
    ok(data.code === 'ERR_UNKNOWN_DS_PROJECT', 'unknown project reported with a stable error code');
    ok(Array.isArray(data.knownProjects) && data.knownProjects.length > 0, 'error names the known projects');
  }

  // ── resources ────────────────────────────────────────────────────────
  console.log('\nresources/list');
  let resourceUris = [];
  {
    const { resources } = await client.listResources();
    resourceUris = resources.map((r) => r.uri);
    for (const uri of EXPECTED_RESOURCES) ok(resourceUris.includes(uri), `server exposes resource ${uri}`);
    ok(
      resources.every((r) => r.mimeType === 'application/json'),
      'every static resource declares application/json'
    );
  }

  console.log('\nresources/templates/list');
  {
    const { resourceTemplates } = await client.listResourceTemplates();
    ok(
      resourceTemplates.some((t) => t.uriTemplate === 'altitude://parity-manifest/{project}'),
      'server exposes the altitude://parity-manifest/{project} template'
    );
    // The template's own `list` callback enumerates ds-projects.json at LIST
    // time and should surface both real projects as concrete resources.
    ok(resourceUris.includes('altitude://parity-manifest/altitude'), 'template lists altitude://parity-manifest/altitude');
    ok(resourceUris.includes('altitude://parity-manifest/southleft'), 'template lists altitude://parity-manifest/southleft');
  }

  console.log('\nresources/read altitude://components');
  {
    const res = await client.readResource({ uri: 'altitude://components' });
    ok(res.contents?.[0]?.mimeType === 'application/json', 'CEM resource declares application/json');
    let cem;
    try {
      cem = JSON.parse(res.contents[0].text);
    } catch (e) {
      ok(false, `CEM resource body is valid JSON (${e.message})`);
    }
    ok(Array.isArray(cem?.modules) && cem.modules.length > 0, 'CEM resource body has modules[]');
  }

  console.log('\nresources/read altitude://parity-manifest/southleft');
  {
    const res = await client.readResource({ uri: 'altitude://parity-manifest/southleft' });
    const data = JSON.parse(res.contents[0].text);
    ok(!data.error, 'southleft parity manifest read cleanly (no structured error)');
  }

  console.log('\nresources/read altitude://parity-manifest/not-a-project — expect a structured error, not a thrown protocol error');
  {
    const res = await client.readResource({ uri: 'altitude://parity-manifest/not-a-project' });
    const data = JSON.parse(res.contents[0].text);
    ok(data.code === 'ERR_UNKNOWN_DS_PROJECT', 'unknown project reported with a stable error code');
    ok(Array.isArray(data.knownProjects) && data.knownProjects.length > 0, 'error names the known projects');
  }

  // ── prompts ──────────────────────────────────────────────────────────
  console.log('\nprompts/list');
  {
    const { prompts } = await client.listPrompts();
    const names = prompts.map((p) => p.name);
    for (const name of EXPECTED_PROMPTS) ok(names.includes(name), `server exposes prompt ${name}`);
    ok(names.length === EXPECTED_PROMPTS.length, `server exposes exactly ${EXPECTED_PROMPTS.length} prompts (got ${names.length})`);
  }

  console.log('\nprompts/get audit_component_parity({ tag: "al-button" })');
  {
    const res = await client.getPrompt({ name: 'audit_component_parity', arguments: { tag: 'al-button' } });
    ok(Array.isArray(res.messages) && res.messages.length === 1, 'returned one message');
    ok(res.messages[0]?.content?.text?.includes('al-button'), 'message references the requested tag');
  }

  console.log('\nprompts/get audit_component_parity({ tag: "al-not-a-real-tag" }) — expect a structured error');
  {
    const res = await client.getPrompt({ name: 'audit_component_parity', arguments: { tag: 'al-not-a-real-tag' } });
    const data = JSON.parse(res.messages[0].content.text);
    ok(data.code === 'ERR_UNKNOWN_COMPONENT', 'unknown tag reported with a stable error code');
  }

  console.log('\nprompts/get generate_brand_theme({ prompt: "ocean sunset" })');
  {
    const res = await client.getPrompt({ name: 'generate_brand_theme', arguments: { prompt: 'ocean sunset' } });
    ok(res.messages[0]?.content?.text?.includes('altitude_generate_theme'), 'guidance names the tool to call');
  }

  console.log('\nprompts/get check_snippet_convention({ markup: "<al-button>Click</al-button>" })');
  {
    const res = await client.getPrompt({
      name: 'check_snippet_convention',
      arguments: { markup: '<al-button>Click</al-button>' },
    });
    ok(res.messages[0]?.content?.text?.includes('altitude_validate'), 'guidance names the tool to call');
  }

  console.log('\nprompts/get scaffold_component({ name: "card-group" }) — LAYOUT_SUSPECT gate should fire');
  {
    const res = await client.getPrompt({ name: 'scaffold_component', arguments: { name: 'card-group' } });
    const data = JSON.parse(res.messages[0].content.text);
    ok(data.code === 'ERR_LAYOUT_SUSPECT', 'layout-suspect name flagged with a stable error code');
  }

  console.log('\nprompts/get scaffold_component({ name: "stat-tile", tier: "atom" }) — real component name');
  {
    const res = await client.getPrompt({ name: 'scaffold_component', arguments: { name: 'stat-tile', tier: 'atom' } });
    ok(res.messages[0]?.content?.text?.includes('altitude-component-authoring'), 'guidance points at the authoring skill');
  }

  await client.close();

  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('smoke test crashed:', err);
  process.exit(1);
});
