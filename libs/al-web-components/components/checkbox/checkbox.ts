import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALFieldNote } from '../field-note/field-note';
import styles from './checkbox.scss';

/**
 * Component: al-checkbox
 * - **slot**: The component content that appears next to the checkbox
 * - **slot** "field-note": If content is slotted, it will display in place of the fieldNote property
 * - **slot** "error": If content is slotted, it will display in place of the errorNote property
 */
export class ALCheckbox extends ALElement {
  static el = 'al-checkbox';

  private elementMap = register({
    elements: [[ALFieldNote.el, ALFieldNote]],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private fieldNoteEl = unsafeStatic(this.elementMap.get(ALFieldNote.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Checked attribute
   * - Changes the component's treatment to represent an checked state
   */
  @property({ type: Boolean })
  accessor isChecked: boolean;

  /**
   * Indeterminate state
   * - Changes the component's treatment to represent an indeterminate state
   */
  @property({ type: Boolean })
  accessor isIndeterminate: boolean;

  /**
   * Error state
   * - Changes the component's treatment to represent an error state
   */
  @property({ type: Boolean })
  accessor isError: boolean;

  /**
   * Disabled attribute
   * - Changes the component's treatment to represent a disabled state
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  /**
   * Required attribute
   * - Sets the checkbox to be required for validation
   */
  @property({ type: Boolean })
  accessor isRequired: boolean;

  /**
   * Hide label?
   * - If true, hides the label from displaying
   */
  @property({ type: Boolean })
  accessor hideLabel: boolean;

  /**
   * Name attribute
   */
  @property()
  accessor name: string;

  /**
   * Value attribute
   */
  @property()
  accessor value: string;

  /**
   *  Error message
   * - An error field note that displays below the checkbox input
   */
  @property()
  accessor errorNote: string;

  /**
   * Field note
   * - The helper text that displays below the checkbox input
   */
  @property()
  accessor fieldNote: string;

  /**
   * Id attribute
   * - The ID used for A11y and to associate the label with the input
   */
  @property()
  accessor fieldId: string;

  /**
   * aria-describedby attribute
   * - Applied to the field note or error note for A11y
   */
  @property()
  accessor ariaDescribedBy: string;

  /**
   * Connected callback
   * - Dynamically sets the fieldId and ariaDescribedBy for A11y
   */
  connectedCallback() {
    super.connectedCallback();
    /* 1 */
    this.fieldId = this.fieldId || nanoid();
    if (this.fieldNote) {
      this.ariaDescribedBy = this.ariaDescribedBy || nanoid();
    }
  }

  /**
   * Handle on change events
   * 1. Toggle the checked state
   * 2. If isIndeterminate is true, then on change set it to false
   * 3. Dispatch the custom event
   */
  handleOnChange() {
    /* 1 */
    this.isChecked = !this.isChecked;
    /* 2 */
    if (this.isIndeterminate === true) {
      this.isIndeterminate = false;
    }
    /* 3 */
    this.dispatch({
      eventName: 'onCheckboxChange',
      detailObj: {
        checked: this.isChecked,
        indeterminate: this.isIndeterminate,
        value: this.value
      }
    });
  }

  /**
   * Handle on keydown events
   * 1. If the Enter key is pressed, then check the checkbox and dispatch the custom event
   */
  handleOnKeydown(e: KeyboardEvent) {
    if (e.code === 'Enter') {
      this.handleOnChange();
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-checkbox', {
      'al-is-indeterminate': this.isIndeterminate === true,
      'al-is-error': this.isError === true,
      'al-is-disabled': this.isDisabled === true,
      'al-has-hidden-label': this.hideLabel
    });

    return html`
      <div class="${componentClassNames}">
        <div class="al-c-checkbox__container">
          <div class="al-c-checkbox__checkbox">
            <input
              class="al-c-checkbox__input"
              type="checkbox"
              id="${this.fieldId}"
              name="${this.name}"
              .value="${this.value}"
              .checked="${this.isChecked}"
              ?disabled="${this.isDisabled}"
              ?required=${this.isRequired}
              @change=${this.handleOnChange}
              @keydown=${this.handleOnKeydown}
              aria-describedby="${ifDefined(this.ariaDescribedBy)}"
              tabindex="0"
            />
            <span class="al-c-checkbox__custom-check"></span>
            <span class="al-c-checkbox__ripple"></span>
          </div>
          <label class="al-c-checkbox__label" for="${this.fieldId}">
            <slot></slot>
          </label>
        </div>
        ${this.fieldNote || this.slotNotEmpty('field-note')
          ? html`
              <slot name="field-note">
                <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} id=${ifDefined(this.ariaDescribedBy)}> ${this.fieldNote} </${this.fieldNoteEl}>
              </slot>
            `
          : html``}
        ${(this.errorNote || this.slotNotEmpty('error')) && this.isError
          ? html`
              <slot name="error">
                <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} ?isError=${true}> ${this.errorNote} </${this.fieldNoteEl}>
              </slot>
            `
          : html``}
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALCheckbox.el) === undefined) {
  customElements.define(ALCheckbox.el, ALCheckbox);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-checkbox': ALCheckbox;
  }
}
