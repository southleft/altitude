import { expect, userEvent, waitFor, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import './popover';
import '../../.storybook/components/f-po/f-po';
import '../button-group/button-group';
import '../button/button';
import '../icon/icons/document';
import '../icon/icons/menu';
import '../icon/icons/help';
import '../menu-item/menu-item';
import '../menu/menu';
import '../tab-panel/tab-panel';
import '../tab/tab';
import '../tabs/tabs';
import '../toggle-button/toggle-button';

export default {
  title: 'Molecules/Popover',
  component: 'al-popover',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onPopoverOpen', 'onPopoverClose', 'onPopoverCloseButton', 'onMenuItemSelect', 'onMenuItemExpand']
    },
    controls: {
      exclude: ['ariaLabelledBy', 'popoverTrigger', 'popoverTriggerButton', 'handleOnClickOutside', 'transitionDelay']
    }
  },
  decorators: [ withActions ],
  argTypes: {
    variant: {
      options: ['default', 'menu'],
      control: { type: 'radio' },
    },
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
    }
  }
};

function closePopover() {
  const popover = document.querySelector<any>('al-popover');
  if (popover) {
    popover.close();
  }
}

const Template = (args) => html`
  <al-popover ${spread(args)} data-testid="popover">
    <al-button data-testid="popover-trigger" slot="trigger">Open Popover</al-button>
    <f-po>Popover content</f-po>
  </al-popover>
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

export const WithDismissible = Template.bind({});
WithDismissible.args = {
  isDismissible: true,
  heading: "Popover heading",
};

const TemplateWithMenu = (args) => html`
  <al-popover ${spread(args)} data-testid="popover" variant="menu">
    <al-button data-testid="popover-trigger" slot="trigger" variant="tertiary" ?hideText=${true}>
      <al-icon-menu slot="before"></al-icon-menu>
      Menu
    </al-button>
    <al-menu data-testid="menu">
      <al-menu-item ?isHeader=${true} data-testid="menu-item-01">
        <al-icon-document slot="before"></al-icon-document>
        Header
      </al-menu-item>
      <al-menu-item data-testid="menu-item-02">Menu Item</al-menu-item>
      <al-menu-item data-testid="menu-item-03">Menu Item</al-menu-item>
      <al-menu-item data-testid="menu-item-04">Menu Item</al-menu-item>
      <al-menu-item ?isDisabled=${true} data-testid="menu-item-05">Menu Item</al-menu-item>
      <al-menu-item data-testid="menu-item-06">Menu Item</al-menu-item>
    </al-menu>
  </al-popover>`
;

export const WithMenu = TemplateWithMenu.bind({});
WithMenu.args = {
  variant: 'menu',
  position: 'bottom-right'
};
WithMenu.parameters = {
  layout: 'fullscreen'
};

const TemplateMenuWithGroups = (args) => html`
  <al-popover ${spread(args)} data-testid="popover">
    <al-button slot="trigger" variant="tertiary" ?hideText=${true}>
      <al-icon-menu slot="before"></al-icon-menu>
      Menu
    </al-button>
    <al-menu data-testid="menu">
    <al-menu-item ?isHeader=${true} data-testid="menu-item-01">
      <al-icon-document slot="before"></al-icon-document>
      Menu Item
    </al-menu-item>
    <al-menu-item ?isHeader=${true} ?isExpanded=${true} ?isExpandableHeader=${true} data-testid="menu-item-02">
      <al-icon-document slot="before"></al-icon-document>
      Menu Item
    </al-menu-item>
    <al-menu-item data-testid="menu-item-03">Menu Item</al-menu-item>
    <al-menu-item data-testid="menu-item-04">Menu Item</al-menu-item>
    <al-menu-item ?isHeader=${true} ?isExpanded=${true} ?isExpandableHeader=${true} data-testid="menu-item-05">
      <al-icon-document slot="before"></al-icon-document>
      Menu Item
    </al-menu-item>
    <al-menu-item data-testid="menu-item-06">Menu Item</al-menu-item>
    <al-menu-item data-testid="menu-item-07">Menu Item</al-menu-item>
    <al-menu-item data-testid="menu-item-08">Menu Item</al-menu-item>
  </al-menu>
</al-popover>`;

export const WithMenuWithGroups = TemplateMenuWithGroups.bind({});
WithMenuWithGroups.args = {
  ...WithMenu.args
};
WithMenuWithGroups.parameters = {
  layout: 'fullscreen',
  position: 'bottom-right'
};

const TemplateWithContent = (args) => html`
  <div style="position: fixed; inset-block-end: var(--al-theme-space); inset-inline-end: var(--al-theme-space); z-index: var(--al-z-index-400);">
    <al-popover ${spread(args)} data-testid="popover">
      <al-toggle-button slot="trigger" variant="background" data-testid="popover-trigger"><al-icon-help size="lg"></al-icon-help></al-toggle-button>
      <al-tabs variant="stretch">
        <al-tab>Tab 1</al-tab>
        <al-tab>Tab 2</al-tab>
        <al-tab>Tab 3</al-tab>
        <al-tab-panel slot="panel">
          <f-po>Tab panel 1 - Instance slot 1</f-po>
          <f-po>Tab panel 1 - Instance slot 2</f-po>
        </al-tab-panel>
        <al-tab-panel slot="panel">
          <f-po>Tab panel 2 - Instance slot 1</f-po>
          <f-po>Tab panel 2 - Instance slot 2</f-po>
        </al-tab-panel>
        <al-tab-panel slot="panel">
          <f-po>Tab panel 3 - Instance slot 1</f-po>
          <f-po>Tab panel 3 - Instance slot 2</f-po>
        </al-tab-panel>
      </al-tabs>
      <al-button slot="footer" variant="tertiary" @click=${closePopover}>Close</al-button>
      <al-button-group slot="footer" alignment="right">
        <al-button variant="secondary">Label</al-button>
        <al-button>Label</al-button>
      </al-button-group>
    </al-popover>
  </div>
`;
export const WithContent = TemplateWithContent.bind({});
WithContent.args = {
  position: 'top-left',
  heading: "Popover heading",
  isDismissible: true
};

WithContent.parameters = {
  layout: 'fullscreen'
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

Default.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const popover = canvas.queryByTestId('popover') as any;
  const popoverTrigger = canvas.queryByTestId('popover-trigger') as any;
  const popoverContainer = popover.shadowRoot.querySelector('.al-c-popover__container') as HTMLElement;

  await userEvent.click(popoverTrigger);
  expect(popover.isActive).toBe(true);

  // Timeout for transition delay to complete
  await waitFor(() => {
    userEvent.type(popoverContainer, '{Escape}');
    expect(popover.isActive).toBe(false);
  }, {  timeout: 500 });

  await userEvent.click(canvasElement);
}

WithMenu.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const popover = canvas.queryByTestId('popover') as any;
  const popoverTrigger = canvas.queryByTestId('popover-trigger') as any;
  const popoverContainer = popover.shadowRoot.querySelector('.al-c-popover__container') as HTMLElement;
  const firstMenuItem = canvas.queryByTestId('menu-item-01').shadowRoot.querySelector('.al-c-menu-item__link').shadowRoot.querySelector('*') as any;

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

WithContent.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const popover = canvas.queryByTestId('popover') as any;
  const popoverTrigger = canvas.queryByTestId('popover-trigger') as any;
  const popoverCloseButton = popover.shadowRoot.querySelector('.al-c-popover__close-button') as HTMLElement;

  await userEvent.type(popoverTrigger, '{Enter}');
  expect(popover.isActive).toBe(true);

  await userEvent.type(popoverCloseButton, '{Escape}');
  expect(popover.isActive).toBe(false);

  popoverTrigger.blur();
}
