import { html, unsafeCSS } from 'lit';
import { property, queryAssignedElements } from 'lit/decorators.js';
import { SLElement } from '../SLElement';
import { SLAccordionPanel } from '../accordion-panel/accordion-panel';
import styles from './accordion.scss';

/**
 * Component: sl-accordion
 *
 * Accordion is a vertical list of panels used to show and hide related sections of content.
 * - **slot**: The accordion content, a set of accordion panels
 */
export class SLAccordion extends SLElement {
  static el = 'sl-accordion';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Expand all?
   * - All panels will be in expand or open state when it's true
   */
  @property({ type: Boolean })
  accessor expandAll: boolean;

  /**
   * Single panel only?
   * - Display only a single panel at a time
   */
  @property({ type: Boolean })
  accessor expandOneOnly: boolean;

  /**
   * Query all the accordion panels
   */
  @queryAssignedElements()
  accessor accordionPanels: Array<SLAccordionPanel>;

  /**
   * First updated lifecycle
   * 1. Add index to each panel level
   * 2. Set the last panel in the SLAccordion
   * 3. Expand all accordion panels if expandAll is true
   * 4. On click of a panel, only expand one at a time
   */
  firstUpdated() {
    this.accordionPanels.forEach((panel, index) => {
      panel.idx = index; /* 1 */
      /* 2 */
      if (index === this.accordionPanels.length - 1) {
        panel.isLast = true;
      } else {
        panel.isLast = false;
      }
      /* 3 */
      if (this.expandAll) {
        if (!panel.isDisabled) {
          panel.isActive = true;
        }
      }
      /* 4 */
      panel.addEventListener('click', () => {
        this.setExpandOneOnly(panel);
      });
    });
  }

  /**
   * Set expand one panel at a time
   * 1. Close all panels except for the one that was clicked
   */
  setExpandOneOnly(panel: SLAccordionPanel) {
    if (this.expandOneOnly) {
      const notActive = [...this.accordionPanels].filter((el) => el !== panel);
      notActive.forEach((panel) => {
        panel.isActive = false;
      });
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-accordion', {});

    return html`
      <dl class="${componentClassNames}">
        <slot></slot>
      </dl>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLAccordion.el) === undefined) {
  customElements.define(SLAccordion.el, SLAccordion);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-accordion': SLAccordion;
  }
}
