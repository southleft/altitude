import { html } from 'lit';
import { spread } from '../../directives/spread';
import './layout-container';
import '../../.storybook/components/f-po/f-po';

export default {
  title: 'Organisms/Layout Container',
  component: 'layout-container',
  tags: [ 'autodocs' ],
  parameters: { status: { type: 'beta' } }
};

export const Default = (args) => html`
  <al-layout-container ${spread(args)}>
    <f-po>Layout Container</f-po>
  </al-layout-container>
`;