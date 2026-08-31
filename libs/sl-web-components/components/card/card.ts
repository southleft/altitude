import { html, nothing, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../../../al-web-components/components/ALElement';
/*
 * The base `al-card` module is deliberately NOT imported — the same rule as
 * `header.ts` and for the same reason. This component IS `al-card` for the
 * Southleft brand (one namespace; the brand implementation overrides the base
 * one), so importing the base module would register the BASE class under that
 * tag first and win, `customElements.define` being first-come and final. The
 * failure is silent: every named slot below goes unassigned and the brand
 * variants render as an ordinary card.
 */
import '../../../al-web-components/components/layout/layout';
import '../../../al-web-components/components/heading/heading';
import styles from './card.scss';

/**
 * Component: al-card
 *
 * Southleft's implementation of the card, and a SUPERSET of Altitude's: the
 * same regions (`image`, `header`, `actions-start`, `actions-end`, the default
 * body), the same `layout`, `variant="bare"` and `fill` behaviour, plus the
 * four card treatments southleft.com ships.
 *
 * ONE COMPONENT, FIVE TREATMENTS. Every one of them is a bounded surface
 * grouping a single subject, with a heading, a body and a trailing cue. They
 * differ in padding, typography, whether the media bleeds to the edge, and
 * which regions they use — presentation decisions, which is what `variant` is
 * for. They are not different components, and splitting them into some would
 * mean four tags a consumer has to choose between before they can render a
 * card.
 *
 *   * (unset) — the base surface: background, shadow, radius.
 *   * `bare`    — the regions without the surface.
 *   * `service` — the "what we do" card. A bordered well on the 40px padding
 *     step, a display-face heading with a corner glyph opposite it, and a mono
 *     supporting list.
 *   * `tool`    — the "we publish our homework" card. A mono command line for a
 *     title and a footer cue pinned to the bottom edge.
 *   * `article` / `work` — the linked media card. Media flush to the card edge,
 *     then a padded column: a mono meta row, a heading, a clamped excerpt, tag
 *     chips and a mono footer cue. `work` is the case-study cut of the same
 *     anatomy — a wider media ratio, a shallower clamp, a tighter rhythm.
 *
 * WHY THE MEDIA VARIANTS CAN LIVE HERE AT ALL. Altitude's `al-card` carries a
 * single outer `padding` that wraps its image region, so its media can never
 * sit flush to the edge — which is why the brand layer used to ship a separate
 * `al-media-card`. This component owns its own padding (`--al-card-padding`,
 * moved onto the content column under `article`/`work`), so the constraint that
 * forced a second component does not apply. That is a brand-layer decision and
 * it stays here: the base card's behaviour is unchanged for every other design
 * system built on the same library.
 *
 * ```html
 * <al-card variant="service" fill href="/services/audits">
 *   <h3 slot="header">Design system audits</h3>
 *   <span slot="cue" aria-hidden="true">&#8599;</span>
 *   <p>Where the system is costing you velocity, and what to do first.</p>
 *   <ul slot="list"><li>Token audit</li><li>Component inventory</li></ul>
 * </al-card>
 *
 * <al-card variant="work" fill href="/projects/petsmart"
 *          image="/img/petsmart.webp" heading="PetSmart"
 *          excerpt="A design system for 1,600 stores."
 *          footer-label="case study &#8594;">
 *   <span slot="tags">Design systems</span>
 * </al-card>
 * ```
 *
 * @slot - The card's body.
 * @slot image - Media above the header. Under the base variants it sits INSIDE the card's padding, exactly as Altitude's card does; under `article`/`work` the media region is flush to the card edge. The `image` property is the usual way to fill it for the media variants; this slot is for anything else, an `<al-avatar>` included.
 * @slot header - The card's heading row. Ignored when the `heading` property is set, which is how the media variants supply theirs.
 * @slot action-right - Top-right single control (kebab / overflow menu). Altitude's card documents this slot but renders no matching `<slot>` element, so anything assigned to it there disappears; this implementation actually renders it, in the header row's trailing cluster beside `cue`.
 * @slot cue - A trailing cue on the header row — the corner glyph under `variant="service"`. Decorative; mark it `aria-hidden` when the card is already a link.
 * @slot meta - A mono meta row above the heading — category, date. Each slotted node is its own item in a row. Collapses entirely when empty.
 * @slot tags - Tag chips under the body. Each slotted node gets the brand's square-cornered chip treatment, so plain `<span>`s are enough. Collapses entirely when empty.
 * @slot list - A supporting list below the body. Under `variant="service"` a slotted `<ul>` gets the brand's mono treatment.
 * @slot footer - A footer cue pinned to the bottom of the card, whatever the body's height. Ignored when the `footer-label` property is set.
 * @slot actions-start - Trailing-action row, leading edge.
 * @slot actions-end - Trailing-action row, trailing edge — the canonical primary action.
 *
 * @csspart card - The card surface itself. An `<a>` when `href` is set, a `<div>` otherwise.
 * @csspart image - The media region.
 * @csspart body - The padded content column.
 * @csspart heading - The `<al-heading>` rendered from the `heading` property.
 * @csspart excerpt - The clamped excerpt paragraph.
 * @csspart footer - The mono footer cue.
 *
 * @cssproperty --al-card-padding - The card's padding. Defaults to `--al-theme-space`; the brand's 40px step under `service`, `--al-theme-space-xl` under `tool`, and under `article`/`work` it moves off the surface and onto the content column.
 * @cssproperty --al-card-media-aspect-ratio - The media region's ratio under `article`/`work`. Defaults to `16 / 9`, or `16 / 10` under `work`.
 * @cssproperty --al-card-line-clamp - Lines the excerpt is clamped to. Defaults to `3`, or `2` under `work`.
 */
export class SLCard extends ALElement {
  static el = 'al-card';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Layout
   * - **default** Displays the slotted items stacked in a column
   * - **row** Displays the slotted items inline in a row
   */
  @property()
  accessor layout: 'inline';

  /**
   * Variant
   * - **default** A card with a background color, box shadow and border radius
   * - **bare** No background color, box shadow or border radius
   * - **service** The brand's "what we do" card: a bordered well, the 40px padding step, a display-face heading and a mono list
   * - **tool** The brand's "we publish our homework" card: a mono command line and a footer cue pinned to the bottom
   * - **article** The linked media card: flush-to-edge media, a meta row, a heading, a clamped excerpt and a mono footer cue
   * - **work** The case-study cut of the media card: a wider media ratio, a two-line clamp and a tighter rhythm
   */
  @property({ reflect: true })
  accessor variant: 'bare' | 'service' | 'tool' | 'article' | 'work';

  /**
   * Fill the available block size instead of hugging the content.
   *
   * Reflected, so a page can also select `al-card[fill]`. It has to be a
   * property rather than something the page sets from outside: `:host` is
   * `display: contents`, so a `height: 100%` written on `<al-card>` is dropped
   * entirely.
   */
  @property({ type: Boolean, reflect: true })
  accessor fill: boolean;

  /**
   * Make the whole card one link target.
   *
   * The brand's `service`, `tool`, `article` and `work` cards are links in
   * their entirety, which is why this is a property and not a slotted `<a>`:
   * one target, one focus ring, and no nested interactive regions for a
   * keyboard user to get lost between. Do not combine it with buttons inside
   * the card.
   */
  @property()
  accessor href: string;

  /** Link target, when `href` is set. `_blank` for the off-site tool cards. */
  @property()
  accessor target: string;

  /**
   * Link `rel`. Defaults to `noopener` whenever `target="_blank"`, so an
   * external card cannot be opened without it by forgetting to pass it.
   */
  @property()
  accessor rel: string;

  /**
   * The mono command line that titles a `tool` card — `npx altitude init`.
   *
   * A property rather than a slot because the prefix glyph is styled
   * separately from the command, and `::slotted()` reaches direct children
   * only: a slotted `<p><span>$</span> npx …</p>` puts the span out of reach.
   */
  @property()
  accessor command: string;

  /** The muted glyph before `command`. `$` for a shell line, `//` for a note. */
  @property({ attribute: 'command-prefix' })
  accessor commandPrefix: string = '$';

  /** Dashed rather than solid border — the brand's "coming soon" tool card. */
  @property({ type: Boolean, reflect: true })
  accessor dashed: boolean;

  /** Media source for the `article` / `work` variants. Omit to render `fallback`. */
  @property()
  accessor image: string;

  /** Alt text. Empty by default: the heading already names the destination, so the image is decorative. */
  @property({ attribute: 'image-alt' })
  accessor imageAlt: string = '';

  /** Stand-in shown when there is no image — the brand uses `<P>`, the client initial in angle brackets. */
  @property()
  accessor fallback: string;

  /** The card's heading. Rendered as an `<al-heading>`, in place of the `header` slot. */
  @property()
  accessor heading: string;

  /** The clamped summary under the heading. */
  @property()
  accessor excerpt: string;

  /** The mono cue in the footer, e.g. `read →`. Omit for no footer. */
  @property({ attribute: 'footer-label' })
  accessor footerLabel: string;

  /** The larger treatment used for a lead card that spans two grid columns. */
  @property({ type: Boolean, reflect: true })
  accessor featured: boolean;

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
   * empty wrapper instead of leaving a phantom gap in the content column.
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
    const isMedia = this.variant === 'article' || this.variant === 'work';

    const componentClassNames = this.componentClassNames('al-c-card', {
      'al-c-card--inline': this.layout === 'inline',
      'al-c-card--bare': this.variant === 'bare',
      'al-c-card--service': this.variant === 'service',
      'al-c-card--tool': this.variant === 'tool',
      'al-c-card--media': isMedia,
      'al-c-card--dashed': !!this.dashed,
      'al-c-card--linked': !!this.href
    });

    const hasTrailing = this.slotNotEmpty('cue') || this.slotNotEmpty('action-right');
    const hasHeaderRow = !!this.heading || this.slotNotEmpty('header') || hasTrailing;
    const hasFooter = !!this.footerLabel || this.slotNotEmpty('footer');

    /**
     * The media region. Under the base variants this is Altitude's `image`
     * slot, unchanged and still inside the card's padding. Under `article` /
     * `work` it is the flush-to-edge well, filled by the `image` property or
     * by the `fallback` glyph when there is no artwork.
     */
    const media =
      isMedia && (this.image || this.fallback)
        ? html`
            <div class="al-c-card__image" part="image">
              ${this.image
                ? html`<img src="${this.image}" alt="${this.imageAlt}" loading="lazy" />`
                : html`<span class="al-c-card__fallback" aria-hidden="true">${this.fallback}</span>`}
            </div>
          `
        : this.slotNotEmpty('image')
          ? html`
              <div class="al-c-card__image" part="image">
                <slot name="image"></slot>
              </div>
            `
          : nothing;

    /**
     * Every region below the media, in one wrapper.
     *
     * The wrapper is `display: contents` for every variant except the media
     * ones, where it becomes the padded column that lets the media above it
     * bleed to the card's edge. Because `display: contents` does not affect
     * selector matching, the base card's `> *` width rules name this wrapper's
     * children too — see the note in card.scss.
     */
    const content = html`
      <div class="al-c-card__content">
        <div class="al-c-card__meta" part="meta">
          <al-layout direction="row" gap="sm" align="center">
            <slot name="meta" @slotchange=${(e: Event) => this.syncSlotFlag('meta', e)}></slot>
          </al-layout>
        </div>
        ${hasHeaderRow
          ? html`
              <div class="al-c-card__header">
                ${this.heading
                  ? html`<al-heading part="heading" tagName="h3" variant="${this.resolvedHeadingVariant}" isBold>
                      ${this.heading}
                    </al-heading>`
                  : html`<slot name="header"></slot>`}
                ${hasTrailing
                  ? html`
                      <div class="al-c-card__cue">
                        <slot name="cue"></slot>
                        <slot name="action-right"></slot>
                      </div>
                    `
                  : nothing}
              </div>
            `
          : nothing}
        ${this.command
          ? html`
              <p class="al-c-card__command">
                <span class="al-c-card__command-prefix" aria-hidden="true">${this.commandPrefix}</span>
                ${this.command}
              </p>
            `
          : nothing}
        ${this.excerpt ? html`<p class="al-c-card__excerpt" part="excerpt">${this.excerpt}</p>` : nothing}
        <div class="al-c-card__body" part="body">
          <slot></slot>
        </div>
        <div class="al-c-card__tags">
          <al-layout direction="row" wrap gap="xs">
            <slot name="tags" @slotchange=${(e: Event) => this.syncSlotFlag('tags', e)}></slot>
          </al-layout>
        </div>
        ${this.slotNotEmpty('list')
          ? html`
              <div class="al-c-card__list">
                <slot name="list"></slot>
              </div>
            `
          : nothing}
        ${hasFooter
          ? html`
              <div class="al-c-card__footer" part="footer">
                ${this.footerLabel
                  ? html`<span aria-hidden="true">${this.footerLabel}</span>`
                  : html`<slot name="footer"></slot>`}
              </div>
            `
          : nothing}
      </div>
    `;

    const inner = html`
      ${this.slotNotEmpty('actions-start') || this.slotNotEmpty('actions-end')
        ? html`
            <div class="al-c-card__actions">
              ${this.slotNotEmpty('actions-start') && html`
                <div class="al-c-card__actions-start">
                  <slot name="actions-start"></slot>
                </div>
              `}
              ${this.slotNotEmpty('actions-end') && html`
                <div class="al-c-card__actions-end">
                  <slot name="actions-end"></slot>
                </div>
              `}
            </div>
          `
        : nothing}
      ${media} ${content}
    `;

    // One surface, rendered as the right element. An `<a>` only when there is
    // somewhere to go — an anchor with no href is not focusable and announces
    // as nothing, which would be worse than the div it replaced.
    return this.href
      ? html`
          <a
            class="${componentClassNames}"
            part="card"
            href="${this.href}"
            target="${this.target || nothing}"
            rel="${this.rel || (this.target === '_blank' ? 'noopener' : nothing)}"
          >
            ${inner}
          </a>
        `
      : html`<div class="${componentClassNames}" part="card">${inner}</div>`;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(SLCard.el) === undefined) {
  customElements.define(SLCard.el, SLCard);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-card': SLCard;
  }
}
