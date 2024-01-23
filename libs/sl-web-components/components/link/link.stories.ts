import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../icon/icons/chevron-right';
import './link';

export default {
  title: 'Components/Link',
  component: 'sl-link',
  tags: [  'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['click']
    },
   },
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['default', 'xs', 'sm', 'lg']
    },
    target: {
      control: { type: 'radio' },
      options: ['_blank', '_self', '_parent', '_top']
    },
    label: {
      control: 'text'
    },
    ariaLabelledBy: {
      control: 'text'
    },
    linkTitle: {
      control: 'text'
    },
    styleModifier: {
      control: 'text'
    }
  },
  args: {
    href: '#',
    linkTitle: 'Link title',
  },
};

const Template = (args) => html`<sl-link ${spread(args)} data-testid="link">Link<sl-icon-chevron-right></sl-icon-chevron-right></sl-link>`;

export const Default = Template.bind({});
Default.args = {};

export const XSmall = Template.bind({});
XSmall.args = {
  variant: 'xs',
};

export const Small = Template.bind({});
Small.args = {
  variant: 'sm',
};

export const Large = Template.bind({});
Large.args = {
  variant: 'lg',
};

export const WithTargetBlank = Template.bind({});
WithTargetBlank.args = {
  target: '_blank',
  href: 'https://google.com'
};

export const WithoutHref = Template.bind({});
WithoutHref.args = {
  href: null
};