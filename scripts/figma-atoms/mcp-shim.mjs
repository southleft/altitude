#!/usr/bin/env node
/**
 * mcp-shim.mjs — drive the figma-console-mcp server from shell commands.
 *
 * Why this exists: the write-capable figma-console MCP server was registered in
 * .mcp.json but not loaded into the Claude session, and a session cannot hot-add
 * MCP servers. This shim spawns the SAME server binary, performs the MCP stdio
 * handshake, and exposes tools/call over local HTTP so any shell can use it:
 *
 *   node scripts/figma-atoms/mcp-shim.mjs [--port 9401]
 *   curl -s localhost:9401/tools
 *   curl -s -X POST localhost:9401/call -d '{"name":"figma_get_status","arguments":{}}'
 *
 * The Desktop Bridge plugin scans WS ports 9223-9232 at launch and auto-reconnects
 * dropped ports every 1s, so a fresh server instance on a freed port is picked up
 * without user action.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createInterface } from 'node:readline';

const portArg = process.argv.indexOf('--port');
const PORT = portArg > -1 ? Number(process.argv[portArg + 1]) : 9401;

const SERVER_JS = 'C:/Users/angel/AppData/Local/npm-cache/_npx/b547afed9fcf6dcb/node_modules/figma-console-mcp/dist/local.js';

const child = spawn(process.execPath, [SERVER_JS], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env },
});
child.stderr.on('data', (d) => process.stderr.write(`[figma-console] ${d}`));
child.on('exit', (code) => {
  console.error(`[shim] figma-console exited (${code}); shutting down`);
  process.exit(1);
});

let nextId = 1;
const pending = new Map();

const rl = createInterface({ input: child.stdout });
rl.on('line', (line) => {
  line = line.trim();
  if (!line.startsWith('{')) return; // stray log line
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (msg.id !== undefined && pending.has(msg.id)) {
    const { resolve } = pending.get(msg.id);
    pending.delete(msg.id);
    resolve(msg);
  }
});

function rpc(method, params, timeoutMs = 180000) {
  const id = nextId++;
  const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params });
  child.stdin.write(payload + '\n');
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`rpc timeout: ${method}`));
    }, timeoutMs);
    pending.set(id, { resolve: (m) => { clearTimeout(t); resolve(m); } });
  });
}

function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
}

const init = await rpc('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'altitude-figma-shim', version: '1.0.0' },
});
notify('notifications/initialized', {});
console.log(`[shim] MCP handshake ok: ${init.result?.serverInfo?.name} ${init.result?.serverInfo?.version}`);

const readBody = (req) => new Promise((resolve) => {
  let b = '';
  req.on('data', (c) => { b += c; });
  req.on('end', () => resolve(b));
});

createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  try {
    if (req.url === '/tools') {
      const r = await rpc('tools/list', {});
      const names = (r.result?.tools || []).map((t) => t.name);
      return res.end(JSON.stringify({ count: names.length, names }));
    }
    if (req.url === '/call' && req.method === 'POST') {
      const { name, arguments: args } = JSON.parse(await readBody(req));
      const r = await rpc('tools/call', { name, arguments: args || {} });
      if (r.error) return res.end(JSON.stringify({ error: r.error }));
      // MCP content blocks -> concatenate text parts for easy shell consumption
      const content = r.result?.content || [];
      const text = content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
      return res.end(JSON.stringify({ isError: r.result?.isError || false, text }));
    }
    res.statusCode = 404;
    res.end('{"error":"unknown route"}');
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(e && e.message || e) }));
  }
}).listen(PORT, '127.0.0.1', () => console.log(`[shim] http on 127.0.0.1:${PORT}`));
