import { html } from 'lit';
import './footer';
import '../heading/heading';
import '../link/link';
import '../list/list';
import '../list-item/list-item';
import '../logo/logo';

export default {
  title: 'Organisms/Footer',
  component: 'al-footer',
  tags: ['autodocs'],
  parameters: {
    status: { type: 'beta' },
    layout: 'fullscreen'
  }
};

export const Default = () => html`
  <al-footer>
    <al-logo slot="logo" variant="southleft"></al-logo>
    <div style="display:flex; flex-direction:column; gap: var(--al-theme-space-sm);">
      <al-heading tagName="h3" variant="sm" ?isBold=${true}>Product</al-heading>
      <al-list>
        <al-list-item><al-link href="#">Features</al-link></al-list-item>
        <al-list-item><al-link href="#">Pricing</al-link></al-list-item>
        <al-list-item><al-link href="#">Changelog</al-link></al-list-item>
      </al-list>
    </div>
    <div style="display:flex; flex-direction:column; gap: var(--al-theme-space-sm);">
      <al-heading tagName="h3" variant="sm" ?isBold=${true}>Company</al-heading>
      <al-list>
        <al-list-item><al-link href="#">About</al-link></al-list-item>
        <al-list-item><al-link href="#">Careers</al-link></al-list-item>
        <al-list-item><al-link href="#">Contact</al-link></al-list-item>
      </al-list>
    </div>
    <div style="display:flex; flex-direction:column; gap: var(--al-theme-space-sm);">
      <al-heading tagName="h3" variant="sm" ?isBold=${true}>Resources</al-heading>
      <al-list>
        <al-list-item><al-link href="#">Docs</al-link></al-list-item>
        <al-list-item><al-link href="#">Support</al-link></al-list-item>
      </al-list>
    </div>
    <div slot="legal">
      <span>&copy; 2026 Altitude. All rights reserved.</span>
      <al-link href="#" variant="sm">Privacy</al-link>
      <al-link href="#" variant="sm">Terms</al-link>
    </div>
    <div slot="social">
      <al-link href="#" label="X (Twitter)">X</al-link>
      <al-link href="#" label="LinkedIn">LinkedIn</al-link>
    </div>
  </al-footer>
`;

export const LinksOnly = () => html`
  <al-footer>
    <div style="display:flex; flex-direction:column; gap: var(--al-theme-space-sm);">
      <al-heading tagName="h3" variant="sm" ?isBold=${true}>Product</al-heading>
      <al-list>
        <al-list-item><al-link href="#">Features</al-link></al-list-item>
        <al-list-item><al-link href="#">Pricing</al-link></al-list-item>
      </al-list>
    </div>
  </al-footer>
`;
