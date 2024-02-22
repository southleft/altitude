import { html } from 'lit';
import { spread } from '../../directives/spread';
import './layout-section';
import '../../.storybook/components/f-po/f-po';

export default {
  title: 'Organisms/Layout Section',
  component: 'layout-section',
  tags: [ 'autodocs' ],
  parameters: { status: { type: 'beta' } }
};

export const Default = (args) => html`
  <al-layout-section ${spread(args)}>
    <f-po>Layout Section</f-po>
  </al-layout-section>
`;