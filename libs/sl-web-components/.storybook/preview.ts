import type { Preview } from '@storybook/web-components';
import { setCustomElementsManifest } from '@storybook/web-components';
import customElements from '../custom-elements.json';

// Set custom elements manifest before any code runs. This enables autodocs from web components jsdoc comments.
setCustomElementsManifest(customElements);

// Setting auto registry to true to allow storybook to automatically register components
globalThis.enAutoRegistry = true;

// Creating a style element for headStyles and appending it to the document head
import headStyles from '../styles/head.scss';
const headStyleElement = document.createElement('style');
headStyleElement.innerHTML = headStyles;
document.head.appendChild(headStyleElement);

// Creating a style element for iconFontCSS and appending it to the document head
import iconFontCSS from '../components/icon/fonts/iconfont.css';
const iconFontStyleElement = document.createElement('style');
iconFontStyleElement.setAttribute('type', 'text/css');
iconFontStyleElement.setAttribute('id', 'iconfont-style');
iconFontStyleElement.innerHTML = iconFontCSS;
document.head.appendChild(iconFontStyleElement);

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      expanded: true,
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
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
