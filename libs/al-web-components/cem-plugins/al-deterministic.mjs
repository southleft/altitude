// CEM analyzer plugin — byte-reproducible manifest across platforms.
//
// `cem analyze` writes `JSON.stringify(manifest, null, 2)`, so whatever ends
// up in the in-memory manifest is what lands on disk. Two things made that
// output machine-dependent:
//
// 1. **Carriage returns baked into string VALUES.** JSDoc text is read
//    verbatim from source. On a Windows checkout (`core.autocrlf=true`, and
//    with no `.gitattributes` before this change) every `.ts` file is CRLF, so
//    every multi-line `description` carried `\r\n` and JSON.stringify encoded
//    it as the escaped two-character sequence `\r\n` inside the string. That
//    is a genuine content difference — git's text normalization CANNOT fix it,
//    because it is not a line terminator, it is data. ~97 files (this manifest
//    plus every downstream `schemas/*.schema.json`) differed on every Windows
//    build for this reason alone.
//
// 2. **Non-deterministic module order.** The analyzer CLI feeds source files
//    to `create()` in `globby()` order, which is filesystem-enumeration order
//    and differs between machines and between runs. The result was a pure
//    permutation of the 140 modules — no content change, an unreviewable diff.
//
// Both are fixed here, in `packageLinkPhase`, which `create()` runs last
// (src/create.js:78) and before the CLI serializes the manifest
// (cli.js:96). Fixing it at the emitter — rather than asking every
// contributor to `git checkout --` the churn — is what makes the artifact
// reproducible for CI and for non-Windows machines too.

/** Keys whose string values are module paths, not prose. */
const PATH_KEYS = new Set(['path', 'module']);

/**
 * Depth-first, in-place normalization of every string in the manifest.
 * - CRLF / lone CR inside any string value → LF.
 * - `\` → `/` for the keys that hold module paths, so a Windows-produced
 *   manifest addresses modules identically to a Linux-produced one.
 */
function normalizeStrings(node, key) {
  if (typeof node === 'string') {
    let out = node.replace(/\r\n?/g, '\n');
    if (PATH_KEYS.has(key)) out = out.split('\\').join('/');
    return out;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) node[i] = normalizeStrings(node[i], key);
    return node;
  }
  if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) node[k] = normalizeStrings(node[k], k);
    return node;
  }
  return node;
}

export default function altitudeDeterministic() {
  return {
    name: 'altitude-deterministic',
    packageLinkPhase({ customElementsManifest }) {
      normalizeStrings(customElementsManifest);

      // Stable sort by module path. `localeCompare` is locale-sensitive, so
      // compare code units directly — the same order on every machine.
      if (Array.isArray(customElementsManifest.modules)) {
        customElementsManifest.modules.sort((a, b) => {
          const x = a?.path ?? '';
          const y = b?.path ?? '';
          return x < y ? -1 : x > y ? 1 : 0;
        });
      }
    },
  };
}
