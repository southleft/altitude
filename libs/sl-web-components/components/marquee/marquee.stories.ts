import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './marquee';

const meta: Meta = {
  title: 'Organisms/Marquee',
  component: 'sl-marquee',
  parameters: { status: { type: 'beta' }, layout: 'fullscreen' },
  tags: ['autodocs'],
  argTypes: { paused: { control: 'boolean' } }
};

export default meta;
type Story = StoryObj;

/**
 * The belt as the site runs it. Items are slotted; the component renders the
 * sequence twice so the loop is seamless. Hover to pause.
 */
export const Default: Story = {
  render: () => html`
    <sl-marquee>
      <span>Design Systems</span>
      <span data-variant="solid">×</span>
      <span>AI</span>
      <span data-variant="mono">— built by the people building the tools —</span>
      <span>Tokens</span>
      <span data-variant="solid">&lt;S&gt;</span>
      <span>Parity</span>
      <span data-variant="mono">// zero rogue divs</span>
    </sl-marquee>
  `
};

/**
 * `paused` is reflected, so a page can stop the belt from outside with
 * `sl-marquee[paused]` — no reaching into the shadow root.
 */
export const Paused: Story = {
  render: () => html`
    <sl-marquee paused>
      <span>Design Systems</span>
      <span data-variant="solid">×</span>
      <span>AI</span>
      <span data-variant="mono">— paused for inspection —</span>
    </sl-marquee>
  `
};

/**
 * Duration and gap are custom properties. A shorter belt wants a faster cycle
 * or the seam becomes obvious.
 */
export const Faster: Story = {
  render: () => html`
    <sl-marquee style="--sl-marquee-duration: 12s; --sl-marquee-gap: 2rem;">
      <span>Ship</span>
      <span data-variant="solid">→</span>
      <span>Measure</span>
      <span data-variant="solid">→</span>
      <span>Repeat</span>
    </sl-marquee>
  `
};
