import { TemplateResult, unsafeCSS } from 'lit';
import { property, queryAssignedElements } from 'lit/decorators.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALButton } from '../button/button';
import { ALHeading } from '../heading/heading';
import { ALIconClose } from '../icon/icons/close';
import { ALFocusTrap } from '../focus-trap/focus-trap';
import styles from './popover.scss';

/**
 * Component: al-popover
 *
 * Popover is used to display content on top of other elements, and is positioned around the trigger that opens it.
 * - **slot**: The main body of the popover
 * - **slot** "header": The header of the popover that appears above the main slot
 * - **slot** "footer": The footer of the popover that appears below the main slot
 * - **slot** "trigger": The trigger that opens/closes the popover
 */
export class ALPopover extends ALElement {
  static el = 'al-popover';

  private elementMap = register({
    elements: [
      [ALHeading.el, ALHeading],
      [ALButton.el, ALButton],
      [ALIconClose.el, ALIconClose],
      [ALFocusTrap.el, ALFocusTrap]
    ],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private headingEl = unsafeStatic(this.elementMap.get(ALHeading.el));
  private buttonEl = unsafeStatic(this.elementMap.get(ALButton.el));
  private iconCloseEl = unsafeStatic(this.elementMap.get(ALIconClose.el));
  private focusTrapEl = unsafeStatic(this.elementMap.get(ALFocusTrap.el));

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
   * Contructor
   * 1. Bind the context of the handleOnClickOutside method
   * 2. Add a listener that closes the popover when a selection is made within its slotted menu component (if it has one)
   */
  constructor() {
    super();
    this.handleOnClickOutside = this.handleOnClickOutside.bind(this); /* 1 */
    /* 2 */
    this.addEventListener('onMenuItemSelect', () => {
      if (this.variant == 'menu') {
        this.close();
      }
    });
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
    const componentClassNames = this.componentClassNames('al-c-popover', {
      'al-c-popover--menu': this.variant === 'menu',
      'al-c-popover--bottom-center': this.position === 'bottom-center',
      'al-c-popover--bottom-right': this.position === 'bottom-right',
      'al-c-popover--bottom-left': this.position === 'bottom-left',
      'al-c-popover--top-center': this.position === 'top-center',
      'al-c-popover--top-right': this.position === 'top-right',
      'al-c-popover--top-left': this.position === 'top-left',
      'al-c-popover--left': this.position === 'left',
      'al-c-popover--left-top': this.position === 'left-top',
      'al-c-popover--right': this.position === 'right',
      'al-c-popover--right-top': this.position === 'right-top',
      'al-is-active': this.isActive === true
    });

    return html`
      <div class="${componentClassNames}" @keydown=${this.handleOnKeydown}>
        ${this.slotNotEmpty('trigger') &&
        html`
          <div class="al-c-popover__trigger" @click=${this.toggleActive}>
            <slot name="trigger"></slot>
          </div>
        `}
        <${this.focusTrapEl} .transitionDelay=${this.transitionDelay} ?isActive=${this.isActive}>
          <div
            class="al-c-popover__container"
            role="dialog"
            aria-labelledby=${this.ariaLabelledBy}
          >
          ${(this.slotNotEmpty('header') || this.heading || this.isDismissible) &&
            html`
              <div class="al-c-popover__header">
                ${(this.slotNotEmpty('header') || this.heading) &&
                html`
                  <div class="al-c-popover__title" id=${this.ariaLabelledBy}>
                    ${this.heading &&
                    html`
                      <${this.headingEl} tagName="h1">${this.heading}</${this.headingEl}>
                    `}
                    <slot name="header"></slot>
                  </div>
                `}
                ${this.isDismissible
                  ? html`
                  <${this.buttonEl} class="al-c-popover__close-button" variant="tertiary" ?hideText=${true} @click=${this.handleOnCloseButton}>
                    Close<${this.iconCloseEl} class="al-c-popover__icon-close" slot="after"></${this.iconCloseEl}>
                  </${this.buttonEl}>
                `
                  : html``}
              </div>
            `}
            <div class="al-c-popover__body">
              <slot></slot>
            </div>
            ${this.slotNotEmpty('footer') &&
            html`
              <div class="al-c-popover__footer">
                <slot name="footer"></slot>
              </div>
            `}
          </div>
        </${this.focusTrapEl}>
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALPopover.el) === undefined) {
  customElements.define(ALPopover.el, ALPopover);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-popover': ALPopover;
  }
}
