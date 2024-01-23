import type { StoryObj } from '@storybook/react-webpack5';
import { SLButton, SLIconDone, SLIconSend } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Components/Button',
  component: SLButton,
  tags: [ 'autodocs' ],
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

export const DefaultIconBefore: ComponentStoryObj<typeof ENButton> = {
  args: {
    children: (
      <>
        <SLIconDone slot="before"></SLIconDone>
        Label
      </>
    ),
  },
};

export const DefaultIconAfter: ComponentStoryObj<typeof ENButton> = {
  args: {
    children: (
      <>
        <SLIconSend slot="after"></SLIconSend>
        Label
      </>
    ),
  },
};

export const DefaultDisabled: ComponentStoryObj<typeof ENButton> = {
  args: {
    isDisabled: true,
  },
};

export const Secondary: ComponentStoryObj<typeof ENButton> = {
  args: {
    variant: 'secondary',
  },
};

export const SecondaryIcon: ComponentStoryObj<typeof ENButton> = {
  args: {
    ...DefaultIcon.args,
    variant: 'secondary',
  },
};

export const SecondaryIconBefore: ComponentStoryObj<typeof ENButton> = {
  args: {
    ...DefaultIconBefore.args,
    variant: 'secondary',
  },
};

export const SecondaryIconAfter: ComponentStoryObj<typeof ENButton> = {
  args: {
    ...DefaultIconAfter.args,
    variant: 'secondary',
  },
}

export const SecondaryDisabled: ComponentStoryObj<typeof ENButton> = {
  args: {
    variant: 'secondary',
    isDisabled: true,
  },
};

export const Tertiary: ComponentStoryObj<typeof ENButton> = {
  args: {
    variant: 'tertiary',
  },
};

export const TertiaryIcon: ComponentStoryObj<typeof ENButton> = {
  args: {
    ...DefaultIcon.args,
    variant: 'tertiary',
  },
};

export const TertiaryIconBefore: ComponentStoryObj<typeof ENButton> = {
  args: {
    ...DefaultIconBefore.args,
    variant: 'tertiary',
  },
};

export const TertiaryIconAfter: ComponentStoryObj<typeof ENButton> = {
  args: {
    ...DefaultIconAfter.args,
    variant: 'tertiary',
  },
}

export const TertiaryDisabled: ComponentStoryObj<typeof ENButton> = {
  args: {
    variant: 'tertiary',
    isDisabled: true,
  },
};

export const Danger: ComponentStoryObj<typeof ENButton> = {
  args: {
    variant: 'danger',
  },
};

export const DangerIcon: ComponentStoryObj<typeof ENButton> = {
  args: {
    ...DefaultIcon.args,
    variant: 'danger',
  },
};

export const DangerIconBefore: ComponentStoryObj<typeof ENButton> = {
  args: {
    ...DefaultIconBefore.args,
    variant: 'danger',
  },
};

export const DangerIconAfter: ComponentStoryObj<typeof ENButton> = {
  args: {
    ...DefaultIconAfter.args,
    variant: 'danger',
  },
};

export const DangerDisabled: ComponentStoryObj<typeof ENButton> = {
  args: {
    variant: 'danger',
    isDisabled: true,
  },
};

export const WithFullWidth: ComponentStoryObj<typeof ENButton> = {
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

export const WithHref: ComponentStoryObj<typeof ENButton> = {
  args: {
    href: 'https://www.google.com/',
    target: '_blank',
  },
};
 