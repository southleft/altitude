import { TemplateResult, unsafeCSS, html } from 'lit';
import { property, query } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { ALElement } from '../ALElement';
import styles from './tab.scss';

/**
 * Component: al-tab
 * - **slot**: The tab label
 */
export class ALTab extends ALElement {
  static el = 'al-tab';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Active state
   * - **true** Renders a tab with selected/active state
   * - **false** Renders a tab without selected/active state
   */
  @property({ type: Boolean })
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
   * Query the tab element inside the ALTab
   */
  @query('.al-c-tab')
  accessor tabEl: HTMLButtonElement;

  render() {
    const componentClassNames = this.componentClassNames('al-c-tab', {
      'al-is-active': this.isActive,
      'al-is-disabled': this.isDisabled
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
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALTab.el) === undefined) {
  customElements.define(ALTab.el, ALTab);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-tab': ALTab;
  }
}
