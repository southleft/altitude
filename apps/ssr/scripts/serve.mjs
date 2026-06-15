#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', 'dist');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

const server = createServer(async (req, res) => {
  const url = req.url === '/' ? '/index.html' : req.url;
  try {
    const data = await readFile(join(ROOT, url));
    res.writeHead(200, { 'content-type': TYPES[extname(url)] ?? 'text/plain' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

const PORT = 5177;
server.listen(PORT, () => console.log(`[ssr] http://localhost:${PORT}`));
