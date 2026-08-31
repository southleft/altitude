import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALButton } from '../button/button';
import { ALIcon } from '../icon/icon';
import { ALLayout } from '../layout/layout';
import { info, x } from '../icon/glyphs';
import { registerIcons } from '../icon/registry';
import styles from './banner.scss';

registerIcons({ info, x });

/**
 * Component: al-banner
 *
 * A page-level, full-width announcement bar — distinct from `<al-alert>`
 * (which is a card-surfaced, contextual message).
 *
 * The banner carries no tone `variant`. A banner is a single structural
 * shape whose only behavioural prop is `isDismissible`; its leading icon and
 * that icon's color are the two things a consumer changes, and everything
 * else — the message, the trailing CTA — is slotted content. Override the
 * glyph via the `icon` slot and its color via `--al-banner-icon-fill`.
 *
 * @slot - The banner's message content.
 * @slot link - Optional trailing link/CTA (typically an `<al-link>`).
 * @slot icon - Slot in an icon to override the default one.
 *
 * @cssprop --al-banner-icon-fill - Fill of the leading icon. Defaults to the
 *          informational content color; set it to any content token to retone
 *          the banner (e.g. `var(--al-theme-color-content-danger-default)`).
 *
 * @event onBannerClose - Fired when the banner is dismissed. Detail: `{ isDismissed }`.
 */
export class ALBanner extends ALElement {
  static el = 'al-banner';

  private elementMap = register({
    elements: [
      [ALButton.el, ALButton],
      [ALIcon.el, ALIcon],
      [ALLayout.el, ALLayout]
    ],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private buttonEl = unsafeStatic(this.elementMap.get(ALButton.el));
  private iconEl = unsafeStatic(this.elementMap.get(ALIcon.el));
  private layoutEl = unsafeStatic(this.elementMap.get(ALLayout.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

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

  /**
   * Render
   * 1. `.al-c-banner` is the component's own BOX — surface, padding, bottom
   *    rule, full-bleed width. It owns no arrangement.
   * 2. Arrangement is `<al-layout>`, per the repo's arrangement-vs-semantics
   *    rule. The outer row matches the design's "Main Content" frame (row,
   *    centred, 16px gap); the inner row matches "Text + Actions" (row,
   *    centred, 16px gap, space-between) so the CTA sits hard right and the
   *    message absorbs the free space.
   * 3. The inner row deliberately does NOT wrap. Under flex-wrap the message's
   *    hypothetical main size is its max-content width, so a sentence-length
   *    message fills the line on its own and drops the CTA below it — the
   *    design keeps them on one row. The message shrinks instead, via
   *    `flex: 1 1 auto; min-inline-size: 0` in banner.scss.
   */
  render() {
    const componentClassNames = this.componentClassNames('al-c-banner', {
      'al-is-dismissed': this.isDismissed === true
    });

    return html`
      <div class="${componentClassNames}" role="status">
        <${this.layoutEl} direction="row" align="center" gap="md">
          <div class="al-c-banner__icon">
            ${this.slotNotEmpty('icon')
              ? html`<slot name="icon"></slot>`
              : html`<${this.iconEl} name="info" aria-hidden="true"></${this.iconEl}>`}
          </div>
          <${this.layoutEl} direction="row" align="center" justify="between" gap="md" grow>
            <div class="al-c-banner__content"><slot></slot></div>
            ${this.slotNotEmpty('link')
              ? html`<div class="al-c-banner__link"><slot name="link"></slot></div>`
              : ''}
          </${this.layoutEl}>
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
        </${this.layoutEl}>
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
