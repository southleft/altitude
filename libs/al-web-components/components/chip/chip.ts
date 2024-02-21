import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALIconClose } from '../icon/icons/close';
import styles from './chip.scss';

/**
 * Component: al-chip
 *
 * Chips are compact elements that represent an input, attribute, or action.
 * - **slot**: The chip content
 */
export class ALChip extends ALElement {
  static el = 'al-chip';

  private elementMap = register({
    elements: [[ALIconClose.el, ALIconClose]],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private iconCloseEl = unsafeStatic(this.elementMap.get(ALIconClose.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Variant
   * - **default** A chip with a strong contrast background
   * - **secondary** A chip with a outline
   * - **info** A chip with a info background
   * - **success** A chip with a success background
   * - **warning** A chip with a warning background
   * - **danger** A chip with a danger background
   */
  @property()
  accessor variant: 'secondary' | 'info' | 'success' | 'warning' | 'danger';

  /**
   * Type variant
   * - **default** A chip with rounded corners
   * - **squared** A chip with squared corners
   */
  @property()
  accessor type: 'squared';

  /**
   * Dismissible property
   * - **true** Adds an X to hide the chip on click
   * - **false** Hides the X so the chip can not be hidden
   */
  @property({ type: Boolean })
  accessor isDismissible: boolean;

  /**
   * Is dismissed property
   * - **true** Hides the chip
   * - **false** Shows the chip
   */
  @property({ type: Boolean })
  accessor isDismissed: boolean;

  /**
   * Close chip
   * 1. Set isDismissed to true to hide the chip
   * 2. Add dismissed class for chip group
   * 3. Dispatch a custom event on close
   */
  public close() {
    this.isDismissed = true; /* 1 */
    this.classList.add('al-is-dismissed'); /* 2 */
    this.dispatch({ eventName: 'onChipClose' }); /* 3 */
  }

  /**
   * Handle on keydown events
   * 1. If the escape key is pressed, then close the chip
   */
  handleOnKeydown(e: KeyboardEvent) {
    /* 1 */
    if (e.code === 'Escape' && this.isDismissible) {
      this.close();
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-chip', {
      'al-c-chip--secondary': this.variant === 'secondary',
      'al-c-chip--success': this.variant === 'success',
      'al-c-chip--info': this.variant === 'info',
      'al-c-chip--warning': this.variant === 'warning',
      'al-c-chip--danger': this.variant === 'danger',
      'al-c-chip--squared': this.type === 'squared',
      'al-is-dismissible': this.isDismissible,
      'al-is-dismissed': this.isDismissed
    });

    return html`
      <button class="${componentClassNames}" @keydown=${this.handleOnKeydown}>
        <slot></slot>
        ${this.isDismissible && html` <${this.iconCloseEl} class="al-c-chip__close" @click=${this.close}></${this.iconCloseEl}> `}
      </button>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALChip.el) === undefined) {
  customElements.define(ALChip.el, ALChip);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-chip': ALChip;
  }
}
