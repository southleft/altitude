// T2.4 — Storybook 10 preview config.
//
// Drops the webpack `!!raw-loader!sass-loader!…` imports and uses Vite's
// `?inline` query for the raw CSS. The CEM-driven `setCustomElementsManifest`
// still wires autodocs.

import type { Preview } from '@storybook/web-components';
import { setCustomElementsManifest } from '@storybook/web-components';
import { addons } from 'storybook/preview-api';
import { html } from 'lit';
import customElements from '../custom-elements.json';
import mainStyles from '../styles/main.scss?inline';
import { EVENTS } from './ai-theme/constants';
import { applyTheme, resetTheme } from './ai-theme/apply';
import type { ApplyPayload } from './ai-theme/types';
// The docs page renders inside the preview iframe with its own theme, entirely
// separate from the manager chrome. Without this it stays on Storybook's light
// default, which is why the docs page read as a white slab against dark chrome.
import managerTheme from './theme';
// NOTE: this lives in `blocks/`, not `docs/`. The `./docs/*.@(js|jsx|ts|tsx|mdx)`
// stories glob in main.ts would otherwise try to index it as a story file and
// fail the build with "Unable to index".
import AltitudeDocsPage from './blocks/AltitudeDocsPage';

setCustomElementsManifest(customElements);

// Storybook 10 + auto-register flag — components self-register when alAutoRegistry
// is true, mirroring the apps/web-components fixture.
(globalThis as any).alAutoRegistry = true;

// Inject the global theme into the iframe.
const mainStyleElement = document.createElement('style');
mainStyleElement.innerHTML = mainStyles as unknown as string;
mainStyleElement.setAttribute('type', 'text/css');
mainStyleElement.setAttribute('id', 'al-theme-sheet');
document.head.appendChild(mainStyleElement);

// AI Theme addon (.storybook/ai-theme) — the manager panel derives a palette
// and pushes it over the addon channel; we write it as inline custom
// properties on <html>. Registered once at module scope rather than in a
// decorator so the theme survives story navigation instead of being torn
// down and re-applied on every render.
//
// getChannel() throws if the preview runtime hasn't installed the channel by
// the time this module evaluates, which would take the whole preview down.
// Poll instead: cheap, and a missing channel just means no AI theme.
function registerAiThemeChannel(attempt = 0): void {
  if (!addons.hasChannel()) {
    if (attempt < 20) setTimeout(() => registerAiThemeChannel(attempt + 1), 50);
    return;
  }
  const channel = addons.getChannel();
  channel.on(EVENTS.APPLY, (payload: ApplyPayload) => applyTheme(payload));
  channel.on(EVENTS.RESET, () => resetTheme());
}
registerAiThemeChannel();

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

/**
 * Gives a single-story view the same card chrome as the docs page.
 *
 * Selecting one story in the sidebar renders it bare on the canvas, which read
 * as a different product from the docs page it sits under. This wraps it in the
 * same frame + card (name on the left, addressable story id on the right) that
 * `AltitudeDocsPage` renders, so the two views are continuous.
 *
 * Scope is deliberately narrow:
 *  - Docs view is skipped — `AltitudeDocsPage` already supplies the card there,
 *    and wrapping again would nest two.
 *  - `layout: 'fullscreen'` is skipped. Pages and templates are meant to bleed
 *    to the viewport edge; boxing them would misrepresent them.
 *  - `parameters.alFrame = false` is an explicit per-story escape hatch.
 */
const storyFrame: NonNullable<Preview['decorators']>[number] = (story, context) => {
  if (context.viewMode !== 'story') return story();

  const layout = (context.parameters as any)?.layout;
  if (layout === 'fullscreen') return story();
  if ((context.parameters as any)?.alFrame === false) return story();

  return html`
    <div class="al-docs al-docs--story">
      <div class="al-docs__stories">
        <section class="al-docs__card">
          <div class="al-docs__card-head">
            <span class="al-docs__card-name">${context.name}</span>
            <span class="al-docs__card-id">${context.id}</span>
          </div>
          <div class="al-docs__card-body">${story()}</div>
        </section>
      </div>
    </div>
  `;
};

const preview: Preview = {
  // Global autodocs switch. Storybook 10 dropped `docs.autodocs` from main.ts;
  // this tag is the replacement. Every component file already sets it locally,
  // so this mainly guarantees new components get a docs page by default.
  tags: ['autodocs'],

  decorators: [storyFrame],

  parameters: {
    docs: {
      theme: managerTheme,
      // Custom autodocs template. Attached MDX (`<Meta of={Stories} />`) still
      // takes precedence over this, so the Foundations pages are untouched.
      page: AltitudeDocsPage,
    },
    actions: { argTypesRegex: '^on.*' },
    controls: {
      exclude: new RegExp(excludeRegexArray.join('|')),
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: ['Resources', 'Foundations', 'Atoms', 'Molecules', 'Organisms', 'Templates', 'Pages', 'Recipes'],
      },
    },
    backgrounds: { disable: true },
  },
};

export default preview;
