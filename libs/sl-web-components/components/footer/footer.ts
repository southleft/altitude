import { html, unsafeCSS, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../../../al-web-components/components/ALElement';
/*
 * The base `al-footer` module is deliberately NOT imported.
 *
 * It used to be, because this component rendered `<al-footer>` inside its
 * own template. It no longer does — this component IS `al-footer` now (one
 * namespace; the brand implementation overrides the base one), so importing
 * the base module would register the BASE class under that tag first and win,
 * `customElements.define` being first-come and final. The symptom is exact and
 * silent: every named slot below goes unassigned, because the element that
 * actually upgraded has one unnamed slot, and the header renders empty.
 */
import '../../../al-web-components/components/layout/layout';
import styles from './footer.scss';

/**
 * Component: al-footer
 *
 * Southleft's site footer — an asymmetric three-column masthead, a pull quote,
 * and a legal bar.
 *
 * IT *IS* `al-footer` — the brand implementation of that tag. It owns the
 * `<footer>` landmark and its box directly; it no longer wraps Altitude's,
 * because a component cannot render the tag it is registered under without
 * recursing (spec 2026-08-23-one-al-namespace-across-brand-and-base). The
 * `--al-footer-*` custom properties remain the public API, now read here.
 *
 * ```html
 * <al-footer copyright="© 2026 Southleft, LLC. All rights reserved."
 *            quote="If I cannot do great things, I can do small things in a great way."
 *            cite="— attributed to Dr. Martin Luther King Jr.">
 *   <al-logo slot="brand" variant="southleft" href="/"></al-logo>
 *   <p slot="brand">Design systems consulting, engineering, and AI integration.</p>
 *   <nav slot="columns" aria-label="Footer">…</nav>
 *   <a slot="legal" href="/privacy-policy">Privacy policy</a>
 * </al-footer>
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
 * @cssproperty --al-footer-template - The masthead track list. Defaults to `1.4fr 1fr 1fr`.
 * @cssproperty --al-footer-measure - The content column. Defaults to `79rem`.
 * @cssproperty --al-footer-padding-block - The footer's vertical rhythm. Defaults to `3.5rem`.
 */
export class SLFooter extends ALElement {
  static el = 'al-footer';

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
      <footer class="${componentClassNames}">
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
      </footer>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(SLFooter.el) === undefined) {
  customElements.define(SLFooter.el, SLFooter);
}

/*
 * NO `HTMLElementTagNameMap` ENTRY, DELIBERATELY.
 *
 * This component OVERRIDES the base library's `al-footer`: same tag, brand
 * implementation, and the app imports one or the other (see the module note at
 * the top of this file). `HTMLElementTagNameMap` cannot express that. It is a
 * global interface keyed by tag name, both packages compile into one TypeScript
 * program (this package reaches Altitude through relative paths, so its sources
 * join the program — see the `exports` note in package.json), and two
 * declarations of one key with different types is TS2717, a hard build error:
 *
 *   Property ''al-footer'' must be of type 'ALFooter', but here has type 'SLFooter'.
 *
 * The base declaration therefore stands, and `document.querySelector('al-footer')`
 * types as `ALFooter` even where this implementation is the one registered.
 * That is a known, narrow inaccuracy in the TYPES only — the runtime element is
 * whichever module was imported. Anyone who needs this component's own type
 * imports the exported `SLFooter` class directly, which is the reason it is
 * exported.
 */
