import {html} from 'lit';
import { spread } from '../../../directives/spread';
import './basic-page';
import '../../components/f-po/f-po';

export default {
  title: 'Templates/Basic Page',
  component: 'sl-basic-page',
  parameters: { status: { type: 'beta' } },
  tags: [ 'autodocs' ]
};

const Template = (args) => html`<sl-basic-page ${spread(args)} data-testid="basic-page"><f-po style=${`height: 80vh;`}>Basic Page Content</f-po></sl-basic-page>`;

export const Default = Template.bind({});
Default.args = {};