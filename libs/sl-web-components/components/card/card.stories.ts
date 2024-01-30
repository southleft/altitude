import { html } from 'lit';
import '../../.storybook/components/f-po/f-po';
import { spread } from '../../directives/spread';
import '../button/button';
import '../chip/chip';
import '../heading/heading';
import '../icon/icons/done';
import '../icon/icons/emoji';
import '../text-passage/text-passage';
import './card';

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
<div style="max-width: 300px;">
  <sl-card ${spread(args)} data-testid="card">
    <sl-chip slot="actions-left">Label</sl-chip>
    <sl-button slot="actions-right" variant="secondary" ?hideText=${true}>Button<sl-icon-done slot="after"></sl-icon-done></sl-button>
    <img slot="image" alt="card image" src="https://fakeimg.pl/600x400" />
    <sl-icon-emoji size="md" slot="header"></sl-icon-emoji>
    <sl-heading slot="header" tagName="h3" variant="sm">Card title</sl-heading>
    <sl-text-passage>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed dui leo, lacinia ut finibus sed, consectetur quis enim.</sl-text-passage>
  </sl-card>
</div>`;

export const WithContent = TemplateWithContent.bind({});
WithContent.args = {};

