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
  component: 'sl-card',
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
<sl-card ${spread(args)}>
  <f-po slot="actions-start">Card Action Start</f-po>
  <f-po slot="actions-end">Card Action End</f-po>
  <f-po slot="image">Card Image</f-po>
  <f-po slot="header">Card Header</f-po>
  <f-po>Card Content</f-po>
</sl-card>`;

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
<sl-card ${spread(args)}>
  <sl-chip slot="actions-start">Label</sl-chip>
    <sl-popover slot="actions-end" menuId="card-menu" variant="menu">
      <sl-button slot="trigger" variant="tertiary" ?hideText=${true}>
        <sl-icon-dots-vertical slot="before"></sl-icon-dots-vertical>
      </sl-button>
      <sl-menu id="card-menu">
        <sl-menu-item>List Item 1</sl-menu-item>
        <sl-menu-item>List Item 2</sl-menu-item>
        <sl-menu-item>List Item 3</sl-menu-item>
        <sl-menu-item>List Item 1</sl-menu-item>
        <sl-menu-item>List Item 2</sl-menu-item>
        <sl-menu-item>List Item 3</sl-menu-item>
      </sl-menu>
    </sl-popover>
  <img slot="image" alt="card image" src="https://fakeimg.pl/600x400" />
  <sl-heading slot="header" tagName="h3" variant="sm" ?isBold=${true}>Card title</sl-heading>
  <sl-text-passage>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed dui leo, lacinia ut finibus sed, consectetur quis enim.</sl-text-passage>
</sl-card>`;

export const WithContent = TemplateWithContent.bind({});
WithContent.args = {};

