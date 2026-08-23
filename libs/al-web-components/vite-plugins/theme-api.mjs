// Dev-server half of the AI theme console.
//
// In production the console POSTs to /api/theme, which is a Cloudflare Pages
// Function (functions/api/theme.js) deployed alongside the built Storybook.
// A statically-built Storybook has no server of its own, and `storybook dev`
// never sees the Pages runtime — so without this plugin the endpoint 404s
// locally and the console silently falls back to its offline seed engine.
// This mounts the SAME handler module on Storybook's Vite dev server, so dev
// and the deployed site run one implementation of the prompt and the clamps.
//
// The API key is read here, in Node, and passed to the handler as its `env`.
// It is never added to `define`/`import.meta.env`, so it cannot reach the
// browser bundle — the browser only ever sees the derived art direction.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import { onRequestPost } from '../../../../functions/api/theme.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
/** ai-theme -> .storybook -> al-web-components -> libs -> repo root */
const REPO_ROOT = resolve(__dirname, '../../../..');

export function themeApiPlugin(): Plugin {
  return {
    name: 'al-theme-api',
    configureServer(server) {
      // loadEnv with an empty prefix reads every key from .env* (Vite would
      // otherwise only surface VITE_-prefixed ones).
      //
      // Look in the repo root as well as the cwd: `pnpm --filter
      // al-web-components start` runs with cwd=libs/al-web-components, but a
      // monorepo secret naturally lives in the root .env (which is also where
      // .env.example sits). Precedence, most specific first: real environment
      // > workspace .env > root .env.
      const mode = server.config.mode ?? 'development';
      const rootEnv = loadEnv(mode, REPO_ROOT, '');
      const cwdEnv = loadEnv(mode, process.cwd(), '');
      const pick = (key: string) => process.env[key] || cwdEnv[key] || rootEnv[key];
      const env = {
        ANTHROPIC_API_KEY: pick('ANTHROPIC_API_KEY'),
        THEME_MODEL: pick('THEME_MODEL'),
      };

      server.middlewares.use(async (req, res, next) => {
        // Match on the pathname only — a cache-busting query string would
        // otherwise fall straight through to Storybook's 404.
        const path = (req.url ?? '').split('?')[0];
        if (path !== '/api/theme' || req.method !== 'POST') return next();

        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);

        // Node 22 has Request/Response globally, so the Pages Function runs
        // unmodified — we only translate at the Node <-> Web boundary.
        const request = new Request('http://localhost/api/theme', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: Buffer.concat(chunks),
        });

        try {
          const result: Response = await onRequestPost({ request, env });
          res.statusCode = result.status;
          res.setHeader('content-type', result.headers.get('content-type') ?? 'application/json');
          res.end(await result.text());
        } catch (err) {
          // A dev-server middleware that throws kills the request with no
          // response at all; the console would hang rather than fall back.
          server.config.logger.error(`[al-theme-api] ${(err as Error).message}`);
          res.statusCode = 502;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: 'handler failed' }));
        }
      });
    },
  };
}
