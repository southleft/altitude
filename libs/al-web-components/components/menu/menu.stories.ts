import { expect, userEvent, within, waitFor } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../button/button';
import '../icon/icons/document';
import '../icon/icons/menu';
import '../menu-item/menu-item';
import '../toggle-button/toggle-button';
import './menu';

export default {
  title: 'Molecules/Menu',
  component: 'al-menu',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onMenuItemExpand', 'onMenuItemSelect'],
    },
    controls: {
      exclude: [
        'menuItems',
        'menuList',
        'focusedItem',
        'selectedItem',
        'validItemCount',
        'hasOverflow',
      ]
    }
  },
  decorators: [ withActions ],
  argTypes: {
    variant: {
      type: 'radio',
      options: ['default', 'simple']
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
  },
  args: {
    width: '280',
  },
};

const Template = (args) => html`
  <al-menu ${spread(args)} data-testid="menu">
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
`;

const TemplateWithGroups = (args) => html`
  <al-menu ${spread(args)} data-testid="menu">
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
`;

const TemplateWithGroupIndentation = (args) => html`
  <al-menu ${spread(args)} ?indentGroupItems=${true} data-testid="menu">
    <al-menu-item ?isHeader=${true} ?isExpanded=${true} ?isExpandableHeader=${true} data-testid="menu-item-01">
      <al-icon-document slot="before"></al-icon-document>
      Menu Item
    </al-menu-item>
    <al-menu-item data-testid="menu-item-02">Menu Item</al-menu-item>
    <al-menu-item data-testid="menu-item-03">Menu Item</al-menu-item>
    <al-menu-item data-testid="menu-item-04">Menu Item</al-menu-item>
  </al-menu>
`;

const TemplateWithHrefs = (args) => html`
  <al-menu ${spread(args)} data-testid="menu">
    <al-menu-item href="#" target="_blank" ?isHeader=${true} data-testid="menu-item-01">
      <al-icon-document slot="before"></al-icon-document>
      Menu Item
    </al-menu-item>
    <al-menu-item href="#" target="_blank" ?isHeader=${true} ?isExpandableHeader=${true} data-testid="menu-item-02">
      <al-icon-document slot="before"></al-icon-document>
      Menu Item
    </al-menu-item>
    <al-menu-item href="#" target="_blank" data-testid="menu-item-03">Menu Item</al-menu-item>
    <al-menu-item href="#" target="_blank" ?isHeader=${true} ?isExpanded=${true} ?isExpandableHeader=${true} data-testid="menu-item-02">
      <al-icon-document slot="before"></al-icon-document>
      Menu Item
    </al-menu-item>
    <al-menu-item href="#" target="_blank" data-testid="menu-item-03">Menu Item</al-menu-item>
  </al-menu>
`;

export const Default = Template.bind({});
Default.args = {
};

export const DefaultWithScroll = Template.bind({});
DefaultWithScroll.args = {
  height: '160'
};

export const WithGroups = TemplateWithGroups.bind({});
WithGroups.args = {};

export const WithGroupsWithScroll = TemplateWithGroups.bind({});
WithGroupsWithScroll.args = {
  height: '160'
};

export const WithGroupIndentation = TemplateWithGroupIndentation.bind({});
WithGroupIndentation.args = {};

export const WithHrefs = TemplateWithHrefs.bind({});
WithHrefs.args = {};

export const Simple = Template.bind({});
Simple.args = {
  variant: 'simple',
};
Simple.parameters= {
  layout: 'fullscreen'
};

export const SimpleWithGroups = TemplateWithGroups.bind({});
SimpleWithGroups.args = {
  ...Simple.args
};
SimpleWithGroups.parameters= {
  layout: 'fullscreen'
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

Default.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const menu = canvas.queryByTestId('menu') as any;
  const menuItems = canvas.queryAllByTestId(/^menu-item-0/) as any;
  const menuListEl = menu.shadowRoot?.querySelector('.al-c-menu__list') as HTMLUListElement;

  // Make assertions
  expect(menu).toBeInTheDocument();

  // Simulate a focus event on the menu's first item
  await menuItems[0].shadowRoot.querySelector('.al-c-menu-item__link').shadowRoot.querySelector('*').focus();
  await waitFor(() => expect(menu.focusedItem).toBe(undefined), {
    timeout: 6000
  });

  // Simulate a keyboard event (pressing Arrow Down key)
  await userEvent.keyboard('[ArrowDown]');
  await waitFor(() => expect(menu.focusedItem).toBe(menuItems[1]), {
    timeout: 6000
  });

  // Simulate a keyboard event (pressing Arrow Up key)
  await userEvent.keyboard('[ArrowUp]');
  await waitFor(() => expect(menu.focusedItem).toBe(menuItems[0]), {
    timeout: 6000
  });

  // Simulate a keyboard event (pressing End key)
  await userEvent.keyboard('[End]');
  await waitFor(() => expect(menu.focusedItem).toBe(menuItems[5]), {
    timeout: 6000
  });

  // Simulate a keyboard event (pressing Arrow Up key) to a disabled menu item
  await userEvent.keyboard('[ArrowUp]');
  await waitFor(() => expect(menu.focusedItem).toBe(menuItems[4]), {
    timeout: 6000
  });

  // Simulate a keyboard event (pressing Home key)
  await userEvent.keyboard('[Home]');
  await waitFor(() => expect(menu.focusedItem).toBe(menuItems[0]), {
    timeout: 6000
  });

  // Simulate a click event on a disabled menu item
  await userEvent.click(menuItems[4].shadowRoot.querySelector('.al-c-menu-item__link').shadowRoot.querySelector('*'));
  expect(menu.selectedItem).toBe(undefined);
  expect(menuItems[4].isSelected).toBe(undefined);

  // Simulate a click event on the first menu item
  await userEvent.click(menuItems[0].shadowRoot.querySelector('.al-c-menu-item__link').shadowRoot.querySelector('*'));
  expect(menu.selectedItem).toBe(menuItems[0]);

  // Simulate a click event on the second menu item
  await userEvent.click(menuItems[1].shadowRoot.querySelector('.al-c-menu-item__link').shadowRoot.querySelector('*'));
  expect(menu.selectedItem).toBe(menuItems[1]);
  expect(menuItems[0].isSelected).toBe(false);

  // Remove selected item and focus
  menuItems[1].isSelected = false;
  menu.selectedItem = undefined
  menuItems[1].blur();
};


WithGroups.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const menuItems = canvas.queryAllByTestId(/^menu-item-0/) as any;

  // Simulate a click event on menu expand button
  await userEvent.click(menuItems[1].shadowRoot.querySelector('.al-c-menu-item__control'));
  expect(menuItems[2].isHidden).toBe(true);
  expect(menuItems[3].isHidden).toBe(true);

  // Simulate a click event on menu expand button
  await userEvent.click(menuItems[1].shadowRoot.querySelector('.al-c-menu-item__control'));
  expect(menuItems[2].isHidden).toBe(false);
  expect(menuItems[3].isHidden).toBe(false);
};