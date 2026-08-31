#!/usr/bin/env node
/**
 * bridge-io.mjs — two-way JSON channel between this repo and the Figma plugin sandbox.
 *
 * WHY THIS EXISTS
 * `figma_execute` runs code inside the Figma plugin sandbox. That sandbox HAS `fetch`,
 * and the Desktop Bridge manifest whitelists `http://localhost:9223`–`9232`. So instead
 * of inlining a 70KB spec into the code string (slow, error-prone, and it blows up the
 * tool call), the plugin can just fetch it — and POST results back.
 *
 * Port MUST be inside 9223-9232 or the plugin's network policy blocks it. Avoid the
 * ports figma-console-mcp itself is using (check `figma_get_status`).
 *
 * Usage:
 *   node scripts/figma-atoms/bridge-io.mjs [--port 9229]
 *
 *   GET  http://localhost:9229/<name>.json   -> .altitude/figma-sync/<name>.json
 *   POST http://localhost:9229/<name>.json   -> writes .altitude/figma-sync/<name>.json
 *
 * Files are read PER REQUEST, never cached at boot. A boot-time cache silently serves a
 * stale spec and the resulting "the fix didn't work" hunt costs far more than the cache saves.
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = join(ROOT, '.altitude/figma-sync');
mkdirSync(DIR, { recursive: true });

const portArg = process.argv.indexOf('--port');
const PORT = portArg > -1 ? Number(process.argv[portArg + 1]) : 9229;
if (PORT < 9223 || PORT > 9232) {
  console.error(`port ${PORT} is outside 9223-9232 — the Desktop Bridge manifest will block it`);
  process.exit(1);
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'cache-control': 'no-store',
};

createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  const name = (req.url.replace(/^\//, '').split('?')[0] || 'data.json').replace(/[^a-zA-Z0-9._-]/g, '');
  const file = join(DIR, name);

  if (req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      writeFileSync(file, body);
      res.writeHead(200, { ...CORS, 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, bytes: body.length, file: `.altitude/figma-sync/${name}` }));
    });
    return;
  }

  if (!existsSync(file)) { res.writeHead(404, CORS); return res.end('{}'); }
  res.writeHead(200, { ...CORS, 'content-type': 'application/json' });
  res.end(readFileSync(file));
}).listen(PORT, () => console.log(`bridge-io on http://localhost:${PORT} -> .altitude/figma-sync/`));
