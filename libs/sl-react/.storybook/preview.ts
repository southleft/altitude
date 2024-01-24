import type { Preview } from '@storybook/react-webpack5';

export const excludeRegexArray = [
  '^children$',
  '^render$',
  '^firstUpdated$',
  '^openAll$',
  '^closeAll$',
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
  '^_.*'
];

// Creating a style element for headStyles and appending it to the document head
import headStyles from 'sl-web-components/styles/head.scss';
const headStyleElement = document.createElement('style');
headStyleElement.innerHTML = headStyles;
document.head.appendChild(headStyleElement);

// Icon font (Storybook only for docs)
import iconFontCSS from '../../sl-web-components/components/icon/fonts/iconfont.css';
const iconFontStyleElement = document.createElement('style');
iconFontStyleElement.setAttribute('type', 'text/css');
iconFontStyleElement.setAttribute('id', 'iconfont-style');
iconFontStyleElement.innerHTML = iconFontCSS;
document.head.appendChild(iconFontStyleElement);

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      exclude: new RegExp(excludeRegexArray.join('|')),
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/
      }
    },
    // Configuring story sort order
    options: {
      storySort: {
        order: ['Documentation', 'Fundamentals', 'Components', 'Recipes', 'Templates', 'Pages']
      }
    }
  }
};

export default preview;