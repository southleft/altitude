// Dev-server half of the AI theme console.
//
// In production the console POSTs to /api/theme, which is a Cloudflare Pages
// Function (functions/api/theme.js) deployed alongside the built site. A
// statically-built Astro site or Storybook has no server of its own, and the
// dev server never sees the Pages runtime — so without this plugin the
// endpoint 404s locally and the console silently falls back to its offline
// seed engine. This mounts the SAME handler module on the Vite dev server, so
// dev and the deployed site run one implementation of the prompt and clamps.
//
// The API key is read here, in Node, and passed to the handler as its `env`.
// It is never added to `define`/`import.meta.env`, so it cannot reach the
// browser bundle — the browser only ever sees the derived art direction.
//
// WHY .mjs, AND WHY NOT IN `theme-engine/`
// ----------------------------------------
// This is Node-only Vite middleware, not part of the browser theme engine, so
// it deliberately does NOT live in `../theme-engine/` (whose every module is
// browser-safe and reachable from the `"./theme-engine"` export). It sits with
// the library's other build-time plugins instead.
//
// Plain `.mjs` rather than `.ts` because `tsconfig.json` includes
// `**/**/*.ts`: as TypeScript this file would enter the declaration-emit
// program and immediately fail on `import ... from '../../../functions/api/
// theme.js'` — an untyped `.js` module outside the package, with `allowJs`
// off. Its two former type annotations bought nothing that JSDoc does not.
// (It used to live in `.storybook/ai-theme/`, where the dot-directory kept it
// out of the tsc program by accident rather than by decision.)

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { onRequestPost } from '../../../functions/api/theme.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
/** vite-plugins -> al-web-components -> libs -> repo root */
const REPO_ROOT = resolve(__dirname, '../../..');

/** @returns {import('vite').Plugin} */
export function themeApiPlugin() {
  return {
    name: 'al-theme-api',
    configureServer(server) {
      // loadEnv with an empty prefix reads every key from .env* (Vite would
      // otherwise only surface VITE_-prefixed ones).
      //
      // Look in the repo root as well as the cwd: `pnpm --filter
      // @southleft/al-web-components start` runs with cwd=libs/al-web-components, but a
      // monorepo secret naturally lives in the root .env (which is also where
      // .env.example sits). Precedence, most specific first: real environment
      // > workspace .env > root .env.
      const mode = server.config.mode ?? 'development';
      const rootEnv = loadEnv(mode, REPO_ROOT, '');
      const cwdEnv = loadEnv(mode, process.cwd(), '');
      const pick = (key) => process.env[key] || cwdEnv[key] || rootEnv[key];
      const env = {
        ANTHROPIC_API_KEY: pick('ANTHROPIC_API_KEY'),
        THEME_MODEL: pick('THEME_MODEL'),
      };

      server.middlewares.use(async (req, res, next) => {
        // Match on the pathname only — a cache-busting query string would
        // otherwise fall straight through to the dev server's 404.
        const path = (req.url ?? '').split('?')[0];
        if (path !== '/api/theme' || req.method !== 'POST') return next();

        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);

        // Node 22 has Request/Response globally, so the Pages Function runs
        // unmodified — we only translate at the Node <-> Web boundary.
        const request = new Request('http://localhost/api/theme', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: Buffer.concat(chunks),
        });

        try {
          const result = await onRequestPost({ request, env });
          res.statusCode = result.status;
          res.setHeader('content-type', result.headers.get('content-type') ?? 'application/json');
          res.end(await result.text());
        } catch (err) {
          // A dev-server middleware that throws kills the request with no
          // response at all; the console would hang rather than fall back.
          server.config.logger.error(`[al-theme-api] ${err.message}`);
          res.statusCode = 502;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: 'handler failed' }));
        }
      });
    },
  };
}
