import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './heading.scss';

/**
 * Component: al-heading
 *
 * Heading is used to render semantic heading tags with specific styles.
 * - **slot**: The heading content
 */
export class ALHeading extends ALElement {
  static el = 'al-heading';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Heading variants
   * - **default** renders a heading with the XL font styles
   * - **sm** renders a heading with the SM font styles
   * - **md** renders a heading with the MD font styles
   * - **lg** renders a heading with the LG font styles
   * - **display-sm** renders a heading with the Display SM font styles
   * - **display-md** renders a heading with the Display MD font styles
   * - **display-lg** renders a heading with the Display LG font styles
   */
  @property()
  accessor variant: 'display-lg' | 'display-md' | 'display-sm' | 'lg' | 'md' | 'sm';

  /**
   * Heading tag name
   * - **h1** renders an `h1` tag
   * - **h2** renders an `h2` tag, this is the default
   * - **h3** renders an `h3` tag
   * - **h4** renders an `h4` tag
   * - **h5** renders an `h5` tag
   * - **h6** renders an `h6` tag
   */
  @property()
  accessor tagName: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' = 'h2';

  /**
   * Is bold?
   * - **true** Renders the heading with semibold font weight
   * - **false** Renders the heading with regular font weight
   */
  @property({ type: Boolean })
  accessor isBold: boolean;

  render() {
    const componentClassNames = this.componentClassNames('al-c-heading', {
      'al-c-heading--sm': this.variant === 'sm',
      'al-c-heading--md': this.variant === 'md',
      'al-c-heading--lg': this.variant === 'lg',
      'al-c-heading--display-sm': this.variant === 'display-sm',
      'al-c-heading--display-md': this.variant === 'display-md',
      'al-c-heading--display-lg': this.variant === 'display-lg',
      'al-is-bold': this.isBold
    });

    switch (this.tagName) {
      case 'h1':
        return html`<h1 class="${componentClassNames}"><slot></slot></h1>`;
      case 'h2':
        return html`<h2 class="${componentClassNames}"><slot></slot></h2>`;
      case 'h3':
        return html`<h3 class="${componentClassNames}"><slot></slot></h3>`;
      case 'h4':
        return html`<h4 class="${componentClassNames}"><slot></slot></h4>`;
      case 'h5':
        return html`<h5 class="${componentClassNames}"><slot></slot></h5>`;
      case 'h6':
        return html`<h6 class="${componentClassNames}"><slot></slot></h6>`;
    }
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALHeading.el) === undefined) {
  customElements.define(ALHeading.el, ALHeading);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-heading': ALHeading;
  }
}
