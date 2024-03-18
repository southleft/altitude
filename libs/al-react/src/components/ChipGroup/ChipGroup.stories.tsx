import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALChipGroup, ALChip } from '../..';

export default {
  title: 'Molecules/Chip Group',
  component: ALChipGroup,
  subcomponents: { ALChip },
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['click', 'onChipGroupExpand']
    }
  },
  argTypes: {
    chipsVisible: {
      control: 'number',
    },
  },
  args: {
    children: (
      <>
        <ALChip>Label</ALChip>
        <ALChip variant="info">Label</ALChip>
        <ALChip variant="success">Label</ALChip>
        <ALChip variant="warning">Label</ALChip>
        <ALChip variant="danger">Label</ALChip>
      </>
    )
  },
};

export const Default: StoryObj<typeof ALChipGroup> = { args: {} };

export const With2Visible: StoryObj<typeof ALChipGroup> = { args: {
  chipsVisible: 2
} };

export const With3Visible: StoryObj<typeof ALChipGroup> = { args: {
  chipsVisible: 3
} };

export const With4Visible: StoryObj<typeof ALChipGroup> = { args: {
  chipsVisible: '4'
} };