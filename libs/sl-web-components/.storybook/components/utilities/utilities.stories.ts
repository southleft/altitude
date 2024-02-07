import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './utilities-grid';
import './utilities-spacing';
import './utilities-typography';

const meta: Meta = {
  title: 'Fundamentals/Utilities',
  component: 'utilities',
};

export default meta;
type Story = StoryObj;

export const Grid: Story = () => html`<utilities-grid></utilities-grid>`;

export const Spacing: Story = () => html`<utilities-spacing></utilities-spacing>`;

export const Typography: Story = () => html`<utilities-typography></utilities-typography>`;
