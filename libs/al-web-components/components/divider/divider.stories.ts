import { html } from 'lit';
import { spread } from '../../directives/spread';
import './divider';
import '../layout/layout';
import '../text-block/text-block';

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
  <al-layout direction="column" gap="md">
    <al-text-block>Tokens are grouped into three tiers.</al-text-block>
    <al-divider ${spread(args)}></al-divider>
    <al-text-block>Tier-3 is where a brand overrides a role.</al-text-block>
  </al-layout>
`;

export const Default = Template.bind({});
Default.args = {};

const TemplateVertical = (args) => html`
  <al-layout direction="row" gap="md">
    <al-text-block>Components</al-text-block>
    <al-divider ${spread(args)}></al-divider>
    <al-text-block>Tokens</al-text-block>
  </al-layout>
`;

export const Vertical = TemplateVertical.bind({});
Vertical.args = {
  variant: 'vertical'
};
