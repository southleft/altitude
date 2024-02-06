import { html } from 'lit';
import { spread } from '../../directives/spread';
import './card';
import '../../.storybook/components/f-po/f-po';
import '../chip/chip';
import '../heading/heading';
import '../icon/icons/dots-vertical';
import '../text-passage/text-passage';
import * as ContextualMenu from '../contextual-menu/contextual-menu.stories';

export default {
  title: 'Molecules/Card',
  component: 'sl-card',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
  },
};

const Template = (args) => html`
<sl-card ${spread(args)}>
  <f-po slot="actions-left">Card Actions Left</f-po>
  <f-po slot="actions-right">Card Actions Right</f-po>
  <f-po slot="image">Card Image</f-po>
  <f-po slot="header">Card Header</f-po>
  <f-po>Card Content</f-po>
</sl-card>`;

export const Default = Template.bind({});
Default.args = {};

const TemplateWithContent = (args) => html`
<sl-card ${spread(args)}>
  <sl-chip slot="actions-left">Label</sl-chip>
  <div slot="actions-right">${ContextualMenu.Default({})}</div>
  <img slot="image" alt="card image" src="https://fakeimg.pl/600x400" />
  <sl-heading slot="header" tagName="h3" variant="sm" ?isBold=${true}>Card title</sl-heading>
  <sl-text-passage>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed dui leo, lacinia ut finibus sed, consectetur quis enim.</sl-text-passage>
</sl-card>`;

export const WithContent = TemplateWithContent.bind({});
WithContent.args = {};

