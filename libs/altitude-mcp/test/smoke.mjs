#!/usr/bin/env node
// Smoke test: spawns the real altitude-mcp server, performs the actual MCP
// handshake over stdio, lists tools, then calls every tool once with real
// inputs and asserts each response is valid JSON with the shape we expect.
// No mocking — this exercises the exact path a calling agent would use.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = join(HERE, '..', 'src', 'server.mjs');

const EXPECTED_TOOLS = [
  'altitude_list_components',
  'altitude_get_component',
  'altitude_validate',
  'altitude_get_tokens',
  'altitude_search_icons',
  'altitude_generate_theme',
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

  console.log('\naltitude_get_tokens({ tier: 2, brand: "meridian", name: "theme-color-background-primary-default" })');
  {
    const res = await client.callTool({
      name: 'altitude_get_tokens',
      arguments: { tier: 2, brand: 'meridian', name: 'theme-color-background-primary-default' },
    });
    const data = parseToolJson(res);
    ok(data.tokens?.[0]?.brand === 'meridian' && !!data.tokens?.[0]?.resolvedValue, 'brand-scoped token resolved');
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

  await client.close();

  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('smoke test crashed:', err);
  process.exit(1);
});
