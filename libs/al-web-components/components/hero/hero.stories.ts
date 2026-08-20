import { html } from 'lit';
import { spread } from '../../directives/spread';
import './hero';
import '../../.storybook/components/f-po/f-po';
import '../button/button';
import '../chip/chip';
import '../heading/heading';
import '../text-passage/text-passage';

export default {
  title: 'Organisms/Hero',
  component: 'al-hero',
  tags: ['autodocs'],
  parameters: {
    status: { type: 'beta' },
    layout: 'padded'
  },
  argTypes: {
    layout: {
      control: 'radio',
      options: ['default', 'centered', 'stacked', 'poster']
    },
    mediaPosition: {
      control: 'radio',
      options: ['default', 'start']
    },
    contained: {
      control: 'boolean'
    },
    contentAlignment: {
      control: 'radio',
      options: ['default', 'start', 'end']
    },
    overlay: {
      control: 'boolean'
    }
  }
};

const Template = (args) => html`
  <al-hero ${spread(args)}>
    <al-chip slot="eyebrow" variant="secondary">New release</al-chip>
    <al-heading slot="heading" tagName="h1" variant="display-md" ?isBold=${true}>Build once, brand everywhere</al-heading>
    <al-text-passage>The same components, the same page, a completely different site — driven entirely by design tokens.</al-text-passage>
    <al-button slot="actions">Get started</al-button>
    <al-button slot="actions" variant="secondary">See it live</al-button>
    <f-po slot="media" style="min-height: 16rem;">Hero Media</f-po>
  </al-hero>
`;

export const Default = Template.bind({});
Default.args = {};

export const Centered = Template.bind({});
Centered.args = { layout: 'centered' };

export const Stacked = Template.bind({});
Stacked.args = { layout: 'stacked' };

export const Poster = Template.bind({});
Poster.args = { layout: 'poster' };

export const MediaStart = Template.bind({});
MediaStart.args = { mediaPosition: 'start' };

export const ContentAlignedStart = Template.bind({});
ContentAlignedStart.args = { contentAlignment: 'start' };

export const PosterWithOverlay = (args) => html`
  <al-hero ${spread(args)}>
    <al-chip slot="eyebrow" variant="secondary">New release</al-chip>
    <al-heading slot="heading" tagName="h1" variant="display-md" ?isBold=${true}>Legible over any backdrop</al-heading>
    <al-text-passage>The optional overlay adds a gradient scrim behind poster media so this copy stays readable.</al-text-passage>
    <al-button slot="actions">Get started</al-button>
    <f-po slot="media" style="min-height: 24rem;">Hero Media</f-po>
  </al-hero>
`;
PosterWithOverlay.args = { layout: 'poster', overlay: true };

export const WithMeta = (args) => html`
  <al-hero ${spread(args)}>
    <al-chip slot="eyebrow" variant="secondary">Platform</al-chip>
    <al-heading slot="heading" tagName="h1" variant="display-md" ?isBold=${true}>Numbers that hold up</al-heading>
    <al-text-passage>A meta strip renders full-width under the main area — stats, logos, or a scroll hint.</al-text-passage>
    <al-button slot="actions">Start free</al-button>
    <f-po slot="media" style="min-height: 12rem;">Hero Media</f-po>
    <div slot="meta" style="display: flex; gap: var(--al-theme-space-lg); align-items: baseline;">
      <al-heading tagName="h3" variant="lg" ?isBold=${true}>95K+</al-heading>
      <al-heading tagName="h3" variant="lg" ?isBold=${true}>99.9%</al-heading>
      <al-heading tagName="h3" variant="lg" ?isBold=${true}>4.9/5</al-heading>
    </div>
  </al-hero>
`;
WithMeta.args = {};
