import { html, unsafeCSS } from 'lit';
import { ALElement } from '../ALElement';
import styles from './footer.scss';

/**
 * Component: al-footer
 *
 * The site footer landmark and its vertical rhythm. Footer owns the `<footer>`
 * element, its block padding and the gap between stacked rows. Arrangement is
 * `<al-layout>`'s job — link columns, legal rows and social clusters are the
 * page's composition.
 *
 * ```html
 * <al-footer>
 *   <al-layout direction="row" justify="between" wrap gap="xl">
 *     <al-logo></al-logo>
 *     <al-layout direction="row" wrap gap="xl">...link columns...</al-layout>
 *   </al-layout>
 *   <al-divider></al-divider>
 *   <al-layout direction="row" justify="between" align="center" wrap>
 *     <small>&copy; 2026 Acme</small>
 *     <al-layout direction="row" gap="sm">...social...</al-layout>
 *   </al-layout>
 * </al-footer>
 * ```
 *
 * See "Arrangement vs. semantics" in AGENTS.md.
 *
 * @slot - The footer content. Wrap each row in an `<al-layout>` to arrange it.
 *
 * @cssproperty --al-footer-gap - Block gap between top-level children. Defaults to `--al-theme-space-lg`.
 * @cssproperty --al-footer-padding-block - Block padding above and below the content. Defaults to three space units.
 * @cssproperty --al-footer-background - Footer surface. Defaults to `transparent` so the page background shows through; set it to a sunken token to separate the footer from the content above.
 * @cssproperty --al-footer-border-block-start - Hairline rule above the footer. Defaults to `none`.
 */
export class ALFooter extends ALElement {
  static el = 'al-footer';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-footer');

    return html`
      <footer class="${componentClassNames}">
        <slot></slot>
      </footer>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALFooter.el) === undefined) {
  customElements.define(ALFooter.el, ALFooter);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-footer': ALFooter;
  }
}
