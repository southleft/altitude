import { html, unsafeCSS } from 'lit';
import { SLElement } from '../SLElement';
import styles from './header.scss';

/**
 * Component: sl-header
 * @slot - The components content
 */
export class SLHeader extends SLElement {
  static el = 'sl-header';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-header', { });

    return html`
      <header class="${componentClassNames}">
        ${this.slotNotEmpty('before') && html`<span class="sl-c-header__before"><slot name="before"></slot></span>`}
        <div class="sl-c-header__main"><slot></slot></div>
        ${this.slotNotEmpty('after') && html`<span class="sl-c-header__after"><slot name="after"></slot></span>`}
      </header>
    `;
  }
}

if ((globalThis as any).slAutoRegistry === true && customElements.get(SLHeader.el) === undefined) {
  customElements.define(SLHeader.el, SLHeader);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-header': SLHeader;
  }
}