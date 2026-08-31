import { TemplateResult, unsafeCSS } from 'lit';
import { property, state, queryAssignedElements } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALLayout } from '../layout/layout';
import { ALFieldNote } from '../field-note/field-note';
import { ALRadio } from '../radio/radio';
import styles from './radio-group.scss';

/**
 * Component: al-radio-group
 * @slot - The radio content, a set of radio items. Items stack in a column
 *         by default; for a row, nest them in `<al-layout direction="row" wrap>`.
 * @slot field-note - If content is slotted, it will display in place of the fieldNote property
 * @slot error - If content is slotted, it will display in place of the errorNote property
 *
 * @event onRadioGroupChange - Fired when the group's selection changes. Detail: `{ checked, name, value }` — taken from the newly checked radio.
 */
export class ALRadioGroup extends ALElement {
  static el = 'al-radio-group';

  private elementMap = register({
    elements: [
      [ALFieldNote.el, ALFieldNote],
      [ALRadio.el, ALRadio],
      [ALLayout.el, ALLayout]
    ],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private fieldNoteEl = unsafeStatic(this.elementMap.get(ALFieldNote.el));

  private layoutEl = unsafeStatic(this.elementMap.get(ALLayout.el));

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
   * Direction
   * - **column** (default) stacks the radios
   * - **row** lays them out inline, wrapping when they run out of room
   *
   * This does NOT re-introduce a hand-rolled arrangement prop. The group
   * already renders an `<al-layout>` around its slotted items; this
   * parameterises THAT layout rather than styling the items here, so
   * `<al-layout>` remains the single arrangement primitive. The row form is
   * a documented variant of the group in the design library (Radio Group
   * example, "Horizontal" column), which is why it earns a prop instead of
   * being left to each consumer to compose.
   */
  @property()
  accessor direction: 'row' | 'column';

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
   * The currently checked radio in the radio group
   */
  @state()
  accessor checkedItem: ALRadio;

  /**
   * Query all the radio's
   */
  @queryAssignedElements({ flatten: true, slot: '' })
  private accessor radioItems: Array<ALRadio>;

  /**
   * Initialize functions
   */
  constructor() {
    super();
    /**
     * Observe changes to the selected state of radio items and update the radio
     */
    this.addEventListener('onRadioChange', (e: CustomEvent) => this.handleOnRadioChange(e.target as ALRadio));
  }

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

  /**
   * When a new item is checked:
   * 1. Set the previously checked item's isChecked state to false
   * 2. Store the newly checked item on the radio's state
   */
  handleOnRadioChange(item: ALRadio) {
    if (this.checkedItem) {
      this.checkedItem.isChecked = false; /* 1 */
    }
    this.checkedItem = item; /* 2 */
  }

  /**
   * Set the checked radio to the previous or next radio based on the 'isPrevious' flag
   * @param checkedItem - The currently active radio
   * @param isPrevious - A flag indicating whether to select the previous radio (true) or the next radio (false)
   * @fires radioChange - Emits a 'radioChange' event with information about the newly selected radio
   * 1. Get the index of the currently active radio
   * 2. Calculate the total number of radio's in the list
   * 3. Deactivate the currently active radio
   * 4. Calculate the index of the new radio based on the 'isPrevious' flag
   * 5. Handle boundary conditions by looping to the other end if necessary
   * 6. Find the next valid radio that is not disabled
   * 7. Handle boundary conditions again if necessary
   * 8. Set the newly selected radio as the active one
   * 9. Emit a 'radioChange' event to indicate the change in the selected radio
   */
  setCheckedAdjacentItem(checkedItem: ALRadio, isPrevious: boolean) {
    const activeIndex = this.radioItems.indexOf(checkedItem); /* 1 */
    const radioListLength = this.radioItems.length - 1; /* 2 */
    this.handleOnRadioChange(checkedItem);
    let newIndex = isPrevious ? activeIndex - 1 : activeIndex + 1; /* 4 */
    /* 5 */
    if (newIndex < 0) {
      newIndex = radioListLength;
    } else if (newIndex > radioListLength) {
      newIndex = 0;
    }
    /*
     * 6. Bounded, because the unbounded form hung the browser.
     *
     * This walked until it found an enabled item, which never terminates when
     * EVERY item is disabled — an arrow key on such a group span-locked the tab.
     * The wrap in step 7 is what makes it infinite rather than merely wrong:
     * the index keeps cycling instead of running off the end.
     *
     * One full pass is enough to prove there is nothing to land on. The
     * `<= radioListLength` bound (not `<`) matches step 5's wrap, which treats
     * `radioListLength` as a valid index rather than the length.
     */
    let stepsRemaining = radioListLength + 1;
    while (this.radioItems[newIndex].isDisabled && stepsRemaining > 0) {
      newIndex = isPrevious ? newIndex - 1 : newIndex + 1;
      stepsRemaining -= 1;
      /* 7 */
      if (newIndex < 0) {
        newIndex = radioListLength;
      } else if (newIndex > radioListLength) {
        newIndex = 0;
      }
    }
    /*
     * Every item disabled: there is no legal target, so leave selection and
     * focus exactly where they are. Returning beats landing on a disabled item
     * — step 8 would set `isChecked` on it and then call `.focus()` on a
     * `:not(:disabled)` selector that matches nothing, throwing on null.
     */
    if (this.radioItems[newIndex].isDisabled) return;
    /* 8 */
    this.checkedItem = this.radioItems[newIndex];
    this.checkedItem.isChecked = true;
    if (this.checkedItem) {
      this.checkedItem.shadowRoot?.querySelector<HTMLInputElement>('.al-c-radio__input:not(:disabled)').focus();
    }
    /* 9 */
    this.dispatch({
      eventName: 'onRadioGroupChange',
      detailObj: {
        checked: this.checkedItem.isChecked,
        name: this.checkedItem.name,
        value: this.checkedItem.value
      }
    });
  }

  /**
   * Handle on keydown events
   * 1. Check if a radio is already checked, else use the target
   * 2. If the enter key is pressed, then check the radio and dispatch the custom event
   * 3. If arrow left or arrow up is pressed, set previous radio as checked
   * 4. If arrow right or arrow down is pressed, set next radio as checked
   */
  handleOnKeydown(e: KeyboardEvent) {
    /* 1 */
    let target;
    if (this.checkedItem) {
      target = this.checkedItem;
    } else {
      target = e.target;
    }
    if (e.code === 'Enter') {
      this.handleOnRadioChange(target as ALRadio); /* 2 */
    } else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
      this.setCheckedAdjacentItem(target as ALRadio, true); /* 3 */
    } else if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
      this.setCheckedAdjacentItem(target as ALRadio, false); /* 4 */
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-radio-group', {
      'al-is-error': this.isError === true,
      'al-is-disabled': this.isDisabled === true,
      'al-has-hidden-legend': this.hideLegend
    });

    return html`
      <fieldset class="${componentClassNames}" @keydown=${this.handleOnKeydown}>
        ${this.label && html` <legend class="al-c-radio-group__legend" aria-describedby="${this.ariaDescribedBy}">${this.label}</legend> `}
        <${this.layoutEl}
          direction=${ifDefined(this.direction)}
          gap=${this.direction === 'row' ? 'md' : 'none'}
          ?wrap=${this.direction === 'row'}
        >
          <slot></slot>
        </${this.layoutEl}>
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

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALRadioGroup.el) === undefined) {
  customElements.define(ALRadioGroup.el, ALRadioGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-radio-group': ALRadioGroup;
  }
}
