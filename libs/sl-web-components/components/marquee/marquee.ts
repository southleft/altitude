import { html, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ALElement } from '../../../al-web-components/components/ALElement';
import styles from './marquee.scss';

/** One item on the belt, read off a slotted element. */
interface MarqueeItem {
  text: string;
  variant: string;
}

/**
 * Component: sl-marquee
 *
 * An endless belt of outline display type. Decorative reinforcement of the
 * page's message — it pauses on hover and stands still under reduced motion.
 *
 * Items are given as slotted elements and the component renders the belt
 * itself, twice:
 *
 * ```html
 * <sl-marquee>
 *   <span>Design Systems</span>
 *   <span data-variant="solid">×</span>
 *   <span>AI</span>
 *   <span data-variant="mono">— built by the people building the tools —</span>
 * </sl-marquee>
 * ```
 *
 * WHY THE SLOT IS A DATA SOURCE, NOT THE RENDERED CONTENT. A seamless loop
 * needs the sequence present twice, so the `-50%` translate lands the second
 * copy exactly where the first began. A slot can only project its nodes ONCE —
 * there is no way to show the same light-DOM node in two places — so the
 * component reads the slotted elements, hides the slot, and renders two copies
 * into the shadow root. Styling then lives in ordinary shadow CSS rather than
 * being split between `::slotted()` for the originals and normal rules for the
 * clones.
 *
 * This is arrangement the component genuinely owns: the belt is a single
 * animated track, not a place a consumer arranges boxes.
 *
 * @slot - The items. Each element's text becomes one item; `data-variant="solid"` fills it in the accent colour and `data-variant="mono"` renders it as small mono type.
 *
 * @csspart track - The animated belt. Retune or stop the animation here.
 *
 * @cssproperty --sl-marquee-duration - One full cycle. Defaults to `36s`.
 * @cssproperty --sl-marquee-gap - Space between items. Defaults to `3rem`.
 * @cssproperty --sl-marquee-font-size - Display item size. Defaults to `clamp(2.5rem, 6vw, 5rem)`.
 * @cssproperty --sl-marquee-padding-block - The band's vertical rhythm. Defaults to `clamp(1.25rem, 3vw, 2.5rem)`.
 */
export class SLMarquee extends ALElement {
  static el = 'sl-marquee';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Pause the belt. Reflected so a page can stop it from outside
   * (`sl-marquee[paused]`) without reaching into the shadow root.
   */
  @property({ type: Boolean, reflect: true })
  accessor paused: boolean;

  @state()
  private accessor items: MarqueeItem[] = [];

  private readItems(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this.items = slot
      .assignedElements({ flatten: true })
      .map((el) => ({
        text: (el.textContent ?? '').trim(),
        variant: el.getAttribute('data-variant') ?? ''
      }))
      .filter((i) => i.text !== '');
  }

  /** One pass of the sequence. Rendered twice — see the class note. */
  private renderRun(copy: number) {
    return this.items.map(
      (item, i) => html`
        <span class="sl-c-marquee__item sl-c-marquee__item--${item.variant || 'outline'}" data-copy="${copy}-${i}">
          ${item.text}
        </span>
      `
    );
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-marquee', {});

    return html`
      <div class="${componentClassNames}" aria-hidden="true">
        <div class="sl-c-marquee__track" part="track">${this.renderRun(0)}${this.renderRun(1)}</div>
      </div>
      <slot @slotchange=${this.readItems}></slot>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(SLMarquee.el) === undefined) {
  customElements.define(SLMarquee.el, SLMarquee);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-marquee': SLMarquee;
  }
}
