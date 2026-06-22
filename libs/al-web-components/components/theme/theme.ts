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
//   motion=full|reduced  — respects prefers-reduced-motion if absent.

import { html, css, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './theme.scss';

/**
 * Component: al-theme
 * - **slot**: The content tree the theme applies to.
 */
export class ALTheme extends ALElement {
  static el = 'al-theme';

  /** Brand identifier. Currently shipped: 'altitude' | 'northright' | 'odyssey' | 'southleft'. */
  @property() accessor brand: 'altitude' | 'northright' | 'odyssey' | 'southleft' = 'altitude';
  /** Color mode. */
  @property() accessor mode: 'light' | 'dark' = 'light';
  /** Density axis. */
  @property() accessor density: 'compact' | 'cozy' | 'comfortable' = 'comfortable';
  /** Contrast axis. */
  @property() accessor contrast: 'normal' | 'more' = 'normal';
  /** Motion axis. Falls back to `prefers-reduced-motion` when unset. */
  @property() accessor motion: 'full' | 'reduced' | undefined;

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
