// Dev-only local media middleware — spec 2026-08-20-southleft-example-app, T11.
//
// Migrated content (work/insights markdown) references images at
// `MEDIA_BASE` (https://southleft.pages.dev/media/<file>, see media.mjs) —
// that preview deployment sits behind Cloudflare Access, so every one of
// those images 404s/redirects-to-login in a plain browser. southleft-v5's
// real assets (~92MB) live locally at `D:\Southleft\southleft-v5\public\media`
// on this machine; when that directory is present (or `MEDIA_LOCAL_DIR`
// points somewhere else that exists) this plugin serves it at `/media/*`
// during `astro dev` ONLY. In prod/CI (the directory absent) it no-ops and
// pages keep resolving against the remote `MEDIA_BASE`, unchanged.
//
// The migrated markdown bodies carry the resolved REMOTE url directly (see
// media.mjs's header comment for why a persistent rehype pass can't reach
// those raw-HTML `<img>` tags), so serving `/media/*` alone isn't enough to
// make the browser ask for it — Base.astro's dev-only inline script (see
// that file) rewrites `<img src>`s pointing at `MEDIA_BASE` to this local
// path client-side, only when `LOCAL_MEDIA_ACTIVE` is true.
import fs from 'node:fs';
import path from 'node:path';
import { LOCAL_MEDIA_ACTIVE, MEDIA_LOCAL_DIR } from './media.mjs';

const MIME_TYPES = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ico': 'image/x-icon',
};

/** Strip a leading `/<base>` segment (Astro's `base: '/southleft'`) so both
 * `/media/foo.webp` and `/southleft/media/foo.webp` resolve the same file —
 * the dev server's own middleware chain sees requests before Astro's router
 * has necessarily normalized the base away. */
function stripKnownPrefixes(pathname) {
  return pathname.replace(/^\/southleft(?=\/media\/)/, '');
}

export function localMediaPlugin() {
  return {
    name: 'southleft-local-media',
    apply: 'serve', // dev only — never runs during `astro build`
    configureServer(server) {
      if (!LOCAL_MEDIA_ACTIVE) return;

      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();
        const url = stripKnownPrefixes(req.url.split('?')[0]);
        if (!url.startsWith('/media/')) return next();

        const relative = decodeURIComponent(url.slice('/media/'.length));
        const resolved = path.resolve(MEDIA_LOCAL_DIR, relative);

        // Path-traversal guard: resolved file must stay inside MEDIA_LOCAL_DIR.
        if (!resolved.startsWith(path.resolve(MEDIA_LOCAL_DIR) + path.sep)) {
          return next();
        }

        fs.stat(resolved, (err, stat) => {
          if (err || !stat.isFile()) return next();
          const ext = path.extname(resolved).toLowerCase();
          res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
          res.setHeader('Cache-Control', 'no-cache');
          fs.createReadStream(resolved).pipe(res);
        });
      });
    },
  };
}
