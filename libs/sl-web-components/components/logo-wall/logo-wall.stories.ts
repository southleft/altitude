import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './logo-wall';

const meta: Meta = {
  title: 'Organisms/Logo Wall',
  component: 'al-logo-wall',
  parameters: { status: { type: 'beta' }, layout: 'fullscreen' },
  tags: ['autodocs'],
  argTypes: { vivid: { control: 'boolean' } }
};

export default meta;
type Story = StoryObj;

/**
 * The real client marks, served from the site's own `public/logos`. Every logo
 * is normalised to one optical height and knocked back to a single texture;
 * hover brings one up to full strength.
 */
const LOGOS = [
  ['ibm', 'IBM'],
  ['google', 'Google'],
  ['docusign', 'DocuSign'],
  ['cigna-health', 'Cigna'],
  ['petsmart', 'PetSmart'],
  ['toast', 'Toast'],
  ['ulta-beauty', 'Ulta Beauty'],
  ['state-farm', 'State Farm']
];

export const Default: Story = {
  render: () => html`
    <al-logo-wall>
      ${LOGOS.map(([slug, name]) => html`<img src="/southleft/logos/${slug}.webp" alt=${name} />`)}
    </al-logo-wall>
  `
};

/**
 * `vivid` skips the knock-back for a page where the logos are the subject
 * rather than social proof in passing.
 */
export const Vivid: Story = {
  render: () => html`
    <al-logo-wall vivid>
      ${LOGOS.slice(0, 4).map(([slug, name]) => html`<img src="/southleft/logos/${slug}.webp" alt=${name} />`)}
    </al-logo-wall>
  `
};
