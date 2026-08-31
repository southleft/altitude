import { html } from 'lit';
import { property, queryAssignedElements } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import getFocusableElements from '../../directives/getFocusableElements';

/**
 * Component: al-focus-trap
 * @slot - The content to trap in the focus trap
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

    this.handleOnKeydown = this.handleOnKeydown.bind(this);
  }

  /**
   * One keydown listener on the trap itself, for the trap's whole lifetime.
   *
   * The previous implementation snapshotted the first and last focusable
   * elements when the trap opened and hung a `keydown` listener on each of
   * them. That snapshot went stale the moment the trapped content changed —
   * an error message appearing, a disabled button enabling, a list filtering
   * down — and focus then escaped past a boundary that no longer existed.
   * `keydown` is `composed`, so one listener here sees Tab from anywhere
   * inside, including nested shadow roots.
   */
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this.handleOnKeydown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.handleOnKeydown);
  }

  /**
   * The deepest active element, following shadow roots.
   */
  private getActiveElement(): HTMLElement | null {
    let active = (this.getRootNode() as Document | ShadowRoot).activeElement as HTMLElement | null;
    while (active?.shadowRoot?.activeElement) {
      active = active.shadowRoot.activeElement as HTMLElement;
    }
    return active;
  }

  /**
   * Wrap Tab / Shift+Tab at the live edges of the trap.
   * 1. Recompute the focusable set on *every* Tab, so it is never stale
   * 2. Keep the public first/last properties in sync for consumers
   * 3. Wrap when focus is at (or has somehow left) an edge
   */
  handleOnKeydown(evt: KeyboardEvent) {
    if (!this.isActive || evt.code !== 'Tab' || !this.slottedContent?.length) {
      return;
    }

    const focusableElements = getFocusableElements(this.slottedContent[0]); /* 1 */
    if (!focusableElements.length) {
      evt.preventDefault();
      return;
    }

    /* 2 */
    this.firstFocusableEl = focusableElements[0];
    this.lastFocusableEl = focusableElements[focusableElements.length - 1];

    /* 3 */
    const active = this.getActiveElement();
    const index = active ? focusableElements.indexOf(active) : -1;

    if (evt.shiftKey && (index <= 0)) {
      this.lastFocusableEl.focus();
      evt.preventDefault();
    } else if (!evt.shiftKey && (index === -1 || index === focusableElements.length - 1)) {
      this.firstFocusableEl.focus();
      evt.preventDefault();
    }
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
   * Place initial focus when the trap opens.
   * 1. Query all focusable elements within the focus trap, including those nested within the shadow DOM.
   * 2. If there are no focusable elements, make the slotted content itself focusable and use it.
   * 3. Record the current edges (Tab recomputes them; these are for consumers).
   * 4. Prefer the selected item, then the first focusable element.
   * 5. Send focus to the initial focus element.
   */
  applyFocusTrap() {
    if (!this.slottedContent?.length) {
      return;
    }

    const focusableElements = getFocusableElements(this.slottedContent[0]); /* 1 */

    /* 2 */
    if (!focusableElements.length) {
      this.slottedContent[0].setAttribute('tabindex', '-1');

      this.initialFocusEl = this.slottedContent[0];
      this.firstFocusableEl = this.slottedContent[0];
      this.lastFocusableEl = this.slottedContent[0];
    } else {
      /* 3 */
      this.firstFocusableEl = focusableElements[0];
      this.lastFocusableEl = focusableElements[focusableElements.length - 1];

      /* 4 — `.al-is-selected` is looked up here rather than being treated as a
         focusable selector: it marks the item that should *receive* focus, and
         the elements that carry it are already focusable in their own right. */
      const selectedItem = focusableElements.find((item) => item.classList.contains('al-is-selected'));
      this.initialFocusEl = selectedItem || this.firstFocusableEl;
    }

    this.initialFocusEl.focus(); /* 5 */
  }

  /**
   * Release the trap.
   * - The keydown listener lives on this element for its whole lifetime, so
   *   there is nothing to detach; `isActive` gates it.
   */
  removeFocusTrap() {
    this.firstFocusableEl = undefined;
    this.lastFocusableEl = undefined;
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