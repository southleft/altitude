import { html } from 'lit';
import './icon-font';

export default {
  title: 'Fundamentals/Icons/Icon Font',
  component: 'icon-font',
  parameters: {
    themes: {
      default: 'light',
    },
  },
};

export const IconFont = (args, context) => html` <icon-font></icon-font> `;
