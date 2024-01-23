import type { StoryObj } from '@storybook/react-webpack5';
import { SLButton, SLIconDone, SLIconSend } from '../..';

export default {
  title: 'Components/Button',
  tags: [ 'autodocs' ],
  component: SLButton,
  parameters: { 
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['click']
    },
  },
  argTypes: {
    type: {
      options: ['button', 'submit', 'reset'],
      control: { type: 'radio' }
    },
    variant: {
      options: ['default', 'secondary', 'tertiary', 'danger'],
      control: { type: 'radio' }
    },
    target: {
      options: ['_blank','_self','_parent','_top'],
      control: { type: 'radio' }
    },
    href: {
      control: 'text'
    },
    name: {
      control: 'text'
    },
    label: {
      control: 'text'
    },
    value: {
      control: 'text'
    },
    isPressed: {
      control: 'boolean'
    },
    isDisabled: {
      control: 'boolean'
    },
    isExpanded: {
      control: 'boolean'
    },
    hideText: {
      control: 'boolean'
    },
    fullWidth: {
      control: 'boolean'
    },
    ariaControls: {
      control: 'text'
    },
    styleModifier: {
      control: "text"
    }
  },
  args: {
    children: 'Label',
  }
};

export const Default: StoryObj<typeof SLButton> = { args: {} };

export const DefaultIcon: ComponentStoryObj<typeof ENButton> = {
  args: {
    hideText: true,
    children: (
      <>
        <SLIconDone slot="before"></SLIconDone>
        Label
      </>
    ),
  },
};
 