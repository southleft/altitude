// T2.4 — Storybook 10 preview for @southleft/al-react.

import type { Preview } from '@storybook/react-vite';
// Package specifier on purpose: a518945 gave @southleft/al-web-components a real exports
// map (`./css/main.css` → `dist/css/main.css`), and the raw filesystem path
// (`../../al-web-components/css/main.css`) does not exist — requires
// `pnpm --filter @southleft/al-web-components build` first, same as the WC Storybook.
import mainStyles from '@southleft/al-web-components/css/main.css?inline';
import { DEFAULT_PRESET_ID } from '../../al-web-components/.storybook/presets';
import { withPreset } from './with-preset';
// The shared autodocs page — a fork of Storybook's `DocsPage` that hangs an
// inline `<A11yReport>` under each story. Docs blocks are React in EVERY
// Storybook regardless of story renderer, so importing the web-components
// copy is safe for the same reason the shared `Resources/*` MDX glob in
// `main.ts` is. One source of truth; the two Storybooks cannot drift.
import { AltitudeDocsPage } from '../../al-web-components/.storybook/docs-page';

// The `iconFontCSS` injection that used to sit below is gone with the icon
// webfont (`feat(icons)!: replace the 37-icon set with the full Phosphor
// library`) — `components/icon/fonts/iconfont.css` is now an empty
// deprecation stub.

// ONE stylesheet, not one per brand — and that is a finding, not an omission.
//
// The spec expected to inject per-brand token CSS here, because the
// web-components preview used to swap a whole `:root` bundle to change brand.
// `2026-07-28-scoped-token-emission-brand-wiring` retired that: the emitter now
// writes `:host([brand='…'])` / `:host([brand='…'][mode='…'])` blocks into
// `<al-theme>`'s own compiled styles, which ship inside
// `dist/components/theme/theme.js`. The `<ALTheme>` wrapper imports that file,
// so every brand travels with the component and there is nothing to inject.
// Measured: `pnpm test:preset-parity` reads four distinct brand backgrounds,
// radii and font stacks out of this preview with only the sheet below present.
//
// The per-brand CSS files do exist, and the spec's inferred path was right —
// `scripts/copy-assets-to-dist.js` copies `styles/dist` (which itself contains
// `css/`) into `dist/css`, so they land at the doubly nested
// `@southleft/al-web-components/css/css/brand/tokens-<brand>-<mode>.css`, six of them.
// They are the flat `:root` bundles, for consumers who theme a whole document.
// Nothing in this Storybook needs them, and importing one would put a second,
// unscoped `:root` bundle on the page and fight the host rules.
const mainStyleElement = document.createElement('style');
mainStyleElement.innerHTML = mainStyles as unknown as string;
mainStyleElement.setAttribute('type', 'text/css');
mainStyleElement.setAttribute('id', 'al-theme-sheet');
document.head.appendChild(mainStyleElement);

export const excludeRegexArray = [
  '^children$',
  '^render$',
  '^firstUpdated$',
  '^componentClassNames$',
  '^slotEmpty$',
  '^slotNotEmpty$',
  '^dispatch$',
  '^renderOptions$',
  '^connectedCallback$',
  '^disconnectedCallback$',
  '^renderRoot$',
  '^isUpdatePending$',
  '^hasUpdated$',
  '^updated$',
  '^addController$',
  '^removeController$',
  '^attributeChangedCallback$',
  '^requestUpdate$',
  '^updateComplete$',
  '^on[A-Z].*',
  '^handle[A-Z].*',
  '^_.*',
];

const preview: Preview = {
  // Global autodocs switch, matching the web-components Storybook. Storybook 10
  // dropped `docs.autodocs` from main.ts and made autodocs tag-driven; the
  // `docs: { autodocs: true } as any` that used to sit in `main.ts` was a
  // silent no-op, which is why this Storybook had no docs pages at all and
  // `atoms-button--docs` returned "Couldn't find story matching…".
  tags: ['autodocs'],

  // `alPreset` is still the global the decorator reads, but it is no longer a
  // DROPDOWN — the seven-recipe "Preset" menu is replaced by the one-click
  // light/dark toggle registered in `./manager.js`, over the same two-entry
  // `presets.ts` the web-components Storybook reads.
  //
  // The `toolbar` key is deliberately absent: declaring it would make core
  // render its own dropdown alongside the toggle. The global itself must stay
  // declared here so `updateGlobals({ alPreset })` from the manager is a
  // recognised write rather than an ad-hoc one.
  globalTypes: {
    alPreset: {
      name: 'Mode',
      description: 'Altitude light / dark',
    },
  },
  // `globalTypes.defaultValue` is deprecated in SB 8+; `initialGlobals` is the
  // supported way to seed a global.
  initialGlobals: {
    alPreset: DEFAULT_PRESET_ID,
  },
  decorators: [withPreset],
  parameters: {
    actions: { argTypesRegex: '^on.*' },
    controls: {
      exclude: new RegExp(excludeRegexArray.join('|')),
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // The docs page every component renders — see the import note above and
    // `@southleft/al-web-components/.storybook/docs-page.tsx`.
    docs: {
      page: AltitudeDocsPage,
    },
    options: {
      storySort: {
        // Matches the web-components Storybook exactly. Nested arrays order
        // the children of the category before them; `'*'` is "everything not
        // named", so sub-folders sort AFTER the flat primitives. Templates /
        // Pages / Recipes are gone — those categories were retired with the
        // whole-screen compositions.
        order: [
          'Resources',
          'Foundations',
          'Atoms',
          ['*', 'Form', 'Navigation', 'Text'],
          'Molecules',
          ['*', 'Form', 'Navigation'],
          'Organisms',
        ],
      },
    },
    backgrounds: { disable: true },
  },
};

export default preview;
