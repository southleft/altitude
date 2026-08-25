/**
 * dtcg-token.mjs — reading the DTCG token tree
 * (`libs/al-web-components/styles/tokens-dtcg/**.json`).
 *
 * Shared by every consumer of the token source so the "which type do I mean?"
 * question is answered in ONE place.
 *
 * THE POINT OF THIS MODULE
 * ------------------------
 * A DTCG token has TWO types, and they answer different questions:
 *
 *   `$type`                              — the DTCG standard type. Deliberately
 *                                          COARSE. `sizing`, `spacing`,
 *                                          `borderRadius`, `borderWidth`,
 *                                          `fontSizes` and `lineHeights` all
 *                                          collapse into `dimension`.
 *
 *   `$extensions["org.altitude.token"]`  — the CSS surface the token was
 *     `.cssType`                          AUTHORED for. Finer than `$type`, and
 *                                          NOT recoverable from it.
 *
 * Use `dtcgType()` when you need standards conformance (serialising DTCG,
 * talking to a DTCG-aware tool). Use `authoredType()` when you need to know
 * what the token is actually FOR — which CSS properties it may set, which
 * Figma variable type or style it becomes. Getting this backwards silently
 * degrades 163 of 555 tokens to a bare `dimension` with no usable semantic.
 *
 * `authoredType()` falls back to `$type` so a token authored without a
 * `cssType` still resolves to something real rather than `undefined`.
 */

/** True if `node` is a DTCG token leaf (as opposed to a group). */
export function isTokenLeaf(node) {
  return node !== null && typeof node === 'object' && !Array.isArray(node) && '$value' in node;
}

/** The DTCG standard `$type`. */
export function dtcgType(node) {
  return node?.$type;
}

/** The authored CSS-surface type: `cssType` if present, else the DTCG `$type`. */
export function authoredType(node) {
  return node?.$extensions?.['org.altitude.token']?.cssType ?? node?.$type;
}

/**
 * Present a DTCG leaf in the flat `{ value, type, ... }` shape, with `type`
 * resolved to the AUTHORED type. Lets a consumer walk the DTCG tree without
 * rewriting downstream logic that reads `.value` / `.type`.
 *
 * `$value` and `$type` are DROPPED, not carried alongside — this is a
 * translation, not an augmentation. Leaving them in means any consumer that
 * serialises the returned object (e.g. the Figma payload's `styles` section,
 * which embeds whole token objects) emits both spellings of the same data.
 * Every other key, `$extensions` included, is preserved.
 */
export function normalizeLeaf(node) {
  const { $value, $type: _$type, ...rest } = node;
  return { ...rest, value: $value, type: authoredType(node) };
}
