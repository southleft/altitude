import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './icon-svgs';
import './icons';

const meta: Meta = {
  title: 'Foundations/Icons/Icon Svgs',
  component: 'icon-svgs',
};

export default meta;
type Story = StoryObj;

export const IconSvgs: Story = (args, context) => html` <icon-svgs></icon-svgs> `;
