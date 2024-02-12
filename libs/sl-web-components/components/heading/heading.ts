import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { SLElement } from '../SLElement';
import styles from './heading.scss';

/**
 * Component: sl-heading
 *
 * Heading is used to render semantic heading tags with specific styles.
 * - **slot**: The heading content
 */
export class SLHeading extends SLElement {
  static el = 'sl-heading';

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
    const componentClassNames = this.componentClassNames('sl-c-heading', {
      'sl-c-heading--sm': this.variant === 'sm',
      'sl-c-heading--md': this.variant === 'md',
      'sl-c-heading--lg': this.variant === 'lg',
      'sl-c-heading--display-sm': this.variant === 'display-sm',
      'sl-c-heading--display-md': this.variant === 'display-md',
      'sl-c-heading--display-lg': this.variant === 'display-lg',
      'sl-is-bold': this.isBold
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

if ((globalThis as any).slAutoRegistry === true && customElements.get(SLHeading.el) === undefined) {
  customElements.define(SLHeading.el, SLHeading);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-heading': SLHeading;
  }
}
