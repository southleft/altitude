import { TemplateResult, unsafeCSS } from 'lit';
import { property, queryAssignedNodes } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLFieldNote } from '../field-note/field-note';
import { SLRadioItem } from '../radio-item/radio-item';
import styles from './radio.scss';

/**
 * Component: sl-radio
 * - Radio buttons let people select one option from a set of options. The “Radio” component should never be used on its own and designers should instead reference the “Radio Group” component.
 * @slot - The component content
 * @slot "field-note" - If content is slotted, it will display in place of the fieldNote property
 * @slot "error" - If content is slotted, it will display in place of the errorNote property
 */
export class SLRadio extends SLElement {
  static el = 'sl-radio';

  private elementMap = register({
    elements: [[SLFieldNote.el, SLFieldNote]],
    suffix: (globalThis as any).enAutoRegistry === true ? '' : PackageJson.version
  });

  private fieldNoteEl = unsafeStatic(this.elementMap.get(SLFieldNote.el));

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
   * - Sets the radio to be required for validation
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
   * Variant
   * - **default** Displays the radio items in a column
   * - **horizontal** Displays the radio items in a row
   */
  @property()
  accessor variant: 'horizontal';

  /**
   * Query all the radio-item's
   */
  @queryAssignedNodes({ flatten: true })
  private accessor radioItems: Array<SLRadioItem>;

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
   * 1. If isRequired is true, set isRequired on all the radio items
   * 2. If isDisabled is true, set isDisabled on all the radio items
   */
  firstUpdated() {
    this.radioItems.forEach((radioItems) => {
      /* 1 */
      if (this.isRequired) {
        radioItems.isRequired = this.isRequired;
      }
      /* 2 */
      if (this.isDisabled) {
        radioItems.isDisabled = this.isDisabled;
      }
    });
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-radio', {
      'sl-is-error': this.isError === true,
      'sl-is-disabled': this.isDisabled === true,
      'sl-has-hidden-legend': this.hideLegend,
      'sl-c-radio--horizontal': this.variant === 'horizontal'
    });

    return html`
      <fieldset class="${componentClassNames}">
        ${this.label && html` <legend class="sl-c-radio__legend" aria-describedby="${this.ariaDescribedBy}">${this.label}</legend> `}
        <div class="sl-c-radio__list">
          <slot></slot>
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
      </fieldset>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLRadio.el) === undefined) {
  customElements.define(SLRadio.el, SLRadio);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-radio': SLRadio;
  }
}
