import { html } from 'lit';
import './tier-2-animation';
import './tier-2-border';
import './tier-2-colors';
import './tier-2-icons';
import './tier-2-layout';
import './tier-2-opacity';
import './tier-2-shadows';
import './tier-2-spacing';
import './tier-2-typography';

export default {
  title: 'Fundamentals/Tokens/Tier 2: Usage',
  component: 'tier-2-tokens',
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

export const Animation = (args, context) => html`<tier-2-animation theme=${context.globals.theme}></tier-2-animation>`;

export const Border = (args, context) => html`<tier-2-border theme=${context.globals.theme}></tier-2-border>`;

export const Colors = (args, context) => html`<tier-2-colors theme=${context.globals.theme}></tier-2-colors>`;

export const Icons = (args, context) => html`<tier-2-icons theme=${context.globals.theme}></tier-2-icons>`;

export const Layout = (args, context) => html`<tier-2-layout theme=${context.globals.theme}></tier-2-layout>`;

export const Opacity = (args, context) => html`<tier-2-opacity theme=${context.globals.theme}></tier-2-opacity>`;

export const Shadows = (args, context) => html`<tier-2-shadows theme=${context.globals.theme}></tier-2-shadows>`;

export const Spacing = (args, context) => html`<tier-2-spacing theme=${context.globals.theme}></tier-2-spacing>`;

export const Typography = (args, context) => html`<tier-2-typography theme=${context.globals.theme}></tier-2-typography>`;
