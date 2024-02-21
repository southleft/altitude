import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './field-note.scss';

/**
 * Component: al-field-note
 *
 * Field note is used as helper text for any type of input field.
 * - **slot**: The field note content
 */
export class ALFieldNote extends ALElement {
  static el = 'al-field-note';

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
    const componentClassNames = this.componentClassNames('al-c-field-note', {
      'al-is-error': this.isError === true,
      'al-is-disabled': this.isDisabled === true
    });

    return html`
      <div class="${componentClassNames}">
        <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALFieldNote.el) === undefined) {
  customElements.define(ALFieldNote.el, ALFieldNote);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-field-note': ALFieldNote;
  }
}
