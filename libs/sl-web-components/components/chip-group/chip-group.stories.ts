import { expect } from '@storybook/jest';
import { userEvent, within } from '@storybook/testing-library';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import './chip-group';

export default {
  title: 'Molecules/Chip Group',
  component: 'sl-chip-group',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['click', 'onChipGroupExpand']
    }
  },
  decorators: [withActions],
  argTypes: {
    chipsVisible: {
      control: 'number'
    }
  }
};

const Template = (args) => html`
  <sl-chip-group ${spread(args)} data-testid="chip-group">
    <sl-chip>Label</sl-chip>
    <sl-chip variant="info">Label</sl-chip>
    <sl-chip variant="success">Label</sl-chip>
    <sl-chip variant="danger">Label</sl-chip>
    <sl-chip variant="warning">Label</sl-chip>
  </sl-chip-group>
`;

export const Default = Template.bind({});
Default.args = {};

export const With2Visible = Template.bind({});
With2Visible.args = {
  chipsVisible: '2'
};

export const With3Visible = Template.bind({});
With3Visible.args = {
  chipsVisible: '3'
};

export const With4Visible = Template.bind({});
With4Visible.args = {
  chipsVisible: '4'
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

With4Visible.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const chipGroup = canvas.queryByTestId('chip-group') as any;
  const chipGroupCounter = chipGroup?.shadowRoot?.querySelector('.sl-c-chip-group__counter') as any;

  // Make assertions
  expect(chipGroup).toBeInTheDocument();
  expect(chipGroupCounter).toBeInTheDocument();

  // Simulate a click event
  await userEvent.click(chipGroupCounter);
  expect(chipGroupCounter.isDismissed).toBe(true);

  // Reset the chip group
  chipGroup.querySelector('sl-chip:nth-child(4)').isDismissed = true;
  chipGroupCounter.isDismissed = false;
};
