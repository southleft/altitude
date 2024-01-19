import { expect } from '@storybook/jest';
import { userEvent, within } from '@storybook/testing-library';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../icon/icons/done';
import './tab';

export default {
  title: 'Components/Tab',
  component: 'sl-tab',
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['tabSelect']
    },
    controls: {
      exclude: ['ariaId', 'ariaControls', 'idx', 'tabEl']
    },
  },
  argTypes: {
    isActive: {
      control: 'boolean',
    },
    isDisabled: {
      control: 'boolean',
    },
  },
};

const Template = (args) => html`<sl-tab ${spread(args)} data-testid="tab"><sl-icon-done></sl-icon-done>Label<sl-badge variant="danger">2</sl-badge></sl-tab>`;

export const Default = Template.bind({});
Default.args = {};

export const Selected = Template.bind({});
Selected.args = {
  isActive: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  isDisabled: true,
};

export const DisabledSelected = Template.bind({});
DisabledSelected.args = {
  isActive: true,
  isDisabled: true,
};

const TemplateWithIconOnly = (args) => html`<sl-tab ${spread(args)} data-testid="tab"><sl-icon-done></sl-icon-done><span class="sl-u-is-vishidden">Label</span></sl-tab>`;

export const WithIconOnly = TemplateWithIconOnly.bind({});
WithIconOnly.args = {
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

Selected.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const tab = canvas.queryByTestId('tab') as any;

  // Make assertions
  expect(tab).toBeInTheDocument();

  // Simulate a click event
  await userEvent.click(tab);
  expect(tab.isActive).toBe(true);
  tab.blur();
};