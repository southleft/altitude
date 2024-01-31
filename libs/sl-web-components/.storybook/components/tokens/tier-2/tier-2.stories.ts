import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import './tier-2-animation';
import './tier-2-border';
import './tier-2-colors';
import './tier-2-icons';
import './tier-2-layout';
import './tier-2-opacity';
import './tier-2-shadows';
import './tier-2-spacing';
import './tier-2-typography';

const meta: Meta = {
  title: 'Fundamentals/Tokens/Tier 2: Usage',
  component: 'tier-2-tokens',
  parameters: {
    themes: {
      default: 'light',
    },
  },
};

export default meta;
type Story = StoryObj;

export const Animation: Story = (args, context) => html`<tier-2-animation theme=${context.globals.theme}></tier-2-animation>`;

export const Border: Story = (args, context) => html`<tier-2-border theme=${context.globals.theme}></tier-2-border>`;

export const Colors: Story = (args, context) => html`<tier-2-colors theme=${context.globals.theme}></tier-2-colors>`;

export const Icons: Story = (args, context) => html`<tier-2-icons theme=${context.globals.theme}></tier-2-icons>`;

export const Layout: Story = (args, context) => html`<tier-2-layout theme=${context.globals.theme}></tier-2-layout>`;

export const Opacity: Story = (args, context) => html`<tier-2-opacity theme=${context.globals.theme}></tier-2-opacity>`;

export const Shadows: Story = (args, context) => html`<tier-2-shadows theme=${context.globals.theme}></tier-2-shadows>`;

export const Spacing: Story = (args, context) => html`<tier-2-spacing theme=${context.globals.theme}></tier-2-spacing>`;

export const Typography: Story = (args, context) => html`<tier-2-typography theme=${context.globals.theme}></tier-2-typography>`;
