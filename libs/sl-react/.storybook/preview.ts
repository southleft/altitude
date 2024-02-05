import type { Preview } from '@storybook/react-webpack5';

/*
 * Head styles
 * - Allows for custom styles of the story iframe window
 * - Creating a style element for headStyles and appending it to the document head
 */
import headStyles from '../../sl-web-components/styles/head.scss';
const headStyleElement = document.createElement('style');
headStyleElement.innerHTML = headStyles;
document.head.appendChild(headStyleElement);

/*
 * Icon font styles
 * - Allows for the icon font to be avaiable in the story iframe window
 * - Creating a style element for iconFontCSS and appending it to the document head
 */
import iconFontCSS from '../../sl-web-components/components/icon/fonts/iconfont.css';
const iconFontStyleElement = document.createElement('style');
iconFontStyleElement.setAttribute('type', 'text/css');
iconFontStyleElement.setAttribute('id', 'iconfont-style');
iconFontStyleElement.innerHTML = iconFontCSS;
document.head.appendChild(iconFontStyleElement);

/*
 * Exclude's
 * - Properties and methods to be excluded from the storybook controls
 */
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
  '^_.*'
];

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on.*' },
    controls: {
      exclude: new RegExp(excludeRegexArray.join('|')),
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    // Configuring story sort order
    options: {
      storySort: {
        order: ['Documentation', 'Fundamentals', 'Atoms', 'Molecules', 'Organisms', 'Templates', 'Pages', 'Recipes']
      }
    },
    backgrounds: { disable: true },
  }
};

export default preview;
