import { expect, userEvent, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import './toggle-button-group';
import '../toggle-button/toggle-button';
import '../icon/icons/emoji';
import '../../.storybook/components/f-po/f-po';

export default {
  title: 'Molecules/Toggle Button Group',
  component: 'al-toggle-button-group',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onToggleButtonSelect', 'onToggleButtonDeselect']
    },
    controls: {
      exclude: ['selectedItem', 'toggleButtons']
    }
  },
  decorators: [ withActions ],
  argTypes: {
    variant: {
      control: 'radio',
      options: ['default', 'background']
    },
    orientation: {
      control: 'radio',
      options: ['default', 'vertical']
    },
    gap: {
      control: 'radio',
      options: ['default', 'sm']
    }
  }
};

const Template = (args) => html`
  <al-toggle-button-group ${spread(args)} data-testid="toggle-button-group">
    <al-toggle-button data-testid="toggle-button-01">
      <al-icon-emoji size="lg"></al-icon-emoji>
    </al-toggle-button>
    <al-toggle-button data-testid="toggle-button-02">
      <al-icon-emoji size="lg"></al-icon-emoji>
    </al-toggle-button>
    <al-toggle-button data-testid="toggle-button-03">
      <al-icon-emoji size="lg"></al-icon-emoji>
    </al-toggle-button>
  </al-toggle-button-group>
`;

export const Default = Template.bind({});
Default.args = {};

export const Background = Template.bind({});
Background.args = {
  variant: 'background'
};

export const Vertical = Template.bind({});
Vertical.args = {
  orientation: 'vertical'
};

export const VerticalBackground = Template.bind({});
VerticalBackground.args = {
  orientation: 'vertical',
  variant: 'background'
};

const TemplateGapSmall = (args) => html`
  <div style="position: fixed; inset-block-end: 1rem; inset-inline-end: 1rem;">
    <al-toggle-button-group ${spread(args)}>
      <al-toggle-button variant="background">
        <al-popover position="top-left">
          <al-icon-emoji slot="trigger" size="lg"></al-icon-emoji>
          <f-po>Content</f-po>
        </al-popover>
      </al-toggle-button>
      <al-toggle-button variant="background">
        <al-popover position="top-left">
          <al-icon-emoji slot="trigger" size="lg"></al-icon-emoji>
          <f-po>Content</f-po>
        </al-popover>
      </al-toggle-button>
      <al-toggle-button variant="background">
        <al-popover position="top-left">
          <al-icon-emoji slot="trigger" size="lg"></al-icon-emoji>
          <f-po>Content</f-po>
        </al-popover>
      </al-toggle-button>
    </al-toggle-button-group>
  </div>
`;
export const GapSmall = TemplateGapSmall.bind({});
GapSmall.args = {
  orientation: 'vertical',
  gap: 'sm'
};
GapSmall.parameters = {
  layout: 'fullscreen'
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

Default.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const toggleButtonGroup = canvas.queryByTestId('toggle-button-group') as any;
  const toggleButtons = canvas.queryAllByTestId(/^toggle-button-0/) as any;

  await userEvent.click(toggleButtons[0].shadowRoot?.querySelector<HTMLElement>('.al-c-toggle-button'));
  expect(toggleButtons[0].isSelected).toBe(true);
  expect(toggleButtonGroup.selectedItem).toBe(toggleButtons[0]);

  await userEvent.click(toggleButtons[1].shadowRoot?.querySelector<HTMLElement>('.al-c-toggle-button'));
  expect(toggleButtons[0].isSelected).toBe(false);
  expect(toggleButtons[1].isSelected).toBe(true);
  expect(toggleButtonGroup.selectedItem).toBe(toggleButtons[1]);

  await userEvent.click(canvasElement);
  expect(toggleButtons[1].isSelected).toBe(false);

  toggleButtons[1].blur();
};
