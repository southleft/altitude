#!/usr/bin/env node
/**
 * Static server for the SSR fixture.
 *
 * ROOT IS THE REPO ROOT, not `apps/ssr/dist`. The generated pages reference
 * `../../../libs/al-web-components/dist/...` for both the stylesheet and the
 * hydration module (see scripts/build.mjs) — three levels up from
 * `apps/ssr/dist/*.html` is the repo root. Serving `dist/` as the root meant
 * every one of those requests 404'd, so the pages rendered unstyled and the
 * hydration probe reported `error: Failed to fetch dynamically imported module`
 * — i.e. the fixture had never actually demonstrated hydration.
 *
 * `/` redirects to the fixture index so `pnpm --filter al-app-ssr start` still
 * lands somewhere useful.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..');
export const FIXTURE_BASE = '/apps/ssr/dist';
const TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname === '/' ? `${FIXTURE_BASE}/index.html` : url.pathname;
  // Contain the server to the repo: reject any path that escapes ROOT.
  const filePath = join(ROOT, normalize(decodeURIComponent(pathname)));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'content-type': TYPES[extname(filePath)] ?? 'text/plain' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

const PORT = Number(process.env.SSR_FIXTURE_PORT ?? 5177);
server.listen(PORT, () => console.log(`[ssr] http://localhost:${PORT}${FIXTURE_BASE}/index.html`));
