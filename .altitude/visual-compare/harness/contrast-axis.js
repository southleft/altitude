// Behavioural fixture for scripts/verify-contrast-axis.mjs.
//
// Each column is an `<al-theme>` wrapping a `--al-theme-color-body-background`
// surface div, itself wrapping one disabled `<al-field-note>`
// (field-note.scss's `.al-is-disabled` sets `opacity:
// var(--al-theme-opacity-disabled)` on its own root, with no other rule in
// between — the same single-property probe `check-scoped-theming.mjs` uses
// `al-button`'s transition-duration for, and `verify-motion-axis.mjs` uses
// WAAPI durations for):
//
//   default            — no `contrast` attribute at all (the reference the
//                         reset cases below must match). `:root`'s own
//                         unlayered default is DARK mode (`main.scss` ->
//                         `dist/scss/theme/tokens-dark.scss`), so this is
//                         the dark-mode pairing.
//   more               — `contrast="more"`.
//   normal-explicit    — `contrast="normal"`, written by hand.
//   nest-inner-bare    — `contrast="more"` ancestor, bare (no attribute)
//                         child — the literal nesting bug reproduction.
//   nest-inner-normal  — `contrast="more"` ancestor, `contrast="normal"`
//                         child.
//   light-default / light-more — `mode="light"` explicitly: the TIGHTER of
//                         the two worst-case pairings cited in theme.scss's
//                         contrast-axis comment (content-default-weak text
//                         over background-default-weak).
//
// `bundle.js` pulls in `<al-theme>` and `<al-field-note>` together, same
// reasoning as `scoped.js`'s header comment.

import '../../../libs/al-web-components/dist/components/bundle/bundle.js';

const root = document.getElementById('probes');

/**
 * One `<al-theme contrast>` column, wrapping a disabled field note.
 *
 * `nested` — omitted for a single-host column. Otherwise `{ contrast }`
 * describes the INNER `<al-theme>`; `contrast: undefined` there means a
 * genuinely bare inner host (no attribute at all) — the literal nesting-bug
 * reproduction — as opposed to omitting `nested` entirely, which means there
 * is no inner host in the first place.
 */
function column({ title, id, contrast, mode, nested }) {
  const col = document.createElement('div');
  col.className = 'col';
  const h2 = document.createElement('h2');
  h2.textContent = title;
  col.appendChild(h2);

  const outer = document.createElement('al-theme');
  if (contrast !== undefined) outer.setAttribute('contrast', contrast);
  if (mode !== undefined) outer.setAttribute('mode', mode);
  outer.setAttribute('data-probe', id);

  // A real, theme-scoped surface, painted `background-default-weak` — the
  // token `--al-theme-color-body-background` resolves to (`body`'s own
  // background, base.scss:27) — scoped to whichever `<al-theme>` host it
  // lands in. `<al-theme>` itself is `display: contents` (no box of its
  // own), so without this every column would visually sit on the page's
  // actual (unthemed, dark) `<body>` regardless of what THAT column's `mode`
  // says. `background-default-weak` directly, NOT the `body-background`
  // alias: the alias is only restated on the BRAND+mode host partials
  // (`:host([brand='altitude'][mode='light'])`, `tokens-config.v5.mjs`), so
  // a bare `mode="light"`-only host (no `brand` attribute — this harness
  // never sets one) falls through to `:root`'s own dark default for the
  // alias specifically, even though `background-default-weak` itself
  // updates correctly from the mode-only partial. Measured, not assumed:
  // the `light-*` columns' surface painted dark until this was changed from
  // the alias to the direct token.
  const mount = (parent) => {
    const surface = document.createElement('div');
    surface.setAttribute('data-surface', id);
    surface.style.background = 'var(--al-theme-color-background-neutral-weak)';
    surface.style.padding = '0.75rem';
    const note = document.createElement('al-field-note');
    note.isDisabled = true;
    note.textContent = 'Disabled helper text';
    note.setAttribute('data-probe-note', id);
    surface.appendChild(note);
    parent.appendChild(surface);
    return note;
  };

  if (nested) {
    const inner = document.createElement('al-theme');
    if (nested.contrast !== undefined) inner.setAttribute('contrast', nested.contrast);
    inner.setAttribute('data-probe', `${id}-inner`);
    outer.appendChild(inner);
    mount(inner);
  } else {
    mount(outer);
  }

  col.appendChild(outer);
  root.appendChild(col);
}

column({ title: 'default (no contrast attribute)', id: 'default' });
column({ title: "contrast='more'", id: 'more', contrast: 'more' });
column({ title: "contrast='normal' (explicit)", id: 'normal-explicit', contrast: 'normal' });
column({ title: 'more > bare (nesting bug repro)', id: 'nest-more', contrast: 'more', nested: {} });
column({ title: "more > normal (explicit reset)", id: 'nest-more-normal', contrast: 'more', nested: { contrast: 'normal' } });
// `mode="light"` explicitly: the tighter of the two worst-case pairings cited
// in theme.scss's contrast-axis comment (content-default-weak text over
// background-default-weak) — `:root`'s own unlayered default is DARK
// (`main.scss` -> `dist/scss/theme/tokens-dark.scss`), so the plain `default`
// / `more` columns above measure the (looser) dark-mode pairing instead.
column({ title: 'light mode, default', id: 'light-default', mode: 'light' });
column({ title: 'light mode, more', id: 'light-more', mode: 'light', contrast: 'more' });

await Promise.all(['al-theme', 'al-field-note'].map((t) => customElements.whenDefined(t)));
// Two microtask/rAF hops: `al-theme`'s own `updateComplete` plus the nested
// `<al-field-note>`'s first render, which only starts once ITS `al-theme`
// ancestor's shadow root (and therefore its adopted stylesheet) exists.
await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
document.documentElement.dataset.ready = 'true';
