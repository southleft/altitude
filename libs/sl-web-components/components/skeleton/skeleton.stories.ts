import { html } from 'lit';
import { spread } from '../../directives/spread';
import './skeleton';

export default {
  title: 'Atoms/Skeleton',
  component: 'sl-skeleton',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
  },
  args: {
    width: '200',
  }
};

const Template = (args) => html`<sl-skeleton ${spread(args)} data-testid="skeleton">Hello world</sl-skeleton>`;

export const Default = Template.bind({});
Default.args = {};

export const Circle = Template.bind({});
Circle.args = {
  variant: 'circle',
  width: '100',
  height: '100',
};

export const Square = Template.bind({});
Square.args = {
  variant: 'square'
};