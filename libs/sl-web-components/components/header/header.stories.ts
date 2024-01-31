import { html } from 'lit';
import { spread } from '../../directives/spread';
import './header';

export default {
  title: 'Organisms/Header',
  component: 'sl-header',
  parameters: { status: { type: 'beta' } },
  tags: [ 'autodocs' ]
};

const Template = (args) => html`<sl-header ${spread(args)} data-testid="header">Hello world</sl-header>`;

export const Default = Template.bind({});
Default.args = {};