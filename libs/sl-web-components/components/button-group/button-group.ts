import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { SLElement } from '../SLElement';
import styles from './button-group.scss';

/**
 * Component: sl-button-group
 * - Button Group is used to group buttons and provide proper alignment.
 * @slot - The components content
 */
export class SLButtonGroup extends SLElement {
  static el = 'sl-button-group';

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
    const componentClassNames = this.componentClassNames('sl-c-button-group', {
      'sl-c-button-group--stacked': this.behavior === 'stacked',
      'sl-c-button-group--stretched': this.behavior === 'stretched',
      'sl-c-button-group--responsive': this.behavior === 'responsive',
      'sl-c-button-group--alignment-right': this.alignment === 'right',
      'sl-c-button-group--alignment-center': this.alignment === 'center'
    });

    return html`
      <div class="${componentClassNames}">
        <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLButtonGroup.el) === undefined) {
  customElements.define(SLButtonGroup.el, SLButtonGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-button-group': SLButtonGroup;
  }
}
