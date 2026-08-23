import { TemplateResult, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALIconSuccess } from '../icon/icons/success';
import styles from './stepper-item.scss';

/**
 * Component: al-stepper-item
 * @slot - The label for each stepper item
 * @slot icon - The icon that displays next to the label
 * @slot description - The description that displays below the label
 */
export class ALStepperItem extends ALElement {
  static el = 'al-stepper-item';

  private elementMap = register({
    elements: [[ALIconSuccess.el, ALIconSuccess]],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private iconCheckEl = unsafeStatic(this.elementMap.get(ALIconSuccess.el));

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

  /**
   * A11y — the role rendered on the internal `<li>`.
   *
   * `listitem` is only legal inside a `list`, and the owning `<ul role="list">`
   * lives in the *parent* component's shadow root. Rendered standalone the
   * hardcoded role has no required parent (axe `aria-required-parent`), while
   * dropping the role leaves a bare `<li>` outside a list (axe `listitem`).
   * `none` is the honest answer for an orphan; `hasAncestorRole` walks the
   * flattened tree, so the slot/shadow hop to the real `<ul>` is followed.
   */
  @state()
  accessor _listRole: 'listitem' | 'none' = 'none';

  /**
   * A11y — recompute the internal `<li>`'s role from the flattened tree.
   * Also runs once on the next frame, because the owning list component may
   * not have rendered its `<ul>` yet when this item first updates.
   */
  private syncListRole() {
    this._listRole = this.hasAncestorRole(['list', 'group'], ['ul', 'ol', 'menu']) ? 'listitem' : 'none';
  }

  async firstUpdated() {
    await this.updateComplete;
    requestAnimationFrame(() => this.syncListRole());
  }

  updated() {
    this.syncListRole();
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-stepper-item', {
      'al-c-stepper-item--vertical': this.variant === 'vertical',
      'al-is-active': this.isActive,
      'al-is-complete': this.isComplete,
      'al-is-last': this.isLast
    });

    return html`
      <li role=${this._listRole} class="${componentClassNames}" aria-current=${ifDefined(this.isActive ? 'step' : null)}>
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
