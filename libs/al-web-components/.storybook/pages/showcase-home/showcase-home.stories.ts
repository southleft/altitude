import { html } from 'lit';
import './showcase-home';
import '../../../components/theme/theme';

/**
 * Pages/Showcase Home — one page, eight sites.
 *
 * The Default story follows the toolbar Preset (and the in-page
 * theme-switcher). The named stories pin a brand so each "site" is
 * directly linkable; they opt out of the preset decorator and mount
 * their own `<al-theme>`, which the in-page switcher then drives.
 */
export default {
  title: 'Pages/Showcase Home',
  component: 'al-showcase-home',
  parameters: {
    status: { type: 'beta' },
    layout: 'fullscreen'
  },
  tags: ['autodocs']
};

export const Default = () => html`<al-showcase-home></al-showcase-home>`;

const pinned = (brand: string, mode: 'light' | 'dark') => {
  const story = () => html`
    <al-theme brand=${brand} mode=${mode}>
      <al-showcase-home></al-showcase-home>
    </al-theme>
  `;
  (story as any).parameters = { alPreset: { disable: true } };
  return story;
};

export const Meridian = pinned('meridian', 'light');
export const Voltage = pinned('voltage', 'dark');
export const Solstice = pinned('solstice', 'light');
export const Nocturne = pinned('nocturne', 'dark');
export const Northright = pinned('northright', 'dark');
export const Odyssey = pinned('odyssey', 'dark');
export const Southleft = pinned('southleft', 'dark');
