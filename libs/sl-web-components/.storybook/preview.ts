import type { Preview } from '@storybook/web-components';

// Setting auto registry to true to allow storybook to automatically register components
globalThis.enAutoRegistry = true;

// Creating a style element for headStyles and appending it to the document head
import headStyles from 'THEME/head.scss';
const headStyleElement = document.createElement('style');
headStyleElement.innerHTML = headStyles;
document.head.appendChild(headStyleElement);

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    }
  }
};

export default preview;
