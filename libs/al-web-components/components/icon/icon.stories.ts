import { html } from 'lit';
import { spread } from '../../directives/spread';
import './icon';
import './icons/add';

export default {
  title: 'Atoms/Icon',
  component: 'al-icon',
  tags: [ 'autodocs' ],
  parameters: { status: { type: 'beta' } },
  argTypes: {
    size: {
      control: 'radio',
      options: ['default', 'xs', 'sm', 'md', 'lg', 'xl' , 'xxl' , 'xxxl'],
    },
    iconTitle: {
      control: 'text',
    },
  },
};

const Template = (args) => html`
  <al-icon-add ${spread(args)}></al-icon-add>
`;

export const Default = Template.bind({});
Default.args = {};

export const SizeXs = Template.bind({});
SizeXs.args = {
  size: 'xs',
};

export const SizeSm = Template.bind({});
SizeSm.args = {
  size: 'sm',
};

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

export const SizeXxl = Template.bind({});
SizeXxl.args = {
  size: 'xxl',
};

export const SizeXxxl = Template.bind({});
SizeXxxl.args = {
  size: 'xxxl',
};
