// The side-by-side multi-brand proof (R9).
//
// `brands.dark.png`'s harness gives each brand its own iframe so each can link
// exactly one `:root` bundle — the only thing whole-stylesheet swapping can do.
// This page renders the same component set FOUR TIMES IN ONE DOCUMENT with one
// shared `:root`, distinguished only by `<al-theme brand>`. If the scoped
// `:host([brand])` blocks regress, every column collapses to the base theme and
// `scripts/check-scoped-theming.mjs` fails.
//
// `bundle.js` is imported rather than per-component modules because it is the
// one entry that pulls in `<al-theme>` alongside everything the columns render.

import '../../../libs/al-web-components/dist/components/bundle/bundle.js';

const BRANDS = [
  ['altitude', 'neutral reference'],
  ['northright', 'dense operational'],
  ['odyssey', 'airy editorial'],
  ['southleft', 'high-contrast utilitarian'],
];

const CONTENT = `
  <al-heading variant="md" tagName="h2" isBold>Heading medium</al-heading>
  <al-heading variant="sm" tagName="h3">Heading small — the quick brown fox</al-heading>

  <div class="row">
    <al-button>Primary</al-button>
    <al-button variant="secondary">Secondary</al-button>
  </div>

  <al-input label="Email address" placeholder="you@example.com"></al-input>

  <div class="row">
    <al-badge>3</al-badge>
    <al-badge variant="success">New</al-badge>
    <al-avatar hasBadge badgeVariant="success">AE</al-avatar>
  </div>

  <al-alert variant="success" isActive title="Saved">
    Your changes were written to disk.
  </al-alert>

  <al-card>
    <span slot="header">Card header</span>
    <p>Body copy at the brand's body-md preset. Padding, corner radius and
    elevation are all brand-owned.</p>
  </al-card>
`;

/** `<al-theme>` is display:contents, so `.surface` is the painted box. */
function column({ title, subtitle, attrs, id, content = CONTENT }) {
  const attrText = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  return `
    <div class="col">
      <h2>${title}<small>${subtitle}</small></h2>
      <al-theme ${attrText} data-probe="${id}">
        <div class="surface">${content}</div>
      </al-theme>
    </div>`;
}

document.getElementById('brands').innerHTML = BRANDS.map(([brand, archetype]) =>
  column({
    title: brand,
    subtitle: archetype,
    attrs: { brand, mode: 'dark' },
    id: brand,
  })
).join('');

document.getElementById('axes').innerHTML = [
  // The mode axis, on a page whose `:root` is dark. Before this spec the light
  // host carried two hardcoded hexes and everything else stayed dark.
  column({
    title: 'northright · light',
    subtitle: 'mode axis over a dark :root',
    attrs: { brand: 'northright', mode: 'light' },
    id: 'northright-light',
  }),
  // Nesting: the inner host must win (R3).
  {
    toString: () => `
    <div class="col">
      <h2>nested<small>odyssey inside southleft</small></h2>
      <al-theme brand="southleft" mode="dark" data-probe="outer">
        <div class="surface">
          <al-heading variant="sm" tagName="h3">Outer — southleft</al-heading>
          <al-button>Outer button</al-button>
          <al-theme brand="odyssey" mode="dark" data-probe="inner">
            <div class="surface">
              <al-heading variant="sm" tagName="h3">Inner — odyssey</al-heading>
              <al-button>Inner button</al-button>
            </div>
          </al-theme>
        </div>
      </al-theme>
    </div>`,
  },
  // The motion axis (R5). `al-heading` transitions on
  // `--al-theme-animation-duration`.
  column({
    title: 'motion · reduced',
    subtitle: 'zeroes the animation duration',
    attrs: { brand: 'altitude', mode: 'dark', motion: 'reduced' },
    id: 'motion-reduced',
    content: `
      <al-heading variant="sm" tagName="h3">Reduced motion</al-heading>
      <al-button>No transition</al-button>
      <p>Compare with the altitude column above, which has no motion attribute.</p>`,
  }),
].join('');

// Signal readiness to the screenshot driver.
const els = [...document.querySelectorAll('al-theme, .surface *')];
await Promise.all(
  [...new Set(els.map((el) => el.tagName.toLowerCase()))]
    .filter((t) => t.startsWith('al-'))
    .map((t) => customElements.whenDefined(t))
);
await Promise.all(els.map((el) => el.updateComplete ?? null));
await document.fonts.ready;
document.documentElement.dataset.ready = 'true';
