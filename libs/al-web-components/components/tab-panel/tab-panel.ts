import { html, unsafeCSS } from 'lit';
import { property, query } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { ALElement } from '../ALElement';
import styles from './tab-panel.scss';

/**
 * Component: al-tab-panel
 *
 * Tab Panel displays content for a single tab within the tabs component.
 * - **slot**: The tab panel content
 */
export class ALTabPanel extends ALElement {
  static el = 'al-tab-panel';

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
   * Query the tab panel element inside the ALTabPanel
   */
  @query('.al-c-tab-panel')
  accessor tabPanelEl: HTMLElement;

  render() {
    const componentClassNames = this.componentClassNames('al-c-tab-panel', {
      'al-is-active': this.isActive
    });

    return html`
      <div class="${componentClassNames}" role="tabpanel" tabindex="0" id=${ifDefined(this.ariaId)} aria-labelledby=${ifDefined(this.ariaLabelledBy)}>
        <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALTabPanel.el) === undefined) {
  customElements.define(ALTabPanel.el, ALTabPanel);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-tab-panel': ALTabPanel;
  }
}
