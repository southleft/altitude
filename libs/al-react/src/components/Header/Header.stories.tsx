import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALHeader } from '../..';

export default {
  title: 'Organisms/Header',
  component: ALHeader,
  parameters: { status: { type: 'beta' } },
  args: { children: 'Hello world' },
};

export const Default: StoryObj<typeof ALHeader> = { args: {} };
