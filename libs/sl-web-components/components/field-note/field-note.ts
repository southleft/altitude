import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { SLElement } from '../SLElement';
import styles from './field-note.scss';

/**
 * Component: sl-field-note
 * - Field note is used as helper text for any type of input field.
 * @slot - The components content
 */
export class SLFieldNote extends SLElement {
  static el = 'sl-field-note';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Error state
   * 1. Changes the component's treatment to represent an error state
   */
  @property({ type: Boolean })
  accessor isError: boolean;

  /**
   * Disabled attribute
   * 1. Changes the component's treatment to represent a disabled state
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  render() {
    const componentClassNames = this.componentClassNames('sl-c-field-note', {
      'sl-is-error': this.isError === true,
      'sl-is-disabled': this.isDisabled === true
    });

    return html`
      <div class="${componentClassNames}">
        <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLFieldNote.el) === undefined) {
  customElements.define(SLFieldNote.el, SLFieldNote);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-field-note': SLFieldNote;
  }
}
