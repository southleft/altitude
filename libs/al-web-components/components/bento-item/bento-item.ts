import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './bento-item.scss';

/**
 * Component: al-bento-item
 *
 * A single tile inside `<al-bento-grid>`. Purely a grid-placement primitive —
 * it owns no visual surface (no border/background/padding) so any content
 * (a card, a stat, an image, a stack of copy) can be slotted in and supply
 * its own chrome. `colSpan`/`rowSpan` are reflected onto the host as CSS
 * custom properties, so they can also be overridden per breakpoint from
 * consumer CSS without touching the attribute.
 *
 * @slot - The tile's content (card, stat, image, or arbitrary markup).
 * @cssproperty --al-bento-item-col-span - Number of the 12 grid columns this tile spans. Defaults to 4.
 * @cssproperty --al-bento-item-row-span - Number of implicit grid rows this tile spans. Defaults to 1.
 */
export class ALBentoItem extends ALElement {
  static el = 'al-bento-item';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Number of the grid's 12 columns this tile spans (1-12).
   */
  @property({ type: Number })
  accessor colSpan: number = 4;

  /**
   * Number of implicit grid rows this tile spans.
   */
  @property({ type: Number })
  accessor rowSpan: number = 1;

  updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('colSpan') || changedProperties.has('rowSpan')) {
      this.style.setProperty('--al-bento-item-col-span', String(this.colSpan ?? 4));
      this.style.setProperty('--al-bento-item-row-span', String(this.rowSpan ?? 1));
    }
  }

  render() {
    return html`<slot></slot>`;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALBentoItem.el) === undefined) {
  customElements.define(ALBentoItem.el, ALBentoItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-bento-item': ALBentoItem;
  }
}
