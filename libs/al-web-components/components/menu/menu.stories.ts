import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../button/button';
import '../icon/icons/document';
import '../icon/icons/menu';
import '../menu-item/menu-item';
import '../toggle-button/toggle-button';
import './menu';

export default {
  title: 'Molecules/Navigation/Menu',
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

/**
 * The element inside an `<al-menu-item>` that actually takes focus.
 *
 * Most items render an `<al-link>` and the focusable control lives in *its*
 * shadow root. A header with no `href` renders a plain
 * `<div class="al-c-menu-item__link" tabindex="-1">` and has no nested shadow
 * root — reaching blindly for `.shadowRoot.querySelector('*')` threw on those.
 */
const focusTarget = (item: any): HTMLElement => {
  const link = item.shadowRoot.querySelector('.al-c-menu-item__link');
  return (link.shadowRoot ? link.shadowRoot.querySelector('*') : link) as HTMLElement;
};
