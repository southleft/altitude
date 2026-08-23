# Altitude

Design system created by Southleft.com. Find all documentation on [ZeroHeight](https://zeroheight.com/809ab055e).

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
pnpm --filter @southleft/al-web-components start   # Storybook on :6006
pnpm --filter @southleft/al-react start            # Storybook on :9009
```

See `CONTRIBUTING.md` for the full development workflow.

## Deployments

### Cloudflare Pages

1. Deployments are automatically triggered when a PR is merged into `main` or when a PR is created from a feature branch.
2. The deployment is available at `https://altitude.pages.dev`.
3. Each workspace is built to the root `/dist` folder when running `pnpm run build:all`.
