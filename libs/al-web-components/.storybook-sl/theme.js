import { create } from 'storybook/theming/create';

// Manager branding for the Southleft Storybook. The three identity strings are
// the ones `.altitude/ds-projects.json` already declares for this project
// (`projects.southleft.storybook.brandTitle` / `brandUrl` / `brandImage`) —
// kept in step by hand because the manager bundle is browser code and cannot
// read a Node-side JSON registry.
//
// `fontBase` leads with Agrandir, the brand's display face, loaded by the
// `@font-face` stylesheet in `./static/fonts/` that `main.ts`'s `managerHead`
// links. The fallbacks matter: the manager renders before the webfont resolves,
// and IBM Plex Sans is the brand's body face (already fetched by the library's
// own main.css) so the interim state is still a Southleft face rather than
// whatever the OS defaults to.
export default create({
  base: 'dark',
  brandTitle: 'Southleft Design System',
  brandUrl: 'https://southleft.com',
  // The Southleft wordmark, lifted from `components/logo/logo.ts`'s
  // `variant="southleft"` path data — see ./static/images/logo.svg.
  brandImage: './images/logo.svg',
  fontBase: 'Agrandir, "IBM Plex Sans", system-ui, sans-serif',
});
