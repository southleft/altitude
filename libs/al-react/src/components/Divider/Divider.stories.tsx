import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALDivider } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Atoms/Divider',
  component: ALDivider,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered'
  },
  argTypes: {
    variant: {
      control: 'radio',
      options: ['default', 'vertical'],
    },
  },
};

export const Default: StoryObj<typeof ALDivider> = {
  args: {},
  decorators: [
    (Story) => (
      <div style={{ display: 'flex'}}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Fpo>Layout Section</Fpo>
        {Story()}
        <Fpo>Layout Section</Fpo>
      </div>
      </div>
    )
  ],
 };

export const Vertical: StoryObj<typeof ALDivider> = {
  args: {
    variant: 'vertical',
  },
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', gap: "1rem" }}>
        <Fpo>Layout Section</Fpo>
        {Story()}
        <Fpo>Layout Section</Fpo>
      </div>
    )
  ],
 };