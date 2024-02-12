import { expect, userEvent, waitFor, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import './popover';
import '../../.storybook/components/f-po/f-po';
import '../button-group/button-group';
import '../button/button';
import '../menu/menu';
import '../menu-item/menu-item';
import '../icon/icons/document';
import '../icon/icons/menu';

export default {
  title: 'Molecules/Popover',
  component: 'sl-popover',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onPopoverOpen', 'onPopoverClose']
    },
    controls: {
      exclude: ['ariaLabelledBy']
    },
  },
  decorators: [ withActions ],
  argTypes: {
    position: {
      options: ['bottom-center', 'bottom-right', 'bottom-left', 'top-center', 'top-right', 'top-left', 'left', 'left-top', 'right', 'right-top'],
      control: { type: 'radio' }
    },
    isActive: {
      type: 'boolean'
    }
  }
};

const Template = (args) => html`
  <sl-popover ${spread(args)} data-testid="popover">
    <sl-button data-testid="popover-trigger" slot="trigger">Open Popover</sl-button>
    <f-po style="padding: 8px; width: 432px" width=>Popover content</f-po>
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

const TemplateWithMenu = (args) => html`
  <sl-popover ${spread(args)} data-testid="popover" menuId="menu-123">
    <sl-button data-testid="popover-trigger" slot="trigger" variant="tertiary" ?hideText=${true}>
      <sl-icon-menu slot="before"></sl-icon-menu>
      Menu
    </sl-button>
    <sl-menu data-testid="menu" id="menu-123">
      <sl-menu-item ?isHeader=${true} data-testid="menu-item-01">
        <sl-icon-document slot="before"></sl-icon-document>
        Header
      </sl-menu-item>
      <sl-menu-item data-testid="menu-item-02">Menu Item</sl-menu-item>
      <sl-menu-item data-testid="menu-item-03">Menu Item</sl-menu-item>
      <sl-menu-item data-testid="menu-item-04">Menu Item</sl-menu-item>
      <sl-menu-item ?isDisabled=${true} data-testid="menu-item-05">Menu Item</sl-menu-item>
      <sl-menu-item data-testid="menu-item-06">Menu Item</sl-menu-item>
    </sl-menu>
  </sl-popover>`
;

export const WithMenu = TemplateWithMenu.bind({});
WithMenu.args = {
  position: 'bottom-right'
};
WithMenu.parameters = {
  layout: 'fullscreen'
};

const TemplateMenuWithGroups = (args) => html`
  <sl-popover ${spread(args)} data-testid="popover" menuId="group-menu-123">
    <sl-button slot="trigger" variant="tertiary" ?hideText=${true}>
      <sl-icon-menu slot="before"></sl-icon-menu>
      Menu
    </sl-button>
    <sl-menu data-testid="menu" id="group-menu-123">
    <sl-menu-item ?isHeader=${true} data-testid="menu-item-01">
      <sl-icon-document slot="before"></sl-icon-document>
      Menu Item
    </sl-menu-item>
    <sl-menu-item ?isHeader=${true} ?isExpanded=${true} ?isExpandableHeader=${true} data-testid="menu-item-02">
      <sl-icon-document slot="before"></sl-icon-document>
      Menu Item
    </sl-menu-item>
    <sl-menu-item data-testid="menu-item-03">Menu Item</sl-menu-item>
    <sl-menu-item data-testid="menu-item-04">Menu Item</sl-menu-item>
    <sl-menu-item ?isHeader=${true} ?isExpanded=${true} ?isExpandableHeader=${true} data-testid="menu-item-05">
      <sl-icon-document slot="before"></sl-icon-document>
      Menu Item
    </sl-menu-item>
    <sl-menu-item data-testid="menu-item-06">Menu Item</sl-menu-item>
    <sl-menu-item data-testid="menu-item-07">Menu Item</sl-menu-item>
    <sl-menu-item data-testid="menu-item-08">Menu Item</sl-menu-item>
  </sl-menu>
</sl-popover>`;

export const WithMenuWithGroups = TemplateMenuWithGroups.bind({});
WithMenuWithGroups.args = {
  position: 'bottom-right'
};
WithMenuWithGroups.parameters = {
  layout: 'fullscreen'
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

Default.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const popover = canvas.queryByTestId('popover') as any;
  const popoverTrigger = canvas.queryByTestId('popover-trigger') as any;
  const popoverContainer = popover.shadowRoot.querySelector('.sl-c-popover__container') as HTMLElement;

  await userEvent.click(popoverTrigger);
  expect(popover.isActive).toBe(true);

  // Timeout for transition delay to complete
  await waitFor(() => {
    userEvent.type(popoverContainer, '{Escape}');
    expect(popover.isActive).toBe(false);
  }, {  timeout: 500 }); 
}

WithMenu.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const popover = canvas.queryByTestId('popover') as any;
  const popoverTrigger = canvas.queryByTestId('popover-trigger') as any;
  const popoverContainer = popover.shadowRoot.querySelector('.sl-c-popover__container') as HTMLElement;
  const firstMenuItem = canvas.queryByTestId('menu-item-01').shadowRoot.querySelector('.sl-c-menu-item__link').shadowRoot.querySelector('*') as any;

  await userEvent.click(popoverTrigger);
  expect(popover.isActive).toBe(true);

  await userEvent.click(popoverTrigger);
  expect(popover.isActive).toBe(false);

  await userEvent.click(popoverTrigger);
  expect(popover.isActive).toBe(true);

  await waitFor(() => expect(popoverContainer).toBeVisible(), {
    timeout: 400, // A long timeout to make sure it doesn't close
  });
  await userEvent.type(firstMenuItem, '{Escape}');
  expect(popover.isActive).toBe(false);

  popoverTrigger.focus();
  await userEvent.type(popoverTrigger, '{Enter}');
  expect(popover.isActive).toBe(true);

  await userEvent.click(canvasElement);
  expect(popover.isActive).toBe(false);

  await userEvent.click(firstMenuItem);
  await userEvent.click(canvasElement);
  expect(popover.isActive).toBe(false);

  popoverTrigger.blur();
  await userEvent.click(canvasElement);
};
