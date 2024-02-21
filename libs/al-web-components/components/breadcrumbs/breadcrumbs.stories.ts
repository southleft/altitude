import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../breadcrumbs-item/breadcrumbs-item';
import '../icon/icons/document';
import './breadcrumbs';

export default {
  title: 'Molecules/Breadcrumbs',
  component: 'al-breadcrumbs',
  subcomponents: { ALBreadcrumbsItem: 'al-breadcrumbs-item' },
  tags: [ 'autodocs' ],
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
  <al-breadcrumbs ${spread(args)}>
    <al-breadcrumbs-item>
      <al-icon-document></al-icon-document>
      Page Name 1
    </al-breadcrumbs-item>
    <al-breadcrumbs-item>
      <al-icon-document></al-icon-document>
      Page Name 2
    </al-breadcrumbs-item>
    <al-breadcrumbs-item>
      <al-icon-document></al-icon-document>
      Page Name 3
    </al-breadcrumbs-item>
  </al-breadcrumbs>
`;

export const Default = Template.bind({});
Default.args = {};

const TemplateTruncated = (args) => html`
  <al-breadcrumbs ${spread(args)}>
    <al-breadcrumbs-item>
      <al-icon-document></al-icon-document>
      Page Name 1
    </al-breadcrumbs-item>
    <al-breadcrumbs-item>
      <al-icon-document></al-icon-document>
      Page Name 2
    </al-breadcrumbs-item>
    <al-breadcrumbs-item>
      <al-icon-document></al-icon-document>
      Page Name 3
    </al-breadcrumbs-item>
    <al-breadcrumbs-item>
      <al-icon-document></al-icon-document>
      Page Name 4
    </al-breadcrumbs-item>
    <al-breadcrumbs-item>
      <al-icon-document></al-icon-document>
      Page Name 5
    </al-breadcrumbs-item>
    <al-breadcrumbs-item>
      <al-icon-document></al-icon-document>
      Page Name 6
    </al-breadcrumbs-item>
    <al-breadcrumbs-item>
      <al-icon-document></al-icon-document>
      Page Name 7
    </al-breadcrumbs-item>
    <al-breadcrumbs-item>
      <al-icon-document></al-icon-document>
      Page Name 8
    </al-breadcrumbs-item>
  </al-breadcrumbs>
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