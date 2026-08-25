import { html } from 'lit';
import './footer';
import '../heading/heading';
import '../link/link';
import '../list/list';
import '../list-item/list-item';
import '../logo/logo';
import '../layout/layout';
import '../divider/divider';
import { placeholderImages } from '../../fixtures';

export default {
  title: 'Organisms/Footer',
  component: 'al-footer',
  tags: ['autodocs'],
  parameters: {
    status: { type: 'beta' },
    // `padded`, not `fullscreen`. The footer deliberately carries no inline
    // padding — the page measure is the page's decision — so a fullscreen story
    // renders it edge-to-edge and reads as broken.
    layout: 'padded'
  }
};

/** One link column. Reused across the stories so they stay about the FOOTER. */
const column = (heading: string, links: string[]) => html`
  <al-layout direction="column" gap="sm">
    <al-heading tagName="h3" variant="sm" ?isBold=${true}>${heading}</al-heading>
    <al-list>
      ${links.map((l) => html`<al-list-item><al-link href="#">${l}</al-link></al-list-item>`)}
    </al-list>
  </al-layout>
`;

/**
 * The footer owns the `<footer>` landmark, its block padding and the gap between
 * stacked rows. Everything else is composition.
 *
 * The rule between the rows is an `<al-divider>` the page places, so it can be
 * moved, restyled or left out.
 */
export const Default = () => html`
  <al-footer>
    <al-layout direction="row" justify="between" wrap gap="xl">
      <al-logo variant="southleft"></al-logo>
      <al-layout direction="row" align="start" wrap gap="xl">
        ${column('Product', ['Features', 'Pricing', 'Changelog'])}
        ${column('Company', ['About', 'Careers', 'Contact'])}
        ${column('Resources', ['Docs', 'Support'])}
      </al-layout>
    </al-layout>

    <al-divider></al-divider>

    <al-layout direction="row" justify="between" align="center" wrap gap="sm">
      <al-layout direction="row" align="center" wrap gap="sm">
        <span>&copy; 2026 Altitude. All rights reserved.</span>
        <al-link href="#">Privacy</al-link>
        <al-link href="#">Terms</al-link>
      </al-layout>
      <al-layout direction="row" align="center" gap="sm">
        <al-link href="#" label="X (Twitter)">X</al-link>
        <al-link href="#" label="LinkedIn">LinkedIn</al-link>
      </al-layout>
    </al-layout>
  </al-footer>
`;

/**
 * Legal copy above the links, centred, with no divider.
 */
export const CentredStack = () => html`
  <al-footer>
    <al-layout direction="column" align="center" gap="md">
      <al-logo variant="southleft"></al-logo>
      <al-layout direction="row" justify="center" wrap gap="md">
        <al-link href="#">Features</al-link>
        <al-link href="#">Pricing</al-link>
        <al-link href="#">Docs</al-link>
        <al-link href="#">Support</al-link>
      </al-layout>
      <span>&copy; 2026 Altitude. All rights reserved.</span>
    </al-layout>
  </al-footer>
`;

/** Link columns and nothing else. */
export const LinksOnly = () => html`
  <al-footer>
    <al-layout direction="row" align="start" wrap gap="xl">
      ${column('Product', ['Features', 'Pricing'])}
      ${column('Company', ['About', 'Careers'])}
    </al-layout>
  </al-footer>
`;

/** A brand mark is sized by the page — the footer imposes no cap. */
export const WithImageLogo = () => html`
  <al-footer>
    <al-layout direction="row" justify="between" wrap gap="xl">
      <img src=${placeholderImages.logo} alt="Acme" width="160" height="40" />
      <al-layout direction="row" align="start" wrap gap="xl">
        ${column('Product', ['Features', 'Pricing'])}
      </al-layout>
    </al-layout>

    <al-divider></al-divider>

    <span>&copy; 2026 Altitude. All rights reserved.</span>
  </al-footer>
`;
