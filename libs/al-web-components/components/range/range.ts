import { TemplateResult, unsafeCSS } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALFieldNote } from '../field-note/field-note';
import styles from './range.scss';
const LOWER_RANGE = 'LOWERRANGE';
const UPPER_RANGE = 'UPPERRANGE';

/**
 * Component: al-range
 *
 * Range provides a visual indication of adjustable content, where the user can increment or decrement the value by moving the handle along a track, or via text input.
 * - **slot** "label": If content is slotted, it will override the default range label
 * - **slot** "before": If content is slotted, it will override the default range "min" label text
 * - **slot** "after": If content is slotted, it will override the default range "max" label text
 */
export class ALRange extends ALElement {
  static el = 'al-range';

  private elementMap = register({
    elements: [[ALFieldNote.el, ALFieldNote]],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private fieldNoteEl = unsafeStatic(this.elementMap.get(ALFieldNote.el));

  // Holds the reference for clearing the timeout
  private clearSetTimeout: ReturnType<typeof setTimeout>;
  private canAllowDispatch = false;

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Hide label?
   * - If true, hides the label from displaying
   */
  @property({ type: Boolean })
  accessor hideLabel: boolean;

  /**
   * Error state
   */
  @property({ type: Boolean })
  accessor isError: boolean;

  /**
   * Disabled attribute
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  /**
   * Handle label unit attribute
   */
  @property({ type: String })
  accessor handleLabelUnit: string;

  /**
   * Min property for range
   */
  @property({ type: Number })
  accessor min = 0;

  /**
   * Minselected property for range
   */
  @property({ type: Number })
  accessor minSelected: number;

  /**
   * Max property for range
   */
  @property({ type: Number })
  accessor max = 100;

  /**
   * Maxselected property for range
   */
  @property({ type: Number })
  accessor maxSelected: number;

  /**
   * Step for range
   */
  @property({ type: Number })
  accessor step = 1;

  /**
   * Shows input value
   */
  @property({ type: Boolean })
  accessor hasOutput: boolean;

  /**
   * Input value
   */
  @property({ type: Number })
  accessor value: number;

  /**
   * Input value for lower range of range
   */
  @property({ type: Number })
  accessor lowerRangeValue: number;

  /**
   * Input value for upper range of range
   */
  @property({ type: Number })
  accessor upperRangeValue: number;

  /**
   * Slide Label
   */
  @property()
  accessor label: string;

  /**
   * Field note text
   */
  @property()
  accessor fieldNote: string;

  /**
   * Error note text
   */
  @property()
  accessor errorNote: string;

  /**
   * Aria described by
   * - Used to connect the field note in select to the select menu for accessibility
   */
  @property()
  accessor ariaDescribedBy: string;

  /**
   * The unique id of the field
   */
  @property()
  accessor fieldId: string;

  /**
   * Displays value label above range
   */
  @property({ type: Boolean })
  accessor hasTooltip: boolean;

  /**
   * Behavior property for slide
   */
  @property()
  accessor behavior: 'range';

  /**
   * Queries the default range
   */
  @query('.al-c-range__input')
  accessor defaultRange: HTMLInputElement;

  /**
   * Queries the lower range/lower input of range
   */
  @query('.al-c-range__input-one')
  accessor lowerRange: HTMLInputElement;

  /**
   * Queries the upper range/upper input of range
   */
  @query('.al-c-range__input-two')
  accessor upperRange: HTMLInputElement;

  /**
   * Queries the container for the label of the lower range in the range
   */
  @query('.al-c-range__input-one-label-container')
  accessor lowerRangeLabelContainer: HTMLElement;

  /**
   * Queries the container for the label of the upper range in the range
   */
  @query('.al-c-range__input-two-label-container')
  accessor upperRangeLabelContainer: HTMLElement;

  /**
   * Queries the element for the range color in the range
   */
  @query('.al-c-range__input-color')
  accessor rangeColor: HTMLElement;

  /**
   * Queries the wrapper for the tooltip associated with the range
   */
  @query('.al-c-range__tooltip-wrapper')
  accessor defaultLabelWrapper: HTMLElement;

  /**
   * Represents the result as a string
   */
  @state()
  accessor result: string;

  /**
   * Represents the output value as a number
   */
  @state()
  accessor outputValue: number;

  /**
   * Represents the output value of the lower range as a number for a range
   */
  @state()
  accessor outputValueLowerRange: number;

  /**
   * Represents the output value of the upper range as a number for a range
   */
  @state()
  accessor outputValueUpperRange: number;

  constructor() {
    super();
    this.updateValue = this.updateValue.bind(this);
    this.syncOutFieldToRangeField = this.syncOutFieldToRangeField.bind(this);
    this.syncOutFieldToLowerRange = this.syncOutFieldToLowerRange.bind(this);
    this.syncOutFieldToUpperRange = this.syncOutFieldToUpperRange.bind(this);
    this.upperRangeOnInput = this.upperRangeOnInput.bind(this);
    this.lowerRangeOnInput = this.lowerRangeOnInput.bind(this);
    this.toggleZIndexonLowerRange = this.toggleZIndexonLowerRange.bind(this);
    this.toggleZIndexonLowerRange = this.toggleZIndexonUppserRange.bind(this);
  }

  firstUpdated() {
    if (this.behavior !== 'range') {
      if (this.value === undefined) {
        this.value = this.min;
      }
      this.outputValue = this.value;
      this.setPercentageLabel(); /* 1 */
    } else {
      this.outputValueLowerRange = this.minSelected ? this.minSelected : this.min;
      this.outputValueUpperRange = this.maxSelected ? this.maxSelected : this.max;
      this.lowerRangeValue = this.minSelected ? this.minSelected : this.min;
      this.upperRangeValue = this.maxSelected ? this.maxSelected : this.max;
      this.handleRangeRange(this.lowerRangeValue, this.minSelected, LOWER_RANGE);
      this.handleRangeRange(this.upperRangeValue, this.maxSelected, UPPER_RANGE);
      this.doubleRange();
    }
  }

  /**
   * function to sets the background style of default ranges when it is dragged
   */
  generateLinearGradient(value1: number, value2: number) {
    return `linear-gradient(var(--rtlGradientToRight, to right), var(--al-theme-color-background-accent-default) 0%, var(--al-theme-color-background-accent-default)
    ${value1}%, var(--al-theme-color-background-default-strong)
    ${value2}%, var(--al-theme-color-background-default-strong) 100%)`;
  }

  /**
   *
   * called when range-range is used. This function sets the position of  min and maxselected and
     handles styling for labels.
   */
  handleRangeRange(value: number, min_max_selected: number, rangeType: string) {
    let val = value; /* 2 */
    /**
   *
   * if minselected and maxselected values lies within the range of range, then assign the corresponding
    values to the values of range-range.
    If it does not lie within the range, then leave the range values to the min and max values itself.
   */
    if (min_max_selected && min_max_selected >= this.min && min_max_selected <= this.max) {
      if (rangeType === LOWER_RANGE) {
        this.lowerRangeValue = min_max_selected;
      } else {
        this.upperRangeValue = min_max_selected;
      }
      val = min_max_selected;
    } else {
      if (rangeType === LOWER_RANGE) {
        this.lowerRangeValue = this.min;
      } else {
        this.upperRangeValue = this.max;
      }
    }
    const percentage = this.calculatePercentage(val);

    if (rangeType === LOWER_RANGE) {
      // @ts-ignore
      this.lowerRangeLabelContainer.style.insetInlineStart = `calc(${percentage + 0.3}% + (${10 - percentage * 0.2}px))`; /* 6 */
    } else {
      // @ts-ignore
      this.upperRangeLabelContainer.style.insetInlineStart = `calc(${percentage - 0.3}% + (${10 - percentage * 0.2}px))`; /* 6 */
    }
  }

  /**
   * function to set the position of labels when they become equal and handle z-index when they become equal.
   */
  checkEquality(rangeType: string) {
    const lowerVal = this.lowerRangeValue;
    const upperVal: number = this.upperRangeValue;

    if (lowerVal === upperVal) {
      if (rangeType === UPPER_RANGE && !this.upperRange.classList.contains('al-c-range__input-upper-active-thumb')) {
        const percentage = this.calculatePercentage(this.upperRangeValue);
        this.upperRange.classList.add('al-c-range__input-upper-active-thumb');
        // @ts-ignore
        this.upperRangeLabelContainer.style.insetInlineStart = `calc(${percentage + 0.3}% + (${10 - percentage * 0.2}px))`;
      } else if (rangeType === LOWER_RANGE && !this.lowerRange.classList.contains('al-c-range__input-lower-active-thumb')) {
        const percentage = this.calculatePercentage(this.lowerRangeValue);
        this.lowerRange.classList.add('al-c-range__input-lower-active-thumb');
        // @ts-ignore
        this.lowerRangeLabelContainer.style.insetInlineStart = `calc(${percentage - 0.3}% + (${10 - percentage * 0.2}px))`; /* 6 */
      }
    } else if (lowerVal !== upperVal) {
      if (rangeType === UPPER_RANGE && this.upperRange.classList.contains('al-c-range__input-upper-active-thumb')) {
        this.upperRange.classList.remove('al-c-range__input-upper-active-thumb');
      } else if (rangeType === LOWER_RANGE && this.lowerRange.classList.contains('al-c-range__input-lower-active-thumb')) {
        this.lowerRange.classList.remove('al-c-range__input-lower-active-thumb');
      }
    }
  }

  /**
   * called when upper range  oninput event occurs
   * i.e when the element gets user input
   */
  upperRangeOnInput(e: Event) {
    this.upperRangeLabelContainer.style.zIndex = 'var(--al-z-index-300)';
    this.upperRangeValue = Number((e.target as HTMLInputElement).value !== '' ? (e.target as HTMLInputElement).value : '0');
    const percentage = this.calculatePercentage(+this.upperRangeValue);
    this.setUpperPercentageRangeLabel(percentage);
    this.checkEquality(UPPER_RANGE);

    this.outputValueUpperRange = this.upperRangeValue;

    if (this.canAllowDispatch) {
      this.emitSlideEvent({
        minValue: this.lowerRangeValue,
        maxValue: this.upperRangeValue,
        minSelected: this.minSelected,
        maxSelected: this.maxSelected
      });
    }
  }

  /**
   * sets the position of upper range label corresponding to value and add style to ranges correspondingly.
   */
  setUpperPercentageRangeLabel(newVal: number) {
    const upperVal = this.upperRangeValue;
    const lowerVal = this.lowerRangeValue;

    if (upperVal < lowerVal) {
      this.upperRangeValue = lowerVal; //Here we are resetting upper range to minimum/equal value
      this.canAllowDispatch = false;

      // TODO: explore fix for larger than 3 digits
    } else if (lowerVal !== upperVal) {
      // @ts-ignore
      this.upperRangeLabelContainer.style.insetInlineStart = `calc(${newVal - 0.3}% + (${10 - newVal * 0.2}px))`; /* 6 */
      this.canAllowDispatch = true;
    }
    if (this.rangeColor) {
      // @ts-ignore
      const upperInitialValue = this.upperRange.max;

      this.rangeColor.style.marginInlineEnd =
        ((+upperInitialValue - this.upperRangeValue) / (+this.upperRange.max - +this.lowerRange.min)) * 100 + '%'; /* 5 */
      this.rangeColor.style.width =
        ((this.upperRangeValue - this.lowerRangeValue) / (+this.upperRange.max - +this.lowerRange.min)) * 100 + '%'; /* 5 */
    }
  }

  /**
   * sets the position of lower range label corresponding to value and add style to ranges correspondingly.
   */
  setLowerPercentageRangeLabel(newVal: number) {
    const upperVal = this.upperRangeValue;
    const lowerVal = this.lowerRangeValue;
    if (lowerVal > upperVal) {
      this.lowerRangeValue = upperVal; //Here we are resetting lower range to maximum/equal value
      this.canAllowDispatch = false;
    } else if (lowerVal !== upperVal) {
      // @ts-ignore
      this.lowerRangeLabelContainer.style.insetInlineStart = `calc(${newVal + 0.3}% + (${10 - newVal * 0.2}px))`; /* 6 */
      this.canAllowDispatch = true;
    }
    if (this.rangeColor) {
      // @ts-ignore
      const lowerInitialValue = this.lowerRange.min;

      this.rangeColor.style.marginInlineStart =
        ((this.lowerRangeValue - +lowerInitialValue) / (+this.upperRange.max - +this.lowerRange.min)) * 100 + '%'; /* 5 */
      this.rangeColor.style.width =
        ((this.upperRangeValue - this.lowerRangeValue) / (+this.upperRange.max - +this.lowerRange.min)) * 100 + '%'; /* 5 */
    }
  }

  /**
   * called when user drags the lower range of range (the left-side range)
   */
  lowerRangeOnInput(evt: Event) {
    this.lowerRangeLabelContainer.style.zIndex = 'var(--al-z-index-300)';
    this.lowerRangeValue = Number((evt.target as HTMLInputElement).value !== '' ? (evt.target as HTMLInputElement).value : '0');

    const lowerVal = this.lowerRangeValue;

    const percentage = this.calculatePercentage(lowerVal);
    this.setLowerPercentageRangeLabel(percentage);
    this.checkEquality(LOWER_RANGE);
    this.outputValueLowerRange = this.lowerRangeValue;
    if (this.canAllowDispatch) {
      this.emitSlideEvent({
        minValue: this.lowerRangeValue,
        maxValue: this.upperRangeValue,
        minSelected: this.minSelected,
        maxSelected: this.maxSelected
      });
    }
  }

  /**
   * function that dispatch event for ranges
   */
  emitSlideEvent(detailObj: { minValue?: number; maxValue?: number; minSelected?: number; maxSelected?: number; value?: number }) {
    if (this.clearSetTimeout) {
      clearTimeout(this.clearSetTimeout);
    }
    this.clearSetTimeout = setTimeout(() => {
      clearTimeout(this.clearSetTimeout);
      this.dispatch({
        eventName: 'onRangeDrag',
        detailObj
      });
    }, 300);
  }

  /**
   * Set the default / on load configuration for range-ranges
   */

  emitOutputFieldEvent(value: number) {
    this.dispatch({ eventName: 'onRangeOutputValueChange', detailObj: { value } });
  }

  async doubleRange() {
    const lowerRange: HTMLInputElement = this.lowerRange; /* 1 */
    const upperRange: HTMLInputElement = this.upperRange; /* 1 */
    if (this.minSelected && this.maxSelected) {
      const upperInitialValue = upperRange.max;
      const lowerInitialValue = lowerRange.min;
      this.rangeColor.style.marginInlineEnd =
        ((+upperInitialValue - this.upperRangeValue) / (+upperRange.max - +lowerRange.min)) * 100 + '%'; /* 5 */
      this.rangeColor.style.width = ((this.upperRangeValue - this.lowerRangeValue) / (+upperRange.max - +lowerRange.min)) * 100 + '%'; /* 5 */
      this.rangeColor.style.marginInlineStart =
        ((this.lowerRangeValue - +lowerInitialValue) / (+upperRange.max - +lowerRange.min)) * 100 + '%'; /* 5 */
    }
  }

  /**
   * called when mouseup event happens for lower range.
   * set the lower range label back to its original z-index and removes the z-index of lower-range
   */
  toggleZIndexonLowerRange() {
    if (!(this.upperRangeValue - this.lowerRangeValue <= 3)) {
      this.lowerRangeLabelContainer.style.zIndex = `var(--al-z-index-300)`;
    }
    if (this.upperRangeValue !== this.lowerRangeValue) {
      if (this.lowerRange.classList.contains('al-c-range__input-lower-active-thumb')) {
        this.lowerRange.classList.remove('al-c-range__input-lower-active-thumb');
      }
    }
  }

  /**
   * called when mouseup event happens for upper range.
   * set the upper range label back to its original z-index and removes the z-index of upper-range
   */
  toggleZIndexonUppserRange() {
    if (!(this.upperRangeValue - this.lowerRangeValue <= 2)) {
      this.upperRangeLabelContainer.style.zIndex = `var(--al-z-index-300)`;
    }
    if (this.upperRangeValue !== this.lowerRangeValue) {
      if (this.upperRange.classList.contains('al-c-range__input-upper-active-thumb')) {
        this.upperRange.classList.remove('al-c-range__input-upper-active-thumb');
      }
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.fieldId = this.fieldId || nanoid();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  /**
   * Set the value
   */
  set Value(value: number) {
    const oldValue = this.value;

    this.value = value;
    this.requestUpdate('value', oldValue);
  }

  /**
   * Get the value
   */
  get Value() {
    return this.value;
  }

  /**
   * called when default range becomed active i.e when user drags the range.
   */
  handleDefaulRangeChange(e: Event) {
    this.value = Number((e.target as HTMLInputElement).value !== '' ? (e.target as HTMLInputElement).value : '0');
    this.outputValue = this.value;
    this.updateValue();
  }

  /**
   * calculates percentage and update the value of range label ,sets its position and dispatch the value
   */
  updateValue() {
    const percentage = this.calculatePercentage(this.value);
    this.setPercentageLabel();
    this.defaultRange.style.background = this.generateLinearGradient(percentage, percentage);
    this.emitSlideEvent({ value: this.value });
  }

  /**
   * called when user sets the position of range using input-field. when the value is lesser than min , rest the value to min..and when it is greater than max, reset it to max
   */
  checkValue() {
    if (this.outputValue < this.min) {
      this.value = this.min;
    } else if (this.outputValue > this.max) {
      this.value = this.max;
    } else {
      if (this.step > 1) {
        this.calculateValueOnStep();
      } else {
        this.value = this.outputValue;
      }
    }
  }

  /**
   * function to update the range value when step value greater than one is given
   */
  calculateValueOnStep() {
    let currValue = this.min + this.step;
    let prevValue = this.min;
    while (this.outputValue > currValue) {
      prevValue = currValue;
      currValue = prevValue + this.step;
    }

    if (this.outputValue - prevValue < currValue - this.outputValue || this.outputValue - prevValue === currValue - this.outputValue) {
      this.value = prevValue;
    } else if (this.outputValue === 0) {
      this.value = this.min;
    } else {
      this.value = currValue;
    }
  }

  /**
   * update default range based on user-input from its corresponding input-field
   */
  syncOutFieldToRangeField(e: Event) {
    this.outputValue = +((e.target as HTMLInputElement).value !== '' ? (e.target as HTMLInputElement).value : '0');
    this.emitOutputFieldEvent(this.outputValue);
    this.checkValue();
    this.updateValue();
  }

  /**
   * update lower range (left-side-range) based on user-input from its corresponding input-field
   */
  syncOutFieldToLowerRange(e: Event) {
    if ((e.target as HTMLInputElement).value === '' || +(e.target as HTMLInputElement).value < this.min) {
      this.lowerRangeValue = this.min;
    } else if (+(e.target as HTMLInputElement).value > this.upperRangeValue || +(e.target as HTMLInputElement).value > this.max) {
      this.outputValueLowerRange = this.upperRangeValue;
      this.lowerRangeValue = this.upperRangeValue;
    } else {
      this.lowerRangeValue = +(e.target as HTMLInputElement).value;
    }
    const percentage = this.calculatePercentage(this.lowerRangeValue);
    this.setLowerPercentageRangeLabel(percentage);
    this.checkEquality(LOWER_RANGE);
    if (this.canAllowDispatch) {
      this.emitSlideEvent({
        minValue: this.lowerRangeValue,
        maxValue: this.upperRangeValue,
        minSelected: this.minSelected,
        maxSelected: this.maxSelected
      });
    }
    this.emitOutputFieldEvent(+(e.target as HTMLInputElement).value);
  }

  /**
   * update upper range (right-side-range) based on user-input from its corresponding input-field
   */
  syncOutFieldToUpperRange(e: Event) {
    if ((e.target as HTMLInputElement).value === '' || +(e.target as HTMLInputElement).value > this.max) {
      this.upperRangeValue = this.max;
    } else if (+(e.target as HTMLInputElement).value < this.lowerRangeValue || +(e.target as HTMLInputElement).value < this.min) {
      this.outputValueUpperRange = this.lowerRangeValue;
      this.upperRangeValue = this.lowerRangeValue;
    } else {
      this.upperRangeValue = +(e.target as HTMLInputElement).value;
    }
    const percentage = this.calculatePercentage(this.upperRangeValue);
    this.setUpperPercentageRangeLabel(percentage);
    this.checkEquality(UPPER_RANGE);
    if (this.canAllowDispatch) {
      this.emitSlideEvent({
        minValue: this.lowerRangeValue,
        maxValue: this.upperRangeValue,
        minSelected: this.minSelected,
        maxSelected: this.maxSelected
      });
    }
    this.emitOutputFieldEvent(+(e.target as HTMLInputElement).value);
  }

  /**
   * Dynamic styling on range as a percentage. sets the label value and sets the position of label
   */
  setPercentageLabel() {
    const percentage = this.calculatePercentage(this.value);
    if (this.defaultRange) this.defaultRange.style.background = this.generateLinearGradient(percentage, percentage);
    if (this.handleLabelUnit !== undefined) {
      this.result = this.value + this.handleLabelUnit;
    } else {
      this.result = `${this.value}`;
    }
    if (this.defaultLabelWrapper) {
      // @ts-ignore
      this.defaultLabelWrapper.style.insetInlineStart = `calc(${percentage + 0.3}% + (${10 - percentage * 0.24}px))`;
    }
  }

  /**
   * returns the percentage value.
   */
  calculatePercentage(value: number) {
    return ((value - this.min) * 100) / (this.max - this.min);
  }

  /**
   * returns the code of range
   */
  renderRangeRange() {
    return html`
      ${this.label || this.slotNotEmpty('label') ? html`<slot name="label"><label class="al-c-range__label">${this.label}</label></slot>` : html``}
      <div class="al-c-range__input-container">
        <slot name="before"> <span class="al-c-range-prefix-text">${this.min}</span></slot>
        <div class="al-c-range__input">
          <input
            class="al-c-range__input-one al-c-range__input-input"
            type="range"
            min=${ifDefined(this.min)}
            max=${ifDefined(this.max)}
            @input=${this.lowerRangeOnInput}
            .value=${live(`${this.lowerRangeValue}`)}
            step=${ifDefined(this.step)}
            aria-label="lowerRange"
            ?disabled="${this.isDisabled}"
            @mouseup=${this.toggleZIndexonLowerRange}
          />
          <span class="al-c-range__input-color"></span>
          <input
            class="al-c-range__input-two al-c-range__input-input"
            type="range"
            min=${ifDefined(this.min)}
            max=${ifDefined(this.max)}
            @input=${(e: Event) => this.upperRangeOnInput(e)}
            .value=${live(`${this.upperRangeValue}`)}
            step=${ifDefined(this.step)}
            ?disabled="${this.isDisabled}"
            aria-label="upperRange"
            @mouseup=${this.toggleZIndexonUppserRange}
          />
          <div>
            <span class="al-c-range__input-one-label-container"><span class="al-c-range__input-one-label"> ${this.lowerRangeValue} </span></span>
            <span class="al-c-range__input-two-label-container"><span class="al-c-range__input-two-label"> ${this.upperRangeValue}</span></span>
          </div>
        </div>
        <slot name="after"> <span class="al-c-range-suffix-text">${this.max}</span></slot>
        ${this.hasOutput
          ? html`
              <div>
                <input
                  type="number"
                  min=${ifDefined(this.min)}
                  max=${ifDefined(this.max)}
                  step=${ifDefined(this.step)}
                  .value=${this.outputValueLowerRange}
                  class="al-c-range__output-range-one"
                  @input=${this.syncOutFieldToLowerRange}
                  ?disabled="${this.isDisabled}"
                />
                <div class="al-c-range__output-range-one-text">Min</div>
              </div>
            `
          : ''}
        ${this.hasOutput
          ? html`
              <div>
                <input
                  type="number"
                  min=${ifDefined(this.min)}
                  max=${ifDefined(this.max)}
                  step=${ifDefined(this.step)}
                  .value=${this.outputValueUpperRange}
                  class="al-c-range__output-range-two"
                  @input=${this.syncOutFieldToUpperRange}
                  ?disabled="${this.isDisabled}"
                />
                <div class="al-c-range__output-range-two-text">Max</div>
              </div>
            `
          : ''}
      </div>
      ${this.fieldNote || this.slotNotEmpty('field-note')
        ? html`
            <slot name="field-note">
              <${this.fieldNoteEl} id=${ifDefined(this.ariaDescribedBy)}> ${this.fieldNote} </${this.fieldNoteEl}>
            </slot>
          `
        : html``}
      ${this.errorNote || this.slotNotEmpty('error')
        ? html`
            <slot name="error">
              <${this.fieldNoteEl} id=${ifDefined(this.ariaDescribedBy)} ?isError=${true}> ${this.errorNote} </${this.fieldNoteEl}>
            </slot>
          `
        : html``}
    `;
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-range', {
      'al-c-range--range': this.behavior === 'range',
      'al-has-output': this.hasOutput,
      'al-is-disabled': this.isDisabled,
      'al-is-error': this.isError,
      'al-has-hidden-label': this.hideLabel,
      'al-has-tooltip': this.hasTooltip
    });

    return html`
      <div class="${componentClassNames}">
        ${this.behavior === 'range'
          ? this.renderRangeRange()
          : html`
              ${this.label || this.slotNotEmpty('label')
                ? html`<slot name="label"><label class="al-c-range__label">${this.label}</label></slot>`
                : html``}
              <div class="al-c-range__output-container">
                <slot name="before"><span class="al-c-range-prefix-text">${this.min}</span></slot>
                <div class="al-c-range__tooltip-container">
                  ${this.hasTooltip
                    ? html` <span class="al-c-range__tooltip-wrapper"><output class="al-c-range__tooltip"> ${this.result} </output></span> `
                    : ''}
                  <input
                    ?disabled="${this.isDisabled}"
                    class="al-c-range__input"
                    type="range"
                    min=${ifDefined(this.min)}
                    max=${ifDefined(this.max)}
                    step=${ifDefined(this.step)}
                    .value=${live(`${this.value}`)}
                    @input=${(e: Event) => this.handleDefaulRangeChange(e)}
                    @change=${(e: Event) => this.handleDefaulRangeChange(e)}
                    id="${this.fieldId}"
                    role="range"
                    aria-label="range"
                    name="range"
                  />
                </div>
                <slot name="after"><span class="al-c-range-suffix-text">${this.max}</span></slot>
                ${this.hasOutput
                  ? html`
                      <input
                        min=${ifDefined(this.min)}
                        max=${ifDefined(this.max)}
                        type="number"
                        @input=${this.syncOutFieldToRangeField}
                        step=${ifDefined(this.step)}
                        .value=${this.outputValue}
                        class="al-c-range__output"
                        ?disabled="${this.isDisabled}"
                      />
                    `
                  : ''}
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
            `}
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALRange.el) === undefined) {
  customElements.define(ALRange.el, ALRange);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-range': ALRange;
  }
}
