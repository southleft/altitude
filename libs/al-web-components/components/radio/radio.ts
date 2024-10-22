import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALFieldNote } from '../field-note/field-note';
import styles from './radio.scss';

/**
 * Component: al-radio
 * - **slot**: The component content that appears next to the radio
 * - **slot** "field-note": If content is slotted, it will display in place of the fieldNote property
 * - **slot** "error": If content is slotted, it will display in place of the errorNote property
 */
export class ALRadio extends ALElement {
  static el = 'al-radio';

  private elementMap = register({
    elements: [
      [ALFieldNote.el, ALFieldNote]
    ],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private fieldNoteEl = unsafeStatic(this.elementMap.get(ALFieldNote.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Checked attribute
   */
  @property({ type: Boolean })
  accessor isChecked: boolean;

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
   * - Sets the radio to be required for validation
   */
  @property({ type: Boolean })
  accessor isRequired: boolean;

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
   * Hide label?
   * - If true, hides the label from displaying
   */
  @property({ type: Boolean })
  accessor hideLabel: boolean;

  /**
   *  Error message
   * - An error field note that displays below the radio input
   */
  @property()
  accessor errorNote: string;

  /**
   * Field note
   * - The helper text that displays below the radio input
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
   * 1. Dynamically sets the fieldId and ariaDescribedBy for A11y
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
   * Toggle checked
   * 1. Set the checked state
   * 2. Dispatch the custom event
   */
  toggleChecked() {
    this.isChecked = true; /* 1 */
    /* 2 */
    this.dispatch({
      eventName: 'onRadioChange',
      detailObj: {
        checked: this.isChecked,
        name: this.name,
        value: this.value
      }
    });
  }

  /**
   * Handle on change of the radio item
   * - Check the item
   */
  handleOnChange() {
    this.toggleChecked();
  }

  /**
   * Handle on keydown of the radio item
   * - Check the item
   */
  handleOnKeydown(e: KeyboardEvent) {
    if (!this.isChecked && e.code === 'Enter') {
      this.toggleChecked();
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-radio', {
      'al-is-error': this.isError === true,
      'al-is-disabled': this.isDisabled === true,
      'al-has-hidden-label': this.hideLabel
    });

    return html`
      <div class="${componentClassNames}">
        <div class="al-c-radio__container">
          <div class="al-c-radio__radio">
            <input
              class="al-c-radio__input"
              type="radio"
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
            <span class="al-c-radio__custom-radio"></span>
            <span class="al-c-radio__ripple"></span>
          </div>
          <label class="al-c-radio__label" for="${this.fieldId}">
            <slot></slot>
          </label>
        </div>
        ${(this.fieldNote || this.slotNotEmpty('field-note')) &&
        html`
          <slot name="field-note">
            <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} id=${ifDefined(this.ariaDescribedBy)}> ${this.fieldNote} </${this.fieldNoteEl}>
          </slot>
        `}
        ${(this.errorNote || this.slotNotEmpty('error')) &&
        html`
          <slot name="error">
            <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} ?isError=${true}> ${this.errorNote} </${this.fieldNoteEl}>
          </slot>
        `}
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALRadio.el) === undefined) {
  customElements.define(ALRadio.el, ALRadio);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-radio': ALRadio;
  }
}
