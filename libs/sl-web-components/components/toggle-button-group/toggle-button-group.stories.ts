import { expect } from '@storybook/jest';
import { userEvent, within } from '@storybook/testing-library';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../icon/icons/emoji';
import '../toggle-button/toggle-button';
import './toggle-button-group';

export default {
  title: 'Components/Toggle Button Group',
  component: 'sl-toggle-button-group',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['toggleButtonSelected', 'toggleButtonDeselected']
    },
    controls: {
      exclude: ['selectedItem', 'toggleButtons']
    }
  },
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
  <sl-toggle-button-group ${spread(args)} data-testid="toggle-button-group">
    <sl-toggle-button data-testid="toggle-button-01">
      <sl-icon-emoji size="lg"></sl-icon-emoji>
    </sl-toggle-button>
    <sl-toggle-button data-testid="toggle-button-02">
      <sl-icon-emoji size="lg"></sl-icon-emoji>
    </sl-toggle-button>
    <sl-toggle-button data-testid="toggle-button-03">
      <sl-icon-emoji size="lg"></sl-icon-emoji>
    </sl-toggle-button>
  </sl-toggle-button-group>
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
    <sl-toggle-button-group ${spread(args)}>
      <sl-toggle-button variant="background">
        <sl-popover position="top-left">
          <sl-icon-emoji slot="trigger" size="lg"></sl-icon-emoji>
          <f-po>Content</f-po>
        </sl-popover>
      </sl-toggle-button>
      <sl-toggle-button variant="background">
        <sl-popover position="top-left">
          <sl-icon-emoji slot="trigger" size="lg"></sl-icon-emoji>
          <f-po>Content</f-po>
        </sl-popover>
      </sl-toggle-button>
      <sl-toggle-button variant="background">
        <sl-popover position="top-left">
          <sl-icon-emoji slot="trigger" size="lg"></sl-icon-emoji>
          <f-po>Content</f-po>
        </sl-popover>
      </sl-toggle-button>
    </sl-toggle-button-group>
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

  await userEvent.click(toggleButtons[0].shadowRoot?.querySelector<HTMLElement>('.sl-c-toggle-button'));
  expect(toggleButtons[0].isSelected).toBe(true);
  expect(toggleButtonGroup.selectedItem).toBe(toggleButtons[0]);

  await userEvent.click(toggleButtons[1].shadowRoot?.querySelector<HTMLElement>('.sl-c-toggle-button'));
  expect(toggleButtons[0].isSelected).toBe(false);
  expect(toggleButtons[1].isSelected).toBe(true);
  expect(toggleButtonGroup.selectedItem).toBe(toggleButtons[1]);

  await userEvent.click(canvasElement);
  expect(toggleButtons[1].isSelected).toBe(false);

  toggleButtons[1].blur();
};
