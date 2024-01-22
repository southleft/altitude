import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../breadcrumbs-item/breadcrumbs-item';
import '../icon/icons/document';
import './breadcrumbs';

export default {
  title: 'Components/Breadcrumbs',
  component: 'sl-breadcrumbs',
  subcomponents: { SLBreadcrumbsItem: 'sl-breadcrumbs-item' },
  parameters: {
    status: { type: 'beta' },
  },
  argTypes: {
    label: {
      control: 'text'
    },
    isTruncated: {
      control: 'boolean'
    },
    itemsBeforeCollapse: {
      control: 'number'
    },
    itemsAfterCollapse: {
      control: 'number'
    },
  }
};

const Template = (args) => html`
  <sl-breadcrumbs ${spread(args)}>
    <sl-breadcrumbs-item>
      <sl-icon-document></sl-icon-document>
      Page Name 1
    </sl-breadcrumbs-item>
    <sl-breadcrumbs-item>
      <sl-icon-document></sl-icon-document>
      Page Name 2
    </sl-breadcrumbs-item>
    <sl-breadcrumbs-item>
      <sl-icon-document></sl-icon-document>
      Page Name 3
    </sl-breadcrumbs-item>
  </sl-breadcrumbs>
`;

export const Default = Template.bind({});
Default.args = {};

const TemplateTruncated = (args) => html`
  <sl-breadcrumbs ${spread(args)}>
    <sl-breadcrumbs-item>
      <sl-icon-document></sl-icon-document>
      Page Name 1
    </sl-breadcrumbs-item>
    <sl-breadcrumbs-item>
      <sl-icon-document></sl-icon-document>
      Page Name 2
    </sl-breadcrumbs-item>
    <sl-breadcrumbs-item>
      <sl-icon-document></sl-icon-document>
      Page Name 3
    </sl-breadcrumbs-item>
    <sl-breadcrumbs-item>
      <sl-icon-document></sl-icon-document>
      Page Name 4
    </sl-breadcrumbs-item>
    <sl-breadcrumbs-item>
      <sl-icon-document></sl-icon-document>
      Page Name 5
    </sl-breadcrumbs-item>
    <sl-breadcrumbs-item>
      <sl-icon-document></sl-icon-document>
      Page Name 6
    </sl-breadcrumbs-item>
    <sl-breadcrumbs-item>
      <sl-icon-document></sl-icon-document>
      Page Name 7
    </sl-breadcrumbs-item>
    <sl-breadcrumbs-item>
      <sl-icon-document></sl-icon-document>
      Page Name 8
    </sl-breadcrumbs-item>
  </sl-breadcrumbs>
`;

export const Truncated = TemplateTruncated.bind({});
Truncated.args = {
  isTruncated: true
};

export const TruncatedWithBeforeCollapse = TemplateTruncated.bind({});
TruncatedWithBeforeCollapse.args = {
  isTruncated: true,
  itemsBeforeCollapse: '2',
};

export const TruncatedWithAfterCollapse = TemplateTruncated.bind({});
TruncatedWithAfterCollapse.args = {
  isTruncated: true,
  itemsAfterCollapse: '2'
};