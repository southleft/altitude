// Storybook 10 + Vite builder for the SOUTHLEFT design system (port 6007).
//
// One component library, two Figma-backed design systems — see
// `.altitude/ds-projects.json`, which already declares this config dir, this
// port and this brand title. Southleft is a complete BRAND of Altitude
// (`<al-theme brand="southleft">`, host partials in
// `styles/dist-v5/scss/host/tokens-brand-southleft*.scss`), so the build
// pipeline is identical; what differs is the brand the stories render in, the
// manager branding, the webfonts that brand's type tokens point at, which Figma
// file parity is checked against — and WHICH COMPONENTS are in the sidebar:
// the scoped Altitude allowlist, plus the Southleft brand layer in
// `libs/sl-web-components`, filed under the same Atoms/Molecules/Organisms
// tiers and superseding the Altitude entries it replaces.
//
// THIS FILE IS DELIBERATELY NOT A COPY of `../.storybook/main.ts`. That config
// carries a generated-token pre-flight, the pnpm MDX file-url resolver plugin,
// remark-gfm, the esbuild decorator settings, the Sass modern-compiler switch
// and the `al-web-components` alias — every one of which would rot silently in
// a duplicate. It is imported and spread; only the keys below are overridden,
// and each override says why it has to differ.

// MUST STAY FIRST — sets DS_PROJECT before anything that reads it evaluates.
// See the module for the ESM-ordering reason.
import './env.ts';

import type { StorybookConfig } from '@storybook/web-components-vite';
import { mergeConfig } from 'vite';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import base from '../.storybook/main.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
/** `libs/al-web-components/.storybook-sl` -> repo root. */
const REPO_ROOT = resolve(__dirname, '../../..');
/** The one app this design system is derived from. Read-only source material. */
const SOUTHLEFT_APP = resolve(REPO_ROOT, 'apps/southleft');

// ---------------------------------------------------------------------------
// SCOPE — which components this Storybook documents
// ---------------------------------------------------------------------------
// `.altitude/ds-projects.json` -> `projects.southleft.library.components` is the
// authoritative allowlist (its own `$componentsComment` explains the rule:
// shipping a component on southleft.com is what earns it a place). The parity
// report already reads it; before this, the SIDEBAR did not — it inherited
// Altitude's `../components/**` glob and listed all ~105 components, so the
// Southleft DS advertised 84 components southleft.com does not use.
//
// Read at config-load time rather than restated here: a second hardcoded copy
// of the list is exactly the drift the registry exists to prevent.
type DsProjects = {
  projects: Record<string, { library?: { components?: string[] } }>;
};

const registryPath = resolve(REPO_ROOT, '.altitude/ds-projects.json');
const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as DsProjects;
const allowlist = registry.projects?.southleft?.library?.components;

if (!Array.isArray(allowlist) || allowlist.length === 0) {
  throw new Error(
    `[al-storybook-sl] ${registryPath} has no projects.southleft.library.components array. ` +
      'That list is what scopes this Storybook\'s sidebar; refusing to boot with an unscoped catalog.',
  );
}

/**
 * Tag -> story file, as a config-dir-relative glob.
 *
 * The mapping is `al-<name>` -> `components/<name>/<name>.stories.ts`, which
 * holds for every component in the library including `al-icon` (its stories are
 * `components/icon/icon.stories.ts`; only its FIGMA representation is special,
 * which is a parity concern, not a Storybook one).
 *
 * Two entries in the allowlist legitimately resolve to nothing and MUST NOT
 * crash the config:
 *   * `al-theme` — the theming host. It owns no pixels and ships no story file
 *     (`components/theme/` has only `.ts` + `.scss`); every story in both
 *     Storybooks is already wrapped in one by the `withPreset` decorator.
 *   * anything added to the allowlist ahead of its component landing.
 * Both are reported once, as a log line, rather than as a throw — a missing
 * story file is a scope-list bookkeeping question, not a broken build.
 */
const missing: string[] = [];

/**
 * Altitude tags whose place in this Storybook is TAKEN by a Southleft
 * component, keyed `al-<tag>` -> `sl-<tag>`.
 *
 * The brand layer does not sit in a section of its own. A Southleft component
 * files under the same tier as the Altitude component it supersedes
 * (`Organisms/Header`, not `Southleft/Header`), so the sidebar reads as ONE
 * design system — Southleft's, with Altitude underneath it — rather than two
 * catalogues to cross-reference. Where both exist for the same slot, showing
 * both would leave a reader to guess which one southleft.com actually uses.
 *
 * Kept EXPLICIT rather than inferred from matching tag names — most `sl-*`
 * components supersede nothing (`sl-hero`, `sl-cta-band`, `sl-marquee`,
 * `sl-logo-wall`: Altitude has no equivalent), so name-matching would both
 * miss real replacements and invent false ones.
 *
 * ONE ENTRY TO REVISIT — `al-card`. Southleft's card is `sl-media-card`, so it
 * takes the Card slot here (user direction 2026-08-22). But `apps/southleft`
 * still uses `<al-card>` at 25 call sites across 13 files, and `sl-media-card`
 * is NOT a drop-in for it: the media card is a linked article/case-study card
 * with flush media, not a general container. So this line hides a component the
 * site genuinely still ships. That is correct as a statement of intent — the
 * brand's card is the media card — and wrong as a statement of fact until
 * those 25 call sites are migrated (spec T11). If they are not going to be,
 * drop this entry rather than leaving the Storybook lying about the catalog.
 */
const SUPERSEDED_BY_BRAND: Record<string, string> = {
  'al-header': 'sl-header',
  'al-footer': 'sl-footer',
  'al-card': 'sl-media-card',
};

const superseded: string[] = [];
const componentStories = allowlist
  .filter((tag) => {
    const replacement = SUPERSEDED_BY_BRAND[tag];
    // Only hide Altitude's story once the brand component that replaces it
    // actually EXISTS. Until then the Altitude entry is the honest thing to
    // show — an empty slot in the sidebar teaches nothing.
    if (!replacement) return true;
    const built = existsSync(
      resolve(__dirname, `../../sl-web-components/components/${replacement.replace(/^sl-/, '')}`),
    );
    if (built) superseded.push(`${tag} -> ${replacement}`);
    return !built;
  })
  .map((tag) => tag.replace(/^al-/, ''))
  .filter((name) => {
    const found = existsSync(resolve(__dirname, `../components/${name}/${name}.stories.ts`));
    if (!found) missing.push(name);
    return found;
  })
  .sort()
  .map((name) => `../components/${name}/${name}.stories.ts`);

if (superseded.length > 0) {
  // eslint-disable-next-line no-console
  console.log(`[al-storybook-sl] brand components supersede: ${superseded.join(', ')}`);
}

if (missing.length > 0) {
  console.log(
    `[al-storybook-sl] scope: ${componentStories.length} component(s) in the sidebar; ` +
      `no story file for ${missing.map((n) => `al-${n}`).join(', ')} (expected for al-theme).`,
  );
}

// ---------------------------------------------------------------------------
// HERO MEDIA — why the card stories need a second mount
// ---------------------------------------------------------------------------
// Every `hero` in `src/content/{work,insights}/*.md` is an absolute
// `https://southleft.pages.dev/media/…` URL, and that preview deployment sits
// behind CLOUDFLARE ACCESS: a browser asking for one gets a 302 to a login page,
// so those images can never load — not here, and not on southleft.com's own dev
// server. The site solves it with a dev-only pair (`vite-plugin-local-media.mjs`
// serves a sibling `southleft-v5` checkout at `/media`, and `Base.astro` rewrites
// the `<img src>`s to it), and this reuses the app's OWN resolution rather than
// inventing a second one: same module, same env var, same existence check.
//
// When the checkout is absent the flag is false, the mount is skipped, and the
// card stories render each component's own no-hero branch — the `<C>` initial
// glyph — instead of a page of broken-image icons. Nothing is faked either way.
let localMediaDir: string | null = null;
try {
  // `pathToFileURL` is not optional on Windows: `import('D:\…')` throws
  // ERR_UNSUPPORTED_ESM_URL_SCHEME, the catch below swallows it, and the hero
  // images silently never appear. Node's ESM loader takes URLs, not paths.
  const media = (await import(pathToFileURL(resolve(SOUTHLEFT_APP, 'src/lib/media.mjs')).href)) as {
    LOCAL_MEDIA_ACTIVE: boolean;
    MEDIA_LOCAL_DIR: string;
  };
  localMediaDir = media.LOCAL_MEDIA_ACTIVE ? media.MEDIA_LOCAL_DIR : null;
} catch {
  // The app is optional source material, not a dependency of this Storybook.
  localMediaDir = null;
}

// `StorybookConfig['stories']` also permits a FUNCTION form, which cannot be
// rewritten without invoking it with Storybook's options. The Altitude config
// declares a literal array and the rewrite below is only meaningful for one, so
// narrow here and fail loudly rather than silently shipping a Storybook with no
// stories in it.
const baseStories = base.stories;
if (!Array.isArray(baseStories)) {
  throw new Error(
    '[al-storybook-sl] ../.storybook/main.ts no longer declares `stories` as an array. ' +
      'Rewrite the config-dir-relative globs here by hand before this Storybook can boot.',
  );
}

/**
 * The Altitude glob that lists EVERY component. Matched by value so that if
 * that config is rewritten, this throws instead of silently leaving the
 * catalog unscoped.
 */
const CATALOG_GLOB = '../components/**/*.stories.@(js|jsx|ts|tsx|mdx)';
if (!baseStories.includes(CATALOG_GLOB)) {
  throw new Error(
    `[al-storybook-sl] expected ../.storybook/main.ts to declare '${CATALOG_GLOB}'. ` +
      'It is the entry this config replaces with the Southleft allowlist; re-derive the ' +
      'scoped globs by hand before booting.',
  );
}

const config: StorybookConfig = {
  ...base,

  // Story globs are resolved relative to the CONFIG DIR, so the Altitude
  // config's `./docs/*` and `./components/**` would look inside
  // `.storybook-sl/` here and quietly find nothing (Storybook logs "No story
  // files found" and moves on). Those two are rewritten to point back at the
  // one set of doc sources — Foundations and Resources are the same
  // documentation for both design systems, not a second copy of them.
  //
  // The whole-catalog glob is the one entry that is REPLACED rather than
  // rewritten (see CATALOG_GLOB above).
  //
  // TWO further entries are APPENDED, and the difference between them is the
  // whole point of this Storybook:
  //
  // ONE entry is appended: `../../sl-web-components/components/**`, the Southleft
  // BRAND LAYER.
  //     Real `sl-*` custom elements in their own package, which depends on
  //     `al-web-components` and is never imported back by it. This is the
  //     extension path the config previously lacked: the `ds-projects.json`
  //     allowlist above can only ever express a SUBSET of Altitude, because it
  //     maps tag names onto `../components/<name>/`. A brand component is not
  //     in that directory and never will be, so it needs its own glob.
  //
  stories: [
    ...baseStories.flatMap((entry) => {
      if (entry === CATALOG_GLOB) return componentStories;
      return typeof entry === 'string' && entry.startsWith('./') ? [entry.replace('./', '../.storybook/')] : [entry];
    }),
    '../../sl-web-components/components/**/*.stories.@(ts|mdx)',
  ],

  // IDENTICAL to the Altitude config, plus this config's own './static' —
  // the Southleft manager logo and the Agrandir + IBM Plex Mono webfonts.
  // '../dist' can be shared wholesale because the two parity reports have
  // DIFFERENT FILENAMES (`parity.json` vs `parity.southleft.json`); an earlier
  // attempt mapped dist one subdirectory at a time to avoid a same-name
  // collision, which diverged from Altitude for no remaining benefit and read
  // the directory at config-load time (wrong on a fresh clone with no dist).
  //
  // ...plus southleft.com's own `public/`, mounted at the SAME `/southleft`
  // prefix the app is served under (apps/southleft/astro.config.mjs `base`).
  // The prefix is not cosmetic: `sl-logo-wall`'s stories reference the twelve
  // real client marks at `/southleft/logos/…`, and the card stories use the
  // site's own hero imagery. Mounting it anywhere else would mean rewriting
  // those paths to something that does not match production.
  staticDirs: [
    '../dist',
    './static',
    ...(existsSync(resolve(SOUTHLEFT_APP, 'public'))
      ? [{ from: '../../../apps/southleft/public', to: '/southleft' }]
      : []),
    // The sibling southleft-v5 media checkout, when this machine has one —
    // see the HERO MEDIA note above. `/media` is the path the app's own
    // rewrite targets, so the fixture can apply the identical substitution.
    ...(localMediaDir ? [{ from: localMediaDir, to: '/media' }] : []),
  ],

  // The brand's display/heading face. `styles/dist-v5/scss/host/
  // tokens-brand-southleft.scss` sets every `--al-typography-preset-*` to
  // `Agrandir, sans-serif`; without an `@font-face` the whole type identity
  // falls back to a system sans and the point of a second Storybook is lost.
  // Both surfaces need it: the iframe renders the components, the manager
  // renders the sidebar in `fontBase` (see ./theme.js).
  previewHead: (head) => `${head}\n<link rel="stylesheet" href="./fonts/southleft-fonts.css" />`,
  managerHead: (head) => `${head}\n<link rel="stylesheet" href="./fonts/southleft-fonts.css" />`,

  // Everything the Altitude config's own `viteFinal` does (MDX file-url
  // resolver, esbuild decorators, Sass modern compiler, the `al-web-components`
  // alias, arming the parity watcher) still has to happen — so it is CALLED,
  // not replaced. The one addition is the dev server's filesystem allowlist:
  // the brand components live in a SIBLING PACKAGE (`libs/sl-web-components`)
  // and import Altitude by relative source path, so both trees have to be
  // servable.
  //
  // Vite normally derives `server.fs.allow` from the workspace root, which
  // already covers `libs/`; naming it explicitly means a change to how that
  // root is detected cannot turn every brand-component story into a blank
  // page.
  viteFinal: async (cfg, options) => {
    const merged = base.viteFinal ? await base.viteFinal(cfg, options) : cfg;
    return mergeConfig(merged, {
      server: { fs: { allow: [REPO_ROOT] } },
      // Whether `/media` is mounted, handed to the browser so the card stories
      // can pick the hero branch or the no-hero branch. A compile-time constant
      // rather than a runtime probe: the answer cannot change while the server
      // is up, and a failed `fetch('/media/…')` per card would be a worse way
      // to ask the same question.
      define: { __SL_LOCAL_MEDIA__: JSON.stringify(Boolean(localMediaDir)) },
    });
  },
};

export default config;
