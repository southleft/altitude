import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './icon-grid';
import './icons';

const meta: Meta = {
  title: 'Fundamentals/Icons/Icon Grid',
  component: 'icon-grid',
};

export default meta;
type Story = StoryObj;

export const IconGrid: Story = (args, context) => html` <icon-grid></icon-grid> `;
