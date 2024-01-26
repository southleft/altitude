import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLIconDone } from '../icon/icons/done';
import styles from './stepper-item.scss';

/**
 * Component: sl-stepper-item
 * - Stepper Item is a single step within a stepper.
 * @slot - The label for each Stepper item
 * @slot "icon" - The icon that displays next to the label
 * @slot "description" - The description that displays below the label
 */
export class SLStepperItem extends SLElement {
  static el = 'sl-stepper-item';

  private elementMap = register({
    elements: [[SLIconDone.el, SLIconDone]],
    suffix: (globalThis as any).enAutoRegistry === true ? '' : PackageJson.version
  });

  private iconCheckEl = unsafeStatic(this.elementMap.get(SLIconDone.el));

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
   * - A visual representation of the last step within an SLStepper
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
    const componentClassNames = this.componentClassNames('sl-c-stepper-item', {
      'sl-c-stepper-item--vertical': this.variant === 'vertical',
      'sl-is-active': this.isActive,
      'sl-is-complete': this.isComplete,
      'sl-is-last': this.isLast
    });

    return html`
      <li role="listitem" class="${componentClassNames}" aria-current=${ifDefined(this.isActive ? 'step' : null)}>
        <div class="sl-c-stepper-item__step">
          <div class="sl-c-stepper-item__counter">
            ${this.isComplete ? html`<${this.iconCheckEl}></${this.iconCheckEl}>` : html` ${this.stepNumber} `}
          </div>
          <hr class="sl-c-stepper-item__hr" />
        </div>
        <div class="sl-c-stepper-item__content">
          ${this.variant === 'vertical' && this.slotNotEmpty('icon')
            ? html`
                <div class="sl-c-stepper-item__icon">
                  <slot name="icon"></slot>
                </div>
              `
            : html``}
          <div class="sl-c-stepper-item__body">
            <div class="sl-c-stepper-item__title">
              ${this.variant !== 'vertical' && this.slotNotEmpty('icon')
                ? html`
                    <div class="sl-c-stepper-item__icon">
                      <slot name="icon"></slot>
                    </div>
                  `
                : html``}
              <slot></slot>
            </div>
            ${this.slotNotEmpty('description')
              ? html`
                  <div class="sl-c-stepper-item__description">
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

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLStepperItem.el) === undefined) {
  customElements.define(SLStepperItem.el, SLStepperItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-stepper-item': SLStepperItem;
  }
}
