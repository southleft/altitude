import { html, unsafeCSS } from 'lit';
import { property, query } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { SLElement } from '../SLElement';
import styles from './tab-panel.scss';

/**
 * Component: sl-tab-panel
 * - Tab Panel displays content for a single tab within the tabs component.
 * @slot - The components content
 */
export class SLTabPanel extends SLElement {
  static el = 'sl-tab-panel';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Active state
   * - **true** Renders a tab panel with selected/active state
   * - **false** Renders a tab panel without selected/active state
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * ID used to connect the tab panel to the tab aria-controls
   */
  @property()
  accessor ariaId: string;

  /**
   * Aria labelledby property
   * - Used to connect tab trigger and tab panel for accessibility
   */
  @property()
  accessor ariaLabelledBy: string;

  /**
   * Index to track tab panel
   */
  @property({ type: Number })
  accessor idx: number = 0;

  /**
   * Query the tab panel element inside the SLTabPanel
   */
  @query('.sl-c-tab-panel')
  accessor tabPanelEl: HTMLElement;

  render() {
    const componentClassNames = this.componentClassNames('sl-c-tab-panel', {
      'sl-is-active': this.isActive
    });

    return html`
      <div class="${componentClassNames}" role="tabpanel" tabindex="0" id=${ifDefined(this.ariaId)} aria-labelledby=${ifDefined(this.ariaLabelledBy)}>
        <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLTabPanel.el) === undefined) {
  customElements.define(SLTabPanel.el, SLTabPanel);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-tab-panel': SLTabPanel;
  }
}
