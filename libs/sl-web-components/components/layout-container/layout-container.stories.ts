import { html } from 'lit';
import '../../.storybook/components/f-po/f-po';
import { spread } from '../../directives/spread';
import './layout-container';

export default {
  title: 'Organisms/Layout Container',
  component: 'layout-container',
  tags: [ 'autodocs' ],
  parameters: { status: { type: 'beta' } }
};

export const Default = (args) => html`
  <sl-layout-container ${spread(args)}>
    <f-po>Layout Container</f-po>
  </sl-layout-container>
`;