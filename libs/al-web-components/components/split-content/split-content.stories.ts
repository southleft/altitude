import { html } from 'lit';
import { spread } from '../../directives/spread';
import './split-content';
import '../../.storybook/components/f-po/f-po';
import '../button/button';
import '../heading/heading';
import '../text-passage/text-passage';

export default {
  title: 'Organisms/Split Content',
  component: 'al-split-content',
  tags: ['autodocs'],
  parameters: {
    status: { type: 'beta' },
    layout: 'padded'
  },
  argTypes: {
    mediaPosition: {
      control: 'radio',
      options: ['end', 'start']
    },
    verticalAlignment: {
      control: 'radio',
      options: ['center', 'start', 'end']
    }
  }
};

const Template = (args) => html`
  <al-split-content ${spread(args)}>
    <f-po slot="media" style="min-height: 16rem;">Media</f-po>
    <div slot="content" style="display:flex; flex-direction:column; gap: var(--al-theme-space);">
      <al-heading tagName="h2" variant="lg" ?isBold=${true}>A feature worth explaining</al-heading>
      <al-text-passage>Pair a media column with supporting copy — the same organism works for onboarding steps, feature call-outs, and "why us" sections.</al-text-passage>
      <al-button>Learn more</al-button>
    </div>
  </al-split-content>
`;

export const Default = Template.bind({});
Default.args = {};

export const MediaStart = Template.bind({});
MediaStart.args = { mediaPosition: 'start' };

export const AlignedStart = Template.bind({});
AlignedStart.args = { verticalAlignment: 'start' };

export const Alternating = (args) => html`
  <div style="display:flex; flex-direction:column; gap: var(--al-theme-space-xxl);">
    <al-split-content ${spread(args)}>
      <f-po slot="media" style="min-height: 14rem;">Media A</f-po>
      <div slot="content" style="display:flex; flex-direction:column; gap: var(--al-theme-space);">
        <al-heading tagName="h2" variant="md" ?isBold=${true}>Step one</al-heading>
        <al-text-passage>Media on the right, content on the left.</al-text-passage>
      </div>
    </al-split-content>
    <al-split-content ${spread(args)} mediaPosition="start">
      <f-po slot="media" style="min-height: 14rem;">Media B</f-po>
      <div slot="content" style="display:flex; flex-direction:column; gap: var(--al-theme-space);">
        <al-heading tagName="h2" variant="md" ?isBold=${true}>Step two</al-heading>
        <al-text-passage>Flip mediaPosition to alternate the rhythm down the page.</al-text-passage>
      </div>
    </al-split-content>
  </div>
`;
Alternating.args = {};
