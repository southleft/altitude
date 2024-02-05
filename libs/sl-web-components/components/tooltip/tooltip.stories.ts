import { expect, userEvent, waitFor, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import './tooltip';

export default {
  title: 'Atoms/Tooltip',
  component: 'sl-tooltip',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onTooltipOpen', 'onTooltipClose']
    },
    controls: {
      exclude: ['ariaDescribedBy']
    },
  },
  decorators: [ withActions ],
  argTypes: {
    hasArrow: {
      type: 'boolean'
    },
    position: {
      options: ['top', 'bottom', 'left', 'right'],
      control: { type: 'radio' }
    },
    isActive: {
      type: 'boolean'
    },
    isDynamic: {
      type: 'boolean'
    },
    isInteractive: {
      type: 'boolean'
    },
  },
};

const Template = (args) => html`
  <sl-tooltip ${spread(args)} data-testid="tooltip">
    <span slot="trigger">Hover me</span>
    <span slot="prefix">⌘ + C</span>
    Tooltip Text
  </sl-tooltip>
`;

export const Default = Template.bind({});
Default.args = {};

export const PositionBottom = Template.bind({});
PositionBottom.args = {
  position: 'bottom'
};

export const PositionLeft = Template.bind({});
PositionLeft.args = {
  position: 'left'
};

export const PositionRight = Template.bind({});
PositionRight.args = {
  position: 'right'
};

const TemplatePositionDynamic = (args) => html`
  <div style="padding: 1rem; height: 100vh; width: 100%; display: flex; flex-direction: column; gap: 1rem; justify-content: space-between;">
    <div style="display: flex; justify-content: center;">
      <sl-tooltip ${spread(args)} position="top" data-testid="tooltip-01">
        <span slot="trigger">Hover me</span>
        <span slot="prefix">Text</span>
        Tooltip Text
      </sl-tooltip>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <sl-tooltip ${spread(args)} position="left" data-testid="tooltip-02">
        <span slot="trigger">Hover me</span>
        <span slot="prefix">Text</span>
        Tooltip Text
      </sl-tooltip>
      <sl-tooltip ${spread(args)} position="right" data-testid="tooltip-03">
        <span slot="trigger">Hover me</span>
        <span slot="prefix">Text</span>
        Tooltip Text
      </sl-tooltip>
    </div>
    <div style="display: flex; justify-content: center;">
      <sl-tooltip ${spread(args)} position="bottom" data-testid="tooltip-04">
        <span slot="trigger">Hover me</span>
        <span slot="prefix">Text</span>
        Tooltip Text
      </sl-tooltip>
    </div>
  </div>
`;

export const PositionDynamic = TemplatePositionDynamic.bind({});
PositionDynamic.args = {
  isDynamic: true,
  heading: 'Tooltip heading',
};
PositionDynamic.parameters = {
  layout: 'fullscreen'
}

export const HideArrow = Template.bind({});
HideArrow.args = {
  hasArrow: false
};

const TemplateVisibleOnClick = (args) => html`
  <sl-tooltip ${spread(args)} data-testid="tooltip">
    <span slot="trigger">Click me</span>
    <span slot="prefix">⌘ + C</span>
    Tooltip text
  </sl-tooltip>
`;
export const VisibleOnClick = TemplateVisibleOnClick.bind({});
VisibleOnClick.args = {
  isInteractive: true,
};

const TemplateWithLongText = (args) => html`
  <sl-tooltip ${spread(args)} data-testid="tooltip">
    <span slot="trigger">Hover me</span>
    <span slot="prefix">⌘ + C</span>
    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc nisi eros, maximus vel pellentesque non, iaculis ac urna.
  </sl-tooltip>
`;
export const WithLongText = TemplateWithLongText.bind({});
WithLongText.args = {};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

Default.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const tooltip = canvas.queryByTestId('tooltip') as any;
  const tooltipTrigger = tooltip.shadowRoot.querySelector('.sl-c-tooltip__trigger') as HTMLElement;

  await waitFor(() => {
    expect(tooltipTrigger).toBeVisible();
  });
  await userEvent.hover(tooltipTrigger);
  expect(tooltip.isActive).toBe(true);

  await userEvent.unhover(tooltipTrigger);
  expect(tooltip.isActive).toBe(false);

  tooltipTrigger.focus();
  await userEvent.click(canvasElement);
  tooltip.blur();
};

PositionDynamic.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const tooltips = canvas.queryAllByTestId(/^tooltip-0/) as any;
  const tooltip1Trigger = tooltips[0].shadowRoot.querySelector('.sl-c-tooltip__trigger') as HTMLElement;
  const tooltip2Trigger = tooltips[1].shadowRoot.querySelector('.sl-c-tooltip__trigger') as HTMLElement;
  const tooltip3Trigger = tooltips[2].shadowRoot.querySelector('.sl-c-tooltip__trigger') as HTMLElement;
  const tooltip4Trigger = tooltips[3].shadowRoot.querySelector('.sl-c-tooltip__trigger') as HTMLElement;

  await waitFor(() => {
    expect(tooltip1Trigger).toBeVisible();
  });

  await userEvent.hover(tooltip1Trigger);
  expect(tooltips[0].isActive).toBe(true);
  await userEvent.unhover(tooltip1Trigger);

  await userEvent.hover(tooltip2Trigger);
  expect(tooltips[1].isActive).toBe(true);
  await userEvent.unhover(tooltip2Trigger);

  await userEvent.hover(tooltip3Trigger);
  expect(tooltips[2].isActive).toBe(true);
  await userEvent.unhover(tooltip3Trigger);

  await userEvent.hover(tooltip4Trigger);
  expect(tooltips[3].isActive).toBe(true);
  await userEvent.unhover(tooltip4Trigger);
};

VisibleOnClick.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const tooltip = canvas.queryByTestId('tooltip') as any;
  const tooltipTrigger = tooltip.shadowRoot.querySelector('.sl-c-tooltip__trigger') as any;

  expect(tooltip).toBeInTheDocument();
  expect(tooltipTrigger).toBeInTheDocument();
  expect(tooltip.isActive).toBe(undefined);

  await waitFor(() => {
    expect(tooltipTrigger).toBeVisible();
  });
  await userEvent.click(tooltipTrigger);
  expect(tooltip.isActive).toBe(true);

  await userEvent.click(tooltipTrigger);
  expect(tooltip.isActive).toBe(false);

  await userEvent.click(tooltipTrigger);
  expect(tooltip.isActive).toBe(true);

  await userEvent.keyboard('{Escape}');
  expect(tooltip.isActive).toBe(false);

  await userEvent.keyboard('{Enter}');
  expect(tooltip.isActive).toBe(true);

  await userEvent.keyboard(' ');
  expect(tooltip.isActive).toBe(false);

  await userEvent.keyboard('{Tab}');
  expect(tooltip.isActive).toBe(false);

  await userEvent.click(canvasElement);
  tooltip.blur();
};