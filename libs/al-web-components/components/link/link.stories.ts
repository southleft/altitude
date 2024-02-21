import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../icon/icons/chevron-right';
import './link';

export default {
  title: 'Atoms/Link',
  component: 'al-link',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['click']
    },
  },
  decorators: [ withActions ],
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

const Template = (args) => html`<al-link ${spread(args)} data-testid="link">Link<al-icon-chevron-right></al-icon-chevron-right></al-link>`;

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