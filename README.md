# Altitude

Design system created by Southleft.com. Find all documentation on [ZeroHeight](https://zeroheight.com/809ab055e).

## Local setup

1. Run `yarn`
2. **For Chronicle MCP server setup:** See `chronicle/README.md`
3. Run `yarn workspace WORKSPACE_NAME start`

## Deployments

### Cloudflare Pages

1. Deployments are automatically triggered when a PR is merged into `main` or when a PR is created from a feature branch.
2. The deployment is available at `https://altitude.pages.dev`.
3. Each workspace is built to the root `/dist` folder when running `yarn build:all`.

