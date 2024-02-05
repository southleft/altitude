import { html } from 'lit';
import { spread } from '../../directives/spread';
import './layout';
import '../layout-section/layout-section';
import '../../.storybook/components/f-po/f-po';

export default {
  title: 'Organisms/Layout',
  component: 'sl-layout',
  tags: [ 'autodocs' ],
  parameters: { status: { type: 'beta' } },
  argTypes: {
    variant: {
      control: 'radio',
      options: ['default', 'sidebar-left', 'sidebar-right']
    },
    gap: {
      control: 'radio',
      options: ['default', 'sm', 'lg', 'xl']
    }
  }
};

const Template = (args) => html`
  <sl-layout ${spread(args)}>
    <sl-layout-section>
      <f-po>Layout Section</f-po>
    </sl-layout-section>
    <sl-layout-section>
      <f-po>Layout Section</f-po>
    </sl-layout-section>
  </sl-layout>
`;

export const Default = Template.bind({});
Default.args = {};

export const DefaultWithGapSm = Template.bind({});
DefaultWithGapSm.args = {
  gap: 'sm'
};

export const DefaultWithGapLg = Template.bind({});
DefaultWithGapLg.args = {
  gap: 'lg'
};

export const DefaultWithGapXl = Template.bind({});
DefaultWithGapXl.args = {
  gap: 'xl'
};

export const SidebarRight = Template.bind({});
SidebarRight.args = {
  variant: 'sidebar-right'
};

export const SidebarLeft = Template.bind({});
SidebarLeft.args = {
  variant: 'sidebar-left'
};
