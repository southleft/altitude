import { TemplateResult, unsafeCSS } from 'lit';
import { property, queryAssignedNodes } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALCheckbox } from '../checkbox/checkbox';
import { ALFieldNote } from '../field-note/field-note';
import styles from './checkbox-group.scss';

/**
 * Component: al-checkbox-group
 * - **slot**: The component content, a set of checkbox items
 * - **slot** "field-note": If content is slotted, it will display in place of the fieldNote property
 * - **slot** "error": If content is slotted, it will display in place of the errorNote property
 */
export class ALCheckboxGroup extends ALElement {
  static el = 'al-checkbox-group';

  private elementMap = register({
    elements: [[ALFieldNote.el, ALFieldNote]],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private fieldNoteEl = unsafeStatic(this.elementMap.get(ALFieldNote.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

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
   * Hide legend?
   * - If true, hides the legend from displaying
   */
  @property({ type: Boolean })
  accessor hideLegend: boolean;

  /**
   * Label
   * - Displays inside the legend
   */
  @property()
  accessor label: string;

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
   * Variant
   * - **default** Displays the checkbox items in a column
   * - **horizontal** Displays the checkbox items in a row
   */
  @property()
  accessor variant: 'horizontal';

  /**
   * Query all the checkbox's
   */
  @queryAssignedNodes({ flatten: true })
  private accessor checkboxItems: Array<ALCheckbox>;

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
   * First updated lifecycle
   * 1. If isRequired is true, set isRequired on all the checkbox items
   * 2. If isDisabled is true, set isDisabled on all the checkbox items
   */
  firstUpdated() {
    this.checkboxItems.forEach((checkboxItems) => {
      /* 1 */
      if (this.isRequired) {
        checkboxItems.isRequired = this.isRequired;
      }
      /* 2 */
      if (this.isDisabled) {
        checkboxItems.isDisabled = this.isDisabled;
      }
    });
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-checkbox-group', {
      'al-is-error': this.isError === true,
      'al-is-disabled': this.isDisabled === true,
      'al-has-hidden-legend': this.hideLegend,
      'al-c-checkbox-group--horizontal': this.variant === 'horizontal'
    });

    return html`
      <fieldset class="${componentClassNames}">
        ${this.label && html` <legend class="al-c-checkbox-group__legend" aria-describedby="${this.ariaDescribedBy}">${this.label}</legend> `}
        <div class="al-c-checkbox-group__list">
          <slot></slot>
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
      </fieldset>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALCheckboxGroup.el) === undefined) {
  customElements.define(ALCheckboxGroup.el, ALCheckboxGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-checkbox-group': ALCheckboxGroup;
  }
}
