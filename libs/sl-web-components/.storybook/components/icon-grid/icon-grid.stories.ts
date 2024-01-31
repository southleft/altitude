import { html } from 'lit';
import './icon-grid';
import './icons';

export default {
  title: 'Fundamentals/Icons/Icon Grid',
  component: 'icon-grid',
  parameters: {
    themes: {
      default: 'light',
    },
  },
};

export const IconGrid = (args, context) => html` <icon-grid></icon-grid> `;
