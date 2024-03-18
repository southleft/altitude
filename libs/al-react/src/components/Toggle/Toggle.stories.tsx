import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALToggle } from '../..';

export default {
  title: 'Atoms/Toggle',
  component: ALToggle,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onToggleChange']
    },
  },
  argTypes: {
    label: {
      control: 'text'
    },
    name: {
      control: 'text'
    },
    isChecked: {
      control: 'boolean'
    },
    isDisabled: {
      control: 'boolean'
    },
    fieldId: {
      control: 'text'
    }
  },
  args: {
    isChecked: false,
    isDisabled: false,
    label: 'Toggle label',
    name: 'Toggle name'
  },
};

export const Default: StoryObj<typeof ALToggle> = { args: {} };

export const Checked: StoryObj<typeof ALToggle> = {
  args: {
    isChecked: true
  }
};

export const Disabed: StoryObj<typeof ALToggle> = {
  args: {
    isDisabled: true
  }
};

export const DisabledChecked: StoryObj<typeof ALToggle> = {
  args: {
    isDisabled: true,
    isChecked: true
  }
};
