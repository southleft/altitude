import { html } from 'lit';
import { spread } from '../../directives/spread';
import './accordion';
import '../accordion-panel/accordion-panel';

export default {
  title: 'Molecules/Accordion',
  component: 'al-accordion',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onAccordionPanelOpen', 'onAccordionPanelClose']
    },
  },
};

const Template = (args) => html`
  <al-accordion ${spread(args)}>
    <al-accordion-panel ?isActive=${true}>
      <div slot="header">What ships in v2?</div>
      <p>New neutrals, retired floating labels, segmented steppers, pill chips, and a mono metadata layer.</p>
    </al-accordion-panel>
    <al-accordion-panel>
      <div slot="header">Is it breaking?</div>
      <p>Only where you relied on the floating label or the old stepper markup. Tokens keep their names; a handful change value.</p>
    </al-accordion-panel>
    <al-accordion-panel>
      <div slot="header">Can I theme it?</div>
      <p>Yes — every value resolves through <code>&lt;al-theme&gt;</code>, so a brand can repoint the ramps without touching component code.</p>
    </al-accordion-panel>
    <al-accordion-panel ?isDisabled=${true}>
      <div slot="header">Migration guide (coming soon)</div>
      <p>Published alongside the v2 release.</p>
    </al-accordion-panel>
  </al-accordion>
`;

export const Default = Template.bind({});
Default.args = {}

export const ExpandOneOnly = Template.bind({});
ExpandOneOnly.args = {
  expandOneOnly: true,
}

export const ExpandAll = Template.bind({});
ExpandAll.args = {
  expandAll: true,
}
