import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { SLElement } from '../SLElement';
import styles from './dropdown-panel.scss';

/**
 * Component: sl-dropdown-panel
 *
 * Dropdown Panel provides overlay and show/hide functionality to the dropdown's list of options.
 * - **slot**: The dropdown panel content
 */
export class SLDropdownPanel extends SLElement {
  static el = 'sl-dropdown-panel';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Adds a max height and scrolling of the panel
   */
  @property({ type: Boolean })
  accessor hasScroll: boolean;

  /**
   * Changes styling on panel for variant with header
   */
  @property({ type: Boolean })
  accessor hasHeader: boolean = false;

  /**
   * Changes styling on panel for variant with footer
   */
  @property({ type: Boolean })
  accessor hasFooter: boolean = false;

  render() {
    const componentClassNames = this.componentClassNames('sl-c-dropdown-panel', {
      'sl-has-header': this.hasHeader === true,
      'sl-has-footer': this.hasFooter === true,
      'sl-has-scroll': this.hasScroll === true
    });

    return html`
      <div class="${componentClassNames}">
        ${this.slotNotEmpty('header') &&
        html`
          <div class="sl-c-dropdown-panel__header">
            <slot name="header"></slot>
          </div>
        `}
        <div class="sl-c-dropdown-panel__body">
          <slot></slot>
        </div>
        ${this.slotNotEmpty('footer') &&
        html`
          <div class="sl-c-dropdown-panel__footer">
            <slot name="footer"></slot>
          </div>
        `}
      </div>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLDropdownPanel.el) === undefined) {
  customElements.define(SLDropdownPanel.el, SLDropdownPanel);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-dropdown-panel': SLDropdownPanel;
  }
}
