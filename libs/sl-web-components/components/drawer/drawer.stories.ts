import { html } from 'lit';
import { spread } from '../../directives/spread';
import './drawer';
import '../../.storybook/components/f-po/f-po';
import '../button-group/button-group';
import '../button/button';
import '../icon/icons/menu';

export default {
  title: 'Molecules/Drawer',
  component: 'sl-drawer',
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
  <sl-drawer ${spread(args)}>
    <sl-button slot="trigger" ?hideText=${true} variant="tertiary">Toggle Drawer<sl-icon-menu slot="before"></sl-icon-menu></sl-button>
    <f-po slot="header">Drawer Title</f-po>
    <f-po>Drawer content</f-po>
    <sl-button-group slot="footer">
      <sl-button variant="secondary">Submit</sl-button>
      <sl-button>Cancel</sl-button>
    </sl-button-group>
  </sl-drawer>
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