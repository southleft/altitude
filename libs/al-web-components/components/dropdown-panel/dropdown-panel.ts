import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './dropdown-panel.scss';

/**
 * Component: al-dropdown-panel
 * - **slot**: The dropdown panel content
 */
export class ALDropdownPanel extends ALElement {
  static el = 'al-dropdown-panel';

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
    const componentClassNames = this.componentClassNames('al-c-dropdown-panel', {
      'al-has-header': this.hasHeader === true,
      'al-has-footer': this.hasFooter === true,
      'al-has-scroll': this.hasScroll === true
    });

    return html`
      <div class="${componentClassNames}">
        ${this.slotNotEmpty('header') &&
        html`
          <div class="al-c-dropdown-panel__header">
            <slot name="header"></slot>
          </div>
        `}
        <div class="al-c-dropdown-panel__body">
          <slot></slot>
        </div>
        ${this.slotNotEmpty('footer') &&
        html`
          <div class="al-c-dropdown-panel__footer">
            <slot name="footer"></slot>
          </div>
        `}
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALDropdownPanel.el) === undefined) {
  customElements.define(ALDropdownPanel.el, ALDropdownPanel);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-dropdown-panel': ALDropdownPanel;
  }
}
