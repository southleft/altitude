import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { SLElement } from '../SLElement';
import styles from './text-passage.scss';

/**
 * Component: sl-text-passage
 * - The text passage provides an area to slot in any content related items and they are all spaced accordingly.
 * @slot - The components content
 */
export class SLTextPassage extends SLElement {
  static el = 'sl-text-passage';

  static get styles() {
    return unsafeCSS(styles);
  }

  /**
   * Prevents the text passage from expanding full width
   * - **sm** Add a max width of --sl-theme-layout-max-width-sm
   */
  @property()
  accessor maxWidth: 'sm';

  render() {
    const componentClassName = this.componentClassNames('sl-c-text-passage', {
      'sl-c-text-passage--max-width-sm': this.maxWidth === 'sm'
    });

    return html`
      <div class="${componentClassName}">
        <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLTextPassage.el) === undefined) {
  customElements.define(SLTextPassage.el, SLTextPassage);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-text-passage': SLTextPassage;
  }
}
