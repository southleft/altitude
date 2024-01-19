import { html } from 'lit';
import '../../.storybook/components/f-po/f-po';
import { spread } from '../../directives/spread';
import './divider';

export default {
  title: 'Components/Divider',
  component: 'sl-divider',
  parameters: {
    status: { type: 'beta' },
    layout: 'centered'
  },
  argTypes: {
    variant: {
      control: 'radio',
      options: ['default', 'vertical'],
    },
  },
};

const Template = (args) => html`
  <div class="sl-u-spacing">
    <f-po>Layout Section</f-po>
    <sl-divider ${spread(args)}></sl-divider>
    <f-po>Layout Section</f-po>
  </div>
`;

export const Default = Template.bind({});
Default.args = {};

const TemplateVertical = (args) => html`
  <div class="sl-u-spacing--left" style="display: flex;">
    <f-po>Layout Section</f-po>
    <sl-divider ${spread(args)}></sl-divider>
    <f-po>Layout Section</f-po>
  </div>
`;

export const Vertical = TemplateVertical.bind({});
Vertical.args = {
  variant: 'vertical'
};
