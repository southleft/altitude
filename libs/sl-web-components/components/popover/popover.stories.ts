import { expect, userEvent, waitFor, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../../.storybook/components/f-po/f-po';
import '../button-group/button-group';
import '../button/button';
import '../icon/icons/help';
import '../tab-panel/tab-panel';
import '../tab/tab';
import '../tabs/tabs';
import '../toggle-button/toggle-button';
import './popover';

export default {
  title: 'Molecules/Popover',
  component: 'sl-popover',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onPopoverOpen', 'onPopoverClose', 'onPopoverCloseButton']
    },
    controls: {
      exclude: ['ariaLabelledBy']
    },
  },
  decorators: [withActions],
  argTypes: {
    heading: {
      type: 'text'
    },
    position: {
      options: ['bottom-center', 'bottom-right', 'bottom-left', 'top-center', 'top-right', 'top-left', 'left', 'left-top', 'right', 'right-top'],
      control: { type: 'radio' }
    },
    isActive: {
      type: 'boolean'
    },
    isDismissible: {
      type: 'boolean'
    },
  },
  args: {
    heading: 'Panel heading',
    isDismissible: true,
  },
};

function closePanel() {
  const popover = document.querySelector<any>('sl-popover');
  if (popover) {
    popover.close();
  }
}

const Template = (args) => html`
  <sl-popover ${spread(args)} data-testid="popover">
    <sl-button slot="trigger">Open Popover</sl-button>
    <f-po>Panel content</f-po>
  </sl-popover>
`;

export const Default = Template.bind({});
Default.args = {};

export const PositionBottomCenter = Template.bind({});
PositionBottomCenter.args = {
  position: 'bottom-center'
};

export const PositionBottomRight = Template.bind({});
PositionBottomRight.args = {
  position: 'bottom-right'
};

export const PositionTopLeft = Template.bind({});
PositionTopLeft.args = {
  position: 'top-left'
};

export const PositionTopCenter = Template.bind({});
PositionTopCenter.args = {
  position: 'top-center'
};

export const PositionTopRight = Template.bind({});
PositionTopRight.args = {
  position: 'top-right'
};

export const PositionLeft = Template.bind({});
PositionLeft.args = {
  position: 'left'
};

export const PositionLeftTop = Template.bind({});
PositionLeftTop.args = {
  position: 'left-top'
};

export const PositionRight = Template.bind({});
PositionRight.args = {
  position: 'right'
};

export const PositionRightTop = Template.bind({});
PositionRightTop.args = {
  position: 'right-top'
};

const TemplateWithSlottedContent = (args) => html`
  <div style="position: absolute; inset-block-end: 1rem; inset-inline-end: 1rem;">
    <sl-popover ${spread(args)} data-testid="popover">
      <sl-toggle-button slot="trigger" data-testid="popover-trigger"><sl-icon-help size="lg"></sl-icon-help></sl-toggle-button>
      <sl-tabs variant="stretch">
        <sl-tab>Tab 1</sl-tab>
        <sl-tab>Tab 2</sl-tab>
        <sl-tab>Tab 3</sl-tab>
        <sl-tab-panel slot="popover">
          <f-po>Tab popover 1 - Instance slot 1</f-po>
          <f-po>Tab popover 1 - Instance slot 2</f-po>
        </sl-tab-panel>
        <sl-tab-panel slot="popover">
          <f-po>Tab popover 2 - Instance slot 1</f-po>
          <f-po>Tab popover 2 - Instance slot 2</f-po>
        </sl-tab-panel>
        <sl-tab-panel slot="popover">
          <f-po>Tab popover 3 - Instance slot 1</f-po>
          <f-po>Tab popover 3 - Instance slot 2</f-po>
        </sl-tab-panel>
      </sl-tabs>
      <sl-button slot="footer" variant="tertiary" @click=${closePanel}>Close</sl-button>
      <sl-button-group slot="footer" alignment="right">
        <sl-button variant="secondary">Label</sl-button>
        <sl-button>Label</sl-button>
      </sl-button-group>
    </sl-popover>
  </div>
`;
export const WithSlottedContent = TemplateWithSlottedContent.bind({});
WithSlottedContent.args = {
  position: 'top-left'
};

WithSlottedContent.parameters = {
  layout: 'fullscreen'
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

WithSlottedContent.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const popover = canvas.queryByTestId('popover') as any;
  const popoverTrigger = canvas.queryByTestId('popover-trigger') as any;
  const popoverContainer = popover.shadowRoot.querySelector('.sl-c-popover__container') as HTMLElement;
  const popoverCloseButton = popover.shadowRoot.querySelector('.sl-c-popover__close-button') as HTMLElement;

  await userEvent.click(popoverTrigger);
  expect(popover.isActive).toBe(true);

  await userEvent.click(popoverTrigger);
  expect(popover.isActive).toBe(false);

  await userEvent.click(popoverTrigger);
  expect(popover.isActive).toBe(true);

  await waitFor(() => expect(popoverContainer).toBeVisible(), {
    timeout: 400, // A long timeout to make sure it doesn't close
  });
  await userEvent.type(popoverContainer, '{Escape}');
  expect(popover.isActive).toBe(false);

  popoverTrigger.focus();
  await userEvent.type(popoverTrigger, '{Enter}');
  expect(popover.isActive).toBe(true);

  await userEvent.click(popoverCloseButton);
  expect(popover.isActive).toBe(false);

  await userEvent.click(popoverTrigger);
  expect(popover.isActive).toBe(true);

  await userEvent.click(canvasElement);
  expect(popover.isActive).toBe(false);

  popoverTrigger.blur();
  await userEvent.click(canvasElement);
};
