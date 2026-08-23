import { html, unsafeCSS, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../../../al-web-components/components/ALElement';
import '../../../al-web-components/components/layout/layout';
import '../../../al-web-components/components/heading/heading';
import styles from './media-card.scss';

/**
 * Component: sl-media-card
 *
 * The linked card the site uses for both insights posts and case studies: a
 * flush-to-edge image, a body, and a mono footer cue. Shared by `ArticleCard`
 * and `WorkCard`, which is what earned it a component — the two differ only in
 * aspect ratio, clamp depth and whether they carry a tag row.
 *
 * WHY NOT `al-card`. Its single outer `padding` wraps the `image` slot too, so
 * the media cannot sit flush to the edge — verified in `card.scss`, where
 * `.al-c-card__image` neither resets nor negates that padding. (The slot's
 * JSDoc used to claim it rendered flush; that claim was simply wrong and has
 * been corrected rather than implemented — the slot carries `<al-avatar>` in
 * three example apps, and bleeding it to the edge would wreck all of them.)
 * Edge-to-edge media is this component's reason to exist, not a flag missing
 * from `al-card`.
 *
 * ```html
 * <sl-media-card
 *   variant="work"
 *   href="/projects/petsmart"
 *   image="/img/petsmart.webp"
 *   heading="PetSmart"
 *   excerpt="A design system for 1,600 stores."
 *   footer-label="case study →"
 * >
 *   <span slot="tags">Design systems</span>
 *   <span slot="tags">Accessibility</span>
 * </sl-media-card>
 * ```
 *
 * @slot meta - The meta row above the heading — category, date. Laid out as a row; each node is its own item.
 * @slot tags - Tag chips under the excerpt. Each slotted node gets the brand's square-cornered chip treatment, so plain `<span>`s are enough.
 * @slot - Extra body content, placed between the excerpt and the footer.
 *
 * @csspart card - The `<a>` itself — the whole card is the link target.
 * @csspart image - The media well.
 * @csspart body - The padded content column.
 * @csspart heading - The `<al-heading>`.
 * @csspart excerpt - The clamped excerpt paragraph.
 * @csspart footer - The mono footer cue.
 *
 * @cssproperty --sl-media-card-aspect-ratio - The media well's ratio. Defaults to `16 / 9`, or `16 / 10` under `variant="work"`.
 * @cssproperty --sl-media-card-padding - The body's padding. Defaults to `--al-theme-space-lg`, or `-xl` when `featured`.
 * @cssproperty --sl-media-card-line-clamp - Lines the excerpt is clamped to. Defaults to `3`, or `2` under `variant="work"`.
 */
export class SLMediaCard extends ALElement {
  static el = 'sl-media-card';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Which of the two card anatomies to render. Reflected so it is inspectable
   * in devtools, targetable as `sl-media-card[variant='work']` from the page,
   * and serialized through Declarative Shadow DOM.
   */
  @property({ reflect: true })
  accessor variant: 'article' | 'work' = 'article';

  /** The larger treatment used for a lead card that spans two grid columns. */
  @property({ type: Boolean, reflect: true })
  accessor featured: boolean;

  /** Where the card links. The whole card is the target. */
  @property()
  accessor href: string;

  /** Media source. Omit to render the `fallback` glyph instead. */
  @property()
  accessor image: string;

  /** Alt text. Empty by default: the card's heading already names the destination, so the image is decorative. */
  @property({ attribute: 'image-alt' })
  accessor imageAlt: string = '';

  /** Stand-in shown when there is no image — the brand uses `<P>`, the client initial in angle brackets. */
  @property()
  accessor fallback: string;

  /** The card's heading. */
  @property()
  accessor heading: string;

  /** The clamped summary under the heading. */
  @property()
  accessor excerpt: string;

  /** The mono cue in the footer, e.g. `read →`. Omit for no footer. */
  @property({ attribute: 'footer-label' })
  accessor footerLabel: string;

  /**
   * Heading scale override. Left unset, it follows the anatomy: `lg` for work
   * cards and featured articles (short client names and lead treatments), `md`
   * for a standard article card, whose long sentence titles overwrap badly at
   * `lg`. Altitude's scoped steps here are 24px and 48px with nothing between —
   * a real gap in `al-heading`, documented rather than papered over.
   */
  @property({ attribute: 'heading-variant' })
  accessor headingVariant: string;

  private get resolvedHeadingVariant(): string {
    if (this.headingVariant) return this.headingVariant;
    return this.variant === 'work' || this.featured ? 'lg' : 'md';
  }

  /**
   * Reflect whether a slot actually received content, so the SCSS can drop the
   * empty wrapper instead of leaving a phantom gap in the body's flex column.
   *
   * This has to be JS. `:host(:has([slot='meta']))` is the natural way to ask
   * and is unsupported — `CSS.supports('selector(:host(:has(*)))')` is false —
   * and `slot:empty` tests fallback children, not assigned nodes. `slotchange`
   * also re-fires when the page swaps children, which a render-time check
   * would miss.
   */
  private syncSlotFlag(name: 'meta' | 'tags', e: Event) {
    const slot = e.target as HTMLSlotElement;
    const filled = slot
      .assignedNodes({ flatten: true })
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '');
    this.toggleAttribute(`has-${name}`, filled);
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-media-card', {});

    return html`
      <a class="${componentClassNames}" part="card" href="${this.href}">
        ${this.image || this.fallback
          ? html`<div class="sl-c-media-card__image" part="image">
              ${this.image
                ? html`<img src="${this.image}" alt="${this.imageAlt}" loading="lazy" />`
                : html`<span class="sl-c-media-card__fallback" aria-hidden="true">${this.fallback}</span>`}
            </div>`
          : nothing}
        <div class="sl-c-media-card__body" part="body">
          <div class="sl-c-media-card__meta" part="meta">
            <al-layout direction="row" gap="sm" align="center">
              <slot name="meta" @slotchange=${(e: Event) => this.syncSlotFlag('meta', e)}></slot>
            </al-layout>
          </div>
          ${this.heading
            ? html`<al-heading part="heading" tagName="h3" variant="${this.resolvedHeadingVariant}" isBold>
                ${this.heading}
              </al-heading>`
            : nothing}
          ${this.excerpt ? html`<p class="sl-c-media-card__excerpt" part="excerpt">${this.excerpt}</p>` : nothing}
          <slot></slot>
          <div class="sl-c-media-card__tags">
            <al-layout direction="row" wrap gap="xs">
              <slot name="tags" @slotchange=${(e: Event) => this.syncSlotFlag('tags', e)}></slot>
            </al-layout>
          </div>
          ${this.footerLabel
            ? html`<span class="sl-c-media-card__footer" part="footer" aria-hidden="true">${this.footerLabel}</span>`
            : nothing}
        </div>
      </a>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(SLMediaCard.el) === undefined) {
  customElements.define(SLMediaCard.el, SLMediaCard);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-media-card': SLMediaCard;
  }
}
