import { html, unsafeCSS, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../../../al-web-components/components/ALElement';
import '../../../al-web-components/components/footer/footer';
import '../../../al-web-components/components/layout/layout';
import styles from './footer.scss';

/**
 * Component: sl-footer
 *
 * Southleft's site footer — an asymmetric three-column masthead, a pull quote,
 * and a legal bar.
 *
 * Built ON `<al-footer>`, which owns the `<footer>` landmark, the block padding
 * and the stacking. What this adds is the brand's shape: the 1.4fr/1fr/1fr
 * masthead, the column kicker and link treatment, and the rules above the quote
 * and the legal bar.
 *
 * ```html
 * <sl-footer copyright="© 2026 Southleft, LLC. All rights reserved."
 *            quote="If I cannot do great things, I can do small things in a great way."
 *            cite="— attributed to Dr. Martin Luther King Jr.">
 *   <al-logo slot="brand" variant="southleft" href="/"></al-logo>
 *   <p slot="brand">Design systems consulting, engineering, and AI integration.</p>
 *   <nav slot="columns" aria-label="Footer">…</nav>
 *   <a slot="legal" href="/privacy-policy">Privacy policy</a>
 * </sl-footer>
 * ```
 *
 * The masthead is `<al-layout variant="grid">` driven through the documented
 * `--al-layout-template` hook, not a bespoke grid — the same escape hatch the
 * site already uses, so an asymmetric masthead never becomes a reason to
 * hand-roll `display: grid`.
 *
 * @slot brand - The first, wider column: wordmark, blurb, CTA, whatever annotation the page carries.
 * @slot columns - The remaining masthead columns. Each top-level element becomes one column.
 * @slot legal - Links for the bottom bar, beside the copyright.
 *
 * @csspart masthead - The column grid.
 * @csspart quote - The pull quote.
 * @csspart bar - The bottom legal bar.
 *
 * @cssproperty --sl-footer-template - The masthead track list. Defaults to `1.4fr 1fr 1fr`.
 * @cssproperty --sl-footer-measure - The content column. Defaults to `79rem`.
 * @cssproperty --sl-footer-padding-block - The footer's vertical rhythm. Defaults to `3.5rem`.
 */
export class SLFooter extends ALElement {
  static el = 'sl-footer';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /** The pull quote above the legal bar. Omit for no quote. */
  @property()
  accessor quote: string;

  /** Attribution under the quote. */
  @property()
  accessor cite: string;

  /** The copyright line in the bottom bar. */
  @property()
  accessor copyright: string;

  render() {
    const componentClassNames = this.componentClassNames('sl-c-footer', {});

    return html`
      <al-footer class="${componentClassNames}">
        <al-layout variant="constrained" class="sl-c-footer__measure">
          <al-layout variant="grid" gap="xl" noCollapse class="sl-c-footer__masthead" part="masthead">
            <div class="sl-c-footer__brand">
              <slot name="brand"></slot>
            </div>
            <slot name="columns"></slot>
          </al-layout>

          ${this.quote
            ? html`<blockquote class="sl-c-footer__quote" part="quote">
                ${this.quote}
                ${this.cite ? html`<cite class="sl-c-footer__cite">${this.cite}</cite>` : nothing}
              </blockquote>`
            : nothing}

          <div class="sl-c-footer__bar" part="bar">
            ${this.copyright ? html`<p class="sl-c-footer__copyright">${this.copyright}</p>` : nothing}
            <al-layout direction="row" wrap gap="md">
              <slot name="legal"></slot>
            </al-layout>
          </div>
        </al-layout>
      </al-footer>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(SLFooter.el) === undefined) {
  customElements.define(SLFooter.el, SLFooter);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-footer': SLFooter;
  }
}
