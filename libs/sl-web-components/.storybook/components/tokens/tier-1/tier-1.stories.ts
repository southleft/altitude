import { html } from 'lit';
import './tier-1-animation';
import './tier-1-border';
import './tier-1-breakpoints';
import './tier-1-colors';
import './tier-1-layout';
import './tier-1-opacity';
import './tier-1-shadows';
import './tier-1-spacing';
import './tier-1-typography';
import './tier-1-zindex';

export default {
  title: 'Fundamentals/Tokens/Tier 1: Definitions',
  component: 'tier-1-tokens',
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

export const Animation = (args, context) => html`<tier-1-animation theme=${context.globals.theme}></tier-1-animation>`;

export const Border = (args, context) => html`<tier-1-border theme=${context.globals.theme}></tier-1-border>`;

export const Breakpoints = (args, context) => html`<tier-1-breakpoints theme=${context.globals.theme}></tier-1-breakpoints>`;

export const Colors = (args, context) => html`<tier-1-colors theme=${context.globals.theme}></tier-1-colors>`;

export const Layout = (args, context) => html`<tier-1-layout theme=${context.globals.theme}></tier-1-layout>`;

export const Opacity = (args, context) => html`<tier-1-opacity theme=${context.globals.theme}></tier-1-opacity>`;

export const Shadows = (args, context) => html`<tier-1-shadows theme=${context.globals.theme}></tier-1-shadows>`;

export const Spacing = (args, context) => html`<tier-1-spacing theme=${context.globals.theme}></tier-1-spacing>`;

export const Typography = (args, context) => html`<tier-1-typography theme=${context.globals.theme}></tier-1-typography>`;

export const ZIndex = (args, context) => html`<tier-1-zindex theme=${context.globals.theme}></tier-1-zindex>`;