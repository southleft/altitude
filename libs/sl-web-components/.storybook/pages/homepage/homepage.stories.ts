import {html} from 'lit';
import './homepage';

export default {
  title: 'Pages/Homepage',
  component: 'homepage',
  parameters: { status: { type: 'beta' } },
  tags: [ 'autodocs' ]
};

const Template = (args) => html`<homepage ${spread(args)} data-testid="homepage">Hello world</homepage>`;

export const Default = Template.bind({});
Default.args = {};