import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../icon/icons/document';
import './breadcrumbs-item';

export default {
  title: 'Components/Breadcrumbs Item',
  component: 'sl-breadcrumbs-item',
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['click']
    },
    controls: {
      exclude: ['isTruncated']
    },
  },
  argTypes: {
    href: {
      control: 'text'
    },
    target: {
      control: 'radio',
      options: ['_blank' , '_self' , '_parent' , '_top']
    },
    isCurrent: {
      control: 'boolean'
    },
    hasSeparator: {
      control: 'boolean'
    }
  }
};

const Template = (args) => html`
  <sl-breadcrumbs-item ${spread(args)}>
    <sl-icon-document></sl-icon-document>Page Name
  </sl-breadcrumbs-item>
`;
export const Default = Template.bind({});
Default.args = {};

export const Current = Template.bind({});
Current.args = {
  isCurrent: true
};

export const HasSeparator = Template.bind({});
HasSeparator.args = {
  hasSeparator: true
};

export const WithHref = Template.bind({});
WithHref.args = {
  href: "https://google.com",
  target: '_blank'
};