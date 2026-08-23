#!/usr/bin/env node
/**
 * ALTITUDE-ONLY gate — spec 2026-08-20-southleft-example-app, T1.
 *
 * Page/layout styling in this app may only use:
 *   - `.al-u-*` utility classes (@southleft/al-web-components/styles/shadow-utilities.scss)
 *   - semantic `--al-theme-*` design tokens (`var(--al-theme-...)`)
 *   - minimal app-layout CSS (grid/positioning only — src/styles/layout.css)
 *
 * NO hardcoded colors, px font-sizes, or non-token box-shadows anywhere in
 * this app's own source. Pragmatic, not perfect: it greps AUTHORED source
 * (`.astro`, `.css` under `src/`) — not the built `@southleft/al-web-components` CSS
 * this app imports verbatim (that file legitimately contains resolved hex
 * values; it is a vendored token artifact, not page styling) and not
 * third-party node_modules.
 *
 * Exit 0 / pass, exit 1 / fail with a list of violations (file:line).
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

/** Minimal recursive walk for .astro/.css under src/ — no extra dependency. */
function collect(dir, exts, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, exts, out);
    else if (exts.some((ext) => entry.name.endsWith(ext))) out.push(full);
  }
  return out;
}

const files = collect(SRC, ['.astro', '.css']);

// Patterns. Each check only fires on a CSS declaration line or a
// `style="..."` attribute — not arbitrary prose (a blog post's migrated
// markdown body could legitimately contain a string like "#f05735" as
// documentation copy).
const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;
const PX_FONT_SIZE = /font-size\s*:\s*\d+(\.\d+)?px/i;
const RAW_BOX_SHADOW = /box-shadow\s*:\s*(?!none\b)(?!.*var\()[^;]+;/i;
const DECLARATION_OR_STYLE_ATTR = /style\s*=\s*["'][^"']*["']|^\s*[a-z-]+\s*:\s*.+;\s*$/;

const violations = [];

for (const file of files) {
  const isCss = file.endsWith('.css');
  const content = readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);

  content.split('\n').forEach((line, i) => {
    if (!isCss && !DECLARATION_OR_STYLE_ATTR.test(line)) return;
    if (HEX_COLOR.test(line)) violations.push(`${rel}:${i + 1}: hardcoded hex color — ${line.trim()}`);
    if (PX_FONT_SIZE.test(line)) violations.push(`${rel}:${i + 1}: px font-size (use a token) — ${line.trim()}`);
    if (RAW_BOX_SHADOW.test(line)) violations.push(`${rel}:${i + 1}: box-shadow without a token var() — ${line.trim()}`);
  });
}

if (violations.length > 0) {
  console.error(`[check-altitude-only] FAIL — ${violations.length} violation(s):`);
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log(`[check-altitude-only] PASS — ${files.length} file(s) scanned, no hardcoded colors/px font-sizes/raw box-shadows found.`);
