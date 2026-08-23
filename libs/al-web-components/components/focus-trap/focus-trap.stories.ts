import { html } from 'lit';
import { spread } from '../../directives/spread';
import './focus-trap';
import '../button/button';
import '../layout/layout';
import '../dialog/dialog';
import '../tab/tab';
import '../tabs/tabs';
import '../tab-panel/tab-panel';
import '../../.storybook/components/f-po/f-po';

export default {
  title: 'Atoms/Focus Trap',
  component: 'al-focus-trap',
  parameters: { status: { type: 'beta' } },
  // HIDDEN FROM THE SIDEBAR. `'!autodocs'` opts this meta out of the global
  // `tags: ['autodocs']` in `.storybook/preview.ts`, and with `docs.docsMode` on
  // in `main.ts` the individual stories are already hidden — so dropping the docs
  // entry removes the component from the sidebar entirely. The component itself
  // is untouched and still exported from `bundle.ts`.
  tags: [ '!autodocs' ]
};

const Template = (args) => html`
  <al-dialog ${spread(args)} ?isActive=${true} ?disableClickOutside=${true} heading="Dialog with Focus Trap">
    <al-tabs variant="stretch">
        <al-tab>Tab 1</al-tab>
        <al-tab>Tab 2</al-tab>
        <al-tab>Tab 3</al-tab>
        <al-tab-panel slot="panel">
          <f-po>Tab panel 1 - Instance slot 1</f-po>
          <f-po>Tab panel 1 - Instance slot 2</f-po>
        </al-tab-panel>
        <al-tab-panel slot="panel">
          <f-po>Tab panel 2 - Instance slot 1</f-po>
          <f-po>Tab panel 2 - Instance slot 2</f-po>
        </al-tab-panel>
        <al-tab-panel slot="panel">
          <f-po>Tab panel 3 - Instance slot 1</f-po>
          <f-po>Tab panel 3 - Instance slot 2</f-po>
        </al-tab-panel>
      </al-tabs>
      <al-button slot="footer" variant="bare">Close</al-button>
      <al-layout slot="footer" direction="row" justify="end" grow>
      <al-button variant="tertiary">Label</al-button>
      <al-button>Label</al-button>
    </al-layout>
  </al-dialog>
`;

export const Default = Template.bind({});
Default.args = {};