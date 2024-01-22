import { html } from 'lit';
import { spread } from '../../directives/spread';
import './drawer';

export default {
  title: 'Components/Drawer',
  component: 'sl-drawer',
  tags: [  'autodocs' ],
  parameters: { status: { type: 'beta' } },
};

function toggleDrawer() {
  const drawer = document.querySelector<any>('sl-drawer');
  if (drawer) {
    drawer.toggleActive();
  }
}

const Template = (args) => html`
  <sl-button @click=${toggleDrawer}>Toggle Drawer</sl-button>
  <sl-drawer ${spread(args)}>
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