import { html } from 'lit';
import { spread } from '../../directives/spread';
import './icon';
import './icons/add';

export default {
  title: 'Atoms/Icon',
  component: 'sl-icon',
  tags: [ 'autodocs' ],
  parameters: { status: { type: 'beta' } },
  argTypes: {
    size: {
      control: 'radio',
      options: ['default', 'md', 'lg', 'xl'],
    },
    iconTitle: {
      control: 'text',
    },
  },
};


const Template = (args) => html`
  <sl-icon-add ${spread(args)}></sl-icon-add>
`;

export const Default = Template.bind({});
Default.args = {};

export const SizeMd = Template.bind({});
SizeMd.args = {
  size: 'md',
};

export const SizeLg = Template.bind({});
SizeLg.args = {
  size: 'lg',
};

export const SizeXl = Template.bind({});
SizeXl.args = {
  size: 'xl',
};
