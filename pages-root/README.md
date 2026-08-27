# `pages-root/` — files published at the site root

Everything in this directory is copied verbatim into `dist/` — the published
root of the Cloudflare Pages deployment — by `pnpm run copy:pages-root`, which
`build:all` runs after the docs build.

## Why it exists as its own directory

Cloudflare reads `_headers` and `_redirects` **only from the root of the output
directory**. Nested copies (`dist/docs/_headers`) are ignored.

These files used to ride to the root inside `apps/home/public/`, because
`apps/home` was the one app that built straight into `dist/` rather than a
subdirectory. When the homepage was dropped from the deploy (2026-08-27) that
made them collateral: removing `build:app-home` from `build:all` would have
silently stopped shipping the site's redirect **and** the content-type headers
that make `/docs/llms*.txt` and every `.md` twin arrive as `text/plain` — the
whole point of that file. Nothing would have failed loudly; the artifacts would
just have started coming back as the wrong type.

So the root-level files no longer belong to any app. They belong to the
deployment, which is what this directory is.

## Contents

| File | Purpose |
| --- | --- |
| `_headers` | Response headers for the whole site — chiefly forcing `text/plain` on the machine-readable docs artifacts. `scripts/check-llms-content-type.mjs <base-url>` asserts these against a running deployment. |
| `_redirects` | Site-wide redirects. Currently one rule: `/` → `/docs/`. |
| `favicon.ico` | Root favicon. The docs site sets its own (`Shell.astro`); this covers the browser's default `/favicon.ico` request. |

## Adding to it

Anything here lands at the site root and is served, so it is public. Keep it to
files that genuinely belong to the deployment as a whole rather than to one app
— an app's own assets belong in that app's `public/`.

Note that `copy:pages-root` requires `dist/` to already exist, which is why
`build:all` runs it after the docs build rather than first.
