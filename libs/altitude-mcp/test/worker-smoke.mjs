#!/usr/bin/env node
// Smoke test for the Fetch-standard hosted entrypoint (../src/worker.mjs,
// R9). Talks to it the way a Cloudflare Pages Function does — real
// `Request` in, real `Response` out, `handleMcpRequest()` — never
// `server.mjs`'s Node-only stdio/http transports. This is what proves
// worker.mjs's tool/resource surface actually answers real MCP calls in
// Node; the Workers-RUNTIME-specific half (does it survive workerd's
// stricter module semantics — it did not, the first time; see
// ../src/lib/cem-parse.mjs's header for the trap this test cannot catch by
// itself) is verified separately with `wrangler pages dev`, documented in
// ../README.md "Hosted endpoint" since it needs a tool this package does
// not depend on.

import { handleMcpRequest } from '../src/worker.mjs';

const EXPECTED_TOOLS = ['altitude_list_components', 'altitude_list_ds_projects'];
const EXPECTED_RESOURCES = [
  'altitude://components',
  'altitude://ai-readiness/cem-digest',
  'altitude://ai-readiness/tokens-digest',
  'altitude://ds-projects',
  'altitude://a11y-report',
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

async function rpc(method, params, id = 1) {
  const res = await handleMcpRequest(
    new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    }),
  );
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`non-JSON response (status ${res.status}): ${text.slice(0, 200)}`);
  }
  return { status: res.status, body };
}

console.log('\ninitialize');
{
  const { status, body } = await rpc('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'worker-smoke', version: '1.0.0' },
  });
  ok(status === 200, 'HTTP 200');
  ok(body.result?.serverInfo?.name === 'altitude-hosted', 'server identifies as "altitude-hosted", not "altitude"');
}

console.log('\ntools/list');
{
  const { body } = await rpc('tools/list', {}, 2);
  const names = (body.result?.tools ?? []).map((t) => t.name).sort();
  ok(names.length === EXPECTED_TOOLS.length, `exactly ${EXPECTED_TOOLS.length} tools (got ${names.length}: ${names.join(', ')})`);
  for (const name of EXPECTED_TOOLS) ok(names.includes(name), `exposes ${name}`);
}

console.log('\ntools/call altitude_list_components({ filter: "button" })');
{
  const { body } = await rpc('tools/call', { name: 'altitude_list_components', arguments: { filter: 'button' } }, 3);
  const text = body.result?.content?.[0]?.text;
  ok(typeof text === 'string', 'response has text content');
  const data = JSON.parse(text);
  ok(Array.isArray(data.components) && data.components.length > 0, 'components[] is non-empty');
  ok(
    data.components.every((c) => c.tag && 'migration' in c),
    'every component carries tag + migration (proves getMigrationState() ran against the statically-imported migration.json)',
  );
}

console.log('\ntools/call altitude_list_ds_projects({})');
{
  const { body } = await rpc('tools/call', { name: 'altitude_list_ds_projects', arguments: {} }, 4);
  const text = body.result?.content?.[0]?.text;
  const data = JSON.parse(text);
  ok(data.default === 'altitude', 'default project is "altitude"');
  ok(
    data.projects?.some((p) => p.id === 'southleft') && data.projects.every((p) => !('resolved' in p)),
    'lists southleft too, and never leaks a build-machine `resolved.*` absolute path',
  );
}

console.log('\nresources/list');
{
  const { body } = await rpc('resources/list', {}, 5);
  const uris = (body.result?.resources ?? []).map((r) => r.uri).sort();
  ok(uris.length === EXPECTED_RESOURCES.length, `exactly ${EXPECTED_RESOURCES.length} resources (got ${uris.length})`);
  for (const uri of EXPECTED_RESOURCES) ok(uris.includes(uri), `exposes ${uri}`);
}

console.log('\nresources/read altitude://ds-projects');
{
  const { body } = await rpc('resources/read', { uri: 'altitude://ds-projects' }, 6);
  const text = body.result?.contents?.[0]?.text;
  const data = JSON.parse(text);
  ok(Object.keys(data.projects ?? {}).length === 2, 'raw registry contents, both projects present');
}

console.log(failures === 0 ? '\nPASS — 0 failure(s)' : `\nFAIL — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
