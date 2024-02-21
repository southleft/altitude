import { html, unsafeCSS } from 'lit';
import { ALElement } from '../ALElement';
import styles from './header.scss';

/**
 * Component: al-header
 * - **slot**: The components content
 */
export class ALHeader extends ALElement {
  static el = 'al-header';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-header', { });

    return html`
      <header class="${componentClassNames}">
        ${this.slotNotEmpty('before') && html`<span class="al-c-header__before"><slot name="before"></slot></span>`}
        <div class="al-c-header__main"><slot></slot></div>
        ${this.slotNotEmpty('after') && html`<span class="al-c-header__after"><slot name="after"></slot></span>`}
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