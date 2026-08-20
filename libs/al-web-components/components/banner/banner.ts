import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALButton } from '../button/button';
import { ALIcon } from '../icon/icon';
import { checkCircle, info, warning, warningCircle, x } from '../icon/glyphs';
import { registerIcons } from '../icon/registry';
import styles from './banner.scss';

registerIcons({ 'check-circle': checkCircle, info, warning, 'warning-circle': warningCircle, x });

/**
 * Component: al-banner
 *
 * A page-level, full-width announcement bar — distinct from `<al-alert>`
 * (which is a card-surfaced, contextual message). Reuses the same tone
 * vocabulary as `<al-alert>`/`<al-toast>` (icon color by `variant`) so the
 * two read as siblings.
 *
 * @slot - The banner's message content.
 * @slot link - Optional trailing link/CTA (typically an `<al-link>`).
 * @slot icon - Slot in an icon to override the tone-default one.
 *
 * @event onBannerClose - Fired when the banner is dismissed. Detail: `{ isDismissed }`.
 */
export class ALBanner extends ALElement {
  static el = 'al-banner';

  private elementMap = register({
    elements: [
      [ALButton.el, ALButton],
      [ALIcon.el, ALIcon]
    ],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private buttonEl = unsafeStatic(this.elementMap.get(ALButton.el));
  private iconEl = unsafeStatic(this.elementMap.get(ALIcon.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Variant
   * - **default** renders a banner that represents an informative announcement
   * - **success** renders a banner that represents a success state
   * - **warning** renders a banner that represents a warning state
   * - **danger** renders a banner that represents a danger/incident state
   */
  @property()
  accessor variant: 'success' | 'warning' | 'danger';

  /**
   * Whether the banner shows a dismiss control.
   */
  @property({ type: Boolean })
  accessor isDismissible: boolean;

  /**
   * Whether the banner has been dismissed. Owned state, toggled by `close()`.
   */
  @property({ type: Boolean })
  accessor isDismissed: boolean;

  /**
   * Dismiss the banner.
   * 1. Set isDismissed to true so the `.al-is-dismissed` rule hides it.
   * 2. Dispatch onBannerClose.
   */
  public close() {
    this.isDismissed = true; /* 1 */
    this.dispatch({
      eventName: 'onBannerClose',
      detailObj: { isDismissed: this.isDismissed }
    }); /* 2 */
  }

  private get bannerIconName(): string {
    if (this.variant === 'success') return 'check-circle';
    if (this.variant === 'warning') return 'warning';
    if (this.variant === 'danger') return 'warning-circle';
    return 'info';
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-banner', {
      'al-c-banner--success': this.variant === 'success',
      'al-c-banner--warning': this.variant === 'warning',
      'al-c-banner--danger': this.variant === 'danger',
      'al-is-dismissed': this.isDismissed === true
    });

    return html`
      <div class="${componentClassNames}" role="status">
        <div class="al-c-banner__icon">
          ${this.slotNotEmpty('icon')
            ? html`<slot name="icon"></slot>`
            : html`<${this.iconEl} name=${this.bannerIconName} aria-hidden="true"></${this.iconEl}>`}
        </div>
        <div class="al-c-banner__body">
          <div class="al-c-banner__content"><slot></slot></div>
          ${this.slotNotEmpty('link')
            ? html`<div class="al-c-banner__link"><slot name="link"></slot></div>`
            : ''}
        </div>
        ${this.isDismissible
          ? html`
              <${this.buttonEl}
                class="al-c-banner__close"
                variant="bare"
                hideText="true"
                label="Dismiss"
                @click=${this.close}
              >
                <${this.iconEl} name="x" slot="before"></${this.iconEl}>
              </${this.buttonEl}>
            `
          : ''}
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALBanner.el) === undefined) {
  customElements.define(ALBanner.el, ALBanner);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-banner': ALBanner;
  }
}
