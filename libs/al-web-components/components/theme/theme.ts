// T4.2 — Scoped `<al-theme>` host component.
//
// Sets brand/mode/density/contrast tokens on `:host` (NOT on `:root`) so two
// `<al-theme>` subtrees with different brands compute distinct `--al-*`
// values on the same page. T4.3 removes the legacy `ALElement.getGlobalStyles`
// regex strip; T4.5 rewrites the theme-switcher to write into this element
// rather than mutate the global `<style>` element.
//
// Slots:
//   default — content the theme applies to.
//
// Attributes (axes per the plan):
//   brand=<id>           — selects the brand bundle to ingest.
//   mode=light|dark      — color mode.
//   density=compact|cozy|comfortable — spacing density axis (T4.4).
//   contrast=normal|more — contrast axis (T4.4).
//   motion=full|reduced|expressive — respects prefers-reduced-motion if
//     absent; `expressive` lengthens/springs the role duration + easing
//     tokens (spec 2026-08-20-token-axes-expansion).
//   shape=default|sharp|pill — corner-radius axis: repoints the
//     `theme.border.radius.role.*` tokens (spec 2026-08-20-token-axes-expansion).
//
// Orthogonal axes: `brand` sets a LOOK, `shape`/`motion` set a FEEL. A
// "recipe" is the combination — see `.altitude/AXES.md` — never a single
// attribute flip, and never a per-brand shape/motion file.

import { html, css, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './theme.scss';

/**
 * Component: al-theme
 * @slot - The content tree the theme applies to.
 */
export class ALTheme extends ALElement {
  static el = 'al-theme';

  /** Brand identifier. Currently shipped: 'altitude' | 'southleft'. */
  @property() accessor brand: 'altitude' | 'southleft' = 'altitude';
  /** Color mode. */
  @property() accessor mode: 'light' | 'dark' = 'light';
  /** Density axis. */
  @property() accessor density: 'compact' | 'cozy' | 'comfortable' = 'comfortable';
  /** Contrast axis. */
  @property() accessor contrast: 'normal' | 'more' = 'normal';
  /**
   * Motion axis. Falls back to `prefers-reduced-motion` when unset.
   * `expressive` lengthens durations and swaps in springier easing on the
   * `theme.animation.{duration,timing}.role.*` tokens; `reduced` still wins
   * under `prefers-reduced-motion` unless `full` is set (accessibility-first
   * — `expressive` is a decorative upgrade, not an override of the OS
   * preference).
   */
  @property() accessor motion: 'full' | 'reduced' | 'expressive' | undefined;
  /**
   * Shape axis. Repoints the `theme.border.radius.role.*` tokens
   * (action/control/surface/indicator) that components map their
   * border-radius usage to. `default` (unset) reproduces today's per-brand
   * radii exactly — the role tokens resolve through the existing
   * `--al-theme-border-radius{,-lg,-round}` chain, so a brand's own radius
   * identity still shows through until `sharp`/`pill` overrides it.
   */
  @property() accessor shape: 'default' | 'sharp' | 'pill' | undefined;

  static get styles() {
    return [
      unsafeCSS(styles.toString()),
      css`
        @layer al.theme {
          :host { display: contents; }
        }
      `,
    ];
  }

  render() {
    return html`<slot></slot>`;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALTheme.el) === undefined) {
  customElements.define(ALTheme.el, ALTheme);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-theme': ALTheme;
  }
}
