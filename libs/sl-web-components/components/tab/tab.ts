import { html, unsafeCSS } from 'lit';
import { property, query } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { SLElement } from '../SLElement';
import styles from './tab.scss';

/**
 * Component: sl-tab
 *
 * Tab is a singular interactive item within the tabs component.
 * - **slot**: The tab label
 */
export class SLTab extends SLElement {
  static el = 'sl-tab';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Active state
   * - **true** Renders a tab with selected/active state
   * - **false** Renders a tab without selected/active state
   */
  @property()
  accessor isActive: boolean;

  /**
   * Disabled attribute
   * - **true** Renders a tab with the disabled property and state
   * - **false** Renders a tab without the disabled property and state
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  /**
   * ID used to connect the tab panel to the tab aria-controls
   */
  @property()
  accessor ariaId: string;

  /**
   * Aria controls attribute
   * - Sets to the id used to connect the tab trigger to the tab panel
   */
  @property()
  accessor ariaControls: string;

  /**
   * Index to track tab
   */
  @property({ type: Number })
  accessor idx: number = 0;

  /**
   * Handle on click
   * 1. Dispatch a custom event on click of the tab
   */
  handleOnClick() {
    this.dispatch({
      eventName: 'onTabSelect',
      detailObj: {
        value: this,
        index: this.idx
      }
    });
  }

  /**
   * Query the tab element inside the SLTab
   */
  @query('.sl-c-tab')
  accessor tabEl: HTMLButtonElement;

  render() {
    const componentClassNames = this.componentClassNames('sl-c-tab', {
      'sl-is-active': this.isActive,
      'sl-is-disabled': this.isDisabled
    });

    return html`
      <button
        class="${componentClassNames}"
        role="tab"
        @click=${this.handleOnClick}
        ?disabled=${this.isDisabled}
        tabindex=${this.isActive ? '0' : '-1'}
        id=${ifDefined(this.ariaId)}
        aria-selected=${ifDefined(this.isActive)}
        aria-controls=${ifDefined(this.ariaControls)}
      >
        <slot></slot>
      </button>
    `;
  }
}

if ((globalThis as any).slAutoRegistry === true && customElements.get(SLTab.el) === undefined) {
  customElements.define(SLTab.el, SLTab);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-tab': SLTab;
  }
}
