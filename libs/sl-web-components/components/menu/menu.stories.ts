import { expect } from '@storybook/jest';
import { userEvent, within } from '@storybook/testing-library';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../button/button';
import '../icon/icons/add-square';
import '../icon/icons/list';
import '../menu-item/menu-item';
import '../toggle-button/toggle-button';
import './menu';

export default {
  title: 'Components/Menu',
  component: 'sl-menu',
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['open', 'close', 'menuItemExpanded', 'menuItemSelected'],
    },
    controls: {
      exclude: [
        'menuId',
        'menuItems',
        'menuList',
        'menuTrigger',
        'tabIndex',
        'focusedItem',
        'selectedItem',
        'validItemCount',
        'firstValidItem',
        'hasOverflow',
      ]
    }
  },
  argTypes: {
    variant: {
      type: 'radio',
      options: ['default', 'cascading']
    },
    position: {
      options: ['bottom-right', 'bottom-left', 'top-right', 'top-left', 'left', 'right' ],
      control: { type: 'radio' }
    },
    isActive: {
      control: 'boolean'
    },
    width: {
      control: 'number'
    },
    height: {
      control: 'number'
    },
    label: {
      control: 'text'
    },
    indentGroupItems: {
      control: 'boolean'
    },
  },
  args: {
    isActive: true,
    width: '280',
  },
};

const Template = (args) => html`
  <sl-menu ${spread(args)} data-testid="menu">
    <sl-menu-item ?isHeader=${true} data-testid="menu-item-01">
      <sl-icon-add-square slot="before"></sl-icon-add-square>
      Header
    </sl-menu-item>
    <sl-menu-item data-testid="menu-item-02">Menu Item</sl-menu-item>
    <sl-menu-item data-testid="menu-item-03">Menu Item</sl-menu-item>
    <sl-menu-item data-testid="menu-item-04">Menu Item</sl-menu-item>
    <sl-menu-item ?isDisabled=${true} data-testid="menu-item-05">Menu Item</sl-menu-item>
    <sl-menu-item data-testid="menu-item-06">Menu Item</sl-menu-item>
  </sl-menu>
`;

const TemplateWithTrigger = (args) => html`
  <sl-menu ${spread(args)} data-testid="menu">
    <sl-button slot="trigger" data-testid="menu-trigger">Open Menu</sl-button>
    <sl-menu-item ?isHeader=${true} data-testid="menu-item-01">
      <sl-icon-add-square slot="before"></sl-icon-add-square>
      Menu Item
    </sl-menu-item>
    <sl-menu-item data-testid="menu-item-02">Menu Item</sl-menu-item>
    <sl-menu-item data-testid="menu-item-03">Menu Item</sl-menu-item>
    <sl-menu-item data-testid="menu-item-04">Menu Item</sl-menu-item>
    <sl-menu-item data-testid="menu-item-05">Menu Item</sl-menu-item>
    <sl-menu-item data-testid="menu-item-06">Menu Item</sl-menu-item>
    <sl-menu-item data-testid="menu-item-07">Menu Item</sl-menu-item>
    <sl-menu-item data-testid="menu-item-08">Menu Item</sl-menu-item>
    <sl-menu-item data-testid="menu-item-09">Menu Item</sl-menu-item>
  </sl-menu>
`;

const TemplateWithGroups = (args) => html`
  <sl-menu ${spread(args)} data-testid="menu">
    <sl-menu-item ?isHeader=${true} data-testid="menu-item-01">
      <sl-icon-add-square slot="before"></sl-icon-add-square>
      Menu Item
    </sl-menu-item>
    <sl-menu-item ?isHeader=${true} ?isExpanded=${true} ?isExpandableHeader=${true} data-testid="menu-item-02">
      <sl-icon-add-square slot="before"></sl-icon-add-square>
      Menu Item
    </sl-menu-item>
    <sl-menu-item data-testid="menu-item-03">Menu Item</sl-menu-item>
    <sl-menu-item data-testid="menu-item-04">Menu Item</sl-menu-item>
    <sl-menu-item ?isHeader=${true} ?isExpanded=${true} ?isExpandableHeader=${true} data-testid="menu-item-05">
      <sl-icon-add-square slot="before"></sl-icon-add-square>
      Menu Item
    </sl-menu-item>
    <sl-menu-item data-testid="menu-item-06">Menu Item</sl-menu-item>
    <sl-menu-item data-testid="menu-item-07">Menu Item</sl-menu-item>
    <sl-menu-item data-testid="menu-item-08">Menu Item</sl-menu-item>
  </sl-menu>
`;

const TemplateWithGroupsWithTrigger = (args) => html`
  <sl-menu ${spread(args)} data-testid="menu" ?isActive=${false}>
    <sl-toggle-button slot="trigger" data-testid="menu-trigger" variant="background"><sl-icon-list size="lg"></sl-icon-list></sl-toggle-button>
    <sl-menu-item ?isHeader=${true} data-testid="menu-item-1">
      <sl-icon-add-square slot="before"></sl-icon-add-square>
      Menu Item
    </sl-menu-item>
    <sl-menu-item ?isHeader=${true} ?isExpanded=${true} ?isExpandableHeader=${true} data-testid="menu-item-2">
      <sl-icon-add-square slot="before"></sl-icon-add-square>
      Menu Item
    </sl-menu-item>
    <sl-menu-item data-testid="menu-item-3">Menu Item</sl-menu-item>
    <sl-menu-item data-testid="menu-item-4">Menu Item</sl-menu-item>
    <sl-menu-item ?isHeader=${true} ?isExpanded=${true} ?isExpandableHeader=${true} data-testid="menu-item-5">
      <sl-icon-add-square slot="before"></sl-icon-add-square>
      Menu Item
    </sl-menu-item>
    <sl-menu-item data-testid="menu-item-6">Menu Item</sl-menu-item>
    <sl-menu-item ?isDisabled=${true} data-testid="menu-item-7">Menu Item</sl-menu-item>
    <sl-menu-item data-testid="menu-item-8">Menu Item</sl-menu-item>
  </sl-menu>
`;

const TemplateWithGroupIndentation = (args) => html`
  <sl-menu ${spread(args)} ?indentGroupItems=${true} data-testid="menu">
    <sl-menu-item ?isHeader=${true} ?isExpanded=${true} ?isExpandableHeader=${true} data-testid="menu-item-01">
      <sl-icon-add-square slot="before"></sl-icon-add-square>
      Menu Item
    </sl-menu-item>
    <sl-menu-item data-testid="menu-item-02">Menu Item</sl-menu-item>
    <sl-menu-item data-testid="menu-item-03">Menu Item</sl-menu-item>
    <sl-menu-item data-testid="menu-item-04">Menu Item</sl-menu-item>
  </sl-menu>
`;

const TemplateWithHrefs = (args) => html`
  <sl-menu ${spread(args)} data-testid="menu">
    <sl-menu-item href="#" target="_blank" ?isHeader=${true} data-testid="menu-item-01">
      <sl-icon-add-square slot="before"></sl-icon-add-square>
      Menu Item
    </sl-menu-item>
    <sl-menu-item href="#" target="_blank" ?isHeader=${true} ?isExpandableHeader=${true} data-testid="menu-item-02">
      <sl-icon-add-square slot="before"></sl-icon-add-square>
      Menu Item
    </sl-menu-item>
    <sl-menu-item href="#" target="_blank" data-testid="menu-item-03">Menu Item</sl-menu-item>
    <sl-menu-item href="#" target="_blank" ?isHeader=${true} ?isExpanded=${true} ?isExpandableHeader=${true} data-testid="menu-item-02">
      <sl-icon-add-square slot="before"></sl-icon-add-square>
      Menu Item
    </sl-menu-item>
    <sl-menu-item href="#" target="_blank" data-testid="menu-item-03">Menu Item</sl-menu-item>
  </sl-menu>
`;

export const Default = Template.bind({});
Default.args = {
};

export const DefaultWithScroll = Template.bind({});
DefaultWithScroll.args = {
  height: '160'
};

export const DefaultWithTrigger = TemplateWithTrigger.bind({});
DefaultWithTrigger.args = {
  isActive: false,
  height: '160'
};

export const WithGroups = TemplateWithGroups.bind({});
WithGroups.args = {};

export const WithGroupsWithScroll = TemplateWithGroups.bind({});
WithGroupsWithScroll.args = {
  height: '160'
};

export const WithGroupsWithTrigger = TemplateWithGroupsWithTrigger.bind({});
WithGroupsWithTrigger.args = {
  isActive: false
};
WithGroupsWithTrigger.parameters= {
  layout: 'fullscreen'
};

export const WithGroupIndentation = TemplateWithGroupIndentation.bind({});
WithGroupIndentation.args = {};

export const WithHrefs = TemplateWithHrefs.bind({});
WithHrefs.args = {};

export const Cascading = Template.bind({});
Cascading.args = {
  variant: 'cascading',
};
Cascading.parameters= {
  layout: 'fullscreen'
};

export const CascadingWithGroups = TemplateWithGroups.bind({});
CascadingWithGroups.args = {
  ...Cascading.args
};
CascadingWithGroups.parameters= {
  layout: 'fullscreen'
};

export const PositionTopLeft = TemplateWithTrigger.bind({});
PositionTopLeft.args = {
  ...DefaultWithTrigger.args,
  position: 'top-left'
};

export const PositionTopRight = TemplateWithTrigger.bind({});
PositionTopRight.args = {
  ...DefaultWithTrigger.args,
  position: 'top-right'
};

export const PositionBottomLeft = TemplateWithTrigger.bind({});
PositionBottomLeft.args = {
  ...DefaultWithTrigger.args,
  position: 'bottom-left'
};

export const PositionBottomRight = TemplateWithTrigger.bind({});
PositionBottomRight.args = {
  ...DefaultWithTrigger.args,
  position: 'bottom-right'
};

export const PositionLeft = TemplateWithTrigger.bind({});
PositionLeft.args = {
  ...DefaultWithTrigger.args,
  position: 'left'
};

export const PositionRight = TemplateWithTrigger.bind({});
PositionRight.args = {
  ...DefaultWithTrigger.args,
  position: 'right'
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

Default.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const menu = canvas.queryByTestId('menu') as any;
  const menuItems = canvas.queryAllByTestId(/^menu-item-0/) as any;
  const menuListEl = menu.shadowRoot?.querySelector('.sl-c-menu__list') as HTMLUListElement;

  // Make assertions
  expect(menu).toBeInTheDocument();

  // // Simulate a focus event on the menu
  await menuListEl.focus();
  expect(menu.focusedItem).toBe(menuItems[0]);

  // Simulate a keyboard event (pressing Arrow Down key)
  await userEvent.type(menuItems[0], '{arrowDown}');
  expect(menu.focusedItem).toBe(menuItems[1])

  // Simulate a keyboard event (pressing Arrow Up key)
  await userEvent.type(menuItems[1], '{arrowUp}');
  expect(menu.focusedItem).toBe(menuItems[0]);

  // Simulate a keyboard event (pressing End key)
  await userEvent.type(menuItems[0], '{End}');
  expect(menu.focusedItem).toBe(menuItems[5]);

  // Simulate a keyboard event (pressing Arrow Up key) and skipping disabled menu item
  await userEvent.type(menuItems[5], '{arrowUp}');
  expect(menu.focusedItem).toBe(menuItems[3]);

  // Simulate a keyboard event (pressing Home key)
  await userEvent.type(menuItems[3], '{Home}');
  expect(menu.focusedItem).toBe(menuItems[0]);

  // Remove focus
  menuItems[0].blur();
};

DefaultWithTrigger.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const menuTrigger = canvas.queryByTestId('menu-trigger') as any;
  const menu = canvas.queryByTestId('menu') as any;
  const menuItems = canvas.queryAllByTestId(/^menu-item-0/) as any;

  // Simulate a click event to open menu
  await userEvent.click(menuTrigger);
  expect(menu.isActive).toBe(true);

  // Simulate a click event on menu item
  await userEvent.click(menuItems[1].shadowRoot.querySelector('.sl-c-menu-item__link'));
  expect(menu.selectedItem).toBe(menuItems[1]);

  // Simulate a click event on menu item
  await userEvent.click(menuItems[2].shadowRoot.querySelector('.sl-c-menu-item__link'));
  expect(menuItems[1].isSelected).toBe(false);
  expect(menu.selectedItem).toBe(menuItems[2]);

  // Simulate a click event to close menu
  await userEvent.click(menuTrigger);
  expect(menu.isActive).toBe(false);

  // Simulate a click event to open menu
  await userEvent.click(menuTrigger);
  expect(menu.isActive).toBe(true);

  // Simulate a keyboard event (pressing Escape key)
  await userEvent.type(menuTrigger, "{Escape}");
  expect(menu.isActive).toBe(false);

  // Simulate a keyboard event (pressing Ebter key)
  await userEvent.type(menuTrigger, "{Enter}");
  expect(menu.isActive).toBe(true);

  // Remove focus
  await userEvent.click(canvasElement);
  setTimeout(() => {
    menuTrigger.shadowRoot.querySelector('.sl-c-button').blur();
  }, 1);
};

WithGroups.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const menuItems = canvas.queryAllByTestId(/^menu-item-0/) as any;

  // Simulate a click event on menu expand button
  await userEvent.click(menuItems[1].shadowRoot.querySelector('.sl-c-menu-item__control'));
  expect(menuItems[2].isHidden).toBe(true);
  expect(menuItems[3].isHidden).toBe(true);

  // Simulate a click event on menu expand button
  await userEvent.click(menuItems[1].shadowRoot.querySelector('.sl-c-menu-item__control'));
  expect(menuItems[2].isHidden).toBe(false);
  expect(menuItems[3].isHidden).toBe(false);
};

WithGroupsWithTrigger.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const menuTrigger = canvas.queryByTestId('menu-trigger') as any;
  const menu = canvas.queryByTestId('menu') as any;

  // Simulate a click event to open menu
  await userEvent.click(menuTrigger);
  expect(menu.isActive).toBe(true);

  // Simulate a keyboard event (pressing Escape key)
  await userEvent.type(menuTrigger, "{Escape}");
  expect(menu.isActive).toBe(false);

  // Simulate a click event to open menu
  await userEvent.click(menuTrigger);
  expect(menu.isActive).toBe(true);

  // Simulate a click on the canvas to close the menu
  await userEvent.click(canvasElement);
  expect(menu.isActive).toBe(false);

  // Remove focus
  setTimeout(() => {
    menuTrigger.shadowRoot.querySelector('.sl-c-toggle-button').blur();
  }, 1);
};