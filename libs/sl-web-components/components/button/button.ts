import { html, unsafeCSS, css } from 'lit';
import { property } from 'lit/decorators.js';
import { SLElement } from '../SLElement';
// import styles from './button.scss';

/**
 * Primary UI component for user interaction
 */
export class BlocksButton extends SLElement {
  /**
   * * SCSS loader isn't working so just rigging up the static styles
   */

  // static get styles() {
  //   return unsafeCSS(styles);
  // }

  static styles = css`
    .c-button {
      background-color: yellow;
    }

    .c-button--secondary {
      background-color: blue;
    }
  `;

  /**
   * Style variant
   */
  @property()
  variant?: 'primary' | 'secondary';

  @property()
  label?: string;

  render() {
    const componentClassNames = this.componentClassNames('c-button', {
      'c-button--primary': this.variant === 'primary',
      'c-button--secondary': this.variant === 'secondary',
    });

    return html`
      <button type="button" class="${componentClassNames}">
        <slot></slot>
      </button>
    `;
  }
}

if (customElements.get('c-button') === undefined) {
  customElements.define('c-button', BlocksButton);
}
