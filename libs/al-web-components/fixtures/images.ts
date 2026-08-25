// Placeholder imagery for Storybook stories, via https://placehold.co.
//
// One source for every filler image in both Storybooks, so sizes and aspect
// ratios stay consistent and a future swap is a one-file change.
//
// Verified contract (curl, 2026-08-21):
//   * `https://placehold.co/600x400` -> HTTP 200, `content-type: image/svg+xml`.
//     The DEFAULT IS SVG, not a raster image. That is fine in `<img>` and is
//     what the pre-existing story URLs were already getting.
//   * `https://placehold.co/80x80/png` -> HTTP 200, `content-type: image/png`.
//     Ask for `format: 'png'` when a story needs a raster (e.g. anything that
//     feeds a canvas, or a CSS filter that SVG handles differently).
//   * `access-control-allow-origin: *` on every variant, so no CORS setup.
//
// SCOPE: `.storybook/` is invisible to the library build — TypeScript's wildcard
// `include` skips dot-directories, and `vite.config.mjs` only takes
// `components/<name>/<name>.ts` as entries. Nothing here ships to consumers.

export interface PlaceholderOptions {
  /** Background color, hex WITHOUT the leading `#` (e.g. `EEEEEE`). */
  bg?: string;
  /** Foreground/text color, hex WITHOUT the leading `#` (e.g. `31343C`). */
  fg?: string;
  /** Overlay label. Defaults to placehold.co's own `{width}x{height}`. */
  text?: string;
  /** `svg` (default, matches the service) or `png` when a raster is required. */
  format?: 'svg' | 'png';
}

/**
 * Build a placehold.co URL.
 *
 * `bg` and `fg` are positional in the service's path grammar — a foreground
 * color is only reachable by also supplying a background, so `fg` alone is
 * silently upgraded to a sensible neutral pair rather than dropped.
 */
export function placeholderImage(width: number, height: number, options: PlaceholderOptions = {}): string {
  const { bg, fg, text, format } = options;

  let url = `https://placehold.co/${width}x${height}`;
  if (bg || fg) {
    url += `/${bg ?? 'EEEEEE'}/${fg ?? '31343C'}`;
  }
  if (format === 'png') {
    url += '/png';
  }
  if (text) {
    // placehold.co renders `+` as a space; encode everything else.
    url += `?text=${encodeURIComponent(text).replace(/%20/g, '+')}`;
  }
  return url;
}

/**
 * Named sizes for the shapes that recur across the component stories. Prefer
 * these over ad-hoc `placeholderImage(...)` calls so two stories showing "a
 * card image" never disagree about the aspect ratio.
 */
export const placeholderImages = {
  /** Square avatar / profile photo. Matches the 80x80 already used by avatar. */
  avatar: placeholderImage(80, 80),
  /** Small square thumbnail for list rows, menu items, toggle buttons. */
  thumbnail: placeholderImage(80, 80),
  /** 3:2 card media — the size the card stories already used. */
  card: placeholderImage(600, 400),
  /** 16:9 wide media for heroes and banners. */
  wide: placeholderImage(1600, 900),
  /** Wordmark-shaped strip for logo/brand slots. */
  logo: placeholderImage(160, 40),
} as const;
