import { TemplateResult, unsafeCSS } from 'lit';
import { property, query, queryAsync, queryAssignedElements } from 'lit/decorators.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLButton } from '../button/button';
import { SLHeading } from '../heading/heading';
import { SLIconClose } from '../icon/icons/close';
import { SLFocusTrap } from '../focus-trap/focus-trap';
import styles from './dialog.scss';

/**
 * Component: sl-dialog
 *
 * Dialog informs users about a task and can contain critical information, require decisions, or involve multiple tasks. It blocks interaction and scrolling on the rest of the screen, and should be used sparingly.
 * - **slot**: The main body of the dialog
 * - **slot** "trigger": The trigger that opens/closes the dialog
 * - **slot** "header": The header of the dialog that appears above the main slot
 * - **slot** "footer": The footer of the dialog that appears below the main slot
 */
export class SLDialog extends SLElement {
  static el = 'sl-dialog';

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
   * Heading text that appears in the header region
   */
  @property()
  accessor heading: string;

  /**
   * Is active?
   * - **true** Shows the dialog container
   * - **false** Hides the dialog container
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * Aria Labelled By attribute
   * - Dynamically set for A11y
   */
  @property()
  accessor ariaLabelledBy: string;

  /**
   * Disable click outside
   * - **true** Disables closing the dialog on click outside of the dialog container
   * - **false** Enables closing the dialog on click outside of the dialog container
   */
  @property({ type: Boolean })
  accessor disableClickOutside: boolean;

  /**
   * The width of the dialog container
   * - If no value is entered, it defaults to 432px
   */
  @property({ type: Number })
  accessor width: number;

  /**
   * Number of ms of the dialog's open/close css transition delay
   * - Used to delay focus trap activation
   */
  @property()
  accessor transitionDelay: number = 400;

  /**
   * Query the dialog container
   */
  @query('.sl-c-dialog__container')
  accessor dialogContainer: HTMLElement;

  /**
   * Query the dialog heading
   */
  @queryAsync('.sl-c-dialog__title > sl-heading')
  accessor dialogHeading: any;

  /**
   * Query the dialog close button
   */
  @queryAsync('.sl-c-dialog__close-button')
  accessor closeButton: any;

  /**
   * Query the dialog trigger
   */
  @queryAssignedElements({ slot: 'trigger' })
  accessor slottedTrigger: any[];

  /**
   * The modal trigger if it not slotted in the 'trigger' slot
   * - Must be set by the trigger's click callback when it calls the modal's open method
   */
  @property()
  accessor dialogTrigger: any;

  /**
   * Query the dialog trigger inner element
   */
  get dialogTriggerButton(): any {
    if (this.dialogTrigger && this.dialogTrigger.shadowRoot) {
      return this.dialogTrigger.shadowRoot.querySelector('*');
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
   * 3. Set the width of the dialog container
   */
  async firstUpdated() {
    await this.updateComplete; /* 1 */
    this.setAria(); /* 2 */
    this.setWidth(); /* 3 */
  }

  /**
   * Updated lifecycle
   * 1. Update aria-expanded on the trigger based on if isActive
   * 2. Set the body overflow based on if the dialog is active
   */
  updated() {
    this.setAria(); /* 1 */
    this.setBodyOverflow(); /* 2 */
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
    if (this.dialogTrigger) {
      this.dialogTrigger.isExpanded = this.isActive || false;
    }
  }

  /**
   * Set the width
   * 1. Add a custom property to adjust the width of the dialog container
   */
  setWidth() {
    if (this.width) {
      this.style.setProperty('--sl-dialog-container-width', this.width.toString() + 'px');
    }
  }

  /**
   * Set body overflow
   * 1. If the dialog is active, prevent scrolling on the body
   * 2. If the dialog is inactive, allow scrolling on the body
   */
  setBodyOverflow() {
    const body = document.querySelector('body');
    if (this.isActive) {
      body.style.overflow = 'hidden'; /* 1 */
    } else {
      body.style.removeProperty('overflow'); /* 2 */
    }
  }

  /**
   * Handles the click event outside the component:
   * 1. Check if the dialog is active and disableClickOutside is not true
   * 2. Determine if the click occurred inside the active dialog container
   * 3. Check if the click occurred outside the active dialog
   * 4. Close the dialog if the click occurred outside it
   */
  handleOnClickOutside(e: MouseEvent) {
    /* 1 */
    if (this.isActive && !this.disableClickOutside) {
      const didClickInside = e.composedPath().includes(this.dialogContainer); /* 2 */
      /* 3 */
      if (!didClickInside) {
        /* 4 */
        this.close(e);
      }
    }
  }

  /**
   * Handle on keydown events
   * 1. If the dialog is open and escape is keyed, close the dialog and return focus to the trigger button
   */
  handleOnKeydown(e: KeyboardEvent) {
    /* 1 */
    if (this.isActive === true && e.code === 'Escape') {
      this.close(e);
    }
  }

  /**
   * Handle on click of close button
   * 1. Close the dialog
   * 2. Dispatch a custom event on click of close button
   */
  handleOnCloseButton(e: MouseEvent) {
    this.close(e); /* 2 */
    /* 3 */
    this.dispatch({
      eventName: 'onDialogCloseButton',
      detailObj: {
        active: this.isActive,
        item: this
      }
    });
  }

 /**
  * Open dialog
  * 1. Set isActive to true to show the dialog
  * 2. Store the dialog trigger on the component state, so that it can be focused later when the dialog is closed
  * 3. Dispatch a custom event on open
  */
 public open(e?: MouseEvent) {
  this.isActive = true; /* 1 */
  /* 2 */
  this.dialogTrigger = e?.target || this.slottedTrigger[0] || null;
  /* 3 */
  this.dispatch({
    eventName: 'onDialogOpen',
    detailObj: {
      active: this.isActive,
      item: this
    }
  });
}

  /**
   * Close dialog
   * 1. Set isActive to false to hide the dialog
   * 2. If the close event was a keyboard event, send focus to the trigger button
   * 3. Dispatch a custom event on close
   */
  public close(e?: MouseEvent | KeyboardEvent) {
    this.isActive = false; /* 1 */

    /* 2 */
    const isKeyboardEvent = e?.detail === 0; /* 1 */
    if (isKeyboardEvent) {
      this.sendFocusToTrigger();
    }
    /* 3 */
    this.dispatch({
      eventName: 'onDialogClose',
      detailObj: {
        active: this.isActive,
        item: this
      }
    });
  }

  /**
   * Send focus to the trigger button that opened the modal
   * 1. Get the trigger that is either an external or slotted element
   * 2. Allow a short timeout for the modal to close
   * 3. Focus the focusable element inside the trigger
   */
  sendFocusToTrigger() {
    if (this.dialogTriggerButton) { /* 1 */
      setTimeout(() => { /* 2 */
        this.dialogTriggerButton.focus(); /* 3 */
      }, 1);
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-dialog', {
      'sl-is-active': this.isActive === true
    });

    return html`
      <div class="${componentClassNames}" @keydown=${this.handleOnKeydown}>
        ${
          this.slotNotEmpty('trigger') &&
          html`
            <div class="sl-c-dialog__trigger" @click=${this.open}>
              <slot name="trigger"></slot>
            </div>
          `
        }
        <${this.focusTrapEl} .transitionDelay=${this.transitionDelay} ?isActive=${this.isActive}>
          <div
            class="sl-c-dialog__container"
            role="dialog"
            aria-labelledby=${this.ariaLabelledBy}
            aria-modal=${this.isActive ? false : true}
          >
            <div class="sl-c-dialog__header">
              ${
                (this.slotNotEmpty('header') || this.heading) &&
                html`
                  <div class="sl-c-dialog__title" id=${this.ariaLabelledBy}>
                    ${this.heading &&
                    html`
                    <${this.headingEl} tagName="h1">${this.heading}</${this.headingEl}>
                  `}
                    <slot name="header"></slot>
                  </div>
                `
              }
              <${this.buttonEl} class="sl-c-dialog__close-button" variant="tertiary" ?hideText=${true} @click=${this.handleOnCloseButton}>
                Close
                <${this.iconCloseEl} class="sl-c-dialog__icon-close" slot="after"></${this.iconCloseEl}>
              </${this.buttonEl}>
            </div>
            <div class="sl-c-dialog__body">
              <slot></slot>
            </div>
            ${
              this.slotNotEmpty('footer') &&
              html`
                <div class="sl-c-dialog__footer">
                  <slot name="footer"></slot>
                </div>
              `
            }
          </div>
        </${this.focusTrapEl}>
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).slAutoRegistry === true && customElements.get(SLDialog.el) === undefined) {
  customElements.define(SLDialog.el, SLDialog);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-dialog': SLDialog;
  }
}