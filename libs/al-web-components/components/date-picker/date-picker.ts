import { TemplateResult, unsafeCSS } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALCalendar } from '../calendar/calendar';
import { ALFieldNote } from '../field-note/field-note';
import { ALIconCalendar } from '../icon/icons/calendar';
import { ALIconChevronDown } from '../icon/icons/chevron-down';
import { ALInput } from '../input/input';
import styles from './date-picker.scss';

/**
 * Component: al-date-picker
 * - **slot** "field-note": If content is slotted, it will display in place of the fieldNote property
 * - **slot** "error": If content is slotted, it will display in place of the errorNote property
 */
export class ALDatePicker extends ALElement {
  static el = 'al-date-picker';

  private elementMap = register({
    elements: [
      [ALInput.el, ALInput],
      [ALFieldNote.el, ALFieldNote],
      [ALCalendar.el, ALCalendar],
      [ALIconCalendar.el, ALIconCalendar],
      [ALIconChevronDown.el, ALIconChevronDown]
    ],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private inputEl = unsafeStatic(this.elementMap.get(ALInput.el));
  private fieldNoteEl = unsafeStatic(this.elementMap.get(ALFieldNote.el));
  private calendarEl = unsafeStatic(this.elementMap.get(ALCalendar.el));
  private iconCalendarEl = unsafeStatic(this.elementMap.get(ALIconCalendar.el));
  private iconChevronDownEl = unsafeStatic(this.elementMap.get(ALIconChevronDown.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * The unique id of the field
   */
  @property()
  accessor fieldId: string;

  /**
   * The field's label
   */
  @property()
  accessor label: string = 'Date and Time';

  /**
   * Hide label?
   */
  @property({ type: Boolean })
  accessor hideLabel: boolean;

  /**
   * The field's name attribute
   */
  @property()
  accessor name: string;

  /**
   * The field's value attribute
   */
  @property()
  accessor value: string;

  /**
   * Placeholder attribute
   * - Specifies a short hint that describes the expected value of an <input> element
   */
  @property()
  accessor placeholder: string;

  /**
   * The field note displayed beneath the field
   */
  @property()
  accessor fieldNote: string;

  /**
   * Error note displayed beneath the field when in an error state
   */
  @property()
  accessor errorNote: string;

  /**
   * Aria describedby
   * - Used to connect the field note in the field to the input for accessibility
   */
  @property()
  accessor ariaDescribedBy: string;

  /**
   * The field's required attribute
   */
  @property({ type: Boolean })
  accessor isRequired: boolean;

  /**
   * Optional state
   * - Specifies that a field is optional and adds the text 'optional' to the label
   */
  @property({ type: Boolean })
  accessor isOptional: boolean;

  /**
   * The field's disabled attribute
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  /**
   * Error state indicating an issue with the field
   */
  @property({ type: Boolean })
  accessor isError: boolean;

  /**
   * Indicates whether a date has been selected
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * Tracks the display state of the date picker
   */
  @state()
  accessor isActiveCalendar: boolean;

  /**
   * Holds the selected date value
   */
  @property()
  accessor selectedDate: any;

  /**
   * Set a specific date to be active
   */
  @property()
  accessor setActiveDate: any;

  /**
   * The field's raw date value
   */
  @state()
  accessor rawDateValue: any;

  /**
   * Saved input date value in date format
   */
  @state()
  accessor originalRawValue: any;

  /**
   * Saved input date & time value
   */
  @state()
  accessor originalValue: any;

  /**
   * ISO Format for date
   */
  @property()
  accessor isoFormat: string = 'yyyy-MM-dd';

  /**
   * Specify date format for UI display
   */
  @property()
  accessor dateFormat: 'MMM dd, yyyy' | 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'yyyy/MM/dd' | 'MMM dd yyyy' | 'dd MMM yyyy' = 'MMM dd, yyyy';

  /**
   * Minimum date for disabled dates (format: yyyy/mm/dd)
   */
  @property()
  accessor disabledMinDate: any;

  /**
   * Maximum date for disabled dates (format: yyyy/mm/dd)
   */
  @property()
  accessor disabledMaxDate: any;

  /**
   * Amount of years to go before and after the current date
   */
  @property({ type: Number })
  accessor multiYear: number = 3;

  /**
   * Previous month button text
   */
  @property()
  accessor previousButtonText: string = 'Previous Month';

  /**
   * Next month button text
   */
  @property()
  accessor nextButtonText: string = 'Next Month';

  /**
   * Show the day of the week as a short hand, e.g. "M" for Monday
   */
  @property({ type: Boolean })
  accessor isDayShortHand: boolean;

  /**
   * Start the day of the week on Monday
   */
  @property({ type: Boolean })
  accessor startOnMonday: boolean;

  /**
   * Query the popup
   */
  @query('.al-c-date-picker__popup')
  accessor popup: HTMLElement;

  /**
   * Query the input
   */
  @query('.al-c-date-picker__input')
  accessor input: ALInput;

  /**
   * Initializations
   * 1. Binds the 'handleOnClickOutside' method to the component instance
   */
  constructor() {
    super();
    this.handleOnClickOutside = this.handleOnClickOutside.bind(this); /* 1 */
  }

  /**
   * Connected callback
   * 1. Attaches a mousedown event listener for handling clicks outside the component
   * 2. Dynamically sets 'fieldId' and 'ariaDescribedBy' attributes for Accessibility
   */
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('mousedown', this.handleOnClickOutside, false); /* 1 */
    /* 2 */
    this.fieldId = this.fieldId || nanoid();
    if (this.fieldNote) {
      this.ariaDescribedBy = this.ariaDescribedBy || nanoid();
    }
  }

  /**
   * Disconnected callback
   * 1. Removes event listeners for handling clicks outside
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    /* 1 */
    document.removeEventListener('mousedown', this.handleOnClickOutside, false);
  }

  /**
   * Toggle active calendar
   * 1. Checks if the component is disabled; if not, toggles the calendar's display
   * 2. Toggles the calendar display
   * 3. Sets dynamic position for the calendar
   * 4. Dispatches custom events 'open' or 'close' based on the calendar state
   */
  toggleActiveCalendar() {
    /* 1 */
    if (!this.isDisabled) {
      this.isActiveCalendar = !this.isActiveCalendar; /* 2 */
      this.setDynamicPosition(); /* 3 */
    }

    /* 4 */
    if (this.isActiveCalendar) {
      this.dispatch({
        eventName: 'onDatePickerOpen',
        detailObj: {
          activeCalendar: this.isActiveCalendar
        }
      });
    } else {
      this.dispatch({
        eventName: 'onDatePickerClose',
        detailObj: {
          activeCalendar: this.isActiveCalendar
        }
      });
    }
  }

  /**
   * Handle on input keydown
   * 1. Toggles the calendar open/close if 'Enter' or 'Spacebar' is pressed
   */
  handleOnKeydown(e: KeyboardEvent) {
    /* 1 */
    if (e.code === 'Enter' || e.code === 'Space') {
      this.toggleActiveCalendar();
    }
  }

  /**
   * Handles the click event outside the component:
   * 1. Check if the calendar is active
   * 2. Determine if the click occurred inside the active field
   * 3. Check if the click occurred outside the active field
   * 4. Close the calendar if the click occurred outside it
   */
  handleOnClickOutside(e: MouseEvent) {
    /* 1 */
    if (this.isActiveCalendar) {
      const didClickInside = e.composedPath().includes(this.shadowRoot.host); /* 2 */
      /* 3 */
      if (!didClickInside) {
        /* 4 */
        this.toggleActiveCalendar();
      }
    }
  }

  /**
   * Handle dynamic placement for calendar popup
   * 1. Sets timeout for dynamic positioning of the calendar
   * 2. Adjusts the calendar position based on window and body dimensions
   * 3. Opens the calendar at the top if it's too close to the bottom
   */
  setDynamicPosition() {
    /* 1 */
    setTimeout(() => {
      if (this.popup) {
        /* 2 */
        this.popup.classList.remove('al-c-date-picker__popup--top');
        const body = this.closest('#root-inner') || document.querySelector('body');
        const bodyRect = body.getBoundingClientRect();
        const calendarPopup = this.popup.getBoundingClientRect();

        /* 3 */
        if (bodyRect.height > calendarPopup.height && calendarPopup.bottom > bodyRect.height) {
          this.popup.classList.add('al-c-date-picker__popup--top');
        }
      }
    }, 1);
  }

  /**
   * Handle on change of the date
   * 1. Updates 'selectedDate' and 'rawDateValue' based on the event detail
   * 2. Updates 'value' based on the selected date and time (if available)
   * 3. Sets 'value' to the selected date if no time is selected
   * 4. Sets 'isActive' to true
   * 5. Dispatches a 'dateChanged' event with the updated value
   */
  handleOnChangeDate(e: CustomEvent) {
    this.selectedDate = e.detail.value; /* 1 */
    this.rawDateValue = e.detail.rawDate; /* 2 */
    this.value = this.selectedDate; /* 3 */
    this.isActive = true; /* 4 */
    /* 5 */
    this.dispatch({
      eventName: 'onDatePickerChange',
      detailObj: {
        value: this.value
      }
    });
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-date-picker', {
      'al-has-hidden-label': this.hideLabel,
      'al-is-disabled': this.isDisabled,
      'al-is-required': this.isRequired,
      'al-is-error': this.isError,
      'al-is-active-calendar': this.isActiveCalendar,
      'al-is-active': this.isActive
    });

    return html`
      <div class="${componentClassNames}">
        <div class="al-c-date-picker__body">
          <${this.inputEl}
            class="al-c-date-picker__input"
            label="${this.label}"
            id="${this.fieldId}"
            name="${ifDefined(this.name)}"
            value="${ifDefined(this.value)}"
            ?hideLabel="${this.hideLabel}"
            ?isReadonly=${true}
            ?isRequired="${this.isRequired}"
            ?isOptional="${this.isOptional}"
            ?isDisabled="${this.isDisabled}"
            ?isError="${this.isError}"
            aria-describedby="${ifDefined(this.ariaDescribedBy)}"
            placeholder="${ifDefined(this.placeholder)}"
            @click=${this.toggleActiveCalendar}
            @keydown=${this.handleOnKeydown}
            ref="inputField"
            ?isActive="${this.isActive}"
          >
            <${this.iconCalendarEl} slot="before"></${this.iconCalendarEl}>
            <${this.iconChevronDownEl} size="lg" slot="after" class="al-c-date-picker__icon-arrow"></${this.iconChevronDownEl}>
          </${this.inputEl}>
          <div class="al-c-date-picker__popup" ?hidden="${!this.isActiveCalendar}" role="dialog">
            <div class="al-c-date-picker__popup-body">
              <${this.calendarEl}
                class="al-c-date-picker__calendar"
                @onCalendarChange=${this.handleOnChangeDate}
                .setActiveDate=${this.setActiveDate}
                .disabledMinDate=${this.disabledMinDate}
                .disabledMaxDate=${this.disabledMaxDate}
                .multiYear=${this.multiYear}
                .previousButtonText=${this.previousButtonText}
                .nextButtonText=${this.nextButtonText}
                .dateFormat=${this.dateFormat}
                ?isDayShortHand=${this.isDayShortHand}
                ?startOnMonday=${this.startOnMonday}
              ></${this.calendarEl}>
            </div>
          </div>
        </div>
        ${
          this.fieldNote || this.slotNotEmpty('field-note')
            ? html`
          <slot name="field-note">
            <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} id=${ifDefined(this.ariaDescribedBy)}>${this.fieldNote}</${this.fieldNoteEl}>
          </slot>
        `
            : html``
        }
        ${
          (this.errorNote || this.slotNotEmpty('error')) && this.isError
            ? html`
          <slot name="error">
            <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} ?isError=${true}>${this.errorNote}</${this.fieldNoteEl}>
          </slot>
        `
            : html``
        }
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALDatePicker.el) === undefined) {
  customElements.define(ALDatePicker.el, ALDatePicker);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-date-picker': ALDatePicker;
  }
}
