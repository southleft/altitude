import type { StoryObj } from '@storybook/react-webpack5';
import { SLButton, SLIconDone, SLIconSend, SLProgress} from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Atoms/Button',
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
  },
};

export const Default: StoryObj<typeof SLButton> = {};

export const DefaultIcon: StoryObj<typeof SLButton> = {
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

export const DefaultIconBefore: StoryObj<typeof SLButton> = {
  args: {
    children: (
      <>
        <SLIconDone slot="before"></SLIconDone>
        Label
      </>
    ),
  },
};

export const DefaultIconAfter: StoryObj<typeof SLButton> = {
  args: {
    children: (
      <>
        <SLIconSend slot="after"></SLIconSend>
        Label
      </>
    ),
  },
};

export const DefaultDisabled: StoryObj<typeof SLButton> = {
  args: {
    isDisabled: true,
  },
};

export const Secondary: StoryObj<typeof SLButton> = {
  args: {
    variant: 'secondary',
  },
};

export const SecondaryIcon: StoryObj<typeof SLButton> = {
  args: {
    ...DefaultIcon.args,
    variant: 'secondary',
  },
};

export const SecondaryIconBefore: StoryObj<typeof SLButton> = {
  args: {
    ...DefaultIconBefore.args,
    variant: 'secondary',
  },
};

export const SecondaryIconAfter: StoryObj<typeof SLButton> = {
  args: {
    ...DefaultIconAfter.args,
    variant: 'secondary',
  },
}

export const SecondaryDisabled: StoryObj<typeof SLButton> = {
  args: {
    variant: 'secondary',
    isDisabled: true,
  },
};

export const Tertiary: StoryObj<typeof SLButton> = {
  args: {
    variant: 'tertiary',
  },
};

export const TertiaryIcon: StoryObj<typeof SLButton> = {
  args: {
    ...DefaultIcon.args,
    variant: 'tertiary',
  },
};

export const TertiaryIconBefore: StoryObj<typeof SLButton> = {
  args: {
    ...DefaultIconBefore.args,
    variant: 'tertiary',
  },
};

export const TertiaryIconAfter: StoryObj<typeof SLButton> = {
  args: {
    ...DefaultIconAfter.args,
    variant: 'tertiary',
  },
}

export const TertiaryDisabled: StoryObj<typeof SLButton> = {
  args: {
    variant: 'tertiary',
    isDisabled: true,
  },
};

export const Danger: StoryObj<typeof SLButton> = {
  args: {
    variant: 'danger',
  },
};

export const DangerIcon: StoryObj<typeof SLButton> = {
  args: {
    ...DefaultIcon.args,
    variant: 'danger',
  },
};

export const DangerIconBefore: StoryObj<typeof SLButton> = {
  args: {
    ...DefaultIconBefore.args,
    variant: 'danger',
  },
};

export const DangerIconAfter: StoryObj<typeof SLButton> = {
  args: {
    ...DefaultIconAfter.args,
    variant: 'danger',
  },
};

export const DangerDisabled: StoryObj<typeof SLButton> = {
  args: {
    variant: 'danger',
    isDisabled: true,
  },
};

export const WithFullWidth: StoryObj<typeof SLButton> = {
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

export const WithHref: StoryObj<typeof SLButton> = {
  args: {
    href: 'https://www.google.com/',
    target: '_blank',
  },
};

export const WithProgress: StoryObj<typeof SLButton> = {
  args: {
    children: (
      <>
      <SLProgress isCircle={true} isDarkContrast={true} duration={3} slot="before"></SLProgress>
      Saving
      </>
    )
  },
};
