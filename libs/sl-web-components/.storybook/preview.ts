import type { Preview } from '@storybook/web-components';

// Setting auto registry to true to allow storybook to automatically register components
globalThis.enAutoRegistry = true;

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
