import {
  addMinutes,
  endOfToday,
  format,
  isAfter,
  isBefore,
  isEqual,
  isSameHour,
  isSameMinute,
  setHours,
  setMilliseconds,
  setMinutes,
  setSeconds,
  startOfToday,
  subMinutes
} from 'date-fns';
import { html, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { SLElement } from '../SLElement';
import styles from './time-selector-list.scss';

/**
 * Component: sl-time-selector-list
 * @slot - The components content
 */
export class SLTimeSelectorList extends SLElement {
  static el = 'sl-time-selector-list';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Determines the orientation of the time selector ('horizontal' renders items in a row).
   */
  @property()
  accessor orientation: 'horizontal';

  /**
   * Sets a specific time to be active (24-hour format, e.g., activeTime="16:00" for 4 PM).
   */
  @property()
  accessor activeTime: string;

  /**
   * Container for the current times within the month.
   */
  @property({ type: Array })
  accessor times: { value: Date; available: boolean }[] = [];

  /**
   * Increments in minutes for the time display.
   */
  @property({ type: Number })
  accessor timeIncrements: number = 30;

  /**
   * The minimum time displayed between times (24-hour format, e.g., timeStart=${16} for 4 PM).
   */
  @property({ type: Number })
  accessor timeStart: number;

  /**
   * The maximum time displayed between times (24-hour format, e.g., timeEnd=${16} for 4 PM).
   */
  @property({ type: Number })
  accessor timeEnd: number;

  /**
   * The minimum time to disable for time display (24-hour format, e.g., disabledMinTime="16:00" for 4 PM).
   */
  @property()
  accessor disabledMinTime: string;

  /**
   * The maximum time to disable for time display (24-hour format, e.g., disabledMaxTime="16:00" for 4 PM).
   */
  @property()
  accessor disabledMaxTime: string;

  /**
   * Sets the active time selector to an inactive state.
   */
  @property({ type: Boolean })
  accessor resetTime: boolean;

  /**
   * Determines whether to use a 24-hour time format.
   */
  @property({ type: Boolean })
  accessor is24HourFormat: boolean;

  /**
   * Specifies the date format for UI display (e.g., 'h:mm a').
   */
  @property()
  accessor timeFormat: string = 'h:mm a';

  /**
   * The label for the time selector heading.
   */
  @property()
  accessor timeSelectorLabel: string = 'Time';

  /**
   * The currently selected time.
   */
  @state()
  accessor selectedTime: Date;

  /**
   * Initializations
   */
  constructor() {
    super();
    this.setTimes = this.setTimes.bind(this);
    this.handleOnChange = this.handleOnChange.bind(this);
    this.handleOnClick = this.handleOnClick.bind(this);
  }

  /**
   * First updated lifecycle
   * - Initializes the component and updates the time format if set to 24-hour format.
   * 1. Initialize times for the selector list
   * 2. Check if a 24-hour time format is set
   */
  firstUpdated() {
    /* 1 */
    this.setTimes();

    /* 2 */
    if (this.is24HourFormat) {
      this.timeFormat = 'kk:mm';
    }
  }

  /**
   * Handle on change event when a time is selected.
   * - Emits a 'change' event with the selected time value.
   * 1. Dispatches a 'change' event containing the selected time value in the specified time format.
   * 2. Returns the formatted selected time value.
   */
  handleOnChange() {
    /* 1 */
    this.dispatch({ eventName: 'onTimeSelectorListChange', detailObj: { value: format(this.selectedTime, this.timeFormat) } });
    /* 2 */
    return format(this.selectedTime, this.timeFormat);
  }

  /**
   * Create times for the time selector list based on specified constraints.
   * 1. Initialize an empty array to store all display times for the month.
   * 2. Iterate through all times starting from the beginning of today until the end of today.
   * 3. If start and end times are set, only consider times within that range.
   * 4. Check if the current time falls within the specified time range and constraints.
   * 5. Push the time object into the 'times' array if it meets the criteria.
   * 6. Increment the time by the specified increments and continue looping until the end of today.
   */
  setTimes() {
    /* 1 */
    this.times = [];
    let todayStart = startOfToday();
    const todayEnd = endOfToday();

    /* 2 */
    while (todayStart <= todayEnd) {
      const time: { value: Date; available: boolean } = {
        value: new Date(),
        available: true
      };
      time.value = todayStart;
      time.available = true;

      /* 3 */
      if (this.timeStart && this.timeEnd) {
        const start = subMinutes(setHours(new Date(), this.timeStart), this.timeIncrements);
        const end = setHours(new Date(), this.timeEnd);

        /* 4 */
        if ((isAfter(todayStart, start) || isEqual(todayStart, start)) && isBefore(todayStart, end)) {
          this.times.push(time);
        }
      } else {
        this.times.push(time); /* 5 */
      }

      /* 5 */
      todayStart = addMinutes(todayStart, this.timeIncrements);
    }
  }

  /**
   * Check if the provided time can be selected based on specified constraints.
   * 1. Parse the minimum time constraints if provided.
   * 2. Parse the maximum time constraints if provided.
   * 3. Check if the provided time falls within the specified range.
   * 4. Return true if the time is within the allowed range, otherwise return false.
   * @param time The selected time object to be checked.
   * @returns A boolean indicating whether the time can be selected or not.
   */
  setAvailable(time: { value: Date; available: boolean }): boolean {
    const dateToCheck = time.value;

    /* 1 */
    let setActivedisabledMinTime;
    if (this.disabledMinTime) {
      const splitMinHour = parseInt(this.disabledMinTime.split(':')[0], 10);
      const splitMinMinute = parseInt(this.disabledMinTime.split(':')[1], 10);
      const setActiveMinHours = setSeconds(setHours(new Date(), splitMinHour), 0);
      setActivedisabledMinTime = setMilliseconds(setMinutes(setActiveMinHours, splitMinMinute), 0);
    }

    /* 2 */
    let setActivedisabledMaxTime;
    if (this.disabledMaxTime) {
      const splitMaxHour = parseInt(this.disabledMaxTime.split(':')[0], 10);
      const splitMaxMinute = parseInt(this.disabledMaxTime.split(':')[1], 10);
      const setActiveMaxHours = setSeconds(setHours(new Date(), splitMaxHour), 0);
      setActivedisabledMaxTime = setMilliseconds(setMinutes(setActiveMaxHours, splitMaxMinute), 0);
    }

    /* 3 */
    if (isAfter(setActivedisabledMinTime, dateToCheck) || isBefore(setActivedisabledMaxTime, dateToCheck)) {
      return false;
    }

    /* 4 */
    return true;
  }

  /**
   * Apply an active state to the provided time if it meets certain conditions.
   * 1. Define the activeTime variable if a specific time is set.
   * 2. Check if the time is available, selected, and the resetTime flag is false; return the selection state.
   * 3. If a specific time is set, check if the provided time matches the activeTime and return true.
   * @param time The selected time object to apply an active state.
   * @returns A boolean indicating if the time should be in an active state.
   */
  setActive(time: { value: Date; available: boolean }): boolean {
    /* 1 */
    let activeTime;
    if (this.activeTime) {
      const splitHour = this.activeTime.split(':')[0];
      const splitMinute = this.activeTime.split(':')[1];
      const setActiveHours = setHours(new Date(), parseInt(splitHour, 10));
      const setActiveSeconds = setSeconds(setActiveHours, 0);
      activeTime = setMinutes(setActiveSeconds, parseInt(splitMinute, 10));
    }

    /* 2 */
    if (time.available && this.selectedTime && this.resetTime === false) {
      return time.value === this.selectedTime; /* 3 */
    } else if (activeTime && isSameHour(time.value, activeTime) && isSameMinute(time.value, activeTime)) {
      return true; /* 4 */
    }
  }

  /**
   * Select the provided time and emit the selection.
   * 1. Clear the time reset flag to prevent resetting the time.
   * 2. If the time is available, update the selectedTime value and trigger the 'change' event.
   * @param time The selected time object.
   */
  handleOnClick(time: { value: Date; available: boolean }) {
    /* 1 */
    this.resetTime = false;
    /* 2 */
    if (time.available) {
      this.selectedTime = time.value;
      this.handleOnChange();
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-time-selector-list', {
      'sl-c-time-selector-list--horizontal': this.orientation === 'horizontal'
    });

    return html`
      <div class="${componentClassNames}">
        <div class="sl-c-time-selector-list__inner">
          <h4 class="sl-c-time-selector-list__heading">${this.timeSelectorLabel}</h4>
          <ul class="sl-c-time-selector-list__list">
            ${this.times.map((time: { value: Date; available: boolean }) => {
              return html`
                <li class="sl-c-time-selector-list__item" id="sl-time-${format(time.value, 'hmma')}">
                  ${time.value.getTime() !== 0
                    ? html`
                        <button
                          class="sl-c-time-selector-list__button
                          ${this.setActive(time) ? 'sl-is-active' : ''}
                          ${this.setAvailable(time) ? 'sl-is-available' : ''}"
                          aria-pressed=${ifDefined(this.setActive(time) ? 'true' : undefined)}
                          @click=${() => this.handleOnClick(time)}
                          ?disabled=${!this.setAvailable(time)}
                          aria-label="${format(time.value, this.timeFormat)}"
                        >
                          ${format(time.value, this.timeFormat)}
                        </button>
                      `
                    : ''}
                </li>
              `;
            })}
          </ul>
        </div>
      </div>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLTimeSelectorList.el) === undefined) {
  customElements.define(SLTimeSelectorList.el, SLTimeSelectorList);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-time-selector-list': SLTimeSelectorList;
  }
}
