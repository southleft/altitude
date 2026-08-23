import { TemplateResult, unsafeCSS, html } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './text-block.scss';

/**
 * Component: al-text-block
 * @slot - The text passage content
 *
 * @cssproperty --al-text-block-font - The block's base typography, as a `font` shorthand. Defaults to body-md. Needed because that default compiles to a `font` shorthand, which resets `font-size`/`line-height` and so cannot be overridden by inheritance from the host — pass a typography token (e.g. `var(--al-theme-typography-body-lg)`) to set lead copy.
 */
export class ALTextBlock extends ALElement {
  static el = 'al-text-block';

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
    const componentClassName = this.componentClassNames('al-c-text-block', {
      'al-c-text-block--max-width-sm': this.maxWidth === 'sm'
    });

    return html`
      <div class="${componentClassName}">
        <slot></slot>
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALTextBlock.el) === undefined) {
  customElements.define(ALTextBlock.el, ALTextBlock);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-text-block': ALTextBlock;
  }
}
