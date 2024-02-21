import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './button-group.scss';

/**
 * Component: al-button-group
 * - **slot**: The button group content, a set of buttons
 */
export class ALButtonGroup extends ALElement {
  static el = 'al-button-group';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Behavior variant
   * - **default** renders the buttons in a row
   * - **stacked** renders the buttons stacked on top of each other
   * - **stretched** renders the buttons stretched to the width of the container
   * - **responsive** renders the buttons stacked on small screens and in a row when space becomes available
   */
  @property()
  accessor behavior: 'stacked' | 'stretched' | 'responsive';

  /**
   * Alignment variant
   * - **default** aligns the buttons to the left of the container
   * - **center** aligns the buttons to the center of the container
   * - **right** aligns the buttons to the right of the container
   */
  @property()
  accessor alignment: 'center' | 'right';

  render() {
    const componentClassNames = this.componentClassNames('al-c-button-group', {
      'al-c-button-group--stacked': this.behavior === 'stacked',
      'al-c-button-group--stretched': this.behavior === 'stretched',
      'al-c-button-group--responsive': this.behavior === 'responsive',
      'al-c-button-group--alignment-right': this.alignment === 'right',
      'al-c-button-group--alignment-center': this.alignment === 'center'
    });

    return html`
      <div class="${componentClassNames}">
        <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALButtonGroup.el) === undefined) {
  customElements.define(ALButtonGroup.el, ALButtonGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-button-group': ALButtonGroup;
  }
}
