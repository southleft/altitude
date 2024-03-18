import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALButton, ALIconSuccess, ALIconSend, ALProgress} from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Atoms/Button',
  component: ALButton,
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
  },
};

export const Default: StoryObj<typeof ALButton> = {};

export const DefaultIcon: StoryObj<typeof ALButton> = {
  args: {
    hideText: true,
    children: (
      <>
        <ALIconSuccess slot="before"></ALIconSuccess>
        Label
      </>
    ),
  },
};

export const DefaultIconBefore: StoryObj<typeof ALButton> = {
  args: {
    children: (
      <>
        <ALIconSuccess slot="before"></ALIconSuccess>
        Label
      </>
    ),
  },
};

export const DefaultIconAfter: StoryObj<typeof ALButton> = {
  args: {
    children: (
      <>
        <ALIconSend slot="after"></ALIconSend>
        Label
      </>
    ),
  },
};

export const DefaultDisabled: StoryObj<typeof ALButton> = {
  args: {
    isDisabled: true,
  },
};

export const Secondary: StoryObj<typeof ALButton> = {
  args: {
    variant: 'secondary',
  },
};

export const SecondaryIcon: StoryObj<typeof ALButton> = {
  args: {
    ...DefaultIcon.args,
    variant: 'secondary',
  },
};

export const SecondaryIconBefore: StoryObj<typeof ALButton> = {
  args: {
    ...DefaultIconBefore.args,
    variant: 'secondary',
  },
};

export const SecondaryIconAfter: StoryObj<typeof ALButton> = {
  args: {
    ...DefaultIconAfter.args,
    variant: 'secondary',
  },
}

export const SecondaryDisabled: StoryObj<typeof ALButton> = {
  args: {
    variant: 'secondary',
    isDisabled: true,
  },
};

export const Tertiary: StoryObj<typeof ALButton> = {
  args: {
    variant: 'tertiary',
  },
};

export const TertiaryIcon: StoryObj<typeof ALButton> = {
  args: {
    ...DefaultIcon.args,
    variant: 'tertiary',
  },
};

export const TertiaryIconBefore: StoryObj<typeof ALButton> = {
  args: {
    ...DefaultIconBefore.args,
    variant: 'tertiary',
  },
};

export const TertiaryIconAfter: StoryObj<typeof ALButton> = {
  args: {
    ...DefaultIconAfter.args,
    variant: 'tertiary',
  },
}

export const TertiaryDisabled: StoryObj<typeof ALButton> = {
  args: {
    variant: 'tertiary',
    isDisabled: true,
  },
};

export const Danger: StoryObj<typeof ALButton> = {
  args: {
    variant: 'danger',
  },
};

export const DangerIcon: StoryObj<typeof ALButton> = {
  args: {
    ...DefaultIcon.args,
    variant: 'danger',
  },
};

export const DangerIconBefore: StoryObj<typeof ALButton> = {
  args: {
    ...DefaultIconBefore.args,
    variant: 'danger',
  },
};

export const DangerIconAfter: StoryObj<typeof ALButton> = {
  args: {
    ...DefaultIconAfter.args,
    variant: 'danger',
  },
};

export const DangerDisabled: StoryObj<typeof ALButton> = {
  args: {
    variant: 'danger',
    isDisabled: true,
  },
};

export const WithFullWidth: StoryObj<typeof ALButton> = {
  args: {
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Fpo>{Story()}</Fpo>
      </div>
    )
  ]
};

export const WithHref: StoryObj<typeof ALButton> = {
  args: {
    href: 'https://www.google.com/',
    target: '_blank',
  },
};

export const WithProgress: StoryObj<typeof ALButton> = {
  args: {
    children: (
      <>
      <ALProgress isCircle={true} isDarkContrast={true} duration={3} slot="before"></ALProgress>
      Saving
      </>
    )
  },
};
