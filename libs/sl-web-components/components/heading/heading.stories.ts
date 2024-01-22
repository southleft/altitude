import { html } from 'lit';
import { spread } from '../../directives/spread';
import './heading';

export default {
  title: 'Components/Heading',
  component: 'sl-heading',
  tags: [  'autodocs' ],
  parameters: { status: { type: 'beta' } },
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['default', 'md', 'lg', 'display-sm', 'display-md', 'display-lg']
    },
    tagName: {
      control: { type: 'radio' },
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
    },
    isBold: {
      control: 'boolean'
    },
  },
};

const Template = (args) => html`<sl-heading ${spread(args)}>This is a heading</sl-heading>`;

export const Default = Template.bind({});
Default.args = {};

export const DefaultBold = Template.bind({});
DefaultBold.args = {
  isBold: true,
};

export const Medium = Template.bind({});
Medium.args = {
  variant: 'md',
};

export const MediumBold = Template.bind({});
MediumBold.args = {
  variant: 'md',
  isBold: true,
};

export const Large = Template.bind({});
Large.args = {
  variant: 'lg',
};

export const LargeBold = Template.bind({});
LargeBold.args = {
  variant: 'lg',
  isBold: true,
};

export const DisplaySmall = Template.bind({});
DisplaySmall.args = {
  variant: 'display-sm',
};

export const DisplaySmallBold = Template.bind({});
DisplaySmallBold.args = {
  variant: 'display-sm',
  isBold: true,
};

export const DisplayMedium = Template.bind({});
DisplayMedium.args = {
  variant: 'display-md',
};

export const DisplayMediumBold = Template.bind({});
DisplayMediumBold.args = {
  variant: 'display-md',
  isBold: true,
};

export const DisplayLarge = Template.bind({});
DisplayLarge.args = {
  variant: 'display-lg',
};

export const DisplayLargeBold = Template.bind({});
DisplayLargeBold.args = {
  variant: 'display-lg',
  isBold: true,
};

export const DefaultWithH1 = Template.bind({});
DefaultWithH1.args = {
  tagName: 'h1',
};

export const DefaultWithH2 = Template.bind({});
DefaultWithH2.args = {
  tagName: 'h2',
};

export const DefaultWithH3 = Template.bind({});
DefaultWithH3.args = {
  tagName: 'h3',
};

export const DefaultWithH4 = Template.bind({});
DefaultWithH4.args = {
  tagName: 'h4',
};

export const DefaultWithH5 = Template.bind({});
DefaultWithH5.args = {
  tagName: 'h5',
};

export const DefaultWithH6 = Template.bind({});
DefaultWithH6.args = {
  tagName: 'h6',
};