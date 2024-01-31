import { expect, userEvent, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../icon/icons/add-square';
import '../icon/icons/chevron-down';
import './menu-item';

export default {
  title: 'Atoms/Menu Item',
  component: 'sl-menu-item',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onMenuItemSelect', 'onMenuExpand'],
    },
    controls: {
      exclude: ['isFocused', 'idx', 'ariaControls', 'menuItemLink', 'menuItemControl', 'menuItemLinkEl', 'menuItemControlEl']
    },
  },
  decorators: [withActions],
  argTypes: {
    href: {
      control: 'text'
    },
    target: {
      control: { type: 'radio' },
      options: ['_blank', '_self', '_parent', '_top']
    },
    linkTitle: {
      control: 'text'
    },
    isHeader: {
      control: 'boolean'
    },
    isExpandableHeader: {
      control: 'boolean'
    },
    isExpanded: {
      control: 'boolean'
    },
    isSelected: {
      control: 'boolean'
    },
    isDisabled: {
      control: 'boolean'
    },
    isHidden: {
      control: 'boolean'
    },
    indentation: {
      control: 'number'
    },
    label: {
      control: 'text'
    },
    groupId: {
      control: 'text'
    },
  },
};

const Template = (args) => html`<sl-menu-item ${spread(args)} data-testid="menu-item">Menu Item</sl-menu-item>`;

const TemplateWithIcon = (args) => html`
  <sl-menu-item ${spread(args)} data-testid="menu-item">
    <sl-icon-add-square slot="before"></sl-icon-add-square>
    Menu Item
  </sl-menu-item>
`;

export const Default = Template.bind({});
Default.args = {};

export const DefaultSelected = Template.bind({});
DefaultSelected.args = {
  isSelected: true
};

export const DefaultDisabled = Template.bind({});
DefaultDisabled.args = {
  isDisabled: true
};

export const DefaultWithIcon = TemplateWithIcon.bind({});
DefaultWithIcon.args = {};

export const DefaultWithIconSelected = TemplateWithIcon.bind({});
DefaultWithIconSelected.args = {
  isSelected: true
};

export const DefaultWithIconDisabled = TemplateWithIcon.bind({});
DefaultWithIconDisabled.args = {
  isDisabled: true
};

export const Header = Template.bind({});
Header.args = {
  isHeader: true
};

export const HeaderSelected = Template.bind({});
HeaderSelected.args = {
  ...Header.args,
  isSelected: true
};

export const HeaderDisabled = Template.bind({});
HeaderDisabled.args = {
  ...Header.args,
  isDisabled: true
};

export const HeaderWithIcon = TemplateWithIcon.bind({});
HeaderWithIcon.args = {
  ...Header.args
};

export const HeaderWithIconSelected = TemplateWithIcon.bind({});
HeaderWithIconSelected.args = {
  ...Header.args,
  isSelected: true
};

export const HeaderWithIconDisabled = TemplateWithIcon.bind({});
HeaderWithIconDisabled.args = {
  ...Header.args,
  isDisabled: true
};

export const HeaderGroup = Template.bind({});
HeaderGroup.args = {
  ...Header.args,
  groupId: '123'
};

export const HeaderGroupSelected = Template.bind({});
HeaderGroupSelected.args = {
  ...HeaderGroup.args,
  isSelected: true
};

export const HeaderGroupDisabled = Template.bind({});
HeaderGroupDisabled.args = {
  ...HeaderGroup.args,
  isDisabled: true
};

export const HeaderGroupWithIcon = TemplateWithIcon.bind({});
HeaderGroupWithIcon.args = {
  ...HeaderGroup.args
};

export const HeaderGroupWithIconSelected = TemplateWithIcon.bind({});
HeaderGroupWithIconSelected.args = {
  ...HeaderGroup.args,
  isSelected: true
};

export const HeaderGroupWithIconDisabled = TemplateWithIcon.bind({});
HeaderGroupWithIconDisabled.args = {
  ...HeaderGroup.args,
  isDisabled: true
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

Default.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const menuItem = canvas.queryByTestId('menu-item') as any;
  const menuItemLink = menuItem.shadowRoot?.querySelector('.sl-c-menu-item__link') as HTMLElement;

  await userEvent.click(menuItemLink);
  expect(menuItem.isSelected).toBe(true);

  menuItem.isSelected = false;
  menuItem.blur();
};

HeaderGroup.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const menuItem = canvas.queryByTestId('menu-item') as any;
  const menuControl = menuItem.shadowRoot?.querySelector('.sl-c-menu-item__control') as HTMLElement;
  const menuItemLink = menuItem.shadowRoot?.querySelector('.sl-c-menu-item__link') as HTMLElement;

  await userEvent.click(menuItemLink);
  expect(menuItem.isSelected).toBe(true);

  await userEvent.click(menuControl);
  expect(menuItem.isExpanded).toBe(true);

  menuItem.isSelected = false;
  menuItem.isExpanded = false;
};
