import { html } from 'lit';
import { spread } from '../../directives/spread';
import './focus-trap';

export default {
  title: 'Atoms/Focus-Trap',
  component: 'sl-focus-trap',
  parameters: { status: { type: 'beta' } },
  tags: [ 'autodocs' ]
};

const Template = (args) => html`<sl-focus-trap ${spread(args)} data-testid="focus-trap">Hello world</sl-focus-trap>`;

export const Default = Template.bind({});
Default.args = {};