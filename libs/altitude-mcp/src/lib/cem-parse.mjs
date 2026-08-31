// Pure CEM parsing — deliberately ZERO imports, not even `./paths.mjs`.
//
// Split out of cem.mjs (2026-08-25) after a real failure: `worker.mjs` (the
// Fetch-standard, filesystem-less entrypoint — see its header, R9) imported
// `parseCem` from `cem.mjs`, which imports `./paths.mjs`, which calls
// `fileURLToPath(import.meta.url)` at MODULE-INIT time to compute REPO_ROOT
// and friends. Under Cloudflare's `workerd` runtime (verified locally with
// `wrangler pages dev`, see libs/altitude-mcp/README.md "Hosted endpoint"),
// `import.meta.url` is not a `file://` URL the way Node's is, so that call
// threw immediately at bundle evaluation — before any tool handler ever ran,
// and before anything touched an actual `node:fs` read. Importing a module
// that only NAMES filesystem paths was enough to break a filesystem-less
// runtime.
//
// So the parsing logic — pure, dependency-free, safe on any runtime — lives
// here, and `cem.mjs` (Node, `fs`-backed) and `worker.mjs` (Workers,
// static-import-backed) both import FROM this file rather than one
// importing from the other. Neither can silently diverge on how a CEM turns
// into the flat `{tag, className, ...}` shape every tool/resource returns.

/** Parse one CEM's `modules[].declarations[]` into the flat shape every reader returns. */
export function parseCem(cem) {
  const out = [];
  for (const mod of cem.modules ?? []) {
    for (const d of mod.declarations ?? []) {
      if (!d.customElement || !d.tagName) continue;
      out.push({
        tag: d.tagName,
        className: d.name,
        description: d.description ?? '',
        summary: d.summary ?? '',
        modulePath: mod.path,
        slots: d.slots ?? [],
        events: d.events ?? [],
        cssParts: d.cssParts ?? [],
        cssProperties: d.cssProperties ?? [],
        attributes: d.attributes ?? [],
        members: d.members ?? [],
      });
    }
  }
  return out;
}
