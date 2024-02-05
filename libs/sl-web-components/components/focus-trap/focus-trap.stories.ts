import { html } from 'lit';
import { spread } from '../../directives/spread';
import './focus-trap';
import '../button/button';
import '../button-group/button-group';
import '../dialog/dialog';
import '../tab/tab';
import '../tabs/tabs';
import '../tab-panel/tab-panel';
import '../../.storybook/components/f-po/f-po';

export default {
  title: 'Atoms/Focus-Trap',
  component: 'sl-focus-trap',
  parameters: { status: { type: 'beta' } },
  tags: [ 'autodocs' ]
};

const Template = (args) => html`
  <sl-dialog ${spread(args)} isActive=${true} disableClickOutside=${true} heading="Dialog with Focus Trap">
    <sl-tabs variant="stretch">
        <sl-tab>Tab 1</sl-tab>
        <sl-tab>Tab 2</sl-tab>
        <sl-tab>Tab 3</sl-tab>
        <sl-tab-panel slot="panel">
          <f-po>Tab panel 1 - Instance slot 1</f-po>
          <f-po>Tab panel 1 - Instance slot 2</f-po>
        </sl-tab-panel>
        <sl-tab-panel slot="panel">
          <f-po>Tab panel 2 - Instance slot 1</f-po>
          <f-po>Tab panel 2 - Instance slot 2</f-po>
        </sl-tab-panel>
        <sl-tab-panel slot="panel">
          <f-po>Tab panel 3 - Instance slot 1</f-po>
          <f-po>Tab panel 3 - Instance slot 2</f-po>
        </sl-tab-panel>
      </sl-tabs>
      <sl-button slot="footer" variant="tertiary">Close</sl-button>
      <sl-button-group slot="footer" alignment="right">
      <sl-button variant="secondary">Label</sl-button>
      <sl-button>Label</sl-button>
    </sl-button-group>
  </sl-dialog>
`;

export const Default = Template.bind({});
Default.args = {};