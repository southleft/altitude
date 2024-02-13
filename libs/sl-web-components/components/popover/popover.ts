import { TemplateResult, unsafeCSS } from 'lit';
import { property, queryAsync, queryAssignedElements } from 'lit/decorators.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLButton } from '../button/button';
import { SLHeading } from '../heading/heading';
import { SLIconClose } from '../icon/icons/close';
import { SLFocusTrap } from '../focus-trap/focus-trap';
import styles from './popover.scss';

/**
 * Component: sl-popover
 *
 * Popover is used to display content on top of other elements, and is positioned around the trigger that opens it.
 * - **slot**: The main body of the popover
 * - **slot** "header": The header of the popover that appears above the main slot
 * - **slot** "footer": The footer of the popover that appears below the main slot
 * - **slot** "trigger": The trigger that opens/closes the popover
 */
export class SLPopover extends SLElement {
  static el = 'sl-popover';

  private elementMap = register({
    elements: [
      [SLHeading.el, SLHeading],
      [SLButton.el, SLButton],
      [SLIconClose.el, SLIconClose],
      [SLFocusTrap.el, SLFocusTrap]
    ],
    suffix: (globalThis as any).slAutoRegistry === true ? '' : PackageJson.version
  });

  private headingEl = unsafeStatic(this.elementMap.get(SLHeading.el));
  private buttonEl = unsafeStatic(this.elementMap.get(SLButton.el));
  private iconCloseEl = unsafeStatic(this.elementMap.get(SLIconClose.el));
  private focusTrapEl = unsafeStatic(this.elementMap.get(SLFocusTrap.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Variants
   * - **default** Displays the popover panel with padding
   * - **menu** Displays the popover panel without padding
   */
  @property()
  accessor variant: 'menu';

  /**
   * Heading text that appears in the header region
   */
  @property()
  accessor heading: string;

  /**
   * Positions the dropdown popover absolutely to the trigger.
   * - **default** places the popover to the bottom left
   * - **bottom-center** places the popover to the bottom center
   * - **bottom-right** places the popover to the bottom right
   * - **bottom-left** places the popover to the bottom left
   * - **top-center** places the popover to the top center
   * - **top-right** places the popover to the top right
   * - **top-left** places the popover to the top left
   * - **left** places the popover to the left
   * - **left-top** places the popover to the left top
   * - **right** places the popover to the right
   * - **right-top** places the popover to the right top
   */
  @property()
  accessor position:
    | 'bottom-center'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'top-right'
    | 'top-left'
    | 'left'
    | 'left-top'
    | 'right'
    | 'right-top' = 'bottom-left';

  /**
   * Is active?
   * - **true** Shows the popover container
   * - **false** Hides the popover container
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * Is dismissible?
   * - **true** Shows the popover close button
   * - **false** Hides the popover close button
   */
  @property({ type: Boolean })
  accessor isDismissible: boolean;

  /**
   * Aria Labelled By attribute
   * - Dynamically set for A11y
   */
  @property()
  accessor ariaLabelledBy: string;

  /**
   * Number of ms of the dialog's open/close css transition delay
   * - Used to delay focus trap activation
   */
   @property()
   accessor transitionDelay: number = 400;

   /**
   * Query the popover heading
   */
   @queryAsync('.sl-c-popover__title > sl-heading')
   accessor popoverHeading: any;

   /**
    * Query the popover close button
    */
   @queryAsync('.sl-c-popover__close-button')
   accessor closeButton: any;

  /**
   * Query the popover trigger
   */
  @queryAssignedElements({ slot: 'trigger' })
  accessor popoverTrigger: any[];

  /**
   * Query the popover trigger inner element
   */
  get popoverTriggerButton(): any {
    if (this.popoverTrigger[0] && this.popoverTrigger[0].shadowRoot) {
      return this.popoverTrigger[0].shadowRoot.querySelector('*');
    }
  }

  /**
   * Initialize functions
   */
  constructor() {
    super();
    this.handleOnClickOutside = this.handleOnClickOutside.bind(this);
  }

  /**
   * Connected callback lifecycle
   * 1. Add mousedown event listener
   */
  connectedCallback() {
    super.connectedCallback();
    globalThis.addEventListener('mousedown', this.handleOnClickOutside, false); /* 1 */
  }

  /**
   * Disconnected callback lifecycle
   * 1. Remove mousedown event listener
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    globalThis.removeEventListener('mousedown', this.handleOnClickOutside, false); /* 1 */
  }

  /**
   * First updated lifecycle
   * 1. Wait for slotted components to be loaded
   * 2. Set aria-expanded on the trigger for A11y
   */
  async firstUpdated() {
    await this.updateComplete; /* 1 */
    this.setAria(); /* 2 */
  }

  /**
   * Updated lifecycle
   * 1. Update aria-expanded on the trigger based on if isActive
   */
  updated() {
    this.setAria();
  }

  /**
   * Set aria-expanded to the trigger button
   * 1. Dynamically sets the aria-labelledby for A11y
   * 2. Set isExpanded to this.isActive if it's truthy, otherwise, set it to false
   */
  setAria() {
    /* 1 */
    this.ariaLabelledBy = this.ariaLabelledBy || nanoid();
    /* 2 */
    if (this.popoverTriggerButton) {
      this.popoverTriggerButton.isExpanded = this.isActive || false;
    }
  }

  /**
   * Handles the click event outside the component:
   * 1. Check if the popover is active
   * 2. Determine if the click occurred inside the active popover
   * 3. Check if the click occurred outside the active popover
   * 4. Close the popover if the click occurred outside it
   */
  handleOnClickOutside(e: MouseEvent) {
    /* 1 */
    if (this.isActive) {
      const didClickInside = e.composedPath().includes(this.shadowRoot.host); /* 2 */
      /* 3 */
      if (!didClickInside) {
        /* 4 */
        this.close();
      }
    }
  }

  /**
   * Handle on keydown events
   * 1. When the Enter key is pressed on the trigger, open the popover and prevent default button click
   * 2. If the popover is open and escape is keyed, close the popover and return focus to the trigger button
   */
  handleOnKeydown(e: KeyboardEvent) {
    const { target } = e as any;
    /* 1 */
    if (this.slotNotEmpty('trigger') && target.matches('[slot="trigger"]') && e.code === 'Enter') {
      e.preventDefault();
      this.toggleActive();
    }
    /* 2 */
    if (this.isActive === true && e.code === 'Escape') {
      this.close();
    }
  }

  /**
   * Handle on click of close button
   * 1. Toggle the active state between true and false
   * 2. Dispatch a custom event on click of close button
   */
  handleOnCloseButton() {
    this.toggleActive();
    this.dispatch({
      eventName: 'onPopoverCloseButton',
      detailObj: {
        active: this.isActive
      }
    });
  }

  /**
   * Set popover active state
   * 1. Toggle the active state between true and false
   * 2. Open/close the popover container based on isActive
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
   * Open popover
   * 1. Set isActive to true to show the popover
   * 2. Dispatch a custom event on open
   */
  public open() {
    this.isActive = true; /* 1 */
    /* 2 */
    this.dispatch({
      eventName: 'onPopoverOpen',
      detailObj: {
        active: this.isActive
      }
    });
  }

  /**
   * Close popover
   * 1. Set isActive to false to hide the popover
   * 2. Set the focus on trigger button element when the popover is closed
   * 3. Dispatch a custom event on close
   */
  public close() {
    this.isActive = false; /* 1 */
    /* 2 */
    if (this.popoverTriggerButton) {
      setTimeout(() => {
        this.popoverTriggerButton.focus();
      }, 1);
    }
    /* 3 */
    this.dispatch({
      eventName: 'onPopoverClose',
      detailObj: {
        active: this.isActive
      }
    });
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-popover', {
      'sl-c-popover--menu': this.variant === 'menu',
      'sl-c-popover--bottom-center': this.position === 'bottom-center',
      'sl-c-popover--bottom-right': this.position === 'bottom-right',
      'sl-c-popover--bottom-left': this.position === 'bottom-left',
      'sl-c-popover--top-center': this.position === 'top-center',
      'sl-c-popover--top-right': this.position === 'top-right',
      'sl-c-popover--top-left': this.position === 'top-left',
      'sl-c-popover--left': this.position === 'left',
      'sl-c-popover--left-top': this.position === 'left-top',
      'sl-c-popover--right': this.position === 'right',
      'sl-c-popover--right-top': this.position === 'right-top',
      'sl-is-active': this.isActive === true
    });

    return html`
      <div class="${componentClassNames}" @keydown=${this.handleOnKeydown}>
        ${this.slotNotEmpty('trigger') &&
        html`
          <div class="sl-c-popover__trigger" @click=${this.toggleActive}>
            <slot name="trigger"></slot>
          </div>
        `}
        <${this.focusTrapEl} .delay=${this.transitionDelay} .isActive=${this.isActive}>
          <div
            class="sl-c-popover__container"
            role="region"
            aria-labelledby=${this.ariaLabelledBy}
            aria-hidden=${this.isActive ? false : true}
          >
            ${(this.slotNotEmpty('header') || this.heading || this.isDismissible) &&
            html`
              <div class="sl-c-popover__header">
                ${(this.slotNotEmpty('header') || this.heading) &&
                html`
                  <div class="sl-c-popover__title" id=${this.ariaLabelledBy}>
                    ${this.heading &&
                    html`
                      <${this.headingEl} tagName="h1">${this.heading}</${this.headingEl}>
                    `}
                    <slot name="header"></slot>
                  </div>
                `}
                ${this.isDismissible
                  ? html`
                  <${this.buttonEl} class="sl-c-popover__close-button" variant="tertiary" ?hideText=${true} @click=${this.handleOnCloseButton}>
                    Close<${this.iconCloseEl} class="sl-c-popover__icon-close" slot="after"></${this.iconCloseEl}>
                  </${this.buttonEl}>
                `
                  : html``}
              </div>
            `}
            <div class="sl-c-popover__body">
              <slot></slot>
            </div>
            ${this.slotNotEmpty('footer') &&
            html`
              <div class="sl-c-popover__footer">
                <slot name="footer"></slot>
              </div>
            `}
          </div>
        </${this.focusTrapEl}>
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).slAutoRegistry === true && customElements.get(SLPopover.el) === undefined) {
  customElements.define(SLPopover.el, SLPopover);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-popover': SLPopover;
  }
}
