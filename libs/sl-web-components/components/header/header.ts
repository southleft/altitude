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
      <div class="${componentClassNames}">
        <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLHeader.el) === undefined) {
  customElements.define(SLHeader.el, SLHeader);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-header': SLHeader;
  }
}