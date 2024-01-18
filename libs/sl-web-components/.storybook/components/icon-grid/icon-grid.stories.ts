import { html } from 'lit';
import './icon-grid';
import './icons';

export default {
  title: 'Tokens, Icons, and Utilities/Icons',
  component: 'icon-grid'
};

export const IconGrid = (args, context) => html` <icon-grid theme=${context.globals.theme}></icon-grid> `;
