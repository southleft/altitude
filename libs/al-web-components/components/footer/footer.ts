import { html, unsafeCSS } from 'lit';
import { ALElement } from '../ALElement';
import styles from './footer.scss';

/**
 * Component: al-footer
 *
 * A site-wide footer organism for marketing pages. Purely compositional —
 * link columns compose with the existing `<al-list>`/`<al-link>`/`<al-menu>`
 * primitives, and every spacing decision comes from the active theme's
 * `--al-theme-space-*` ramp, so the footer is automatically density-aware
 * wherever it renders inside a `<al-theme density="...">` scope.
 *
 * @slot logo - Brand mark, rendered top-left of the link-columns row.
 * @slot - Link columns — arbitrary column blocks (e.g. a heading + `<al-list>` per column).
 * @slot legal - Bottom-row legal copy (copyright, small print, legal links). Leading edge.
 * @slot social - Bottom-row social links/icons. Trailing edge.
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
        ${this.slotNotEmpty('logo') || this.slotNotEmpty()
          ? html`
              <div class="al-c-footer__top">
                ${this.slotNotEmpty('logo') &&
                html`
                  <div class="al-c-footer__logo">
                    <slot name="logo"></slot>
                  </div>
                `}
                <div class="al-c-footer__columns">
                  <slot></slot>
                </div>
              </div>
            `
          : ''}
        ${this.slotNotEmpty('legal') || this.slotNotEmpty('social')
          ? html`
              <div class="al-c-footer__bottom">
                ${this.slotNotEmpty('legal') &&
                html`
                  <div class="al-c-footer__legal">
                    <slot name="legal"></slot>
                  </div>
                `}
                ${this.slotNotEmpty('social') &&
                html`
                  <div class="al-c-footer__social">
                    <slot name="social"></slot>
                  </div>
                `}
              </div>
            `
          : ''}
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
