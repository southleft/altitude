#!/usr/bin/env node
/**
 * One-time content-migration step — spec 2026-08-20-southleft-example-app, T4.
 *
 * Rewrites every `/media/<file>` reference (frontmatter `hero:` AND inline
 * `<img src="/media/...">` in the frozen markdown/HTML bodies) to the
 * deployed v5 media host, through the SAME `MEDIA_BASE` constant
 * `src/lib/media.mjs` documents as the go-live localization point.
 *
 * WHY A FILE REWRITE, NOT A RUNTIME (rehype) TRANSFORM: Astro 7's default
 * markdown compiler ("Sätteri") parses raw HTML embedded in markdown
 * (several `work` entries carry `<figure><img ...></figure>` blocks from the
 * WordPress migration) into `type: 'raw'` hast nodes that a
 * `markdown.rehypePlugins` pass — even coerced through
 * `@astrojs/markdown-remark` — does not visit before final HTML
 * serialization. Rather than pull in a `rehype-raw` dependency (and its
 * transitive surface) to force those nodes into a walkable element tree,
 * this app takes the same approach southleft-v5 itself took for the
 * original WordPress → local-path migration
 * (`southleft-v5/scripts/convert-content.mjs`, frozen after one run): a
 * one-time, idempotent rewrite of the checked-in markdown.
 *
 * Idempotent: re-running over already-rewritten files is a no-op (matches
 * on the literal `/media/` prefix, which is absent once rewritten).
 *
 * Usage: node scripts/rewrite-media-base.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MEDIA_BASE } from '../src/lib/media.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = [path.join(ROOT, 'src/content/insights'), path.join(ROOT, 'src/content/work')];

// Matches `/media/<file>` wherever it appears as a quoted attribute or
// frontmatter value — never bare prose (a post's own body text could
// legitimately say the word "media" followed by something else).
const PATTERN = /(["'(])\/media\//g;

let filesChanged = 0;
let refsChanged = 0;

for (const dir of DIRS) {
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.md')) continue;
    const file = path.join(dir, name);
    const before = readFileSync(file, 'utf8');
    let count = 0;
    const after = before.replace(PATTERN, (_match, quote) => {
      count += 1;
      return `${quote}${MEDIA_BASE}/`;
    });
    if (count > 0) {
      writeFileSync(file, after, 'utf8');
      filesChanged += 1;
      refsChanged += count;
    }
  }
}

console.log(`[rewrite-media-base] rewrote ${refsChanged} reference(s) across ${filesChanged} file(s) -> ${MEDIA_BASE}/`);
