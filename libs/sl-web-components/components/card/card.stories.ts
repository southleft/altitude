import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './card';

const meta: Meta = {
  title: 'Molecules/Card',
  component: 'al-card',
  parameters: { status: { type: 'beta' } },
  tags: ['autodocs'],
  argTypes: {
    layout: { control: 'select', options: ['default', 'inline'] },
    variant: { control: 'select', options: ['default', 'bare', 'service', 'tool', 'article', 'work'] },
    featured: { control: 'boolean' },
    image: { control: 'text' },
    heading: { control: 'text' },
    excerpt: { control: 'text' },
    'footer-label': { control: 'text' },
    fill: { control: 'boolean' },
    dashed: { control: 'boolean' },
    href: { control: 'text' },
    command: { control: 'text' },
    'command-prefix': { control: 'text' }
  }
};

export default meta;
type Story = StoryObj;

/**
 * The accent `›` bullet on a service card's list.
 *
 * It lives here, and in the consuming page's stylesheet, rather than in
 * `card.scss` — a `::before` on a light-DOM `<li>` is not addressable from a
 * shadow root, so the list items the consumer slots have to carry it
 * themselves. `card.scss` owns everything about the list that IS reachable
 * (the mono face, the size, the colour, the spacing); this is the remainder.
 */
const listBullet = html`
  <style>
    ul[slot='list'] li {
      display: flex;
      align-items: baseline;
      gap: var(--al-theme-space-xs);
    }
    ul[slot='list'] li::before {
      content: '\\203A';
      color: var(--al-theme-color-content-primary-default);
    }
  </style>
`;

/**
 * The brand's primary card — the one southleft.com's "What we do" grid is
 * built from. Flip `variant` above to see the other three treatments on the
 * same anatomy.
 */
export const Default: Story = {
  render: () => html`
    ${listBullet}
    <al-card variant="service" fill href="/services/design-system-audits">
      <h3 slot="header">Design system audits</h3>
      <span slot="cue" aria-hidden="true">↗</span>
      <p>
        Where your system is costing the team velocity, what it is costing, and which three
        things to fix first.
      </p>
      <ul slot="list">
        <li>Token and theming audit</li>
        <li>Component inventory and drift report</li>
        <li>Accessibility baseline</li>
        <li>A sequenced remediation plan</li>
      </ul>
    </al-card>
  `
};

/** The same card as `Default`, named for the variant it demonstrates. */
export const Service: Story = Default;

/**
 * The "We publish our homework" card: a mono command line for a title and a
 * footer cue pinned to the bottom, so a row of them lines its cues up however
 * long each description runs.
 */
export const Tool: Story = {
  render: () => html`
    <al-card
      variant="tool"
      fill
      href="https://github.com/southleft/altitude"
      target="_blank"
      command="npx altitude init"
    >
      <p>The design system this site is built from — tokens, web components, and the docs you are reading.</p>
      <span slot="footer">github →</span>
    </al-card>
  `
};

/**
 * The tool card's "coming soon" form: dashed rather than solid, no `href`, and
 * a `//` prefix instead of a shell `$` because there is nothing to run yet.
 */
export const ToolDashed: Story = {
  render: () => html`
    <al-card variant="tool" dashed fill command="and the course" command-prefix="//">
      <p><strong>AI &amp; Design Systems</strong> — a new online course. Grounded, practical, shaped by real work with large-scale teams.</p>
      <a slot="footer" href="/services/workshops-training">get early access →</a>
    </al-card>
  `
};

/**
 * The base treatment, unchanged from Altitude's `al-card`: a background, a
 * shadow and a radius, with the same named regions.
 */
export const Base: Story = {
  render: () => html`
    <al-card>
      <h3 slot="header">Quarterly review</h3>
      <p>Every region the base card ships is still here — this component is a superset of it.</p>
    </al-card>
  `
};

/** No background, shadow or radius — the regions without the surface. */
export const Bare: Story = {
  render: () => html`
    <al-card variant="bare">
      <h3 slot="header">Quarterly review</h3>
      <p>The same regions, with the surface removed.</p>
    </al-card>
  `
};

/** A neutral 16:9 stand-in, inline so these stories need no static asset. */
const placeholder =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#2a2a2a"/><text x="50%" y="50%" fill="#666" font-family="monospace" font-size="20" text-anchor="middle" dominant-baseline="middle">640 &#215; 360</text></svg>`
  );

/**
 * The linked media card: media flush to the card's edge, a mono meta row, a
 * heading, a clamped excerpt and a footer cue. This was a separate
 * `al-media-card` until it became what it always was — a card with its padding
 * moved off the surface and onto the content column.
 */
export const Article: Story = {
  render: () => html`
    <al-card
      variant="article"
      fill
      href="/insights/design-systems/context-based-design-systems"
      image="${placeholder}"
      heading="Context-based design systems"
      excerpt="A new model for the AI-driven product lifecycle: what changes when the system itself becomes the interface your agents read."
      footer-label="read →"
    >
      <span slot="meta">Design systems</span>
      <span slot="meta" aria-hidden="true">·</span>
      <time slot="meta" datetime="2026-05-14">May 14, 2026</time>
    </al-card>
  `
};

/**
 * The case-study cut of the same anatomy: a wider media ratio, a two-line
 * clamp, a tighter rhythm, and tag chips under the excerpt.
 */
export const Work: Story = {
  render: () => html`
    <al-card
      variant="work"
      fill
      href="/projects/petsmart"
      fallback="<P>"
      heading="PetSmart"
      excerpt="A design system for 1,600 stores."
      footer-label="case study →"
    >
      <span slot="tags">Design systems</span>
      <span slot="tags">Accessibility</span>
      <span slot="tags">Front end</span>
    </al-card>
  `
};
