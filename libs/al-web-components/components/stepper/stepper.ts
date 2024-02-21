import { html, unsafeCSS } from 'lit';
import { property, queryAssignedElements } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import { ALStepperItem } from '../stepper-item/stepper-item';
import styles from './stepper.scss';

/**
 * Component: al-stepper
 * - **slot**: The stepper content, a set of stepper items
 */
export class ALStepper extends ALElement {
  static el = 'al-stepper';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Variant
   * - **default** renders a Stepper with a horizontal layout
   * - **vertical** renders a Stepper with a vertical layout
   */
  @property()
  accessor variant: 'vertical';

  /**
   * Query the Stepper item components within the Stepper
   */
  @queryAssignedElements({ flatten: true })
  accessor stepperItems: Array<ALStepperItem>;

  /**
   * Updated lifecycle
   * 1. If the varient is equal to vertical, set the ALStepperItem's to vertical as well
   * 2. Set the step number for each ALStepperItem
   */
  updated() {
    this.setVerticalItems(); /* 1 */
    this.setStepNumber(); /* 2 */
  }

  /**
   * Set step number
   * 1. Loop through all the ALStepperItem's and set the step number based on the index
   * 2. Check if it's the last item in the array and set the isLast property
   */
  setStepNumber() {
    if (this.stepperItems) {
      this.stepperItems.forEach((item: ALStepperItem, idx: number) => {
        /* 1 */
        item.stepNumber = idx + 1;
        /* 2 */
        if (idx === this.stepperItems.length - 1) {
          item.isLast = true;
        } else {
          item.isLast = false;
        }
      });
    }
  }

  /**
   * Set vertical items
   * 1. If the varient is equal to vertical, set the ALStepperItem's to vertical as well
   */
  setVerticalItems() {
    if (this.stepperItems && this.variant === 'vertical') {
      this.stepperItems.forEach((item: ALStepperItem) => {
        item.variant = 'vertical';
      });
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-stepper', {
      'al-c-stepper--vertical': this.variant === 'vertical'
    });

    return html`
      <ul role="list" class="${componentClassNames}">
        <slot></slot>
      </ul>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALStepper.el) === undefined) {
  customElements.define(ALStepper.el, ALStepper);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-stepper': ALStepper;
  }
}
