import { html } from 'lit';
import { property, queryAssignedElements } from 'lit/decorators.js';
import { SLElement } from '../SLElement';
import getFocusableElements from '../../directives/getFocusableElements';

/**
 * Component: sl-focus-trap
 * @slot - The content to trap in the focus trap
 */
export class SLFocusTrap extends SLElement {
  static el = 'sl-focus-trap';

  @property()
  accessor isActive: boolean;

  @property()
  accessor delay: number = 0;

  @property()
  accessor firstFocusableEl: HTMLElement;

  @property()
  accessor lastFocusableEl: HTMLElement;

  @queryAssignedElements()
  accessor slottedContent: Array<HTMLElement>;

  constructor() {
    super();

    this.trapFocusEnd = this.trapFocusEnd.bind(this);
    this.trapFocusStart = this.trapFocusStart.bind(this);
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('isActive')) {
      if (this.isActive === true) {
        setTimeout(() => this.applyFocusTrap(), this.delay);
      } else if (this.isActive === false) {
        this.removeFocusTrap();
      }
    }
  }

  trapFocusEnd(evt: KeyboardEvent) {
    if (evt.code === 'Tab' && !evt.shiftKey) {
      this.firstFocusableEl.focus();
      evt.preventDefault();
    }
  }

  trapFocusStart(evt: KeyboardEvent) {
    if (evt.code === 'Tab' && evt.shiftKey) {
      this.lastFocusableEl.focus();
      evt.preventDefault();
    }
  }

  applyFocusTrap() {
    const focusableElements = getFocusableElements(this.slottedContent[0]);
    this.firstFocusableEl = focusableElements[0];
    this.lastFocusableEl = focusableElements[focusableElements.length - 1];
    
    this.firstFocusableEl.focus();
    
    this.lastFocusableEl.addEventListener('keydown', this.trapFocusEnd);
    this.firstFocusableEl.addEventListener('keydown', this.trapFocusStart);
  }

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

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLFocusTrap.el) === undefined) {
  customElements.define(SLFocusTrap.el, SLFocusTrap);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-focus-trap': SLFocusTrap;
  }
}