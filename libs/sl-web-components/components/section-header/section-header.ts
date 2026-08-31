import { html, unsafeCSS, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../../../al-web-components/components/ALElement';
import '../../../al-web-components/components/layout/layout';
import '../../../al-web-components/components/heading/heading';
import styles from './section-header.scss';

/**
 * Component: al-section-header
 *
 * The heading block that opens a section of a Southleft page: a mono rule
 * carrying an index and label, an accent kicker, a heading, an optional lead,
 * and an optional trailing link.
 *
 * Earned its place by repetition — two pages import it and five more had
 * hand-re-inlined its markup (`services/design-systems.astro:132-138` and four
 * siblings), which is the shape of a component the system was missing.
 *
 * ```html
 * <al-section-header
 *   index="02"
 *   label="Insights"
 *   heading="We publish our homework"
 *   dek="Notes from inside real design-system work."
 *   link-href="/insights"
 *   link-label="all insights →"
 * ></al-section-header>
 * ```
 *
 * @slot - The trailing position, for a control the link cannot express — a filter, a segmented toggle. Use it INSTEAD of `linkHref`; both render if both are set.
 *
 * @property kicker - Kicker text without the angle brackets. Derives from `label` when unset; pass an empty string for a rule with no kicker.
 * @csspart rule - The mono index/label rule above everything.
 * @csspart kicker - The accent `<label>` kicker.
 * @csspart heading - The `<al-heading>`.
 * @csspart dek - The lead paragraph.
 * @csspart link - The trailing mono link.
 *
 * @cssproperty --al-section-header-margin-block-end - Space between the header and the section body. Defaults to `--al-theme-space-xl`.
 */
export class SLSectionHeader extends ALElement {
  static el = 'al-section-header';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /** The ordinal shown before the label in the rule, e.g. `02`. Omit for a label-only rule. */
  @property()
  accessor index: string;

  /** The rule's label, and the source of the kicker slug below it. */
  @property()
  accessor label: string;

  /** The section heading. */
  @property()
  accessor heading: string;

  /** The lead paragraph under the heading. Omit for none. */
  @property()
  accessor dek: string;

  /** Target for the trailing link. Omit (or fill the default slot) for no link. */
  @property({ attribute: 'link-href' })
  accessor linkHref: string;

  /** Text for the trailing link. */
  @property({ attribute: 'link-label' })
  accessor linkLabel: string;

  /** The heading's semantic level — a document-outline concern, so not fixed. */
  @property({ attribute: 'heading-tag' })
  accessor headingTag: string = 'h2';

  /**
   * The kicker text, WITHOUT the angle brackets the component draws around it.
   *
   * Leave it unset and it derives from `label` so the two cannot drift — that is
   * the common case and the original behaviour. Set it when the two genuinely
   * differ (a `<generative>` kicker under a `00 / the-canvas` rule), and set it
   * to the empty string to render the RULE ALONE, which several sections want and
   * which was previously unreachable: `label` gated the rule and the kicker
   * together, so suppressing one suppressed the other.
   */
  @property()
  accessor kicker: string;

  /** `<my-label>` — the brand's kicker form, derived unless `kicker` overrides it. */
  private get kickerText(): string {
    if (this.kicker !== undefined && this.kicker !== null) return this.kicker;
    return (this.label ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-section-header', {});

    return html`
      <div class="${componentClassNames}">
        ${this.label
          ? html`<div class="sl-c-section-header__rule" part="rule" aria-hidden="true">
              <span>${this.index ? `${this.index} / ` : ''}${this.label}</span>
            </div>`
          : nothing}
        <al-layout direction="row" justify="between" align="end" wrap gap="lg">
          <al-layout gap="sm" grow>
            ${this.kickerText
              ? html`<p class="sl-c-section-header__kicker" part="kicker">&lt;${this.kickerText}&gt;</p>`
              : nothing}
            ${this.heading
              ? html`<al-heading part="heading" tagName="${this.headingTag}" variant="lg" isBold>
                  ${this.heading}
                </al-heading>`
              : nothing}
            ${this.dek ? html`<p class="sl-c-section-header__dek" part="dek">${this.dek}</p>` : nothing}
          </al-layout>
          <slot></slot>
          ${this.linkHref
            ? html`<a class="sl-c-section-header__link" part="link" href="${this.linkHref}">${this.linkLabel}</a>`
            : nothing}
        </al-layout>
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(SLSectionHeader.el) === undefined) {
  customElements.define(SLSectionHeader.el, SLSectionHeader);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-section-header': SLSectionHeader;
  }
}
