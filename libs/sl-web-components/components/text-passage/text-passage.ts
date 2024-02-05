import { TemplateResult, unsafeCSS } from 'lit';
import { html } from 'lit/static-html.js';
import { property } from 'lit/decorators.js';
import { SLElement } from '../SLElement';
import styles from './text-passage.scss';

/**
 * Component: sl-text-passage
 *
 * Text Passage provides a layout with consistent spacing for any content related items.
 * - **slot**: The text passage content
 */
export class SLTextPassage extends SLElement {
  static el = 'sl-text-passage';

  static get styles() {
    return unsafeCSS(styles.toString());
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
    ` as TemplateResult<1>;
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
