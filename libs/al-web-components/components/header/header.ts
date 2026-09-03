import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './header.scss';

/**
 * Component: al-header
 *
 * The site header landmark and its chrome. Header owns the `<header>` element,
 * the opt-in sticky/elevated behaviour and the stacking context. Arrangement is
 * `<al-layout>`'s job — nest one and lay the bar out there.
 *
 * ```html
 * <al-header sticky elevated>
 *   <al-layout direction="row" align="center" justify="between">
 *     <al-logo></al-logo>
 *     <al-menu>...</al-menu>
 *     <al-layout direction="row" gap="sm">...actions...</al-layout>
 *   </al-layout>
 * </al-header>
 * ```
 *
 * See "Arrangement vs. semantics" in AGENTS.md.
 *
 * @slot - The header content. Wrap it in an `<al-layout>` to arrange it.
 *
 * @cssproperty --al-header-min-height - Minimum bar height. Defaults to `--al-theme-layout-height-header`. A MINIMUM, not a fixed height, so a wrapping header grows instead of clipping.
 * @cssproperty --al-header-padding - Inline/block padding around the content. Defaults to `--al-theme-space`.
 * @cssproperty --al-header-background - Bar background. Defaults to `--al-theme-color-background-neutral-default`.
 * @cssproperty --al-header-border-block-end - Hairline rule under the bar. Defaults to `none`. Use instead of `elevated` when a translucent bar should read as a rule rather than a lift.
 * @cssproperty --al-header-backdrop-filter - Filter applied to what scrolls behind the bar, e.g. `blur(12px)`. Defaults to `none`. Pair with a translucent `--al-header-background`.
 */
export class ALHeader extends ALElement {
  static el = 'al-header';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /** Stick the header to the top of its scroll container. */
  @property({ type: Boolean, reflect: true })
  accessor sticky: boolean;

  /** Cast a shadow under the bar to separate it from the content it scrolls over. */
  @property({ type: Boolean, reflect: true })
  accessor elevated: boolean;

  render() {
    const componentClassNames = this.componentClassNames('al-c-header', {
      'al-is-sticky': this.sticky,
      'al-is-elevated': this.elevated
    });

    return html`
      <header class="${componentClassNames}">
        <slot></slot>
      </header>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALHeader.el) === undefined) {
  customElements.define(ALHeader.el, ALHeader);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-header': ALHeader;
  }
}
