import type { Preview } from '@storybook/nextjs'

// NOTE: This CSS import is only needed for this test environment
// In normal installations, users already have their CSS configured in Storybook
import '../src/app/globals.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    // Enable Tailwind's dark mode support in Storybook
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#0f172a',
        },
      ],
    },
  },
};

export default preview;
