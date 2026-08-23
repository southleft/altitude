import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './header';
import '../../../al-web-components/components/logo/logo';
import '../../../al-web-components/components/button/button';

const meta: Meta = {
  title: 'Organisms/Header',
  component: 'sl-header',
  parameters: { status: { type: 'beta' }, layout: 'fullscreen' },
  tags: ['autodocs'],
  argTypes: {
    sticky: { control: 'boolean' },
    menuOpen: { control: 'boolean' }
  }
};

export default meta;
type Story = StoryObj;

const NAV = [
  ['/ai-design-systems', 'AI + Design Systems'],
  ['/services', 'Services'],
  ['/work', 'Work'],
  ['/insights', 'Insights'],
  ['/about', 'About'],
  ['/speaking', 'Speaking']
];

const paletteIcon = html`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
  <path d="M12 21a9 9 0 1 1 9-9c0 2.5-2 3-3.5 3H15a2 2 0 0 0-1.5 3.3c.6.7.2 1.7-.7 1.7Z"></path>
  <circle cx="8" cy="10.5" r="0.6" fill="currentColor"></circle>
  <circle cx="12" cy="7.5" r="0.6" fill="currentColor"></circle>
  <circle cx="16" cy="10.5" r="0.6" fill="currentColor"></circle>
</svg>`;

const sunIcon = html`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
  <circle cx="12" cy="12" r="4"></circle>
  <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"></path>
</svg>`;

/**
 * The bar as southleft.com ships it. `aria-current="page"` IS the active pill —
 * the component styles the ARIA attribute rather than a parallel class, so the
 * visual state cannot drift from the announced one.
 */
export const Default: Story = {
  render: () => html`
    <sl-header>
      <al-logo slot="brand" variant="southleft" href="#" aria-label="Southleft home"></al-logo>
      ${NAV.map(
        ([href, label], i) =>
          html`<a slot="nav" href=${href} aria-current=${i === 2 ? 'page' : undefined}>${label}</a>`
      )}
      <button slot="actions" aria-label="Derive your own theme" title="Derive your own theme">${paletteIcon}</button>
      <button slot="actions" aria-label="Switch to paper (light) mode" title="Ink / paper">${sunIcon}</button>
      <al-button slot="actions" href="#">Book a call</al-button>
      ${NAV.map(([href, label], i) => html`<a slot="mobile" href=${href}>${label}<span>0${i + 1}</span></a>`)}
    </sl-header>
    <div style="block-size: 60vh;"></div>
  `
};

/**
 * The mobile panel open. `menu-open` is reflected, so this state is reachable
 * from the page and inspectable in devtools rather than trapped in the shadow
 * root — and the component owns the `aria-expanded` / `aria-controls` pair that
 * makes it announce correctly.
 */
export const MenuOpen: Story = {
  render: () => html`
    <sl-header menu-open>
      <al-logo slot="brand" variant="southleft" href="#" aria-label="Southleft home"></al-logo>
      ${NAV.map(([href, label]) => html`<a slot="nav" href=${href}>${label}</a>`)}
      <al-button slot="actions" href="#">Book a call</al-button>
      ${NAV.map(([href, label], i) => html`<a slot="mobile" href=${href}>${label}<span>0${i + 1}</span></a>`)}
    </sl-header>
    <div style="block-size: 40vh;"></div>
  `
};

/**
 * Nothing requires the full nav. A minimal bar is the same component with fewer
 * slotted children.
 */
export const Minimal: Story = {
  render: () => html`
    <sl-header>
      <al-logo slot="brand" variant="southleft" href="#" aria-label="Southleft home"></al-logo>
      <al-button slot="actions" href="#">Book a call</al-button>
    </sl-header>
    <div style="block-size: 40vh;"></div>
  `
};
