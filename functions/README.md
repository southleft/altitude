# `functions/` — Cloudflare Pages Functions

Every file in this directory is bundled and deployed automatically by the
Cloudflare Pages build. Two things about that are load-bearing:

**1. Cloudflare's bundler, not ours.** Pages builds Functions with its own
pinned `wrangler` (3.114.17 as of 2026-08-27) and the esbuild inside it. That
is an *older* toolchain than this repo's Vite 5 / Node 22, and the repo does
not choose its version. Syntax that works everywhere else here can still fail
at deploy.

Known unsupported: **import attributes** — `import x from './y.json' with { type: 'json' }`.
Node 22 *requires* that attribute to import JSON; wrangler 3.114's esbuild
cannot parse it. Anything you add here must avoid it, transitively — including
in modules under `libs/` that a function imports.

**2. A Functions build failure fails the WHOLE deploy.** Not just the endpoint —
the entire Pages deployment, including the docs site and the homepage. This is
the same "a broken part must not take the documentation site down with it"
rule that orders `build:all` in the root `package.json`, one layer further out.

That is not hypothetical. `functions/api/mcp.js` (the hosted MCP endpoint,
added 2026-08-25 in 7dc5e94) imported `libs/altitude-mcp/src/lib/registry-data.mjs`,
which uses import attributes. Every Pages deploy failed from that commit until
2026-08-27, taking `theme.js`, the docs and the homepage with it. It is parked
at `libs/altitude-mcp/hosted/api-mcp.js` — that file's header has the full
diagnosis and what restoring it requires.

## Before adding a file here

- Trace what it imports, all the way down. If any module in that graph uses an
  import attribute, it will not build.
- Prefer self-contained functions. `api/theme.js` imports nothing, which is why
  it has never been the thing that broke.
- Remember a function that needs a dashboard secret returns its failure status
  (`theme.js` and the parked `mcp.js` both 503 when unconfigured) — shipping the
  code is not the same as shipping a working endpoint.
- Verify against the version Pages actually uses, not a newer local `wrangler`.
  Testing the parked endpoint under a local `wrangler pages dev` is precisely
  what produced false confidence the first time.

## What is here

| File | Purpose |
| --- | --- |
| `api/theme.js` | `POST /api/theme` — deterministic theme generation. Self-contained; 503 without its secret. |
