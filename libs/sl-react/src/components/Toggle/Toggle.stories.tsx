import type { StoryObj } from '@storybook/react-webpack5';
import { SLToggle } from '../..';

export default {
  title: 'Atoms/Toggle',
  component: SLToggle,
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

export const Default: StoryObj<typeof SLToggle> = { args: {} };

export const Checked: StoryObj<typeof SLToggle> = {
  args: {
    isChecked: true
  }
};

export const Disabed: StoryObj<typeof SLToggle> = {
  args: {
    isDisabled: true
  }
};

export const DisabledChecked: StoryObj<typeof SLToggle> = {
  args: {
    isDisabled: true,
    isChecked: true
  }
};
