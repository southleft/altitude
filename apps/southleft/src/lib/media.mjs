// Media base resolution — spec 2026-08-20-southleft-example-app, T4.
//
// v5's `public/media/` is ~165MB of unoptimized WordPress-era assets and is
// intentionally NOT copied into this repo during the playground phase. Every
// `/media/<file>` reference in migrated content (post frontmatter `hero`,
// and inline `<img>`s inside the frozen markdown bodies) resolves against
// the LIVE v5 deployment instead, through this ONE constant.
//
// The markdown files themselves carry the resolved URL directly — rewritten
// ONCE by `scripts/rewrite-media-base.mjs` (see that file for why: a
// build-time rehype pass cannot reach the raw-HTML `<img>` tags several
// `work` entries carry, because Astro's default markdown compiler produces
// `type: 'raw'` hast nodes for embedded HTML that no rehype plugin walks as
// structured elements without an additional `rehype-raw` dependency).
// `resolveMedia()` survives here as the schema-level safety net
// (`content.config.ts`) for any future post authored with a bare
// `/media/...` path again.
//
// GO-LIVE LOCALIZATION POINT: when this app becomes the real southleft.com,
// swap `MEDIA_BASE` to `/media`, add the real files under
// `apps/southleft/public/media/`, and re-run `rewrite-media-base.mjs` with
// that new value (asset optimization is an explicit go-live task, out of
// scope for this spec).
export const MEDIA_BASE = 'https://southleft.pages.dev/media';

// T11 — local media for dev. southleft-v5's real `public/media/` (~92MB) is
// checked out as a SIBLING repo on this machine
// (`D:\Southleft\southleft-v5`), read-only ground truth for the fidelity
// pass. When present (or MEDIA_LOCAL_DIR points somewhere else that
// exists), `vite-plugin-local-media.mjs` serves it at `/media/*` during
// `astro dev`, and Base.astro's dev-only inline script rewrites `<img
// src>`s pointing at MEDIA_BASE to that local path — see both files' header
// comments. Falls back silently (both flip to no-ops) when the directory
// isn't there, so production/CI builds are unaffected.
import fs from 'node:fs';
import path from 'node:path';

export const MEDIA_LOCAL_DIR =
  process.env.MEDIA_LOCAL_DIR || path.resolve(process.cwd(), '../../../southleft-v5/public/media');

export const LOCAL_MEDIA_ACTIVE = fs.existsSync(MEDIA_LOCAL_DIR);

export const LOCAL_MEDIA_BASE = '/media';

/** Rewrite a `/media/<file>` reference to the resolved `MEDIA_BASE` (or, in
 * dev with local media active, straight to the local `/media/<file>` this
 * app now serves itself — see `vite-plugin-local-media.mjs`). Any other path
 * (already-absolute URL not pointing at MEDIA_BASE, `/logos/...`, etc.)
 * passes through unchanged, EXCEPT: when local media is active, an
 * already-resolved `MEDIA_BASE`-prefixed URL (the common case — see the
 * header comment above) is also localized. Every `hero` field in
 * content.config.ts's schema runs through this, so listing-page thumbnails
 * and detail-page hero banners get real local images without touching the
 * frozen markdown files. */
export function resolveMedia(src) {
  if (typeof src !== 'string' || src.length === 0) return src;
  if (LOCAL_MEDIA_ACTIVE && src.startsWith(MEDIA_BASE)) {
    return `${LOCAL_MEDIA_BASE}${src.slice(MEDIA_BASE.length)}`;
  }
  if (src.startsWith('/media/')) {
    return LOCAL_MEDIA_ACTIVE ? src : `${MEDIA_BASE}/${src.slice('/media/'.length)}`;
  }
  return src;
}
