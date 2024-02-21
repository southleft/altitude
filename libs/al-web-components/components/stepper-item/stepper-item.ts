import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALIconCheck } from '../icon/icons/check';
import styles from './stepper-item.scss';

/**
 * Component: al-stepper-item
 * - **slot**: The label for each stepper item
 * - **slot** "icon": The icon that displays next to the label
 * - **slot** "description": The description that displays below the label
 */
export class ALStepperItem extends ALElement {
  static el = 'al-stepper-item';

  private elementMap = register({
    elements: [[ALIconCheck.el, ALIconCheck]],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private iconCheckEl = unsafeStatic(this.elementMap.get(ALIconCheck.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Variant
   * - **default** renders a Stepper item with a horizontal layout
   * - **vertical** renders a Stepper item with a vertical layout
   */
  @property()
  accessor variant: 'vertical';

  /**
   * Is active?
   * - A visual representation of a step with an active/current state
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * Is complete?
   * - A visual representation of a step with a completed state
   */
  @property({ type: Boolean })
  accessor isComplete: boolean;

  /**
   * Is last?
   * - A visual representation of the last step within an ALStepper
   * - Dynamically set by the parent
   */
  @property({ type: Boolean })
  accessor isLast: boolean;

  /**
   * Step number
   * - The number that appears for each step
   * - Dynically set by the parent
   */
  @property({ type: Number })
  accessor stepNumber: number = 1;

  render() {
    const componentClassNames = this.componentClassNames('al-c-stepper-item', {
      'al-c-stepper-item--vertical': this.variant === 'vertical',
      'al-is-active': this.isActive,
      'al-is-complete': this.isComplete,
      'al-is-last': this.isLast
    });

    return html`
      <li role="listitem" class="${componentClassNames}" aria-current=${ifDefined(this.isActive ? 'step' : null)}>
        <div class="al-c-stepper-item__step">
          <div class="al-c-stepper-item__counter">
            ${this.isComplete ? html`<${this.iconCheckEl}></${this.iconCheckEl}>` : html` ${this.stepNumber} `}
          </div>
          <hr class="al-c-stepper-item__hr" />
        </div>
        <div class="al-c-stepper-item__content">
          ${this.variant === 'vertical' && this.slotNotEmpty('icon')
            ? html`
                <div class="al-c-stepper-item__icon">
                  <slot name="icon"></slot>
                </div>
              `
            : html``}
          <div class="al-c-stepper-item__body">
            <div class="al-c-stepper-item__title">
              ${this.variant !== 'vertical' && this.slotNotEmpty('icon')
                ? html`
                    <div class="al-c-stepper-item__icon">
                      <slot name="icon"></slot>
                    </div>
                  `
                : html``}
              <slot></slot>
            </div>
            ${this.slotNotEmpty('description')
              ? html`
                  <div class="al-c-stepper-item__description">
                    <slot name="description"></slot>
                  </div>
                `
              : html``}
          </div>
        </div>
      </li>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALStepperItem.el) === undefined) {
  customElements.define(ALStepperItem.el, ALStepperItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-stepper-item': ALStepperItem;
  }
}
