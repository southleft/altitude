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

/** Rewrite a `/media/<file>` reference to the resolved `MEDIA_BASE`. Any
 * other path (already-absolute URL, `/logos/...`, etc.) passes through
 * unchanged. */
export function resolveMedia(src) {
  if (typeof src !== 'string' || src.length === 0) return src;
  return src.startsWith('/media/') ? `${MEDIA_BASE}/${src.slice('/media/'.length)}` : src;
}
