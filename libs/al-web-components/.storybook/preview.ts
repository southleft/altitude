// T2.4 — Storybook 10 preview config.
//
// Drops the webpack `!!raw-loader!sass-loader!…` imports and uses Vite's
// `?inline` query for the raw CSS. The CEM-driven `setCustomElementsManifest`
// still wires autodocs.

import type { Preview } from '@storybook/web-components';
import { setCustomElementsManifest } from '@storybook/web-components';
import { addons } from 'storybook/preview-api';
import customElements from '../custom-elements.json';
import mainStyles from '../styles/main.scss?inline';
import iconFontCSS from '../components/icon/fonts/iconfont.css?inline';
import { EVENTS } from './ai-theme/constants';
import { applyTheme, resetTheme } from './ai-theme/apply';
import type { ApplyPayload } from './ai-theme/types';

setCustomElementsManifest(customElements);

// Storybook 10 + auto-register flag — components self-register when alAutoRegistry
// is true, mirroring the apps/web-components fixture.
(globalThis as any).alAutoRegistry = true;

// Inject the global theme + icon font into the iframe.
const mainStyleElement = document.createElement('style');
mainStyleElement.innerHTML = mainStyles as unknown as string;
mainStyleElement.setAttribute('type', 'text/css');
mainStyleElement.setAttribute('id', 'al-theme-sheet');
document.head.appendChild(mainStyleElement);

const iconFontStyleElement = document.createElement('style');
iconFontStyleElement.setAttribute('type', 'text/css');
iconFontStyleElement.setAttribute('id', 'iconfont-style');
iconFontStyleElement.innerHTML = iconFontCSS as unknown as string;
document.head.appendChild(iconFontStyleElement);

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

const preview: Preview = {
  parameters: {
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
