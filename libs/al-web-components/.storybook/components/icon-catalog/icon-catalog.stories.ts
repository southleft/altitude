import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './icon-catalog';

const meta: Meta = {
  title: 'Foundations/Icons',
  component: 'icon-catalog',
};

export default meta;
type Story = StoryObj;

export const Catalog: Story = () => html` <icon-catalog></icon-catalog> `;
