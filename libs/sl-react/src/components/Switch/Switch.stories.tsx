import type { StoryObj } from '@storybook/react-webpack5';
import { SLSwitch } from '../..';

export default {
  title: 'Atoms/Switch',
  component: SLSwitch,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onSwitchChange']
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
    label: 'Switch label',
    name: 'Switch name'
  },
};

export const Default: StoryObj<typeof SLSwitch> = { args: {} };

export const Checked: StoryObj<typeof SLSwitch> = {
  args: {
    isChecked: true
  }
};

export const Disabed: StoryObj<typeof SLSwitch> = {
  args: {
    isDisabled: true
  }
};

export const DisabledChecked: StoryObj<typeof SLSwitch> = {
  args: {
    isDisabled: true,
    isChecked: true
  }
};
