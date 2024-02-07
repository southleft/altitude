import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './tier-1-animation';
import './tier-1-border';
import './tier-1-breakpoints';
import './tier-1-colors';
import './tier-1-icons';
import './tier-1-layout';
import './tier-1-opacity';
import './tier-1-shadows';
import './tier-1-space';
import './tier-1-typography';
import './tier-1-zindex';

const meta: Meta = {
  title: 'Fundamentals/Tokens/Tier 1: Definitions',
  component: 'tier-1-tokens',
};

export default meta;
type Story = StoryObj;

export const Animation: Story = (args, context) => html`<tier-1-animation theme=${context.globals.theme}></tier-1-animation>`;

export const Border: Story = (args, context) => html`<tier-1-border theme=${context.globals.theme}></tier-1-border>`;

export const Breakpoints: Story = (args, context) => html`<tier-1-breakpoints theme=${context.globals.theme}></tier-1-breakpoints>`;

export const Colors: Story = (args, context) => html`<tier-1-colors theme=${context.globals.theme}></tier-1-colors>`;

export const Icons: Story = (args, context) => html`<tier-1-icons theme=${context.globals.theme}></tier-1-icons>`;

export const Layout: Story = (args, context) => html`<tier-1-layout theme=${context.globals.theme}></tier-1-layout>`;

export const Opacity: Story = (args, context) => html`<tier-1-opacity theme=${context.globals.theme}></tier-1-opacity>`;

export const Shadows: Story = (args, context) => html`<tier-1-shadows theme=${context.globals.theme}></tier-1-shadows>`;

export const Space: Story = (args, context) => html`<tier-1-space theme=${context.globals.theme}></tier-1-space>`;

export const Typography: Story = (args, context) => html`<tier-1-typography theme=${context.globals.theme}></tier-1-typography>`;

export const ZIndex: Story = (args, context) => html`<tier-1-zindex theme=${context.globals.theme}></tier-1-zindex>`;
