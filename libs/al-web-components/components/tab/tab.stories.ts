import { expect, userEvent, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../icon/icons/check';
import './tab';

export default {
  title: 'Atoms/Tab',
  component: 'al-tab',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onTabSelect']
    },
    controls: {
      exclude: ['ariaId', 'ariaControls', 'idx', 'tabEl']
    },
  },
  decorators: [ withActions ],
  argTypes: {
    isActive: {
      control: 'boolean',
    },
    isDisabled: {
      control: 'boolean',
    },
  },
};

const Template = (args) => html`<al-tab ${spread(args)} data-testid="tab"><al-icon-check></al-icon-check>Label<al-badge variant="danger">2</al-badge></al-tab>`;

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

const TemplateWithIconOnly = (args) => html`<al-tab ${spread(args)} data-testid="tab"><al-icon-check></al-icon-check><span class="al-u-is-vishidden">Label</span></al-tab>`;

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