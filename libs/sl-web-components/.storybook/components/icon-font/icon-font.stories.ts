import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './icon-font';

const meta: Meta = {
  title: 'Fundamentals/Icons/Icon Font',
  component: 'icon-font',
};

export default meta;
type Story = StoryObj;

export const IconFont: Story = (args, context) => html` <icon-font></icon-font> `;
