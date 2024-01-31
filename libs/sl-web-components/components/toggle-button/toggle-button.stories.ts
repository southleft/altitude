import { expect, userEvent, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import './toggle-button';
import '../avatar/avatar';
import '../icon/icons/emoji';
import '../icon/icons/chevron-down';
import '../popover/popover';
import '../tooltip/tooltip';
import '../../.storybook/components/f-po/f-po';

export default {
  title: 'Atoms/Toggle Button',
  component: 'sl-toggle-button',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onToggleButtonDeselect', 'onToggleButtonSelect', 'onPopoverCloseButton']
    },
    controls: {
      exclude: ['isSmall', 'slottedEls', 'toggleButton', 'toggleButtonContent', 'hasPanel']
    }
  },
  decorators: [ withActions ],
  argTypes: {
    variant: {
      control: 'radio',
      options: ['default', 'background']
    },
    isSelected: {
      control: 'boolean'
    },
    hasToggle: {
      control: 'boolean'
    }
  },
};

const Template = (args) => html`
  <sl-toggle-button ${spread(args)} data-testid="toggle-button">
    Text Label
  </sl-toggle-button>
`;
export const Default = Template.bind({});
Default.args = {};

const TemplateIcon = (args) => html`
  <sl-toggle-button ${spread(args)} data-testid="toggle-button">
    <sl-icon-emoji size="lg"></sl-icon-emoji>
  </sl-toggle-button>
`;
export const DefaultIcon = TemplateIcon.bind({});
DefaultIcon.args = {};

const TemplatePrefixIcon = (args) => html`
  <sl-toggle-button ${spread(args)} data-testid="toggle-button">
    <sl-icon-emoji size="lg"></sl-icon-emoji>
    Text Label
  </sl-toggle-button>
`;
export const DefaultPrefixIcon = TemplatePrefixIcon.bind({});
DefaultPrefixIcon.args = {};

const TemplateAvatar = (args) => html`
  <sl-toggle-button ${spread(args)} data-testid="toggle-button">
    <sl-avatar variant="sm" ?hasBadge=${true} badgeVariant="success">
      <img src="https://picsum.photos/80/80" alt="Alt text" />
    </sl-avatar>
  </sl-toggle-button>
`;
export const DefaultAvatar = TemplateAvatar.bind({});
DefaultAvatar.args = {};

const TemplateWithDropdown = (args) => html`
  <sl-toggle-button ${spread(args)} data-testid="toggle-button">
    <sl-popover heading="Heading" ?isDismissible=${true}>
      <span slot="trigger">Text label</span>
      <sl-icon-chevron-down slot="trigger"></sl-icon-chevron-down>
      <f-po>Content</f-po>
    </sl-popover>
  </sl-toggle-button>
`;
export const DefaultWithDropdown = TemplateWithDropdown.bind({});
DefaultWithDropdown.args = {};

const TemplateWithDropdownIcon = (args) => html`
  <sl-toggle-button ${spread(args)} data-testid="toggle-button">
    <sl-popover>
      <sl-icon-emoji slot="trigger" size="lg"></sl-icon-emoji>
      <sl-icon-chevron-down slot="trigger"></sl-icon-chevron-down>
      <f-po>Content</f-po>
    </sl-popover>
  </sl-toggle-button>
`;
export const DefaultWithDropdownIcon = TemplateWithDropdownIcon.bind({});
DefaultWithDropdownIcon.args = {};

const TemplateWithDropdownPrefixIcon = (args) => html`
  <sl-toggle-button ${spread(args)} data-testid="toggle-button">
    <sl-popover>
      <sl-icon-emoji slot="trigger" size="lg"></sl-icon-emoji>
      <span slot="trigger">Text label</span>
      <sl-icon-chevron-down slot="trigger"></sl-icon-chevron-down>
      <f-po>Content</f-po>
    </sl-popover>
  </sl-toggle-button>
`;
export const DefaultWithDropdownPrefixIcon = TemplateWithDropdownPrefixIcon.bind({});
DefaultWithDropdownPrefixIcon.args = {};

const TemplateWithTooltip = (args) => html`
  <sl-tooltip>
    <sl-toggle-button ${spread(args)} slot="trigger" data-testid="toggle-button">Text Label</sl-toggle-button>
    Tooltip Text
  </sl-tooltip>
`;
export const DefaultWithTooltip = TemplateWithTooltip.bind({});
DefaultWithTooltip.args = {};

const TemplateWithTooltipAndDropdown = (args) => html`
  <sl-tooltip>
    <sl-toggle-button ${spread(args)} data-testid="toggle-button" slot="trigger">
      <sl-popover>
        <sl-icon-emoji slot="trigger" size="lg"></sl-icon-emoji>
        <span slot="trigger">Text label</span>
        <sl-icon-chevron-down slot="trigger"></sl-icon-chevron-down>
        <f-po>Content</f-po>
      </sl-popover>
    </sl-toggle-button>
    Tooltip Text
  </sl-tooltip>
`;
export const DefaultWithTooltipAndDropdown = TemplateWithTooltipAndDropdown.bind({});
DefaultWithTooltipAndDropdown.args = {};

export const Background = Template.bind({});
Background.args = {
  variant: 'background'
};

export const BackgroundIcon = TemplateIcon.bind({});
BackgroundIcon.args = {
  ...Background.args
};

export const BackgroundPrefixIcon = TemplatePrefixIcon.bind({});
BackgroundPrefixIcon.args = {
  ...Background.args
};

export const BackgroundAvatar = TemplateAvatar.bind({});
BackgroundAvatar.args = {
  ...Background.args
};

export const BackgroundWithDropdown = TemplateWithDropdown.bind({});
BackgroundWithDropdown.args = {
  ...Background.args,
};

export const BackgroundWithDropdownIcon = TemplateWithDropdownIcon.bind({});
BackgroundWithDropdownIcon.args = {
  ...Background.args,
};

export const BackgroundWithDropdownPrefixIcon = TemplateWithDropdownPrefixIcon.bind({});
BackgroundWithDropdownPrefixIcon.args = {
  ...Background.args,
};

export const BackgroundWithTooltip = TemplateWithTooltip.bind({});
BackgroundWithTooltip.args = {
  ...Background.args
};

export const BackgroundWithTooltipAndDropdown = TemplateWithTooltipAndDropdown.bind({});
BackgroundWithTooltipAndDropdown.args = {};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

DefaultWithDropdown.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const toggleButton = canvas.queryByTestId('toggle-button') as any;
  const toggleButtonEl = toggleButton.shadowRoot?.querySelector('.sl-c-toggle-button__content') as HTMLElement;

  await userEvent.click(toggleButtonEl);
  expect(toggleButton.isSelected).toBe(true);

  await userEvent.click(toggleButtonEl);
  expect(toggleButton.isSelected).toBe(false);

  await userEvent.keyboard('{Enter}');
  expect(toggleButton.isSelected).toBe(true);

  await userEvent.keyboard('{Escape}');
  expect(toggleButton.isSelected).toBe(false);

  await userEvent.click(canvasElement);
  expect(toggleButton.isSelected).toBe(false);

  toggleButton.blur();
};
