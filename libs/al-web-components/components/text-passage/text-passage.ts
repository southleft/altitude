import { TemplateResult, unsafeCSS } from 'lit';
import { html } from 'lit/static-html.js';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './text-passage.scss';

/**
 * Component: al-text-passage
 *
 * Text Passage provides a layout with consistent spacing for any content related items.
 * - **slot**: The text passage content
 */
export class ALTextPassage extends ALElement {
  static el = 'al-text-passage';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Prevents the text passage from expanding full width
   * - **sm** Add a max width of --al-theme-layout-max-width-sm
   */
  @property()
  accessor maxWidth: 'sm';

  render() {
    const componentClassName = this.componentClassNames('al-c-text-passage', {
      'al-c-text-passage--max-width-sm': this.maxWidth === 'sm'
    });

    return html`
      <div class="${componentClassName}">
        <slot></slot>
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALTextPassage.el) === undefined) {
  customElements.define(ALTextPassage.el, ALTextPassage);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-text-passage': ALTextPassage;
  }
}
