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
  }

  console.log('\naltitude_get_component({ tag: "al-button" })');
  {
    const res = await client.callTool({ name: 'altitude_get_component', arguments: { tag: 'al-button' } });
    const data = parseToolJson(res);
    ok(data.tag === 'al-button', 'returned the requested component');
    ok(!!data.schema, 'schema attached');
    ok(!!data.migration, 'migration state attached');
    ok(!!data.story?.docsUrl, 'storybook docs URL derived');
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

  await client.close();

  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('smoke test crashed:', err);
  process.exit(1);
});
