import { html, PropertyValues, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './progress.scss';

/**
 * Component: al-progress
 *
 * @event onProgressChange - Fired when the progress label updates. Detail: `{ label }` — the rendered label text, not the numeric value.
 */
export class ALProgress extends ALElement {
  static el = 'al-progress';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Is circle?
   * - **true** Displays a circular progress indicator
   * - **false** Displays a linear progress indicator
   */
  @property({ type: Boolean })
  accessor isCircle: boolean = false;

  /**
   * Circle size property
   * - Sets the width of the circular progress indicator
   * - **sm** 16px, and what an omitted `circleSize` renders — named so the axis
   *   is expressible in code rather than living as the absence of a value
   * - **md** 24px
   * - **lg** 32px
   * - **xl** 40px
   */
  @property()
  accessor circleSize: 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Show label?
   * **true** Displays the progress label
   * **false** Does not display a progress label
   */
  @property({ type: Boolean })
  accessor showLabel: boolean = false;

  /**
   * Label type
   * **default** Sets the progress label as a percentage
   * **ratio** Sets the progress label as a ratio
   */
  @property({ type: String })
  accessor labelType: 'ratio';

  /**
   * Duration of the progress in seconds
   * - Default is 0
   */
  @property({ type: Number })
  accessor duration: number = 0;

  /**
   * The current completed value of the progress
   * - Default is 0
   */
  @property({ type: Number })
  accessor currentProgress: number = 0;

  /**
   * The value at which the progress will end
   * - Default is 100
   */
  @property({ type: Number })
  accessor endProgress: number = 100;

  /**
   * Aria label for A11y
   * - Default is "progress"
   */
  @property()
  accessor labelAria: string = 'progress';

  /**
   * The value at which the progress started
   * - Default is 0
   */
  @state()
  private accessor initialProgress: number = 0;

  /**
   * Is Reversed?
   * - **true** Depicts decrementing progress from 100 to 0 percent
   * - **false** Depicts incrementing progress from 0 to 100 percent
   */
  @state()
  private accessor isReversed: boolean = false;

  /**
   * Start timestamp
   * - Used to animate progress when a duration has been set
   */
  @state()
  private accessor startTimestamp: any = performance.now();

  /**
   * Calculates the circumference of a circular progress indicator
   * @returns {number} The circumference value
   */
  get _circumference() {
    if (this.isCircle) {
      let radius;

      switch (this.circleSize) {
        case 'md':
          radius = 12;
          break;
        case 'lg':
          radius = 16;
          break;
        case 'xl':
          radius = 20;
          break;
        // `sm` falls through: it IS the unset default, now named.
        case 'sm':
        default:
          radius = 8;
      }

      return 2 * Math.PI * radius;
    }
  }

  /**
   * Used to scale the circular progress fill to the correct size
   * @returns {number} The scale value for the circle size
   */
  get _circleScale() {
    if (this.isCircle) {
      switch (this.circleSize) {
        case 'md':
          return 0.667;
        case 'lg':
          return 0.5;
        case 'xl':
          return 0.4;
        // `sm` falls through: it IS the unset default, now named.
        case 'sm':
        default:
          return 1;
      }
    }
  }

  /**
   * The fraction (0–1) of the range covered by `currentProgress`.
   * - **default** progress counts up from 0 to `endProgress`
   * - **reversed** progress counts down from its initial value to `endProgress`
   *
   * Derived from `currentProgress` on every read, so the fill reflects the
   * property (or attribute) on first render and on every later update, not
   * only after `change()` or the duration animation has run.
   */
  private get _fraction(): number {
    const denominator = this.isReversed ? this.initialProgress : this.endProgress;
    if (!denominator) {
      return 0;
    }
    return Math.min(Math.max((this.currentProgress ?? 0) / denominator, 0), 1);
  }

  /**
   * The percentage value of the current progress, rounded down
   */
  private get currentPercentage(): number {
    return Math.floor(this._fraction * 100);
  }

  /**
   * Stroke dash offset
   * - Controls the fill for the circular progress indicator
   * - Find the change in pixels from the current progress, scale it, and
   *   subtract it from the circumference
   */
  private get strokeDashOffset(): number {
    return this._circumference - this._circumference * this._fraction * this._circleScale;
  }

  /**
   * The progress label, displayed as a percentage or ratio of units
   * @returns {string} The progress label
   */
  get _label() {
    let label: string;

    if (this.labelType === 'ratio') {
      const denominator = this.isReversed ? this.initialProgress.toLocaleString() : this.endProgress.toLocaleString();
      label = `${this.currentProgress.toLocaleString()} / ${denominator}`;
    } else {
      label = `${this.currentPercentage}%`;
    }

    return label;
  }

  /**
   * Constructor
   * - Binds the animation fill method to the component class
   */
  constructor() {
    super();
    this.animateFillDuration = this.animateFillDuration.bind(this);
  }

  /**
   * Updates the circular progress indicator's stroke-dashoffset to reflect the current progress
   * @deprecated The circle is now derived from `currentProgress` on every render; calling this
   * only requests an update. Kept so existing callers do not break.
   */
  updateCircle() {
    this.requestUpdate();
  }

  /**
   * Animates the progress indicator fill when a duration is provided
   * 1. Calculate the elapsed time
   * 2. Calculate the new progress value based on the elapsed time
   * 3. Set the current progress after checking that:
   * - **default** it is not more than the progress end value of 100
   * - **reversed** it is not less that the progress end value of 0
   * 4. Continue the animation until progress reaches its end value
   *    (the fill and label are derived from currentProgress at render time)
   */
  animateFillDuration() {
    /* 1 */
    const now = performance.now();
    const elapsed = now - this.startTimestamp;
    /* 2 */
    const durationMs = this.duration * 1000;
    const newProgress = this.isReversed
      ? this.initialProgress - (elapsed / durationMs) * this.initialProgress
      : (elapsed / durationMs) * this.endProgress;
    /* 3 */
    this.currentProgress = this.isReversed ? Math.max(newProgress, this.endProgress) : Math.min(newProgress, this.endProgress);
    /* 4 */
    const stopAnimation = this.isReversed ? this.currentProgress <= this.endProgress : this.currentProgress >= this.endProgress;
    if (!stopAnimation) {
      requestAnimationFrame(this.animateFillDuration);
    }
  }

  /**
   * Will update lifecycle method
   * - Before the first render, capture the starting value and whether the
   *   progress counts down, so the first render already draws the right fill
   * 1. Set initial progress to the current progress value
   * 2. Determine if the progress is reversed
   */
  willUpdate(changed: PropertyValues<this>) {
    super.willUpdate(changed);
    if (!this.hasUpdated) {
      this.initialProgress = this.currentProgress; /* 1 */
      this.isReversed = this.endProgress < this.initialProgress; /* 2 */
    }
  }

  /**
   * First updated lifecycle method
   * - If the progress is based on duration, start the fill animation
   */
  firstUpdated() {
    if (this.duration) {
      requestAnimationFrame(this.animateFillDuration);
    }
  }

  /**
   * Change
   * @param {number} changeValue The positive or negative number by which to change the progress
   * - Dynamically updates the progress indicator
   * 1. Check whether or not the progress has reached its end
   * 2. If not, update the current progress value
   * 3. Dispatch the custom event (the fill, label and percentage derive from currentProgress)
   * - The label is dispatched with the custom event so that it can be displayed in other components as needed
   */
  public change(changeValue: number = 1) {
    /* 1 */
    const continueProgress = this.isReversed ? this.currentProgress > this.endProgress : this.currentProgress < this.endProgress;

    if (continueProgress) {
      this.currentProgress += changeValue; /* 2 */
    }

    /* 3 */
    this.dispatch({
      eventName: 'onProgressChange',
      detailObj: {
        label: this._label
      }
    });
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-progress', {
      // Applied for an OMITTED circleSize too: sm IS the unset default, now named.
      'al-is-circle-sm': this.circleSize === 'sm' || !this.circleSize,
      'al-is-circle-md': this.circleSize === 'md',
      'al-is-circle-lg': this.circleSize === 'lg',
      'al-is-circle-xl': this.circleSize === 'xl',
      'al-has-label': this.showLabel === true
    });

    return html`
      <div class="${componentClassNames}" role="progressbar" aria-label=${this.labelAria} aria-valuenow=${this.currentProgress}>
        ${this.isCircle
          ? html`
              <div class="al-c-progress__track--circle"></div>
              <svg class="al-c-progress__fill--circle" xmlns="http://www.w3.org/2000/svg">
                <circle
                  cx="8"
                  cy="8"
                  r="8"
                  stroke-width="4px"
                  style="stroke-dasharray: ${this._circumference}; stroke-dashoffset: ${this.strokeDashOffset}"
                />
              </svg>
            `
          : html`
              <div class="al-c-progress__track">
                <div class="al-c-progress__fill" style="width: ${this.currentPercentage}%"></div>
              </div>
            `}
        <div class="al-c-progress__label${this.showLabel ? '' : ' al-is-u-vishidden'}">${this._label}</div>
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALProgress.el) === undefined) {
  customElements.define(ALProgress.el, ALProgress);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-progress': ALProgress;
  }
}
