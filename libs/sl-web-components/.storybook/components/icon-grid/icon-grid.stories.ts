import { html } from 'lit';
import './icon-grid';
import './icons';

export default {
  title: 'Tokens, Icons, and Utilities/Icons',
  component: 'icon-grid',
  parameters: {
    docs: {
      disable: true
    },
    viewMode: 'story',
    previewTabs: {
      'storybook/docs/panel': {
        hidden: true
      }
    }
  }
};

export const IconGrid = (args, context) => html` <icon-grid theme=${context.globals.theme}></icon-grid> `;
