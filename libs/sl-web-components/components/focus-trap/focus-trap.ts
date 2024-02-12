import { html } from 'lit';
import { property, queryAssignedElements } from 'lit/decorators.js';
import { SLElement } from '../SLElement';
import getFocusableElements from '../../directives/getFocusableElements';

/**
 * Component: sl-focus-trap
 * 
 * Focus Trap is used as a wrapper around dialogs, popovers, and other overlays to trap focus within them, enabling accessible keyboard navigation.
 * 
 * - **slot**: The content to trap in the focus trap
 */
export class SLFocusTrap extends SLElement {
  static el = 'sl-focus-trap';

  /**
   * Is the focus trap active?
   */
  @property()
  accessor isActive: boolean;

  /**
   * Delay in milliseconds before the focus trap is activated. 
   * - Can be set by the component using focus trap, when there is a css transition that needs to complete before the focus trap activates.
   */
  @property()
  accessor delay: number = 0;

  /**
   * First element that can recieve focus in the focus trap (e.g. button, input, a, etc.).
   */
  @property()
  accessor firstFocusableEl: HTMLElement;

  /**
   * Last element that can recieve focus in the focus trap (e.g. button, input, a, etc.).
   */
  @property()
  accessor lastFocusableEl: HTMLElement;

  /**
   * Slotted elements contain the component that will be included in the focus trap.
   */
  @queryAssignedElements()
  accessor slottedContent: Array<HTMLElement>;

  constructor() {
    super();

    this.trapFocusEnd = this.trapFocusEnd.bind(this);
    this.trapFocusStart = this.trapFocusStart.bind(this);
  }

  /**
   * Updated lifecycle
   * 1. Listen for changes to the isActive property
   * 2. If the focus trap is active, apply the focus trap
   * 3. If the focus trap is inactive, remove the focus trap
   */
  updated(changedProperties: Map<string, unknown>) {
    /* 1 */
    if (changedProperties.has('isActive')) { 
      /* 2 */
      if (this.isActive === true) {
        setTimeout(() => this.applyFocusTrap(), this.delay);
      /* 3 */
      } else if (this.isActive === false) {
        this.removeFocusTrap();
      }
    }
  }

  /**
   * Trap focus at the end of the focus trap
   * - Applied to the keydown listener on the last focusable element in the focus trap.
   * - When the user presses "Tab", send focus to the first element in the focus trap.
   */
  trapFocusEnd(evt: KeyboardEvent) {
    if (evt.code === 'Tab' && !evt.shiftKey) {
      this.firstFocusableEl.focus();
      evt.preventDefault();
    }
  }

  /**
   * Trap focus at the beginning of the focus trap
   * - Applied to the keydown listener on the first focusable element in the focus trap.
   * - When the user presses "Tab + Shift", send focus to the last element in the focus trap.
   */
  trapFocusStart(evt: KeyboardEvent) {
    if (evt.code === 'Tab' && evt.shiftKey) {
      this.lastFocusableEl.focus();
      evt.preventDefault();
    }
  }

  /**
   * Apply the focus trap
   * 1. Query all focusable elements within the focus trap, including those nested within the shadow DOM.
   * 2. Store the first and last focusable element on the focus trap state.
   * 3. Send focus to the first focusable element.
   * 4. Apply keydown listeners to the first and last focusable elements to enable the focus trap functionality.
   */
  applyFocusTrap() {
    const focusableElements = getFocusableElements(this.slottedContent[0]); /* 1 */
    /* 2 */
    this.firstFocusableEl = focusableElements[0];
    this.lastFocusableEl = focusableElements[focusableElements.length - 1];
    /* 3 */
    this.firstFocusableEl.focus();
    /* 4 */
    this.lastFocusableEl.addEventListener('keydown', this.trapFocusEnd);
    this.firstFocusableEl.addEventListener('keydown', this.trapFocusStart);
  }

  /**
   * Remove the focus trap
   * - Remove the keydown listeners on the first and last focusable elements.
   */
  removeFocusTrap() {
    this.firstFocusableEl?.removeEventListener('keydown', this.trapFocusStart);
    this.lastFocusableEl?.removeEventListener('keydown', this.trapFocusEnd);
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-focus-trap', { });

    return html`
      <div class="${componentClassNames}">
	      <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).slAutoRegistry === true && customElements.get(SLFocusTrap.el) === undefined) {
  customElements.define(SLFocusTrap.el, SLFocusTrap);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-focus-trap': SLFocusTrap;
  }
}