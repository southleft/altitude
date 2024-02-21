import { html } from 'lit';
import { property, queryAssignedElements } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import getFocusableElements from '../../directives/getFocusableElements';

/**
 * Component: al-focus-trap
 * - **slot**: The content to trap in the focus trap
 */
export class ALFocusTrap extends ALElement {
  static el = 'al-focus-trap';

  /**
   * Is the focus trap active?
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * Delay in milliseconds before the focus trap is activated.
   * - Can be set by the component using focus trap, when there is a css transition that needs to complete before the focus trap activates.
   */
  @property({ type: Number })
  accessor transitionDelay: number = 0;

  /**
   * First element that can recieve focus in the focus trap (e.g. button, input, a, etc.).
   */
  @property({ attribute: false})
  accessor firstFocusableEl: HTMLElement;

  /**
   * Last element that can recieve focus in the focus trap (e.g. button, input, a, etc.).
   */
  @property({ attribute: false})
  accessor lastFocusableEl: HTMLElement;

  /**
   * Element to recieve intitla focus when the focus trap is opened
   */
  @property({ attribute: false})
  accessor initialFocusEl: HTMLElement;

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
        setTimeout(() => this.applyFocusTrap(), this.transitionDelay);
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
   * 2. If there are no focusable elements, set the sloted content as the initial focus. and first and last focusable, element.
   * 3. Store the first and last focusable elements on state.
   * 4. Set the initial focus element as either the selected item, or the first focusable element.
   * 5. Send focus to the initial focus element.
   * 6. Apply keydown listeners to the first and last focusable elements to enable the focus trap functionality.
   */
  applyFocusTrap() {
    const focusableElements = getFocusableElements(this.slottedContent[0]); /* 1 */

    /* 2 */
    if (!focusableElements.length) {
      this.slottedContent[0].setAttribute("tabindex", "-1");

      this.initialFocusEl = this.slottedContent[0];
      this.firstFocusableEl = this.slottedContent[0];
      this.lastFocusableEl = this.slottedContent[0];
    }
    else {
      /* 3 */
      this.firstFocusableEl = focusableElements[0];
      this.lastFocusableEl = focusableElements[focusableElements.length - 1];

      const selectedItem = focusableElements.find(item => item.classList.contains('al-is-selected'));
      this.initialFocusEl = selectedItem || this.firstFocusableEl; /* 4 */
    }

    this.initialFocusEl.focus(); /* 5 */

    /* 6 */
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
    const componentClassNames = this.componentClassNames('al-c-focus-trap', { });

    return html`
      <div class="${componentClassNames}">
	      <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALFocusTrap.el) === undefined) {
  customElements.define(ALFocusTrap.el, ALFocusTrap);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-focus-trap': ALFocusTrap;
  }
}