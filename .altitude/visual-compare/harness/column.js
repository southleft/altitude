// The fixed component set every brand column renders (R10).
//
// Identical markup in all four columns; only the linked brand token bundle
// differs. Held at the same mode (dark), density (comfortable) and contrast
// (default) so any visible difference is attributable to `brand` alone.

import '../../../libs/al-web-components/dist/components/button/button.js';
import '../../../libs/al-web-components/dist/components/card/card.js';
import '../../../libs/al-web-components/dist/components/input/input.js';
import '../../../libs/al-web-components/dist/components/badge/badge.js';
import '../../../libs/al-web-components/dist/components/alert/alert.js';
import '../../../libs/al-web-components/dist/components/heading/heading.js';
import '../../../libs/al-web-components/dist/components/avatar/avatar.js';
import '../../../libs/al-web-components/dist/components/icon/icons/dots-vertical.js';
import '../../../libs/al-web-components/dist/components/icon/icons/success.js';

document.getElementById('root').innerHTML = `
  <al-heading variant="md" tagName="h2" isBold>Heading medium</al-heading>
  <al-heading variant="sm" tagName="h3">Heading small — the quick brown fox</al-heading>

  <div class="row">
    <al-button>Primary</al-button>
    <al-button variant="secondary">Secondary</al-button>
    <al-button hideText label="More actions">
      <al-icon-dots-vertical slot="before"></al-icon-dots-vertical>
    </al-button>
  </div>

  <al-input label="Email address" placeholder="you@example.com"></al-input>

  <div class="row">
    <al-badge>3</al-badge>
    <al-badge variant="success">New</al-badge>
    <al-badge variant="danger">9+</al-badge>
    <al-avatar hasBadge badgeVariant="success">AE</al-avatar>
  </div>

  <al-alert variant="success" isActive title="Saved">
    <al-icon-success slot="before"></al-icon-success>
    Your changes were written to disk.
  </al-alert>

  <al-card>
    <span slot="header">Card header</span>
    <p>Body copy at the brand's body-md preset. Padding, corner radius and
    elevation are all brand-owned.</p>
    <al-button slot="actions-end" variant="secondary">Action</al-button>
  </al-card>
`;

// Signal to the screenshot driver that every custom element has upgraded.
const els = [...document.querySelectorAll('#root *')];
await Promise.all([...new Set(els.map((el) => el.tagName.toLowerCase()))]
  .filter((t) => t.startsWith('al-'))
  .map((t) => customElements.whenDefined(t)));
await Promise.all(els.map((el) => el.updateComplete ?? null));
await document.fonts.ready;
document.documentElement.dataset.ready = 'true';
