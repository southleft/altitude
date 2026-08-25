import { html } from 'lit';
import { spread } from '../../directives/spread';
import './drawer';
import '../../fixtures/f-po/f-po';
import '../layout/layout';
import '../button/button';
import '../icon/icons/menu';

export default {
  title: 'Molecules/Drawer',
  component: 'al-drawer',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onDrawerOpen', 'onDrawerClose', 'onDrawerCloseButton']
    },
    controls: {
      exclude: ['ariaLabelledBy']
    },
  },
};

const Template = (args) => html`
  <al-drawer ${spread(args)}>
    <al-button slot="trigger" ?hideText=${true} variant="bare">Toggle Drawer<al-icon-menu slot="before"></al-icon-menu></al-button>
    <f-po slot="header">Drawer Title</f-po>
    <f-po>Drawer content</f-po>
    <al-layout slot="footer" direction="row" grow>
      <al-button variant="tertiary">Submit</al-button>
      <al-button>Cancel</al-button>
    </al-layout>
  </al-drawer>
`;

export const Default = Template.bind({});
Default.args = {};

export const AlignmentRight = Template.bind({});
AlignmentRight.args = {
  alignment: 'right',
};

export const WithBackdrop = Template.bind({});
WithBackdrop.args = {
  hasBackdrop: true,
};

export const WithWidth = Template.bind({});
WithWidth.args = {
  width: '400',
};