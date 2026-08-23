import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './section-header';
import '../../../al-web-components/components/button/button';
import '../../../al-web-components/components/layout/layout';

const meta: Meta = {
  title: 'Molecules/Section Header',
  component: 'sl-section-header',
  parameters: { status: { type: 'beta' } },
  tags: ['autodocs'],
  argTypes: {
    index: { control: 'text' },
    label: { control: 'text' },
    heading: { control: 'text' },
    dek: { control: 'text' },
    linkHref: { control: 'text' },
    linkLabel: { control: 'text' }
  }
};

export default meta;
type Story = StoryObj;

/**
 * The full block: mono rule, accent kicker, heading, lead, trailing link. The
 * kicker's `<slug>` form is derived from `label`, so the two cannot drift.
 */
export const Default: Story = {
  args: {
    index: '02',
    label: 'Insights',
    heading: 'We publish our homework',
    dek: 'Notes from inside real design-system work — what held, what did not, and why.',
    linkHref: '#',
    linkLabel: 'all insights →'
  },
  render: (args) => html`
    <sl-section-header
      index=${args.index}
      label=${args.label}
      heading=${args.heading}
      dek=${args.dek}
      link-href=${args.linkHref}
      link-label=${args.linkLabel}
    ></sl-section-header>
  `
};

/**
 * Without a link the heading stack takes the full width. This is the shape five
 * pages had hand-re-inlined before the component existed.
 */
export const NoLink: Story = {
  args: {
    index: '03',
    label: 'Services',
    heading: 'How we work',
    dek: 'Four practices that compound.'
  },
  render: (args) => html`
    <sl-section-header index=${args.index} label=${args.label} heading=${args.heading} dek=${args.dek}></sl-section-header>
  `
};

/**
 * The rule carries a label with no ordinal when a section is not part of a
 * numbered sequence.
 */
export const NoIndex: Story = {
  args: { label: 'Elsewhere', heading: 'Find us around the web' },
  render: (args) => html`<sl-section-header label=${args.label} heading=${args.heading}></sl-section-header>`
};

/**
 * The default slot occupies the trailing position for a control the link cannot
 * express. Use it INSTEAD of `link-href` — set both and both render.
 */
export const WithSlottedControl: Story = {
  args: { index: '01', label: 'Work', heading: 'Selected case studies' },
  render: (args) => html`
    <sl-section-header index=${args.index} label=${args.label} heading=${args.heading}>
      <al-layout direction="row" gap="sm">
        <al-button variant="tertiary">All</al-button>
        <al-button variant="tertiary">Design systems</al-button>
        <al-button variant="tertiary">AI</al-button>
      </al-layout>
    </sl-section-header>
  `
};
