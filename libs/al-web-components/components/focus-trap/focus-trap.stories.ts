import { html } from 'lit';
import { spread } from '../../directives/spread';
import './focus-trap';
import '../button/button';
import '../layout/layout';
import '../dialog/dialog';
import '../tab/tab';
import '../tabs/tabs';
import '../tab-panel/tab-panel';
import '../../fixtures/f-po/f-po';

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

/**
 * The trap on its own. Every other story here puts it inside a dialog, which is
 * its usual home — but that meant the documented default never rendered an
 * `<al-focus-trap>` at all, so the generated docs page had no example to show.
 *
 * Tab through the buttons: focus cycles inside the trap rather than escaping to
 * the page behind it.
 */
export const Default = (args) => html`
  <al-focus-trap ${spread(args)} ?isActive=${true}>
    <al-layout direction="row" gap="sm" align="center">
      <al-button variant="tertiary">Cancel</al-button>
      <al-button>Continue</al-button>
    </al-layout>
  </al-focus-trap>
`;
Default.args = {};

export const InsideDialog = Template.bind({});
InsideDialog.args = {};