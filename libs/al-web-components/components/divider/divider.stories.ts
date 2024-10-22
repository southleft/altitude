import { html } from 'lit';
import { spread } from '../../directives/spread';
import './divider';
import '../../.storybook/components/f-po/f-po';

export default {
  title: 'Atoms/Divider',
  component: 'al-divider',
  tags: [ 'autodocs' ],
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
  <div style="display: flex; flex-direction: column; gap: 1rem;">
    <f-po>Layout Section</f-po>
    <al-divider ${spread(args)}></al-divider>
    <f-po>Layout Section</f-po>
  </div>
`;

export const Default = Template.bind({});
Default.args = {};

const TemplateVertical = (args) => html`
  <div style="display: flex; gap: 1rem;">
    <f-po>Layout Section</f-po>
    <al-divider ${spread(args)}></al-divider>
    <f-po>Layout Section</f-po>
  </div>
`;

export const Vertical = TemplateVertical.bind({});
Vertical.args = {
  variant: 'vertical'
};
