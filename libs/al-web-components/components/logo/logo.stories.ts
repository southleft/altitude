import { html } from 'lit';
import { spread } from '../../directives/spread';
import './logo';

export default {
  title: 'Atoms/Logo',
  component: 'al-logo',
  parameters: { status: { type: 'beta' } },
  tags: [ 'autodocs' ],
};

const Template = (args) => html`<al-logo ${spread(args)} data-testid="logo">By Southleft</al-logo>`;

export const Default = Template.bind({});
Default.args = {};

export const Northright = Template.bind({});
Northright.args = {
  variant: 'northright'
};

export const Odyssey = Template.bind({});
Odyssey.args = {
  variant: 'odyssey'
};

const TemplateSouthleft = (args) => html`<al-logo ${spread(args)}></al-logo>`;
export const Southleft = TemplateSouthleft.bind({});
Southleft.args = {
  variant: 'southleft'
};