#!/usr/bin/env node
/**
 * mcp-shim.mjs — drive the figma-console-mcp server from shell commands.
 *
 * Why this exists: the write-capable figma-console MCP server was registered in
 * .mcp.json but not loaded into the Claude session, and a session cannot hot-add
 * MCP servers. This shim spawns the SAME server binary, performs the MCP stdio
 * handshake, and exposes tools/call over local HTTP so any shell can use it:
 *
 *   node scripts/figma-atoms/mcp-shim.mjs [--port 9401] [--server <path-to-local.js>]
 *   curl -s localhost:9401/tools
 *   curl -s -X POST localhost:9401/call -d '{"name":"figma_get_status","arguments":{}}'
 *
 * The Desktop Bridge plugin scans WS ports 9223-9232 at launch and auto-reconnects
 * dropped ports every 1s, so a fresh server instance on a freed port is picked up
 * without user action.
 *
 * WHERE THE SERVER COMES FROM. This used to be one absolute path into one
 * developer's npx cache ("C:/Users/<user>/AppData/Local/npm-cache/_npx/<hash>/
 * node_modules/figma-console-mcp/dist/local.js"), which is why nobody else has
 * ever been able to run `scripts/figma-parity/refresh-figma-digests.mjs` — and
 * so why `figmaCurrentDigest` was null for every component in both parity
 * manifests, making figma-drift and conflict structurally unreachable.
 * Resolution is now a documented chain, every step of which works on a machine
 * that is not this one:
 *
 *   1. `--server <path>`                      — explicit override
 *   2. `$FIGMA_CONSOLE_MCP_SERVER`            — CI / dotfile override
 *   3. `require.resolve('figma-console-mcp')` — if it is ever a repo dependency
 *   4. the npm `_npx` cache for this platform — what `npx figma-console-mcp`
 *      already left behind, found by SEARCH rather than by a remembered hash
 *   5. `npx -y figma-console-mcp@latest`      — the exact command `.mcp.json`
 *      registers, so a machine with none of the above still works (it just pays
 *      a download the first time)
 *
 * Whichever step wins is printed, so a run is never ambiguous about what it spawned.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createInterface } from 'node:readline';
import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const PKG = 'figma-console-mcp';
/** The package's stdio entry point, relative to its install root. */
const ENTRY = join('dist', 'local.js');

const argOf = (flag) => {
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1) || null;
  const i = process.argv.indexOf(flag);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('-') ? process.argv[i + 1] : null;
};

const PORT = Number(argOf('--port') ?? 9401);

/** Every `_npx/<hash>/node_modules/<pkg>/dist/local.js` npm has cached here. */
function npxCacheCandidates() {
  const roots = [
    process.env.npm_config_cache ? join(process.env.npm_config_cache, '_npx') : null,
    process.platform === 'win32' && process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, 'npm-cache', '_npx')
      : null,
    join(homedir(), '.npm', '_npx'),
  ].filter(Boolean);
  const hits = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    let entries;
    try {
      entries = readdirSync(root);
    } catch {
      continue;
    }
    for (const hash of entries) {
      const candidate = join(root, hash, 'node_modules', PKG, ENTRY);
      if (existsSync(candidate)) hits.push(candidate);
    }
  }
  return hits;
}

/** @returns {{ command: string, args: string[], via: string, shell: boolean }} */
function resolveServer() {
  const explicit = argOf('--server');
  if (explicit) {
    if (!existsSync(explicit)) throw new Error(`--server ${explicit} does not exist`);
    return { command: process.execPath, args: [explicit], via: `--server ${explicit}`, shell: false };
  }

  const fromEnv = process.env.FIGMA_CONSOLE_MCP_SERVER;
  if (fromEnv) {
    if (!existsSync(fromEnv)) throw new Error(`FIGMA_CONSOLE_MCP_SERVER=${fromEnv} does not exist`);
    return { command: process.execPath, args: [fromEnv], via: `FIGMA_CONSOLE_MCP_SERVER=${fromEnv}`, shell: false };
  }

  // A repo dependency, if anyone ever adds one.
  try {
    const require = createRequire(import.meta.url);
    const pkgJson = require.resolve(`${PKG}/package.json`);
    const entry = join(pkgJson.slice(0, -'package.json'.length), ENTRY);
    if (existsSync(entry)) {
      return { command: process.execPath, args: [entry], via: `node_modules (${entry})`, shell: false };
    }
  } catch {
    /* not installed — expected; fall through */
  }

  const cached = npxCacheCandidates();
  if (cached.length) {
    return { command: process.execPath, args: [cached[0]], via: `npx cache (${cached[0]})`, shell: false };
  }

  // Last resort: the literal command `.mcp.json` registers. Works anywhere npm
  // does, at the cost of a first-run download.
  return {
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['-y', `${PKG}@latest`],
    via: `npx -y ${PKG}@latest (no local copy found)`,
    shell: process.platform === 'win32',
  };
}

let spawnSpec;
try {
  spawnSpec = resolveServer();
} catch (err) {
  console.error(`[shim] cannot resolve the ${PKG} server: ${err.message}`);
  process.exit(1);
}
console.log(`[shim] server via ${spawnSpec.via}`);

const child = spawn(spawnSpec.command, spawnSpec.args, {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env },
  shell: spawnSpec.shell,
});
child.on('error', (err) => {
  console.error(`[shim] failed to spawn ${spawnSpec.command}: ${err.message}`);
  process.exit(1);
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
