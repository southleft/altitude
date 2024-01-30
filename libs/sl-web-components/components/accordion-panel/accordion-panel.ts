import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLIconChevronDown } from '../icon/icons/chevron-down';
import styles from './accordion-panel.scss';

/**
 * Component: sl-accordion-panel
 * - The panel that is slotted inside the SLAccordion
 * @slot - The component content
 */
export class SLAccordionPanel extends SLElement {
  static el = 'sl-accordion-panel';

  private elementMap = register({
    elements: [[SLIconChevronDown.el, SLIconChevronDown]],
    suffix: (globalThis as any).enAutoRegistry === true ? '' : PackageJson.version
  });

  private iconChevronDownEl = unsafeStatic(this.elementMap.get(SLIconChevronDown.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Active property
   * 1. Panel is open when set to true. Close when set to false
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * Disabled property
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  /**
   * Is last?
   * - Dynamically set by the SLAccordion
   * - Removes the bottom border if it is the last item
   */
  @property({ type: Boolean })
  accessor isLast: boolean;

  /**
   * Index of the panel
   * - Dynamically set by the SLAccordion
   */
  @property({ type: Number })
  accessor idx: number;

  /**
   * Aria Controls attribute
   * - Dynamically set for A11y
   */
  @property()
  accessor ariaControls: string;

  /**
   * Aria Labelled By attribute
   * - Dynamically set for A11y
   */
  @property()
  accessor ariaLabelledBy: string;

  /**
   * Connected callback
   * 1. Dynamically sets the aria-labelledby and aria-controls for A11y
   */
  connectedCallback() {
    super.connectedCallback();
    /* 1 */
    this.ariaLabelledBy = this.ariaLabelledBy || nanoid();
    this.ariaControls = this.ariaControls || nanoid();
  }

  /**
   * Set accordion panel active state
   * 1. Toggle the active state between true and false
   * 2. Open/close the panel based on isActive
   */
  public toggleActive() {
    this.isActive = !this.isActive; /* 1 */
    /* 2 */
    if (this.isActive) {
      this.open();
    } else {
      this.close();
    }
  }

  /**
   * Open accordion panel
   * 1. Set isActive to true to show the panel
   * 2. Dispatch a custom event on close
   */
  public open() {
    this.isActive = true; /* 1 */
    /* 2 */
    this.dispatch({
      eventName: 'onAccordionPanelOpen',
      detailObj: {
        index: this.idx,
        expanded: this.isActive
      }
    });
  }

  /**
   * Close accordion panel
   * 1. Set isActive to false to hide the panel
   * 2. Dispatch a custom event on close
   */
  public close() {
    this.isActive = false; /* 1 */
    /* 2 */
    this.dispatch({
      eventName: 'onAccordionPanelClose',
      detailObj: {
        index: this.idx,
        expanded: this.isActive
      }
    });
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-accordion-panel', {
      'sl-is-active': this.isActive,
      'sl-is-disabled': this.isDisabled,
      'sl-is-last': this.isLast
    });

    return html`
      <div class="${componentClassNames}">
        <dt class="sl-c-accordion-panel__header">
          <button
            class="sl-c-accordion-panel__button"
            aria-expanded=${ifDefined(this.isActive)}
            aria-controls=${ifDefined(this.ariaControls)}
            id="${this.ariaLabelledBy}"
            @click=${this.toggleActive}
            ?disabled="${this.isDisabled}"
          >
            <div class="sl-c-accordion__title">
              <slot name="header"></slot>
            </div>
            <div class="sl-c-accordion-panel__icon">
              <${this.iconChevronDownEl} size="lg"></${this.iconChevronDownEl}>
            </div>
          </button>
        </dt>
        <dd class="sl-c-accordion-panel__body" aria-labelledby="${this.ariaLabelledBy}" id=${this.ariaControls}>
          <div class="sl-c-accordion-panel__body-inner">
            <slot></slot>
          </div>
        </dd>
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLAccordionPanel.el) === undefined) {
  customElements.define(SLAccordionPanel.el, SLAccordionPanel);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-accordion-panel': SLAccordionPanel;
  }
}
