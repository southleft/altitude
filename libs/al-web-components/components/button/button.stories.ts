import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../../fixtures/f-po/f-po';
import '../icon/icons/success';
import '../icon/icons/send';
import './button';
import '../layout/layout';

export default {
  title: 'Atoms/Button',
  component: 'al-button',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['click']
    }
  },
  argTypes: {
    type: {
      options: ['button', 'submit', 'reset'],
      control: { type: 'radio' }
    },
    variant: {
      options: ['default', 'neutral', 'bare', 'secondary', 'tertiary'],
      control: { type: 'radio' }
    },
    size: {
      options: ['default', 'sm', 'lg'],
      control: { type: 'radio' }
    },
    isPill: {
      control: 'boolean'
    },
    target: {
      options: ['_blank', '_self', '_parent', '_top'],
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
      control: 'text'
    }
  }
};

const Template = (args) => html` <al-button ${spread(args)}>Label</al-button> `;

const TemplateIconBefore = (args) => html`
  <al-button ${spread(args)}>
    <al-icon-success slot="before" data-testid="icon-before"></al-icon-success>
    Label
  </al-button>
`;

const TemplateIconAfter = (args) => html`
  <al-button ${spread(args)}>
    Label
    <al-icon-send slot="after" data-testid="icon-after"></al-icon-send>
  </al-button>
`;

const TemplateFullWidth = (args) => html`
  <f-po style="width: 400px;">
    <al-button ${spread(args)}>Label</al-button>
  </f-po>
`;

export const Default = Template.bind({});
Default.args = {};

export const DefaultIcon = TemplateIconBefore.bind({});
DefaultIcon.args = {
  hideText: true
};

export const DefaultIconBefore = TemplateIconBefore.bind({});
DefaultIconBefore.args = {};

export const DefaultIconAfter = TemplateIconAfter.bind({});
DefaultIconAfter.args = {};

export const DefaultDisabled = Template.bind({});
DefaultDisabled.args = {
  isDisabled: true
};

export const Secondary = Template.bind({});
Secondary.args = {
  variant: 'secondary'
};

export const SecondaryIcon = TemplateIconBefore.bind({});
SecondaryIcon.args = {
  hideText: true,
  variant: 'secondary'
};

export const SecondaryIconBefore = TemplateIconBefore.bind({});
SecondaryIconBefore.args = {
  variant: 'secondary'
};

export const SecondaryIconAfter = TemplateIconAfter.bind({});
SecondaryIconAfter.args = {
  variant: 'secondary'
};

export const SecondaryDisabled = Template.bind({});
SecondaryDisabled.args = {
  variant: 'secondary',
  isDisabled: true
};

export const Tertiary = Template.bind({});
Tertiary.args = {
  variant: 'tertiary'
};

export const TertiaryIcon = TemplateIconBefore.bind({});
TertiaryIcon.args = {
  hideText: true,
  variant: 'tertiary'
};

export const TertiaryIconBefore = TemplateIconBefore.bind({});
TertiaryIconBefore.args = {
  variant: 'tertiary'
};

export const TertiaryIconAfter = TemplateIconAfter.bind({});
TertiaryIconAfter.args = {
  variant: 'tertiary'
};

export const TertiaryDisabled = Template.bind({});
TertiaryDisabled.args = {
  variant: 'tertiary',
  isDisabled: true
};

export const Bare = Template.bind({});
Bare.args = {
  variant: 'bare'
};

export const BareIcon = TemplateIconBefore.bind({});
BareIcon.args = {
  hideText: true,
  variant: 'bare'
};

export const BareIconBefore = TemplateIconBefore.bind({});
BareIconBefore.args = {
  variant: 'bare'
};

export const BareIconAfter = TemplateIconAfter.bind({});
BareIconAfter.args = {
  variant: 'bare'
};

export const BareDisabled = Template.bind({});
BareDisabled.args = {
  variant: 'bare',
  isDisabled: true
};

export const Neutral = Template.bind({});
Neutral.args = {
  variant: 'neutral'
};

export const NeutralIcon = TemplateIconBefore.bind({});
NeutralIcon.args = {
  hideText: true,
  variant: 'neutral'
};

export const NeutralIconBefore = TemplateIconBefore.bind({});
NeutralIconBefore.args = {
  variant: 'neutral'
};

export const NeutralIconAfter = TemplateIconAfter.bind({});
NeutralIconAfter.args = {
  variant: 'neutral'
};

export const NeutralDisabled = Template.bind({});
NeutralDisabled.args = {
  variant: 'neutral',
  isDisabled: true
};

export const WithFullWidth = TemplateFullWidth.bind({});
WithFullWidth.args = {
  fullWidth: true
};

export const WithHref = Template.bind({});
WithHref.args = {
  href: 'https://www.google.com/',
  target: '_blank'
};

export const WithSubmit = () =>
  html`<form
    data-testid="form"
    action="#"
    @submit=${(e) => {
      e.preventDefault();
      onSubmit();
    }}
  >
    <input type="hidden" name="test" value="test" />
    <al-layout direction="row" gap="md">
      <al-button data-testid="submit" type="submit">Submit</al-button>
      <al-button data-testid="reset" type="reset" variant="tertiary">Reset</al-button>
    </al-layout>
  </form>`;

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

export const Small = Template.bind({});
Small.args = {
  size: 'sm',
  variant: 'tertiary'
};

export const Large = Template.bind({});
Large.args = {
  size: 'lg',
  variant: 'tertiary'
};

export const Pill = Template.bind({});
Pill.args = {
  isPill: true
};

export const PillOutline = Template.bind({});
PillOutline.args = {
  isPill: true,
  variant: 'tertiary'
};
