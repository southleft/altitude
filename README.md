# Altitude

Design system created by Southleft.com. Documentation is generated from the code and published at [altitude.pages.dev/docs](https://altitude.pages.dev/docs).

## Stack

- **pnpm 9** workspaces, **Node 22 LTS**
- **Vite 5** library + Storybook builds
- **Lit 3.3** web components, **React 19** wrappers via `@lit/react`
- **Style Dictionary v5** token pipeline (DTCG source)
- **Storybook 10** with the Vite framework
- **Sass 1.101** using the modern `@use` / `@forward` module system

## Local setup

```bash
nvm use           # Node 22 LTS (pinned in .nvmrc)
pnpm install
pnpm --filter @southleft/al-web-components start   # Storybook on :6006 + Altitude MCP on :6017
pnpm --filter @southleft/al-react start            # Storybook on :9009
```

See `CONTRIBUTING.md` for the full development workflow, and `.altitude/WORKFLOWS.md`
for the process map — which commands, gates, and docs apply to each kind of change.

## Tooling worth knowing on day one

- **Altitude MCP** (`libs/altitude-mcp/`) — 8 tools for agents and editors (component
  discovery, markup validation, tokens, icons, theme generation, Figma parity). Runs in
  stdio mode via `.mcp.json`, and in HTTP mode on :6017 alongside the WC Storybook.
- **Figma ↔ code parity** — per-component badges in the WC Storybook sidebar and status
  panels on the docs site. CLIs: `pnpm run parity:projects` / `parity:seed` /
  `parity:synced <tag>` / `parity:refresh` (+ `:sl` variants). See `.altitude/PARITY.md`.
- **Claude skills** — `.claude/skills/` is tracked and ships repo-specific skills
  (e.g. `altitude-figma-sync` for Figma work, with the library's conventions and traps;
  `altitude-component-authoring` for the full add-a-component checklist).

## Deployments

### Cloudflare Pages

1. Deployments are automatically triggered when a PR is merged into `main` or when a PR is created from a feature branch.
2. The deployment is available at `https://altitude.pages.dev`.
3. Each workspace is built to the root `/dist` folder when running `pnpm run build:all`.
