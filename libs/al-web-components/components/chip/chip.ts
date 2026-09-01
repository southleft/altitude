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
 * @slot - The chip content
 *
 * @event onChipClose - Fired when the chip's remove control is activated. Carries no detail payload; read the chip's own properties from `event.target`.
  *
 * @cssproperty --al-chip-background - Chip surface. Defaults to `--al-theme-color-background-default-strong`.
 * @cssproperty --al-chip-color - Label colour. Defaults to `--al-theme-color-content-default-weak`.
 * @cssproperty --al-chip-border - Border shorthand. Defaults to `none`.
 * @cssproperty --al-chip-border-radius - Corner radius. Defaults to `4px`.
 * @cssproperty --al-chip-padding - Padding shorthand. Defaults to `space-xxs space-sm`.
 * @cssproperty --al-chip-gap - Gap between label and icon. Defaults to `space-xs`.
 * @cssproperty --al-chip-font-family - Label family. Defaults to `inherit`.
 * @cssproperty --al-chip-cursor - Defaults to `pointer`; set `default` for a non-interactive chip.
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
  accessor variant: 'neutral' | 'bare' | 'primary' | 'secondary' | 'tertiary';

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
      'al-c-chip--neutral': this.variant === 'neutral',
      'al-c-chip--bare': this.variant === 'bare',
      'al-c-chip--primary': this.variant === 'primary',
      'al-c-chip--tertiary': this.variant === 'tertiary',
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
