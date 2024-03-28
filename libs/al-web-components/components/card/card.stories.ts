import { html } from 'lit';
import { spread } from '../../directives/spread';
import './card';
import '../../.storybook/components/f-po/f-po';
import '../chip/chip';
import '../heading/heading';
import '../icon/icons/dots-vertical';
import '../text-passage/text-passage';
import '../button/button';
import '../popover/popover';
import '../menu/menu';
import '../menu-item/menu-item';

export default {
  title: 'Molecules/Card',
  component: 'al-card',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
  },
  argTypes: {
    layout: {
      control: 'radio',
      options: ['default', 'row']
    },
    variant: {
      control: 'radio',
      options: ['default', 'bare']
    },
  }
};

const Template = (args) => html`
<al-card ${spread(args)}>
  <f-po slot="actions-start">Card Action Start</f-po>
  <f-po slot="actions-end">Card Action End</f-po>
  <f-po slot="image">Card Image</f-po>
  <f-po slot="header">Card Header</f-po>
  <f-po>Card Content</f-po>
</al-card>`;

export const Default = Template.bind({});
Default.args = {};

export const Bare = Template.bind({});
Bare.args = {
  variant: 'bare'
};

export const LayoutInline = Template.bind({});
LayoutInline.args = {
  layout: 'inline'
};

const TemplateWithContent = (args) => html`
<al-card ${spread(args)}>
  <al-chip slot="actions-start">Label</al-chip>
    <al-popover slot="actions-end" menuId="card-menu" variant="menu">
      <al-button slot="trigger" variant="bare" ?hideText=${true}>
        <al-icon-dots-vertical slot="before"></al-icon-dots-vertical>
      </al-button>
      <al-menu id="card-menu">
        <al-menu-item>List Item 1</al-menu-item>
        <al-menu-item>List Item 2</al-menu-item>
        <al-menu-item>List Item 3</al-menu-item>
        <al-menu-item>List Item 1</al-menu-item>
        <al-menu-item>List Item 2</al-menu-item>
        <al-menu-item>List Item 3</al-menu-item>
      </al-menu>
    </al-popover>
  <img slot="image" alt="card image" src="https://fakeimg.pl/600x400" />
  <al-heading slot="header" tagName="h3" variant="sm" ?isBold=${true}>Card title</al-heading>
  <al-text-passage>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed dui leo, lacinia ut finibus sed, consectetur quis enim.</al-text-passage>
</al-card>`;

export const WithContent = TemplateWithContent.bind({});
WithContent.args = {};

