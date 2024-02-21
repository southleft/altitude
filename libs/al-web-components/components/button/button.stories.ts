import { expect, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../../.storybook/components/f-po/f-po';
import '../icon/icons/check';
import '../icon/icons/send';
import './button';

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
  decorators: [ withActions ],
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
    <al-icon-check slot="before" data-testid="icon-before"></al-icon-check>
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

export const Danger = Template.bind({});
Danger.args = {
  variant: 'danger'
};

export const DangerIcon = TemplateIconBefore.bind({});
DangerIcon.args = {
  hideText: true,
  variant: 'danger'
};

export const DangerIconBefore = TemplateIconBefore.bind({});
DangerIconBefore.args = {
  variant: 'danger'
};

export const DangerIconAfter = TemplateIconAfter.bind({});
DangerIconAfter.args = {
  variant: 'danger'
};

export const DangerDisabled = Template.bind({});
DangerDisabled.args = {
  variant: 'danger',
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
    <div style="display: flex; gap: 16px;">
      <al-button data-testid="submit" type="submit">Submit</al-button>
      <al-button data-testid="reset" type="reset" variant="secondary">Reset</al-button>
    </div>
  </form>`;

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

DefaultIconAfter.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const iconAfterSlot: any = canvas.queryByTestId('icon-after')?.shadowRoot?.querySelector('[class*="al-c-icon"]');
  expect(iconAfterSlot).toBeInTheDocument();
};

DefaultIconBefore.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const iconBefore = canvas.queryByTestId('icon-before')?.shadowRoot?.querySelector('[class*="al-c-icon"]');
  expect(iconBefore).toBeInTheDocument();
};
