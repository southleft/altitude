import { html, unsafeCSS } from 'lit';
import { property, queryAssignedElements } from 'lit/decorators.js';
import { SLElement } from '../SLElement';
import { SLStepperItem } from '../stepper-item/stepper-item';
import styles from './stepper.scss';

/**
 * Component: sl-stepper
 *
 * Stepper keeps track of a user's progress by indicating where the user is in a multi-step process.
 * - **slot**: The stepper content, a set of stepper items
 */
export class SLStepper extends SLElement {
  static el = 'sl-stepper';

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
  accessor stepperItems: Array<SLStepperItem>;

  /**
   * Updated lifecycle
   * 1. If the varient is equal to vertical, set the SLStepperItem's to vertical as well
   * 2. Set the step number for each SLStepperItem
   */
  updated() {
    this.setVerticalItems(); /* 1 */
    setTimeout(() => {
      this.setStepNumber(); /* 2 */
    }, 200);
  }

  /**
   * Set step number
   * 1. Loop through all the SLStepperItem's and set the step number based on the index
   * 2. Check if it's the last item in the array and set the isLast property
   */
  setStepNumber() {
    if (this.stepperItems) {
      this.stepperItems.forEach((item: SLStepperItem, idx: number) => {
        console.log("ITEM: ", item)
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
   * 1. If the varient is equal to vertical, set the SLStepperItem's to vertical as well
   */
  setVerticalItems() {
    if (this.stepperItems && this.variant === 'vertical') {
      this.stepperItems.forEach((item: SLStepperItem) => {
        item.variant = 'vertical';
      });
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-stepper', {
      'sl-c-stepper--vertical': this.variant === 'vertical'
    });

    return html`
      <ul role="list" class="${componentClassNames}">
        <slot></slot>
      </ul>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLStepper.el) === undefined) {
  customElements.define(SLStepper.el, SLStepper);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-stepper': SLStepper;
  }
}
