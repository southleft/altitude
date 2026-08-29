/**
 * color.mjs — one canonicalization of colour, shared by everything that has to
 * decide whether two colours are "the same".
 *
 * T4, spec 2026-08-29-parity-judgement-gates-and-evals. `normHex` and
 * `rgbaToHex` lived privately inside `scripts/check-figma-drift.mjs`; the
 * Figma↔code visual comparison needs exactly the same normalization, and a
 * second copy of colour logic is the kind of thing that drifts silently and
 * then makes two tools disagree about one component. Moved here, imported
 * there — `scripts/__tests__/check-figma-drift.test.mjs` proves the move
 * changed nothing.
 *
 * Everything canonicalizes to an UPPERCASE hex string, alpha appended only
 * when it is not fully opaque, so `#FFF`, `#ffffff`, `#FFFFFFFF` and
 * `rgb(255, 255, 255)` all compare equal.
 */

/** `#abc` / `#AABBCC` / `#AABBCCFF` -> canonical `#AABBCC` (alpha dropped when opaque). */
export function normHex(h) {
  let s = String(h).replace('#', '').toUpperCase();
  if (s.length === 3 || s.length === 4) s = s.split('').map((c) => c + c).join('');
  if (s.length === 8 && s.slice(6) === 'FF') s = s.slice(0, 6);
  return '#' + s;
}

/** `rgb(1, 2, 3)` / `rgba(1, 2, 3, 0.5)` -> canonical hex, or null if it does not parse. */
export function rgbaToHex(s) {
  const m = String(s).match(/^rgba?\(([^)]+)\)$/i);
  if (!m) return null;
  const parts = m[1].split(',').map((x) => parseFloat(x.trim()));
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  const h = (n) => Math.round(n).toString(16).padStart(2, '0').toUpperCase();
  const a = parts.length > 3 ? parts[3] : 1;
  return '#' + h(parts[0]) + h(parts[1]) + h(parts[2]) + (a < 1 ? h(a * 255) : '');
}

const clamp255 = (n) => Math.max(0, Math.min(255, Math.round(n)));
const hex2 = (n) => clamp255(n).toString(16).padStart(2, '0').toUpperCase();

/**
 * `color(srgb 0.29 0.27 0.22 / 0.45)` -> canonical hex.
 *
 * Chromium serializes some authored colours in this form — it is what
 * `getComputedStyle` returns for the southleft hero's grid overlay, so a
 * comparison that only understood `rgb()` would silently treat a real colour
 * as unparseable.
 */
export function colorFnToHex(s) {
  const m = String(s).match(/^color\(\s*srgb\s+([^)]+)\)$/i);
  if (!m) return null;
  const [rgbPart, alphaPart] = m[1].split('/').map((x) => x.trim());
  const nums = rgbPart.split(/\s+/).map(Number);
  if (nums.length < 3 || nums.some((n) => Number.isNaN(n))) return null;
  const a = alphaPart === undefined ? 1 : Number(alphaPart);
  return '#' + nums.slice(0, 3).map((n) => hex2(n * 255)).join('') + (Number.isFinite(a) && a < 1 ? hex2(a * 255) : '');
}

/**
 * Any CSS colour string this pipeline actually produces -> canonical hex.
 *
 * Returns null for anything it cannot represent as a single flat colour —
 * `transparent`, gradients, `currentColor`, keywords. Null means "not
 * comparable", NEVER "black": a comparison that quietly turned an
 * unrepresentable value into a real colour would report a match that is not
 * there, which is the failure mode this whole spec exists to remove.
 */
export function cssColorToHex(value) {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (s === '' || s === 'transparent' || s === 'none' || s === 'currentColor') return null;
  if (s.startsWith('#')) return normHex(s);
  if (/^rgba?\(/i.test(s)) {
    // Fully transparent is the CSS idiom for "no paint", not a colour.
    const m = s.match(/^rgba\(([^)]+)\)$/i);
    if (m) {
      const parts = m[1].split(',').map((x) => parseFloat(x.trim()));
      if (parts.length > 3 && parts[3] === 0) return null;
    }
    return rgbaToHex(s);
  }
  if (/^color\(/i.test(s)) return colorFnToHex(s);
  return null;
}

/**
 * A Figma SOLID paint -> canonical hex.
 *
 * Figma stores channels as 0..1 floats and keeps paint alpha in a separate
 * `opacity` field. Returns null for a non-solid or invisible paint — a
 * gradient or an image is not a flat colour and must not be compared as one.
 */
export function figmaPaintToHex(paint) {
  if (!paint || paint.type !== 'SOLID' || paint.visible === false) return null;
  const c = paint.color;
  if (!c || [c.r, c.g, c.b].some((n) => typeof n !== 'number')) return null;
  const a = typeof paint.opacity === 'number' ? paint.opacity : 1;
  if (a === 0) return null;
  return '#' + [c.r, c.g, c.b].map((n) => hex2(n * 255)).join('') + (a < 1 ? hex2(a * 255) : '');
}

/**
 * Are two canonical hex colours the same within a per-channel tolerance?
 *
 * The tolerance is not cosmetic. Figma stores 0..1 floats and the browser
 * reports 0..255 integers, so a colour that round-trips through both is
 * routinely off by one in a channel. `0` demands exact equality.
 *
 * Two nulls are NOT equal — null means "not comparable", and calling two
 * incomparable things equal is how a check passes on missing data.
 */
export function sameColor(a, b, tolerance = 1) {
  if (!a || !b) return false;
  const parse = (hex) => {
    const s = normHex(hex).slice(1);
    const full = s.length === 6 ? s + 'FF' : s;
    if (full.length !== 8) return null;
    return [0, 2, 4, 6].map((i) => parseInt(full.slice(i, i + 2), 16));
  };
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return false;
  return pa.every((n, i) => Math.abs(n - pb[i]) <= tolerance);
}
